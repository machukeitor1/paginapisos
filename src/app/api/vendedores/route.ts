import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const vendedores = await prisma.vendedor.findMany({
      select: {
        id: true,
        nombre: true,
        rut: true,
        telefono: true,
        email: true,
        activo: true,
      },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(vendedores);
  } catch {
    return NextResponse.json({ error: "Error al obtener vendedores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.nombre || !data.rut || !data.password) {
      return NextResponse.json({ error: "Nombre, RUT y contraseña requeridos" }, { status: 400 });
    }

    const password = await bcrypt.hash(data.password, 10);

    const vendedor = await prisma.vendedor.create({
      data: {
        nombre: data.nombre,
        rut: data.rut,
        telefono: data.telefono || null,
        email: data.email || null,
        password,
        activo: data.activo !== false,
      },
      select: {
        id: true,
        nombre: true,
        rut: true,
        telefono: true,
        email: true,
        activo: true,
      },
    });

    return NextResponse.json(vendedor, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un vendedor con ese RUT" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Error al crear" }, { status: 500 });
  }
}
