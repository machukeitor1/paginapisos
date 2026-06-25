import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activas = searchParams.get("activas");

    const where: any = {};
    if (activas === "true") where.activo = true;

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { orden: "asc" },
    });
    return NextResponse.json(banners);
  } catch {
    return NextResponse.json({ error: "Error al obtener banners" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const banner = await prisma.banner.create({ data });
    return NextResponse.json(banner, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear" }, { status: 500 });
  }
}
