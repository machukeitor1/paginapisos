import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendedorSession } from "@/lib/auth-vendedor";
import { getSession } from "@/lib/auth";

async function aplicarMovimientoStock(
  items: { productoId: number | null; cantidad: number; importe: number }[],
  tipo: "venta" | "devolucion",
  cotizacionId: number,
  vendedorId: number | null
) {
  const porProducto = new Map<number, { cantidad: number; importe: number }>();
  for (const item of items) {
    if (!item.productoId) continue;
    const prev = porProducto.get(item.productoId) || { cantidad: 0, importe: 0 };
    prev.cantidad += item.cantidad;
    prev.importe += item.importe;
    porProducto.set(item.productoId, prev);
  }

  const ids = Array.from(porProducto.keys());
  if (ids.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const productos = await tx.producto.findMany({ where: { id: { in: ids } } });
    const porId = new Map(productos.map((p) => [p.id, p]));

    if (tipo === "venta") {
      for (const [productoId, agg] of porProducto) {
        const prod = porId.get(productoId);
        if (!prod) continue;
        if (prod.stock < agg.cantidad) {
          throw new Error(
            `Stock insuficiente para ${prod.sku}: quedan ${prod.stock} y se requieren ${agg.cantidad}`
          );
        }
      }
    }

    for (const [productoId, agg] of porProducto) {
      const prod = porId.get(productoId);
      if (!prod) continue;
      const nuevoStock = tipo === "venta" ? prod.stock - agg.cantidad : prod.stock + agg.cantidad;
      await tx.stockMovimiento.create({
        data: {
          productoId,
          tipo,
          cantidad: agg.cantidad,
          saldoTras: nuevoStock,
          cotizacionId,
          vendedorId,
          importe: tipo === "venta" ? agg.importe : null,
        },
      });
      await tx.producto.update({
        where: { id: productoId },
        data: { stock: nuevoStock },
      });
    }
  });
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        cliente: true,
        vendedor: { select: { id: true, nombre: true } },
        items: { include: { producto: { select: { stock: true, stockMinimo: true } } } },
      },
    });
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }
    return NextResponse.json(cotizacion);
  } catch {
    return NextResponse.json({ error: "Error al obtener cotización" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const vendedorSession = await getVendedorSession();
    const adminSession = await getSession();
    if (!vendedorSession && !adminSession) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const id = parseInt(params.id);
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    if (vendedorSession && !adminSession && cotizacion.vendedorId !== vendedorSession.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (cotizacion.estado === "VENDIDO") {
      await aplicarMovimientoStock(
        cotizacion.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, importe: i.importe })),
        "devolucion",
        id,
        vendedorSession?.id ?? null
      );
    }

    await prisma.cotizacion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar cotización" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const vendedorSession = await getVendedorSession();
    const adminSession = await getSession();
    if (!vendedorSession && !adminSession) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const id = parseInt(params.id);
    const existing = await prisma.cotizacion.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    if (vendedorSession && !adminSession && existing.vendedorId !== vendedorSession.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = await request.json();
    const { cliente, items, notas, estado } = data;

    // Estado update: maneja descuento/restitución de stock
    if (estado && !cliente && !items) {
      if (!["PENDIENTE", "VENDIDO", "PERDIDO"].includes(estado)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
      }

      const antes = existing.estado;
      const vendedorId = vendedorSession?.id ?? null;

      if (antes === "PENDIENTE" && estado === "VENDIDO") {
        try {
          await aplicarMovimientoStock(
            existing.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, importe: i.importe })),
            "venta",
            id,
            vendedorId
          );
        } catch (error: any) {
          if (error?.message?.startsWith("Stock insuficiente")) {
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }
      } else if (antes === "VENDIDO" && estado === "PENDIENTE") {
        await aplicarMovimientoStock(
          existing.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, importe: i.importe })),
          "devolucion",
          id,
          vendedorId
        );
      }

      const cotizacion = await prisma.cotizacion.update({
        where: { id },
        data: { estado },
        include: { cliente: true, vendedor: { select: { nombre: true } }, items: true },
      });
      return NextResponse.json(cotizacion);
    }

    if (!cliente?.nombre) {
      return NextResponse.json({ error: "Nombre del cliente requerido" }, { status: 400 });
    }
    if (!items?.length) {
      return NextResponse.json({ error: "Debe agregar al menos un producto" }, { status: 400 });
    }

    let clienteDb;
    if (cliente.rut) {
      const existing = await prisma.cliente.findFirst({ where: { rut: cliente.rut } });
      if (existing) {
        clienteDb = await prisma.cliente.update({
          where: { id: existing.id },
          data: {
            nombre: cliente.nombre,
            direccion: cliente.direccion || null,
            comuna: cliente.comuna || null,
            telefono: cliente.telefono || null,
            email: cliente.email || null,
          },
        });
      } else {
        clienteDb = await prisma.cliente.create({
          data: {
            nombre: cliente.nombre,
            rut: cliente.rut,
            direccion: cliente.direccion || null,
            comuna: cliente.comuna || null,
            telefono: cliente.telefono || null,
            email: cliente.email || null,
          },
        });
      }
    } else {
      clienteDb = await prisma.cliente.create({
        data: {
          nombre: cliente.nombre,
          direccion: cliente.direccion || null,
          comuna: cliente.comuna || null,
          telefono: cliente.telefono || null,
          email: cliente.email || null,
        },
      });
    }

    const itemsData = items.map((item: any) => ({
      productoId: item.productoId || null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      rendimiento: item.rendimiento || 1,
      unidadVenta: item.unidadVenta || 'un',
      modo: item.modo || 'unidad',
      precioUnitario: item.precioUnitario,
      descuentoPorc: item.descuentoPorc || 0,
      importe: item.importe,
      proyectoM2: item.proyectoM2 || null,
    }));

    const subtotal = itemsData.reduce((sum: number, i: any) => sum + i.importe, 0);
    const neto = Math.round(subtotal / 1.19);
    const iva = subtotal - neto;
    const total = subtotal;

    await prisma.cotizacionItem.deleteMany({ where: { cotizacionId: id } });

    const cotizacion = await prisma.cotizacion.update({
      where: { id },
      data: {
        subtotal,
        iva,
        total,
        notas: notas || null,
        clienteId: clienteDb.id,
        items: { create: itemsData },
      },
      include: {
        cliente: true,
        vendedor: { select: { nombre: true } },
        items: true,
      },
    });

    return NextResponse.json(cotizacion);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar cotización" }, { status: 500 });
  }
}