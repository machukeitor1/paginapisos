export const FORMAS_PAGO = {
  EFECTIVO: "Efectivo",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
  CREDITO_CLIENTE: "Crédito cliente",
} as const;

export type FormaPago = keyof typeof FORMAS_PAGO;

export function esFormaPago(valor: unknown): valor is FormaPago {
  return typeof valor === "string" && Object.prototype.hasOwnProperty.call(FORMAS_PAGO, valor);
}

export function etiquetaFormaPago(codigo: string | null | undefined): string {
  if (!codigo) return "";
  return esFormaPago(codigo) ? FORMAS_PAGO[codigo] : codigo;
}
