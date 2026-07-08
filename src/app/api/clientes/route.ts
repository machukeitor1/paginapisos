import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const where: any = {};
    if (q.length >= 2) {
      where.OR = [
        { rut: { contains: q } },
        { nombre: { contains: q } },
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q.length >= 2 ? 20 : 100,
    });

    return NextResponse.json(clientes);
  } catch {
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.nombre) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    let cliente;
    if (data.rut) {
      const existing = await prisma.cliente.findFirst({ where: { rut: data.rut } });
      if (existing) {
        cliente = await prisma.cliente.update({
          where: { id: existing.id },
          data: {
            nombre: data.nombre,
            direccion: data.direccion || null,
            comuna: data.comuna || null,
            telefono: data.telefono || null,
            email: data.email || null,
          },
        });
      } else {
        cliente = await prisma.cliente.create({
          data: {
            nombre: data.nombre,
            rut: data.rut,
            direccion: data.direccion || null,
            comuna: data.comuna || null,
            telefono: data.telefono || null,
            email: data.email || null,
          },
        });
      }
    } else {
      cliente = await prisma.cliente.create({
        data: {
          nombre: data.nombre,
          direccion: data.direccion || null,
          comuna: data.comuna || null,
          telefono: data.telefono || null,
          email: data.email || null,
        },
      });
    }

    return NextResponse.json(cliente, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear cliente" }, { status: 500 });
  }
}
