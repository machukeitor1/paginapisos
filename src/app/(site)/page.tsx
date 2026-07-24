import Hero from "@/components/site/Hero";
import ProductosDestacados from "@/components/site/ProductosDestacados";
import CategoriasGrid from "@/components/site/CategoriasGrid";
import Sucursales from "@/components/site/Sucursales";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://revestimientoschillan.cl',
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoriasGrid />
      <ProductosDestacados />
      <Sucursales />
    </>
  );
}
