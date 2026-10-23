import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";
import { whereAuditoria } from "@/lib/auditoria";

export async function GET(request: Request) {
  try {
    const actor = await getActor();
    if (!actor || actor.tipo !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const where = whereAuditoria(searchParams);
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1") || 1);
    const porPagina = Math.min(200, Math.max(1, parseInt(searchParams.get("porPagina") || "30") || 30));

    const [total, items] = await Promise.all([
      prisma.cotizacionEvento.count({ where }),
      prisma.cotizacionEvento.findMany({
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
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener auditoría" }, { status: 500 });
  }
}
