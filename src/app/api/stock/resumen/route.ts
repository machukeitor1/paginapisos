import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";
import { PERIODO_LABEL, rangoPeriodo } from "@/lib/periodos";

export async function GET(request: Request) {
  try {
    const actor = await getActor();
    if (!actor || actor.tipo !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "mes_actual";
    const { desde, hasta } = rangoPeriodo(periodo, searchParams.get("desde"), searchParams.get("hasta"));

    const [productos, ventas, movimientos] = await Promise.all([
      prisma.producto.findMany({
        where: { activo: true },
        select: { id: true, sku: true, nombre: true, stock: true, stockMinimo: true, precio: true, unidadVenta: true },
      }),
      prisma.cotizacion.findMany({
        where: { estado: "VENDIDO", fechaVenta: { gte: desde, lt: hasta } },
        include: {
          items: { select: { productoId: true, descripcion: true, cantidad: true, importe: true } },
          vendedor: { select: { nombre: true } },
        },
      }),
      prisma.stockMovimiento.findMany({
        where: { createdAt: { gte: desde, lt: hasta } },
        select: { tipo: true, cantidad: true, faltante: true },
      }),
    ]);

    const stock = {
      productos: productos.length,
      unidades: productos.reduce((sum, p) => sum + p.stock, 0),
      valor: productos.reduce((sum, p) => sum + p.stock * p.precio, 0),
      bajos: productos.filter((p) => p.stock > 0 && p.stock <= p.stockMinimo).length,
      sinStock: productos.filter((p) => p.stock <= 0).length,
      negativos: productos.filter((p) => p.stock < 0).length,
    };

    const ventasResumen = {
      cantidad: ventas.length,
      total: ventas.reduce((sum, c) => sum + c.total, 0),
      unidades: ventas.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.cantidad, 0), 0),
      ticketPromedio: ventas.length > 0 ? ventas.reduce((sum, c) => sum + c.total, 0) / ventas.length : 0,
    };

    const topMap = new Map<string, { descripcion: string; sku: string; cantidad: number; importe: number }>();
    const vendedorMap = new Map<string, { nombre: string; cantidad: number; total: number }>();

    for (const venta of ventas) {
      const v = vendedorMap.get(venta.vendedor.nombre) || { nombre: venta.vendedor.nombre, cantidad: 0, total: 0 };
      v.cantidad += 1;
      v.total += venta.total;
      vendedorMap.set(v.nombre, v);

      for (const item of venta.items) {
        const key = item.productoId ? `p${item.productoId}` : `d${item.descripcion}`;
        const actual = topMap.get(key) || {
          descripcion: item.descripcion,
          sku: "",
          cantidad: 0,
          importe: 0,
        };
        actual.cantidad += item.cantidad;
        actual.importe += item.importe;
        topMap.set(key, actual);
      }
    }

    const idsTop = Array.from(topMap.keys())
      .filter((k) => k.startsWith("p"))
      .map((k) => parseInt(k.slice(1)));
    if (idsTop.length > 0) {
      const prods = await prisma.producto.findMany({
        where: { id: { in: idsTop } },
        select: { id: true, sku: true },
      });
      const skuPorId = new Map(prods.map((p) => [p.id, p.sku]));
      for (const [key, value] of topMap) {
        if (key.startsWith("p")) value.sku = skuPorId.get(parseInt(key.slice(1))) || "";
      }
    }

    const tipos: Record<string, number> = {};
    let faltanteUnidades = 0;
    for (const mov of movimientos) {
      tipos[mov.tipo] = (tipos[mov.tipo] || 0) + 1;
      if (mov.faltante) faltanteUnidades += mov.faltante;
    }

    return NextResponse.json({
      periodo,
      label: PERIODO_LABEL[periodo] || periodo,
      desde,
      hasta,
      stock,
      ventas: ventasResumen,
      faltantes: { unidades: faltanteUnidades, movimientos: movimientos.filter((m) => (m.faltante || 0) > 0).length },
      movimientosPorTipo: tipos,
      topProductos: Array.from(topMap.values())
        .sort((a, b) => b.importe - a.importe)
        .slice(0, 10),
      porVendedor: Array.from(vendedorMap.values()).sort((a, b) => b.total - a.total),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al generar resumen" }, { status: 500 });
  }
}
