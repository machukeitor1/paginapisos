import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";
import { whereAuditoria, EVENTO_LABEL, TIPO_USUARIO_LABEL } from "@/lib/auditoria";
import { fechaChile } from "@/lib/periodos";

export async function GET(request: Request) {
  try {
    const actor = await getActor();
    if (!actor || actor.tipo !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const where = whereAuditoria(searchParams);

    const eventos = await prisma.cotizacionEvento.findMany({
      where,
      include: {
        cotizacion: {
          select: {
            id: true,
            numero: true,
            total: true,
            vendedor: { select: { nombre: true } },
            cliente: { select: { nombre: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5000,
    });

    const filas = eventos.map((e) => ({
      Fecha: fechaChile(e.createdAt, true),
      "N° Cotización": e.cotizacion.numero,
      Cliente: e.cotizacion.cliente.nombre,
      Vendedor: e.cotizacion.vendedor.nombre,
      "Estado anterior": e.estadoAnterior ? EVENTO_LABEL[e.estadoAnterior] || e.estadoAnterior : "-",
      "Estado nuevo": EVENTO_LABEL[e.estadoNuevo] || e.estadoNuevo,
      Motivo: e.motivo || "",
      "Tipo usuario": TIPO_USUARIO_LABEL[e.usuarioTipo] || e.usuarioTipo,
      Usuario: e.usuarioNombre,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), "Auditoría");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="auditoria_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al exportar auditoría" }, { status: 500 });
  }
}
