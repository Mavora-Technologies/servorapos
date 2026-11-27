// apps/web/lib/pos-image-cache.ts
import { getOptimizedMenuImageUrl } from './cloudinary';

const POS_IMAGE_CACHE_NAME = 'servora-pos-menu-images-v1';

export async function syncPosMenuImagesCache(imageUrls: Array<string | null | undefined>) {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  try {
    const cache = await caches.open(POS_IMAGE_CACHE_NAME);
    const activeUrls = new Set(
      imageUrls
        .map((u) => getOptimizedMenuImageUrl(u, 'card'))
        .filter((u): u is string => Boolean(u))
    );

    // 1. Evict stale or removed images
    const existingKeys = await cache.keys();
    await Promise.all(
      existingKeys
        .filter((req) => !activeUrls.has(req.url))
        .map((req) => cache.delete(req))
    );

    // 2. Warm-cache new/updated images in parallel (non-blocking)
    const cachedSet = new Set(existingKeys.map((req) => req.url));
    const missing = Array.from(activeUrls).filter((u) => !cachedSet.has(u));

    await Promise.allSettled(
      missing.map(async (url) => {
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) {
          await cache.put(url, res.clone());
        }
      })
    );
  } catch {
    // Non-fatal: browser privacy mode or storage quota
  }
}