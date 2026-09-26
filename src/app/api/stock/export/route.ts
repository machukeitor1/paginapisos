import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const TIPO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  egreso: "Egreso",
  ajuste: "Ajuste",
  venta: "Venta",
  devolucion: "Devolución",
};

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "diario";

    const now = new Date();
    let desde: Date;
    if (periodo === "mensual") {
      desde = new Date(now);
      desde.setDate(desde.getDate() - 30);
    } else if (periodo === "semanal") {
      desde = new Date(now);
      desde.setDate(desde.getDate() - 7);
    } else {
      desde = new Date(now);
      desde.setHours(0, 0, 0, 0);
    }

    const [movimientos, productos] = await Promise.all([
      prisma.stockMovimiento.findMany({
        where: { createdAt: { gte: desde } },
        include: {
          producto: { select: { sku: true, nombre: true } },
          vendedor: { select: { nombre: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.producto.findMany({
        where: { activo: true },
        include: { categoria: { select: { nombre: true } } },
        orderBy: { sku: "asc" },
      }),
    ]);

    const filasMovimientos = movimientos.map((m) => ({
      Fecha: m.createdAt,
      Hora: m.createdAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
      Producto: m.producto.nombre,
      SKU: m.producto.sku,
      Tipo: TIPO_LABEL[m.tipo] || m.tipo,
      Cantidad: m.tipo === "egreso" || m.tipo === "venta" ? -m.cantidad : m.cantidad,
      "Saldo tras": m.saldoTras,
      "Vendedor": m.vendedor?.nombre || "-",
      "Importe": m.importe || "",
      Motivo: m.motivo || "",
    }));

    const filasStock = productos.map((p) => ({
      SKU: p.sku,
      Producto: p.nombre,
      Categoría: p.categoria.nombre,
      Stock: p.stock,
      "Stock mínimo": p.stockMinimo,
      Estado: p.stock <= 0 ? "Sin stock" : p.stock <= p.stockMinimo ? "Stock bajo" : "OK",
    }));

    const wb = XLSX.utils.book_new();
    const wsMov = XLSX.utils.json_to_sheet(filasMovimientos);
    const wsStock = XLSX.utils.json_to_sheet(filasStock);

    XLSX.utils.book_append_sheet(wb, wsMov, "Movimientos");
    XLSX.utils.book_append_sheet(wb, wsStock, "Stock actual");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const label = periodo === "mensual" ? "Mensual" : periodo === "semanal" ? "Semanal" : "Diario";
    const nombreArchivo = `stock_${label.toLowerCase()}_${now.toISOString().slice(0, 10)}.xlsx`;

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