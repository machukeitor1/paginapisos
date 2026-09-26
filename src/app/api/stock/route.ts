import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const categoriaId = searchParams.get("categoriaId");

    const where: any = {};
    if (categoriaId) {
      where.categoriaId = parseInt(categoriaId);
    }
    if (q) {
      where.OR = [
        { sku: { contains: q, mode: "insensitive" as const } },
        { nombre: { contains: q, mode: "insensitive" as const } },
      ];
    }

    const productos = await prisma.producto.findMany({
      where,
      include: {
        categoria: { select: { id: true, nombre: true } },
      },
      orderBy: [{ categoriaId: "asc" }, { sku: "asc" }],
    });

    return NextResponse.json(productos);
  } catch {
    return NextResponse.json({ error: "Error al obtener stock" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const { productoId, tipo, cantidad, motivo } = body;

    if (!productoId || !tipo || typeof cantidad !== "number" || cantidad <= 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (!["entrada", "egreso", "ajuste"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
    }

    const producto = await prisma.producto.findUnique({ where: { id: parseInt(productoId) } });
    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    let nuevoStock: number;
    if (tipo === "entrada") {
      nuevoStock = producto.stock + cantidad;
    } else if (tipo === "egreso") {
      nuevoStock = producto.stock - cantidad;
    } else {
      nuevoStock = cantidad;
    }

    if (nuevoStock < 0) {
      return NextResponse.json({ error: `Stock insuficiente (quedan ${producto.stock})` }, { status: 400 });
    }

    const [movimiento, updated] = await prisma.$transaction([
      prisma.stockMovimiento.create({
        data: {
          productoId: producto.id,
          tipo,
          cantidad,
          saldoTras: nuevoStock,
          motivo: motivo || null,
        },
      }),
      prisma.producto.update({
        where: { id: producto.id },
        data: { stock: nuevoStock },
      }),
    ]);

    return NextResponse.json({ movimiento, producto: updated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al ajustar stock" }, { status: 500 });
  }
}