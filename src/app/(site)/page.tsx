import Hero from "@/components/site/Hero";
import ProductosDestacados from "@/components/site/ProductosDestacados";
import CategoriasGrid from "@/components/site/CategoriasGrid";
import Sucursales from "@/components/site/Sucursales";

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
