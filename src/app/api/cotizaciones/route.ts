import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendedorSession } from "@/lib/auth-vendedor";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const vendedorSession = await getVendedorSession();
    const adminSession = await getSession();
    if (!vendedorSession && !adminSession) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get("vendedorId");
    const q = searchParams.get("q");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const estado = searchParams.get("estado");

    const where: any = {};
    if (vendedorId) {
      where.vendedorId = parseInt(vendedorId);
    } else if (vendedorSession && !adminSession) {
      where.vendedorId = vendedorSession.id;
    }

    if (estado) {
      where.estado = estado;
    }

    if (q) {
      where.cliente = {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { rut: { contains: q } },
        ],
      };
    }

    if (desde) {
      where.createdAt = { ...where.createdAt, gte: new Date(desde) };
    }
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setDate(hastaDate.getDate() + 1);
      where.createdAt = { ...where.createdAt, lt: hastaDate };
    }

    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      include: {
        cliente: { select: { nombre: true, rut: true } },
        vendedor: { select: { nombre: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(cotizaciones);
  } catch {
    return NextResponse.json({ error: "Error al obtener cotizaciones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getVendedorSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const data = await request.json();
    const { cliente, items, notas } = data;

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

    const lastCot = await prisma.cotizacion.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const nextNum = lastCot ? lastCot.id + 1 : 1;
    const numero = `COT-${String(nextNum).padStart(4, "0")}`;

    const now = new Date();
    const vencimiento = new Date(now);
    vencimiento.setDate(vencimiento.getDate() + 3);

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

    const cotizacion = await prisma.cotizacion.create({
      data: {
        numero,
        estado: "PENDIENTE",
        vencimiento,
        subtotal,
        iva,
        total,
        notas: notas || null,
        clienteId: clienteDb.id,
        vendedorId: session.id,
        items: {
          create: itemsData,
        },
      },
      include: {
        cliente: true,
        vendedor: { select: { nombre: true } },
        items: true,
      },
    });

    return NextResponse.json(cotizacion, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear cotización" }, { status: 500 });
  }
}
