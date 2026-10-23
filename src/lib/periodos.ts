const TZ = "America/Santiago";

export type PeriodoResumen =
  | "semana_actual"
  | "semana_anterior"
  | "mes_actual"
  | "mes_anterior"
  | "diario"
  | "rango";

export const PERIODOS: PeriodoResumen[] = [
  "semana_actual",
  "semana_anterior",
  "mes_actual",
  "mes_anterior",
  "diario",
  "rango",
];

export const PERIODO_LABEL: Record<string, string> = {
  semana_actual: "Semana actual",
  semana_anterior: "Semana anterior",
  mes_actual: "Mes actual",
  mes_anterior: "Mes anterior",
  diario: "Hoy",
  rango: "Rango personalizado",
};

function offsetMinutes(date: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  }).format(date);
  const match = formatted.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
}

function ymdInTz(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0");
  return { y: get("year"), m: get("month"), d: get("day") };
}

function startOfDay(y: number, m: number, d: number): Date {
  const middayUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const off = offsetMinutes(middayUtc);
  return new Date(Date.UTC(y, m - 1, d) - off * 60000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function rangoPeriodo(
  periodo: string,
  desdeParam?: string | null,
  hastaParam?: string | null
): { desde: Date; hasta: Date } {
  const ahora = new Date();
  const { y, m, d } = ymdInTz(ahora);

  if (periodo === "rango" && desdeParam && hastaParam) {
    const desdeYmd = desdeParam.split("-").map(Number);
    const hastaYmd = hastaParam.split("-").map(Number);
    const desde = startOfDay(desdeYmd[0], desdeYmd[1], desdeYmd[2]);
    const hastaDia = startOfDay(hastaYmd[0], hastaYmd[1], hastaYmd[2]);
    return { desde, hasta: addDays(hastaDia, 1) };
  }

  if (periodo === "diario") {
    const desde = startOfDay(y, m, d);
    return { desde, hasta: addDays(desde, 1) };
  }

  if (periodo === "semana_actual" || periodo === "semana_anterior") {
    const hoy = startOfDay(y, m, d);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const desdeSemana = addDays(hoy, -((dow + 6) % 7));
    const inicio = periodo === "semana_actual" ? desdeSemana : addDays(desdeSemana, -7);
    return { desde: inicio, hasta: addDays(inicio, 7) };
  }

  const inicioMes = startOfDay(y, m, 1);
  if (periodo === "mes_actual") {
    const nextMonth = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
    return { desde: inicioMes, hasta: startOfDay(nextMonth.y, nextMonth.m, 1) };
  }

  const prevMonth = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return { desde: startOfDay(prevMonth.y, prevMonth.m, 1), hasta: inicioMes };
}

export function fechaChile(date: Date, withTime = false): string {
  return date.toLocaleString("es-CL", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function archivoPeriodoSufijo(desde: Date, hastaExclusiva: Date): string {
  const fin = new Date(hastaExclusiva.getTime() - 86400000);
  return `${desde.toISOString().slice(0, 10)}_${fin.toISOString().slice(0, 10)}`;
}
