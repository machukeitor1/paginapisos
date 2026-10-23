import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";

export async function GET(request: Request) {
  try {
    const actor = await getActor();
    if (!actor || actor.tipo !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1") || 1);
    const porPagina = Math.min(100, Math.max(1, parseInt(searchParams.get("porPagina") || "20") || 20));

    const where: any = {};
    if (q) {
      where.OR = [
        { numeroFactura: { contains: q, mode: "insensitive" } },
        { proveedor: { contains: q, mode: "insensitive" } },
        { notas: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, ingresos] = await Promise.all([
      prisma.ingresoFactura.count({ where }),
      prisma.ingresoFactura.findMany({
        where,
        include: {
          movimientos: {
            include: { producto: { select: { sku: true, nombre: true } } },
            orderBy: { productoId: "asc" },
          },
        },
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    return NextResponse.json({
      items: ingresos,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener ingresos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    if (!actor || actor.tipo !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const numeroFactura = String(body.numeroFactura || "").trim();
    const fecha = body.fecha ? new Date(body.fecha) : new Date();
    const proveedor = body.proveedor ? String(body.proveedor).trim() : null;
    const notas = body.notas ? String(body.notas).trim() : null;
    const items = Array.isArray(body.items) ? body.items : [];

    if (!numeroFactura) {
      return NextResponse.json({ error: "Número de factura requerido" }, { status: 400 });
    }
    if (Number.isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "Debe agregar al menos un producto" }, { status: 400 });
    }

    const porProducto = new Map<number, number>();
    for (const item of items) {
      const productoId = parseInt(item.productoId);
      const cantidad = Number(item.cantidad);
      if (!Number.isFinite(productoId) || !Number.isFinite(cantidad) || cantidad <= 0) {
        return NextResponse.json({ error: "Hay líneas con producto o cantidad inválida" }, { status: 400 });
      }
      porProducto.set(productoId, (porProducto.get(productoId) || 0) + cantidad);
    }

    const existente = await prisma.ingresoFactura.findFirst({ where: { numeroFactura } });
    if (existente) {
      return NextResponse.json({ error: `La factura ${numeroFactura} ya fue registrada` }, { status: 400 });
    }

    const ids = Array.from(porProducto.keys());
    const productos = await prisma.producto.findMany({ where: { id: { in: ids } } });
    if (productos.length !== ids.length) {
      return NextResponse.json({ error: "Alguno de los productos no existe" }, { status: 400 });
    }

    const ingreso = await prisma.$transaction(async (tx) => {
      const factura = await tx.ingresoFactura.create({
        data: {
          numeroFactura,
          fecha,
          proveedor,
          notas,
          usuarioTipo: actor.tipo,
          usuarioId: actor.id,
          usuarioNombre: actor.nombre,
        },
      });

      for (const producto of productos) {
        const cantidad = porProducto.get(producto.id) || 0;
        const nuevoStock = producto.stock + cantidad;
        await tx.stockMovimiento.create({
          data: {
            productoId: producto.id,
            tipo: "entrada",
            cantidad,
            saldoTras: nuevoStock,
            motivo: `Factura ${numeroFactura}`,
            ingresoId: factura.id,
            usuarioTipo: actor.tipo,
            usuarioId: actor.id,
            usuarioNombre: actor.nombre,
          },
        });
        await tx.producto.update({
          where: { id: producto.id },
          data: { stock: nuevoStock },
        });
      }

      return factura;
    });

    return NextResponse.json(ingreso, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al registrar ingreso" }, { status: 500 });
  }
}
