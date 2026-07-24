import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductoContent from "./ProductoContent";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { categoria: string; slug: string } }): Promise<Metadata> {
  const producto = await prisma.producto.findUnique({
    where: { slug: params.slug },
    select: {
      nombre: true,
      descripcion: true,
      slug: true,
      sku: true,
      precio: true,
      imagenes: true,
      marca: true,
      categoria: { select: { nombre: true, slug: true } },
    },
  });
  if (!producto) return {};

  const title = `${producto.nombre} en Chillán`;
  const description = producto.descripcion || `${producto.nombre} — ${producto.categoria.nombre}. Revestimientos Chillán.`;

  let images: string[] = [];
  try { images = JSON.parse(producto.imagenes); } catch {}
  const firstImage = images[0] || '/Logo.png';

  const precioFmt = `$${Math.round(producto.precio).toLocaleString('es-CL')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description: `${description} — Desde ${precioFmt}`,
      url: `https://revestimientoschillan.cl/${producto.categoria.slug}/${producto.slug}`,
      type: 'website',
      images: [{ url: firstImage, width: 800, height: 600, alt: producto.nombre }],
    },
    alternates: {
      canonical: `https://revestimientoschillan.cl/${producto.categoria.slug}/${producto.slug}`,
    },
  };
}

export default async function ProductoPage({ params }: { params: { categoria: string; slug: string } }) {
  const producto = await prisma.producto.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      nombre: true,
      slug: true,
      sku: true,
      descripcion: true,
      precio: true,
      imagenes: true,
      marca: true,
      categoria: { select: { nombre: true, slug: true } },
    },
  });
  if (!producto) return notFound();

  let images: string[] = [];
  try { images = JSON.parse(producto.imagenes); } catch {}
  const firstImage = images[0] || '/Logo.png';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    description: producto.descripcion || `${producto.nombre} — ${producto.categoria.nombre}`,
    sku: producto.sku,
    brand: { '@type': 'Brand', name: producto.marca || 'Grupo Cubico' },
    image: firstImage,
    url: `https://revestimientoschillan.cl/${producto.categoria.slug}/${producto.slug}`,
    offers: {
      '@type': 'Offer',
      price: producto.precio,
      priceCurrency: 'CLP',
      availability: 'https://schema.org/InStock',
      url: `https://revestimientoschillan.cl/${producto.categoria.slug}/${producto.slug}`,
    },
    category: producto.categoria.nombre,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://revestimientoschillan.cl' },
      { '@type': 'ListItem', position: 2, name: producto.categoria.nombre, item: `https://revestimientoschillan.cl/${producto.categoria.slug}` },
      { '@type': 'ListItem', position: 3, name: producto.nombre },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ProductoContent />
    </>
  );
}
