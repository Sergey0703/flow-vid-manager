import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/auth', '/pending-approval'],
    },
    sitemap: 'https://aimediaflow.net/sitemap.xml',
  };
}
