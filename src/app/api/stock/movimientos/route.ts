import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get("productoId");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const tipo = searchParams.get("tipo");
    const q = (searchParams.get("q") || "").trim();
    const limite = Math.min(1000, Math.max(1, parseInt(searchParams.get("limite") || "200") || 200));

    const where: any = {};
    if (productoId) where.productoId = parseInt(productoId);
    if (tipo && tipo !== "todos") where.tipo = tipo;
    if (desde) where.createdAt = { ...where.createdAt, gte: new Date(desde) };
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setDate(hastaDate.getDate() + 1);
      where.createdAt = { ...where.createdAt, lt: hastaDate };
    }
    if (q) {
      where.OR = [
        { usuarioNombre: { contains: q, mode: "insensitive" } },
        { motivo: { contains: q, mode: "insensitive" } },
        { producto: { sku: { contains: q, mode: "insensitive" } } },
        { producto: { nombre: { contains: q, mode: "insensitive" } } },
        { ingreso: { numeroFactura: { contains: q, mode: "insensitive" } } },
      ];
    }

    const movimientos = await prisma.stockMovimiento.findMany({
      where,
      include: {
        producto: { select: { sku: true, nombre: true } },
        vendedor: { select: { id: true, nombre: true } },
        ingreso: { select: { id: true, numeroFactura: true, fecha: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limite,
    });

    return NextResponse.json(movimientos);
  } catch {
    return NextResponse.json({ error: "Error al obtener movimientos" }, { status: 500 });
  }
}
