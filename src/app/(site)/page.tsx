import { prisma } from "@/lib/prisma";
import { getBannerVariantUrl } from "@/lib/image-utils";
import Hero from "@/components/site/Hero";
import ProductosDestacados from "@/components/site/ProductosDestacados";
import CategoriasGrid from "@/components/site/CategoriasGrid";
import Sucursales from "@/components/site/Sucursales";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://revestimientoschillan.cl',
  },
};

export default async function HomePage() {
  const [banners, categorias, productos] = await Promise.all([
    prisma.banner.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, titulo: true, subtitulo: true, badge: true, imagen: true, imagenMovil: true, url: true },
    }),
    prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, slug: true, descripcion: true, imagen: true },
    }),
    prisma.producto.findMany({
      where: { destacado: true },
      orderBy: { orden: 'asc' },
      include: { categoria: true },
    }),
  ]);

  const firstBanner = banners[0];
  const preloadUrl = firstBanner
    ? getBannerVariantUrl(firstBanner.imagenMovil || firstBanner.imagen, 'w400')
    : null;

  return (
    <>
      {preloadUrl && (
        <link rel="preload" as="image" href={preloadUrl} />
      )}
      <Hero banners={banners} />
      <CategoriasGrid categorias={categorias} />
      <ProductosDestacados productos={productos} />
      <Sucursales />
    </>
  );
}
