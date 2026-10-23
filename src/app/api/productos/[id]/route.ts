import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CAMPOS_PERMITIDOS = [
  "nombre",
  "slug",
  "sku",
  "descripcion",
  "dimensiones",
  "unidad",
  "precio",
  "descuento",
  "marca",
  "imagenes",
  "estado",
  "destacado",
  "activo",
  "orden",
  "categoriaId",
  "rendimiento",
  "unidadVenta",
  "precioUnitario",
  "medidas",
  "presentacion",
  "rendimientoTexto",
  "accesorios",
  "esAccesorio",
  "displayLabel",
  "stock",
  "stockMinimo",
] as const;

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const id = parseInt(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const data = await request.json();
    const payload: Record<string, unknown> = {};
    for (const campo of CAMPOS_PERMITIDOS) {
      if (Object.prototype.hasOwnProperty.call(data, campo)) payload[campo] = data[campo];
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const antes = await prisma.producto.findUnique({ where: { id } });
    if (!antes) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const stockNuevo = payload.stock !== undefined ? Number(payload.stock) : undefined;
    if (stockNuevo !== undefined && !Number.isFinite(stockNuevo)) {
      return NextResponse.json({ error: "Stock inválido" }, { status: 400 });
    }

    if (stockNuevo !== undefined && stockNuevo !== antes.stock) {
      const [producto] = await prisma.$transaction([
        prisma.producto.update({ where: { id }, data: payload }),
        prisma.stockMovimiento.create({
          data: {
            productoId: id,
            tipo: "ajuste",
            cantidad: stockNuevo,
            saldoTras: stockNuevo,
            motivo: "Ajuste por edición de producto",
            usuarioTipo: "admin",
            usuarioNombre: session.email,
          },
        }),
      ]);
      return NextResponse.json(producto);
    }

    const producto = await prisma.producto.update({ where: { id }, data: payload });
    return NextResponse.json(producto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await prisma.producto.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar" }, { status: 500 });
  }
}
