import { prisma } from "./prisma";

export type FilaEntrada = {
  fila?: number;
  sku: string;
  nombre?: string;
  cantidad: number | string;
};

export type EstadoFila = "ok" | "ambiguo" | "no_encontrado" | "duplicado" | "invalido";

export type ProductoBasico = {
  id: number;
  sku: string;
  nombre: string;
  unidadVenta: string;
  stock: number;
  activo: boolean;
};

export type FilaPrevisualizada = {
  fila: number;
  skuOriginal: string;
  nombreExcel: string | null;
  cantidad: number | null;
  estado: EstadoFila;
  productoId: number | null;
  productoSku: string | null;
  productoNombre: string | null;
  stockActual: number | null;
  candidatos: ProductoBasico[];
};

export function normalizarSku(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9.-]/g, "");
}

export function normalizarNombre(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function previsualizarImportacion(filas: FilaEntrada[]) {
  const productos = await prisma.producto.findMany({
    select: { id: true, sku: true, nombre: true, unidadVenta: true, stock: true, activo: true },
    orderBy: { sku: "asc" },
  });

  const porSku = new Map<string, ProductoBasico>();
  const porNombre = new Map<string, ProductoBasico>();
  for (const p of productos) {
    porSku.set(normalizarSku(p.sku), p);
    const nombreNorm = normalizarNombre(p.nombre);
    if (!porNombre.has(nombreNorm)) porNombre.set(nombreNorm, p);
  }

  const usados = new Map<number, number>();
  const resultados: FilaPrevisualizada[] = filas.map((f, idx) => {
    const fila = f.fila ?? idx + 1;
    const skuOriginal = String(f.sku ?? "").trim();
    const nombreExcel = f.nombre ? String(f.nombre).trim() : null;
    const cantidadNum = typeof f.cantidad === "number" ? f.cantidad : Number(String(f.cantidad ?? "").replace(",", "."));
    const skuNorm = normalizarSku(skuOriginal);
    const nombreNorm = normalizarNombre(nombreExcel);

    const base = {
      fila,
      skuOriginal,
      nombreExcel,
      cantidad: Number.isFinite(cantidadNum) ? cantidadNum : null,
      candidatos: [] as ProductoBasico[],
    };

    if (!Number.isFinite(cantidadNum)) {
      return { ...base, estado: "invalido" as EstadoFila, productoId: null, productoSku: null, productoNombre: null, stockActual: null };
    }

    let match: ProductoBasico | undefined;
    if (skuNorm) match = porSku.get(skuNorm);
    if (!match && nombreNorm) match = porNombre.get(nombreNorm);

    let candidatos: ProductoBasico[] = [];
    if (!match && (skuNorm.length >= 3 || nombreNorm.length >= 5)) {
      candidatos = productos
        .filter((p) => {
          const pSku = normalizarSku(p.sku);
          const pNombre = normalizarNombre(p.nombre);
          return (
            (skuNorm.length >= 3 && (pSku.includes(skuNorm) || skuNorm.includes(pSku))) ||
            (nombreNorm.length >= 5 && (pNombre.includes(nombreNorm) || nombreNorm.includes(pNombre)))
          );
        })
        .slice(0, 6);
    }

    if (match) {
      const filaPrevia = usados.get(match.id);
      if (filaPrevia) {
        return {
          ...base,
          estado: "duplicado",
          productoId: match.id,
          productoSku: match.sku,
          productoNombre: match.nombre,
          stockActual: match.stock,
          candidatos: [],
        };
      }
      usados.set(match.id, fila);
      return {
        ...base,
        estado: "ok",
        productoId: match.id,
        productoSku: match.sku,
        productoNombre: match.nombre,
        stockActual: match.stock,
        candidatos: [],
      };
    }

    if (candidatos.length > 0) {
      return {
        ...base,
        estado: "ambiguo",
        productoId: candidatos.length === 1 ? candidatos[0].id : null,
        productoSku: candidatos.length === 1 ? candidatos[0].sku : null,
        productoNombre: candidatos.length === 1 ? candidatos[0].nombre : null,
        stockActual: candidatos.length === 1 ? candidatos[0].stock : null,
        candidatos,
      };
    }

    return {
      ...base,
      estado: "no_encontrado",
      productoId: null,
      productoSku: null,
      productoNombre: null,
      stockActual: null,
      candidatos: [],
    };
  });

  const resumen = {
    total: resultados.length,
    ok: resultados.filter((r) => r.estado === "ok").length,
    ambiguos: resultados.filter((r) => r.estado === "ambiguo").length,
    noEncontrados: resultados.filter((r) => r.estado === "no_encontrado").length,
    duplicados: resultados.filter((r) => r.estado === "duplicado").length,
    invalidos: resultados.filter((r) => r.estado === "invalido").length,
    conStockNegativo: resultados.filter((r) => (r.cantidad ?? 0) < 0).length,
  };

  return { resumen, filas: resultados, productos };
}
