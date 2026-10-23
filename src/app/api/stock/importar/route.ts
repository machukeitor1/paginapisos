import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";
import { previsualizarImportacion, type FilaEntrada } from "@/lib/stock-import";

const CARGA_INICIAL = "CARGA-INICIAL";

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    if (!actor || actor.tipo !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const accion = body.accion === "confirmar" ? "confirmar" : "preview";
    const filas: FilaEntrada[] = Array.isArray(body.filas) ? body.filas : [];

    if (filas.length === 0) {
      return NextResponse.json({ error: "No se recibieron filas para importar" }, { status: 400 });
    }

    if (accion === "preview") {
      const preview = await previsualizarImportacion(filas);
      const yaImportado = await prisma.ingresoFactura.findFirst({
        where: { numeroFactura: CARGA_INICIAL },
        select: { id: true, createdAt: true },
      });
      return NextResponse.json({ ...preview, yaImportado });
    }

    const yaImportado = await prisma.ingresoFactura.findFirst({ where: { numeroFactura: CARGA_INICIAL } });
    if (yaImportado) {
      return NextResponse.json(
        { error: "La carga inicial ya fue registrada. No es posible repetirla." },
        { status: 400 }
      );
    }

    const porProducto = new Map<number, { cantidad: number; fila: number }>();
    const filasResueltas: { productoId: number; cantidad: number }[] = [];

    for (const fila of filas) {
      const productoId = parseInt(String((fila as any).productoId));
      const cantidad = Number(fila.cantidad);
      if (!Number.isFinite(productoId) || !Number.isFinite(cantidad)) {
        return NextResponse.json({ error: "Hay filas con producto o cantidad inválida" }, { status: 400 });
      }
      if (porProducto.has(productoId)) {
        return NextResponse.json(
          { error: `El producto id ${productoId} aparece más de una vez en el archivo` },
          { status: 400 }
        );
      }
      porProducto.set(productoId, { cantidad, fila: fila.fila ?? 0 });
      filasResueltas.push({ productoId, cantidad });
    }

    const ids = filasResueltas.map((f) => f.productoId);
    const productos = await prisma.producto.findMany({ where: { id: { in: ids } } });
    if (productos.length !== ids.length) {
      return NextResponse.json({ error: "Alguno de los productos no existe" }, { status: 400 });
    }

    const archivo = body.archivo ? String(body.archivo) : null;

    const factura = await prisma.$transaction(async (tx) => {
      const ingreso = await tx.ingresoFactura.create({
        data: {
          numeroFactura: CARGA_INICIAL,
          fecha: new Date(),
          proveedor: "Carga inicial de inventario",
          notas: archivo ? `Archivo: ${archivo}` : null,
          usuarioTipo: actor.tipo,
          usuarioId: actor.id,
          usuarioNombre: actor.nombre,
        },
      });

      for (const fila of filasResueltas) {        await tx.stockMovimiento.create({
          data: {
            productoId: fila.productoId,
            tipo: "carga_inicial",
            cantidad: fila.cantidad,
            saldoTras: fila.cantidad,
            motivo: "Carga inicial de inventario",
            ingresoId: ingreso.id,
            usuarioTipo: actor.tipo,
            usuarioId: actor.id,
            usuarioNombre: actor.nombre,
          },
        });
        await tx.producto.update({
          where: { id: fila.productoId },
          data: { stock: fila.cantidad },
        });
      }

      await tx.producto.updateMany({
        where: { id: { notIn: ids }, movimientos: { none: {} } },
        data: { stock: 0 },
      });

      return ingreso;
    });

    return NextResponse.json({ success: true, ingresoId: factura.id, filas: filasResueltas.length }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al importar stock" }, { status: 500 });
  }
}
