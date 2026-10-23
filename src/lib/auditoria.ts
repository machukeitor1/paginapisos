import type { Prisma } from "@prisma/client";
import { rangoPeriodo } from "./periodos";

export function whereAuditoria(searchParams: URLSearchParams): Prisma.CotizacionEventoWhereInput {
  const where: Prisma.CotizacionEventoWhereInput = {};

  const periodo = searchParams.get("periodo");
  if (periodo && periodo !== "todo") {
    const { desde, hasta } = rangoPeriodo(periodo, searchParams.get("desde"), searchParams.get("hasta"));
    where.createdAt = { gte: desde, lt: hasta };
  }

  const usuarioTipo = searchParams.get("usuarioTipo");
  if (usuarioTipo && usuarioTipo !== "todos") where.usuarioTipo = usuarioTipo;

  const estadoNuevo = searchParams.get("estadoNuevo");
  if (estadoNuevo && estadoNuevo !== "todos") where.estadoNuevo = estadoNuevo;

  const q = (searchParams.get("q") || "").trim();
  if (q) {
    where.OR = [
      { usuarioNombre: { contains: q, mode: "insensitive" } },
      { motivo: { contains: q, mode: "insensitive" } },
      { cotizacion: { numero: { contains: q, mode: "insensitive" } } },
      { cotizacion: { cliente: { nombre: { contains: q, mode: "insensitive" } } } },
    ];
  }

  return where;
}

export const EVENTO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  VENDIDO: "Vendido",
  PERDIDO: "Perdido",
};

export const TIPO_USUARIO_LABEL: Record<string, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
};
