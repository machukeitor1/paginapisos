import { NextResponse } from "next/server";
import { generateTemplateBuffer } from "@/lib/templates/cotizacion-template";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") === "dinamico" ? "dinamico" : "fijo";

    const buffer = await generateTemplateBuffer(tipo);
    const bytes = new Uint8Array(buffer);

    const filename = tipo === "fijo"
      ? "Plantilla_Cotizacion_Revestimientos_Chillan.docx"
      : "Plantilla_Cotizacion.docx";

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al generar plantilla" },
      { status: 500 }
    );
  }
}
