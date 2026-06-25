import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activas = searchParams.get("activas");

    const where: any = {};
    if (activas === "true") where.activo = true;

    const sucursales = await prisma.sucursal.findMany({
      where,
      orderBy: { orden: "asc" },
    });
    return NextResponse.json(sucursales);
  } catch {
    return NextResponse.json({ error: "Error al obtener sucursales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const sucursal = await prisma.sucursal.create({ data });
    return NextResponse.json(sucursal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear" }, { status: 500 });
  }
}
