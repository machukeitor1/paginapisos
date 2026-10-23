import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, type Actor } from "@/lib/actor";

type ItemLike = { productoId: number | null; cantidad: number; importe: number };

function agregarPorProducto(items: ItemLike[]) {
  const porProducto = new Map<number, { cantidad: number; importe: number }>();
  for (const item of items) {
    if (!item.productoId) continue;
    const prev = porProducto.get(item.productoId) || { cantidad: 0, importe: 0 };
    prev.cantidad += item.cantidad;
    prev.importe += item.importe;
    porProducto.set(item.productoId, prev);
  }
  return porProducto;
}

function actorFields(actor: Actor) {
  return {
    usuarioTipo: actor.tipo,
    usuarioId: actor.id,
    usuarioNombre: actor.nombre,
  };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        cliente: true,
        vendedor: { select: { id: true, nombre: true } },
        items: { include: { producto: { select: { stock: true, stockMinimo: true } } } },
        eventos: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }
    if (actor.tipo === "vendedor" && cotizacion.vendedorId !== actor.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json(cotizacion);
  } catch {
    return NextResponse.json({ error: "Error al obtener cotización" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const id = parseInt(params.id);
    const cotizacion = await prisma.cotizacion.findUnique({ where: { id } });
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    if (actor.tipo === "vendedor" && cotizacion.vendedorId !== actor.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (cotizacion.estado !== "PENDIENTE") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar cotizaciones en estado PENDIENTE" },
        { status: 400 }
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
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const id = parseInt(params.id);
    const existing = await prisma.cotizacion.findUnique({
      where: { id },
      include: { items: true, vendedor: { select: { nombre: true } }, cliente: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }
    if (actor.tipo === "vendedor" && existing.vendedorId !== actor.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = await request.json();
    const { cliente, items, notas, estado, motivo, confirmarFaltante } = data;

    if (estado && !cliente && !items) {
      if (!["PENDIENTE", "VENDIDO", "PERDIDO"].includes(estado)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const actual = await tx.cotizacion.findUnique({
          where: { id },
          include: { items: true, eventos: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
        if (!actual) return { status: 404, body: { error: "Cotización no encontrada" } };

        const antes = actual.estado;
        if (antes === estado) {
          return { status: 400, body: { error: `La cotización ya está en estado ${estado}` } };
        }
        if ((antes === "VENDIDO" && estado === "PERDIDO") || (antes === "PERDIDO" && estado === "VENDIDO")) {
          return {
            status: 400,
            body: { error: "Primero reabre la cotización a PENDIENTE para cambiar su resultado" },
          };
        }

        const cerrada = antes === "VENDIDO" || antes === "PERDIDO";
        const motivoLimpio = motivo ? String(motivo).trim() : "";
        if (cerrada && motivoLimpio.length < 3) {
          return { status: 400, body: { error: "Debes indicar el motivo de la reapertura" } };
        }

        const porProducto = agregarPorProducto(
          actual.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, importe: i.importe }))
        );
        const ids = Array.from(porProducto.keys());
        const productos = ids.length
          ? await tx.producto.findMany({ where: { id: { in: ids } } })
          : [];
        const porId = new Map(productos.map((p) => [p.id, p]));

        if (antes === "PENDIENTE" && estado === "VENDIDO") {
          const faltantes = [] as {
            productoId: number;
            sku: string;
            nombre: string;
            requerido: number;
            disponible: number;
            faltante: number;
          }[];
          for (const [productoId, agg] of porProducto) {
            const prod = porId.get(productoId);
            if (!prod) continue;
            if (prod.stock < agg.cantidad) {
              faltantes.push({
                productoId,
                sku: prod.sku,
                nombre: prod.nombre,
                requerido: agg.cantidad,
                disponible: prod.stock,
                faltante: agg.cantidad - Math.max(prod.stock, 0),
              });
            }
          }

          if (faltantes.length > 0 && confirmarFaltante !== true) {
            return { status: 409, body: { requiereConfirmacion: true, faltantes } };
          }

          for (const [productoId, agg] of porProducto) {
            const prod = porId.get(productoId);
            if (!prod) continue;
            const nuevoStock = prod.stock - agg.cantidad;
            const faltante = Math.max(0, agg.cantidad - Math.max(prod.stock, 0));
            await tx.stockMovimiento.create({
              data: {
                productoId,
                tipo: "venta",
                cantidad: agg.cantidad,
                saldoTras: nuevoStock,
                faltante: faltante > 0 ? faltante : null,
                motivo: faltante > 0 ? "Venta con faltante de stock" : null,
                cotizacionId: id,
                vendedorId: actor.tipo === "vendedor" ? actor.id : null,
                importe: agg.importe,
                ...actorFields(actor),
              },
            });
            await tx.producto.update({ where: { id: productoId }, data: { stock: nuevoStock } });
          }
        }

        if (antes === "VENDIDO" && estado === "PENDIENTE") {
          for (const [productoId, agg] of porProducto) {
            const prod = porId.get(productoId);
            if (!prod) continue;
            const nuevoStock = prod.stock + agg.cantidad;
            await tx.stockMovimiento.create({
              data: {
                productoId,
                tipo: "devolucion",
                cantidad: agg.cantidad,
                saldoTras: nuevoStock,
                motivo: `Reapertura: ${motivoLimpio}`,
                cotizacionId: id,
                vendedorId: actor.tipo === "vendedor" ? actor.id : null,
                ...actorFields(actor),
              },
            });
            await tx.producto.update({ where: { id: productoId }, data: { stock: nuevoStock } });
          }
        }

        await tx.cotizacionEvento.create({
          data: {
            cotizacionId: id,
            estadoAnterior: antes,
            estadoNuevo: estado,
            motivo: motivoLimpio || null,
            ...actorFields(actor),
          },
        });

        const cotizacion = await tx.cotizacion.update({
          where: { id },
          data: {
            estado,
            fechaVenta: estado === "VENDIDO" ? new Date() : null,
          },
          include: {
            cliente: true,
            vendedor: { select: { nombre: true } },
            items: true,
            eventos: { orderBy: { createdAt: "asc" } },
          },
        });

        return { status: 200, body: cotizacion };
      });

      return NextResponse.json(resultado.body, { status: resultado.status });
    }

    if (existing.estado !== "PENDIENTE") {
      return NextResponse.json(
        { error: "Solo se pueden editar cotizaciones en estado PENDIENTE. Reábrela primero." },
        { status: 400 }
      );
    }

    if (!cliente?.nombre) {
      return NextResponse.json({ error: "Nombre del cliente requerido" }, { status: 400 });
    }
    if (!items?.length) {
      return NextResponse.json({ error: "Debe agregar al menos un producto" }, { status: 400 });
    }

    let clienteDb;
    if (cliente.rut) {
      const clienteExistente = await prisma.cliente.findFirst({ where: { rut: cliente.rut } });
      if (clienteExistente) {
        clienteDb = await prisma.cliente.update({
          where: { id: clienteExistente.id },
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
      unidadVenta: item.unidadVenta || "un",
      modo: item.modo || "unidad",
      precioUnitario: item.precioUnitario,
      descuentoPorc: item.descuentoPorc || 0,
      importe: item.importe,
      proyectoM2: item.proyectoM2 || null,
    }));

    const subtotal = itemsData.reduce((sum: number, i: any) => sum + i.importe, 0);
    const neto = Math.round(subtotal / 1.19);
    const iva = subtotal - neto;
    const total = subtotal;

    await prisma.$transaction([
      prisma.cotizacionItem.deleteMany({ where: { cotizacionId: id } }),
      prisma.cotizacion.update({
        where: { id },
        data: {
          subtotal,
          iva,
          total,
          notas: notas || null,
          clienteId: clienteDb.id,
          items: { create: itemsData },
        },
      }),
    ]);

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        vendedor: { select: { nombre: true } },
        items: true,
        eventos: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(cotizacion);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar cotización" }, { status: 500 });
  }
}
