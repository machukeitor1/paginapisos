import Hero from "@/components/site/Hero";
import ProductosDestacados from "@/components/site/ProductosDestacados";
import CategoriasGrid from "@/components/site/CategoriasGrid";
import CategoriaSelector from "@/components/site/CategoriaSelector";
import Sucursales from "@/components/site/Sucursales";

export default function HomePage() {
  return (
    <>
      <Hero />
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <CategoriaSelector />
        </div>
      </section>
      <CategoriasGrid />
      <ProductosDestacados />
      <Sucursales />
    </>
  );
}
