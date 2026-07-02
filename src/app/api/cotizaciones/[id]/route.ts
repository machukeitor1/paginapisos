import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendedorSession } from "@/lib/auth-vendedor";
import { getSession } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        cliente: true,
        vendedor: { select: { id: true, nombre: true } },
        items: true,
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
    const cotizacion = await prisma.cotizacion.findUnique({ where: { id } });
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    if (vendedorSession && !adminSession && cotizacion.vendedorId !== vendedorSession.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.cotizacion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar cotización" }, { status: 500 });
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
    const existing = await prisma.cotizacion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    if (vendedorSession && !adminSession && existing.vendedorId !== vendedorSession.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    // Partial update: just change estado
    if (body.estado) {
      const updated = await prisma.cotizacion.update({
        where: { id },
        data: { estado: body.estado },
      });
      return NextResponse.json(updated);
    }

    const { cliente, items, notas } = body;

    if (!cliente?.rut || !cliente?.nombre) {
      return NextResponse.json({ error: "Datos del cliente requeridos" }, { status: 400 });
    }
    if (!items?.length) {
      return NextResponse.json({ error: "Debe agregar al menos un producto" }, { status: 400 });
    }

    const clienteDb = await prisma.cliente.upsert({
      where: { rut: cliente.rut },
      update: {
        nombre: cliente.nombre,
        direccion: cliente.direccion || null,
        comuna: cliente.comuna || null,
        telefono: cliente.telefono || null,
        email: cliente.email || null,
      },
      create: {
        nombre: cliente.nombre,
        rut: cliente.rut,
        direccion: cliente.direccion || null,
        comuna: cliente.comuna || null,
        telefono: cliente.telefono || null,
        email: cliente.email || null,
      },
    });

    const itemsData = items.map((item: any) => ({
      productoId: item.productoId || null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuentoPorc: item.descuentoPorc || 0,
      importe: item.importe,
      proyectoM2: item.proyectoM2 || null,
    }));

    const subtotal = itemsData.reduce((sum: number, i: any) => sum + i.importe, 0);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;

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
