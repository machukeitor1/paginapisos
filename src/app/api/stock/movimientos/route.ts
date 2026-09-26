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

    const where: any = {};
    if (productoId) {
      where.productoId = parseInt(productoId);
    }
    if (desde) {
      where.createdAt = { ...where.createdAt, gte: new Date(desde) };
    }
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setDate(hastaDate.getDate() + 1);
      where.createdAt = { ...where.createdAt, lt: hastaDate };
    }

    const movimientos = await prisma.stockMovimiento.findMany({
      where,
      include: {
        producto: { select: { sku: true, nombre: true } },
        vendedor: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(movimientos);
  } catch {
    return NextResponse.json({ error: "Error al obtener movimientos" }, { status: 500 });
  }
}