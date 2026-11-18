// apps/web/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const publicRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/features', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/pricing', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/solutions/restaurants', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/solutions/bars-lounges', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/solutions/cloud-kitchens', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/hardware-pos', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  ];

  return publicRoutes.map((route) => ({
    url: route.path === '/' ? SITE_CONFIG.url : `${SITE_CONFIG.url}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}