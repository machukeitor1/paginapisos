import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const destacados = searchParams.get("destacados");
    const slug = searchParams.get("slug");
    const activos = searchParams.get("activos");

    if (slug) {
      const producto = await prisma.producto.findUnique({
        where: { slug },
        include: { categoria: true },
      });
      return NextResponse.json(producto);
    }

    const where: any = {};
    if (destacados === "true") where.destacado = true;
    if (activos === "true") where.activo = true;

    const productos = await prisma.producto.findMany({
      where,
      orderBy: { orden: "asc" },
      include: { categoria: true },
    });
    return NextResponse.json(productos);
  } catch {
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const producto = await prisma.producto.create({ data });
    return NextResponse.json(producto, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear" }, { status: 500 });
  }
}
