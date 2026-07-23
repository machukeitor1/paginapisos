import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://revestimientoschillan.cl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/cotizador`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contacto`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  const categorias = await prisma.categoria.findMany({
    select: { slug: true, updatedAt: true },
  });
  const categoryPages: MetadataRoute.Sitemap = categorias.map((cat) => ({
    url: `${BASE_URL}/${cat.slug}`,
    lastModified: cat.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const productos = await prisma.producto.findMany({
    select: { slug: true, updatedAt: true, categoria: { select: { slug: true } } },
  });
  const productPages: MetadataRoute.Sitemap = productos.map((prod) => ({
    url: `${BASE_URL}/${prod.categoria.slug}/${prod.slug}`,
    lastModified: prod.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
