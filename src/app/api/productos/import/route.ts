import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productos } = body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json({ error: "Se requiere un array de productos" }, { status: 400 });
    }

    let insertados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (const prod of productos) {
      try {
        if (prod.sku) {
          // Upsert por SKU
          const existing = await prisma.producto.findUnique({ where: { sku: prod.sku } });
          if (existing) {
            await prisma.producto.update({
              where: { id: existing.id },
              data: {
                nombre: prod.nombre || existing.nombre,
                slug: prod.slug || existing.slug,
                descripcion: prod.descripcion ?? existing.descripcion,
                dimensiones: prod.dimensiones ?? existing.dimensiones,
                unidad: prod.unidad || existing.unidad,
                precio: prod.precio ?? existing.precio,
                descuento: prod.descuento ?? existing.descuento,
                marca: prod.marca || "",
                imagenes: prod.imagenes ? JSON.stringify(prod.imagenes) : existing.imagenes,
                destacado: prod.destacado ?? existing.destacado,
                activo: prod.activo ?? existing.activo,
                categoriaId: prod.categoriaId || existing.categoriaId,
              },
            });
            actualizados++;
          } else {
            await prisma.producto.create({
              data: {
                nombre: prod.nombre,
                slug: prod.slug,
                sku: prod.sku,
                descripcion: prod.descripcion || "",
                dimensiones: prod.dimensiones || null,
                unidad: prod.unidad || "m2",
                precio: prod.precio || 0,
                descuento: prod.descuento || null,
                marca: prod.marca || "",
                imagenes: JSON.stringify(prod.imagenes || []),
                destacado: prod.destacado || false,
                activo: prod.activo !== false,
                orden: prod.orden || 0,
                categoriaId: prod.categoriaId,
              },
            });
            insertados++;
          }
        } else {
          errores.push(`SKU faltante para: ${prod.nombre}`);
        }
      } catch (e: any) {
        errores.push(`${prod.sku || prod.nombre}: ${e.message}`);
      }
    }

    return NextResponse.json({ insertados, actualizados, errores });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error en importacion" }, { status: 500 });
  }
}