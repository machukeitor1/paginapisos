import type { Metadata } from "next";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import WhatsAppButton from "@/components/site/WhatsAppButton";
import MapButton from "@/components/site/MapButton";

export const metadata: Metadata = {
  title: "Revestimientos y Pisos - Materiales de Construcción",
  description: "Venta de revestimientos metálicos, WPC, pisos vinílicos SPC, deck y siding granito. Despacho a todo Chile.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <WhatsAppButton />
      <MapButton />
      <Footer />
    </>
  );
}
