import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    if (q.length < 1) return NextResponse.json([]);

    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        OR: [
          { sku: { contains: q, mode: "insensitive" } },
          { nombre: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        nombre: true,
        sku: true,
        precio: true,
        precioUnitario: true,
        descuento: true,
        unidad: true,
        slug: true,
        rendimiento: true,
        unidadVenta: true,
        dimensiones: true,
        categoria: { select: { nombre: true } },
      },
      take: 20,
      orderBy: { sku: "asc" },
    });

    return NextResponse.json(productos);
  } catch {
    return NextResponse.json({ error: "Error al buscar" }, { status: 500 });
  }
}
