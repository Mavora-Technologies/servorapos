// apps/web/lib/cloudinary.ts
import { fetchApi } from '@/lib/api';

export const ACCEPTED_MENU_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_MENU_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadedMenuImage {
  imageUrl: string;
  imagePublicId: string;
  imageOriginalFilename: string;
  imageMimeType: string;
  imageFileSize: number;
}

interface SignedUploadPayload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
  uploadUrl: string;
  maxFileSizeBytes: number;
}

export function validateMenuImageFile(file: File): string | null {
  if (
    !ACCEPTED_MENU_IMAGE_TYPES.includes(
      file.type as (typeof ACCEPTED_MENU_IMAGE_TYPES)[number]
    )
  ) {
    return 'Unsupported format. Please upload a JPEG, PNG, or WebP image.';
  }
  if (file.size <= 0) {
    return 'Selected file is empty.';
  }
  if (file.size > MAX_MENU_IMAGE_SIZE_BYTES) {
    return 'Image is too large. Maximum allowed size is 5 MB.';
  }
  return null;
}

export function getOptimizedMenuImageUrl(
  url: string | null | undefined,
  variant: 'thumb' | 'card' | 'preview'
): string | null {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  // Avoid double-transforming already-transformed URLs
  if (/\/upload\/[^/]*w_\d+/.test(url)) return url;

  const transform =
    variant === 'thumb'
      ? 'f_auto,q_auto,c_fill,g_auto,w_96,h_96'
      : variant === 'card'
        ? 'f_auto,q_auto,c_fill,g_auto,w_400,h_300'
        : 'f_auto,q_auto,c_limit,w_640,h_480';

  return url.replace('/upload/', `/upload/${transform}/`);
}

export async function uploadMenuItemImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedMenuImage> {
  const validationError = validateMenuImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  // 1. Request short-lived signed upload params from authenticated backend
  const signRes = await fetchApi('/api/v1/menu/images/sign', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    }),
  });

  const signed: SignedUploadPayload | undefined = signRes?.data;
  if (!signed?.uploadUrl || !signed?.signature) {
    throw new Error('Server failed to issue Cloudinary upload authorization.');
  }

  // 2. Upload directly to Cloudinary with live progress tracking
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signed.apiKey);
  formData.append('timestamp', String(signed.timestamp));
  formData.append('signature', signed.signature);
  formData.append('folder', signed.folder);
  formData.append('allowed_formats', signed.allowedFormats);

  const cloudResponse = await new Promise<{
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    original_filename?: string;
    error?: { message?: string };
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', signed.uploadUrl);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && parsed.secure_url && parsed.public_id) {
          onProgress?.(100);
          resolve(parsed);
        } else {
          reject(
            new Error(parsed?.error?.message || `Cloudinary upload failed (HTTP ${xhr.status}).`)
          );
        }
      } catch {
        reject(new Error('Invalid response received from Cloudinary.'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading image to Cloudinary.'));
    xhr.onabort = () => reject(new Error('Image upload was cancelled.'));
    xhr.send(formData);
  });

  if (!cloudResponse.secure_url || !cloudResponse.public_id) {
    throw new Error('Cloudinary did not confirm the uploaded image reference.');
  }

  return {
    imageUrl: cloudResponse.secure_url,
    imagePublicId: cloudResponse.public_id,
    imageOriginalFilename: file.name,
    imageMimeType: file.type,
    imageFileSize: cloudResponse.bytes ?? file.size,
  };
}

export async function cleanupOrphanedUpload(publicId: string): Promise<void> {
  await fetchApi('/api/v1/menu/images', {
    method: 'DELETE',
    body: JSON.stringify({ publicId }),
  }).catch(() => {
    // Non-blocking best-effort cleanup
  });
}