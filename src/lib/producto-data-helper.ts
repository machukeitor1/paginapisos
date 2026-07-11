export function safeJsonParse(val: string | null | undefined, fallback: any = null): any {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

export function getProdData(producto: any, extra?: any) {
  return {
    medidas: safeJsonParse(producto.medidas, extra?.medidas),
    presentacion: producto.presentacion || extra?.presentacion || '',
    rendimiento: producto.rendimientoTexto || extra?.rendimiento || '',
    accesorios: safeJsonParse(producto.accesorios, extra?.accesorios),
  }
}
