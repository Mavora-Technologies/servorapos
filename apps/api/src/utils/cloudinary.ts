// apps/api/src/utils/cloudinary.ts
import crypto from 'crypto';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary credentials are not configured on the server (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).'
    );
  }

  return { cloudName, apiKey, apiSecret };
}

export function getTenantMenuImageFolder(tenantId: number): string {
  return `servora/${tenantId}/menu-items`;
}

export function assertPublicIdBelongsToTenant(tenantId: number, publicId: string): void {
  const expectedPrefix = `${getTenantMenuImageFolder(tenantId)}/`;
  if (!publicId.startsWith(expectedPrefix) || publicId.includes('..')) {
    throw new Error('Unauthorized asset reference: image does not belong to this tenant.');
  }
}

function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(`${sorted}${apiSecret}`).digest('hex');
}

export function generateMenuImageUploadSignature(tenantId: number) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = getTenantMenuImageFolder(tenantId);
  const allowedFormats = 'jpg,jpeg,png,webp';

  const paramsToSign = {
    allowed_formats: allowedFormats,
    folder,
    timestamp,
  };

  const signature = signCloudinaryParams(paramsToSign, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    allowedFormats,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    maxFileSizeBytes: MAX_MENU_IMAGE_BYTES,
  };
}

/**
 * Safely destroys a Cloudinary asset scoped to the authenticated tenant.
 * Never throws on cleanup failure so a committed DB write is never rolled back.
 */
export async function destroyTenantCloudinaryImage(
  tenantId: number,
  publicId: string
): Promise<{ ok: boolean; result?: string; error?: string }> {
  try {
    assertPublicIdBelongsToTenant(tenantId, publicId);
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = signCloudinaryParams(
      { invalidate: 'true', public_id: publicId, timestamp },
      apiSecret
    );

    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      invalidate: 'true',
      api_key: apiKey,
      signature,
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }
    );

    const data = (await response.json().catch(() => ({}))) as { result?: string; error?: { message?: string } };
    if (!response.ok) {
      return { ok: false, error: data?.error?.message || `HTTP ${response.status}` };
    }
    return { ok: true, result: data?.result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cloudinary cleanup failed';
    console.warn(`[Cloudinary Destroy Warning] tenant=${tenantId} publicId=${publicId}: ${message}`);
    return { ok: false, error: message };
  }
}

/**
 * Injects Cloudinary responsive transformation parameters into a secure_url.
 */
export function buildOptimizedCloudinaryUrl(
  imageUrl: string | null | undefined,
  width: number,
  height: number
): string | null {
  if (!imageUrl) return null;
  if (!imageUrl.includes('res.cloudinary.com') || !imageUrl.includes('/upload/')) {
    return imageUrl;
  }
  const transform = `f_auto,q_auto,c_fill,g_auto,w_${width},h_${height}`;
  return imageUrl.replace('/upload/', `/upload/${transform}/`);
}