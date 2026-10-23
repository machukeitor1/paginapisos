import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PERIODO_LABEL, archivoPeriodoSufijo, fechaChile, rangoPeriodo } from "@/lib/periodos";

const TIPO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  egreso: "Egreso",
  ajuste: "Ajuste",
  venta: "Venta",
  devolucion: "Devolución",
  carga_inicial: "Carga inicial",
};

const LEGACY: Record<string, string> = {
  semanal: "semana_actual",
  mensual: "mes_actual",
  diario: "diario",
};

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const periodoRaw = searchParams.get("periodo") || "diario";
    const periodo = LEGACY[periodoRaw] || periodoRaw;
    const { desde, hasta } = rangoPeriodo(periodo, searchParams.get("desde"), searchParams.get("hasta"));

    const [movimientos, productos, ventas] = await Promise.all([
      prisma.stockMovimiento.findMany({
        where: { createdAt: { gte: desde, lt: hasta } },
        include: {
          producto: { select: { sku: true, nombre: true } },
          vendedor: { select: { nombre: true } },
          ingreso: { select: { numeroFactura: true } },
          cotizacion: { select: { numero: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.producto.findMany({
        where: { activo: true },
        include: { categoria: { select: { nombre: true } } },
        orderBy: { sku: "asc" },
      }),
      prisma.cotizacion.findMany({
        where: { estado: "VENDIDO", fechaVenta: { gte: desde, lt: hasta } },
        include: {
          cliente: { select: { nombre: true } },
          vendedor: { select: { nombre: true } },
          items: { select: { cantidad: true, importe: true } },
        },
        orderBy: { fechaVenta: "desc" },
      }),
    ]);

    const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
    const unidadesVendidas = ventas.reduce(
      (sum, v) => sum + v.items.reduce((s, i) => s + i.cantidad, 0),
      0
    );
    const faltanteUnidades = movimientos.reduce((sum, m) => sum + (m.faltante || 0), 0);
    const stockUnidades = productos.reduce((sum, p) => sum + p.stock, 0);
    const stockValor = productos.reduce((sum, p) => sum + p.stock * p.precio, 0);

    const filasResumen = [
      { Indicador: "Período", Valor: PERIODO_LABEL[periodo] || periodo },
      { Indicador: "Desde", Valor: fechaChile(desde) },
      { Indicador: "Hasta", Valor: fechaChile(new Date(hasta.getTime() - 86400000)) },
      { Indicador: "Ventas (cantidad)", Valor: ventas.length },
      { Indicador: "Ventas (total $)", Valor: totalVentas },
      { Indicador: "Unidades vendidas", Valor: unidadesVendidas },
      { Indicador: "Unidades con faltante", Valor: faltanteUnidades },
      { Indicador: "Productos activos", Valor: productos.length },
      { Indicador: "Unidades en stock", Valor: stockUnidades },
      { Indicador: "Valor stock $", Valor: stockValor },
      { Indicador: "Productos bajo mínimo", Valor: productos.filter((p) => p.stock > 0 && p.stock <= p.stockMinimo).length },
      { Indicador: "Productos sin stock", Valor: productos.filter((p) => p.stock <= 0).length },
    ];

    const filasMovimientos = movimientos.map((m) => ({
      Fecha: fechaChile(m.createdAt),
      Hora: m.createdAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }),
      Producto: m.producto.nombre,
      SKU: m.producto.sku,
      Tipo: TIPO_LABEL[m.tipo] || m.tipo,
      Cantidad: m.tipo === "egreso" || m.tipo === "venta" ? -m.cantidad : m.cantidad,
      "Saldo tras": m.saldoTras,
      Faltante: m.faltante || "",
      Factura: m.ingreso?.numeroFactura || "",
      Cotización: m.cotizacion?.numero || "",
      Usuario: m.usuarioNombre || m.vendedor?.nombre || "-",
      Importe: m.importe || "",
      Motivo: m.motivo || "",
    }));

    const filasStock = productos.map((p) => ({
      SKU: p.sku,
      Producto: p.nombre,
      Categoría: p.categoria.nombre,
      Unidad: p.unidadVenta,
      Stock: p.stock,
      "Stock mínimo": p.stockMinimo,
      "Valor stock $": p.stock * p.precio,
      Estado: p.stock < 0 ? "Negativo" : p.stock <= 0 ? "Sin stock" : p.stock <= p.stockMinimo ? "Stock bajo" : "OK",
    }));

    const filasVentas = ventas.map((v) => ({
      Fecha: v.fechaVenta ? fechaChile(v.fechaVenta) : "",
      "N° Cotización": v.numero,
      Cliente: v.cliente.nombre,
      Vendedor: v.vendedor.nombre,
      "N° ítems": v.items.length,
      Unidades: v.items.reduce((s, i) => s + i.cantidad, 0),
      Subtotal: v.subtotal,
      Total: v.total,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasResumen), "Resumen");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasMovimientos), "Movimientos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasStock), "Stock actual");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasVentas), "Ventas");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const nombreArchivo = `reporte_${periodo}_${archivoPeriodoSufijo(desde, hasta)}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al exportar stock" }, { status: 500 });
  }
}
