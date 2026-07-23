import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/vendedor/'] },
    ],
    sitemap: 'https://revestimientoschillan.cl/sitemap.xml',
  };
}
