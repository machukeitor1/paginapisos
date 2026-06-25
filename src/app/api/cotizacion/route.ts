import { NextResponse } from "next/server";
import { generarLinkWhatsApp, generarMensajeCotizacion } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const { items, total, nombreCliente, telefonoCliente, whatsapp } = await request.json();

    if (!items || !whatsapp) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const mensaje = generarMensajeCotizacion(items, total, nombreCliente, telefonoCliente);
    const link = generarLinkWhatsApp(whatsapp, mensaje);

    return NextResponse.json({ link, mensaje });
  } catch {
    return NextResponse.json({ error: "Error al generar cotización" }, { status: 500 });
  }
}
