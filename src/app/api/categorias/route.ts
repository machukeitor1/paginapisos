import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activas = searchParams.get("activas");

    const where: any = {};
    if (activas === "true") where.activo = true;

    const categorias = await prisma.categoria.findMany({
      where,
      orderBy: { orden: "asc" },
    });
    return NextResponse.json(categorias);
  } catch {
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const categoria = await prisma.categoria.create({ data });
    return NextResponse.json(categoria, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear" }, { status: 500 });
  }
}
