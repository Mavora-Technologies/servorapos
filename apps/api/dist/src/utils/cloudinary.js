"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_MENU_IMAGE_BYTES = exports.ALLOWED_IMAGE_MIME_TYPES = void 0;
exports.getTenantMenuImageFolder = getTenantMenuImageFolder;
exports.assertPublicIdBelongsToTenant = assertPublicIdBelongsToTenant;
exports.generateMenuImageUploadSignature = generateMenuImageUploadSignature;
exports.destroyTenantCloudinaryImage = destroyTenantCloudinaryImage;
exports.buildOptimizedCloudinaryUrl = buildOptimizedCloudinaryUrl;
// apps/api/src/utils/cloudinary.ts
const crypto_1 = __importDefault(require("crypto"));
exports.ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
];
exports.MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
function getCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials are not configured on the server (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).');
    }
    return { cloudName, apiKey, apiSecret };
}
function getTenantMenuImageFolder(tenantId) {
    return `servora/${tenantId}/menu-items`;
}
function assertPublicIdBelongsToTenant(tenantId, publicId) {
    const expectedPrefix = `${getTenantMenuImageFolder(tenantId)}/`;
    if (!publicId.startsWith(expectedPrefix) || publicId.includes('..')) {
        throw new Error('Unauthorized asset reference: image does not belong to this tenant.');
    }
}
function signCloudinaryParams(params, apiSecret) {
    const sorted = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');
    return crypto_1.default.createHash('sha1').update(`${sorted}${apiSecret}`).digest('hex');
}
function generateMenuImageUploadSignature(tenantId) {
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
        maxFileSizeBytes: exports.MAX_MENU_IMAGE_BYTES,
    };
}
/**
 * Safely destroys a Cloudinary asset scoped to the authenticated tenant.
 * Never throws on cleanup failure so a committed DB write is never rolled back.
 */
async function destroyTenantCloudinaryImage(tenantId, publicId) {
    try {
        assertPublicIdBelongsToTenant(tenantId, publicId);
        const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = signCloudinaryParams({ invalidate: 'true', public_id: publicId, timestamp }, apiSecret);
        const body = new URLSearchParams({
            public_id: publicId,
            timestamp: String(timestamp),
            invalidate: 'true',
            api_key: apiKey,
            signature,
        });
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        const data = (await response.json().catch(() => ({})));
        if (!response.ok) {
            return { ok: false, error: data?.error?.message || `HTTP ${response.status}` };
        }
        return { ok: true, result: data?.result };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Cloudinary cleanup failed';
        console.warn(`[Cloudinary Destroy Warning] tenant=${tenantId} publicId=${publicId}: ${message}`);
        return { ok: false, error: message };
    }
}
/**
 * Injects Cloudinary responsive transformation parameters into a secure_url.
 */
function buildOptimizedCloudinaryUrl(imageUrl, width, height) {
    if (!imageUrl)
        return null;
    if (!imageUrl.includes('res.cloudinary.com') || !imageUrl.includes('/upload/')) {
        return imageUrl;
    }
    const transform = `f_auto,q_auto,c_fill,g_auto,w_${width},h_${height}`;
    return imageUrl.replace('/upload/', `/upload/${transform}/`);
}
