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

export async function POST(request: Request) {
  let data: any;
  try { data = await request.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  try {
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
