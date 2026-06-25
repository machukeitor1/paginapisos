import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let config = await prisma.configuracion.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.configuracion.create({
        data: { id: 1, nombreEmpresa: "Mi Empresa" },
      });
    }
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const config = await prisma.configuracion.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar" }, { status: 500 });
  }
}
