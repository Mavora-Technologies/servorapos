// apps/web/app/robots.ts
import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/features',
          '/pricing',
          '/contact',
          '/hardware-pos',
          '/solutions/',
          '/resources/',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/api/',
          '/login',
          '/register',
          '/dashboard',
          '/pos',
          '/kitchen',
          '/orders',
          '/menu',
          '/inventory',
          '/purchasing',
          '/suppliers',
          '/finance',
          '/payments',
          '/cash-management',
          '/staff',
          '/customers',
          '/loyalty',
          '/marketing',
          '/reports',
          '/reservations',
          '/tables',
          '/ai-assistant',
          '/automations',
          '/notifications',
          '/settings',
          '/help',
        ],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
    host: SITE_CONFIG.url,
  };
}