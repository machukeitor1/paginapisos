import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";

export async function GET(request: Request) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((id) => parseInt(id))
      .filter((id) => Number.isFinite(id));

    if (ids.length === 0) return NextResponse.json([]);

    const productos = await prisma.producto.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        sku: true,
        nombre: true,
        stock: true,
        stockMinimo: true,
        unidadVenta: true,
        activo: true,
      },
    });

    return NextResponse.json(productos);
  } catch {
    return NextResponse.json({ error: "Error al obtener disponibilidad" }, { status: 500 });
  }
}
