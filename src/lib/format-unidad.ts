export function formatUnidad(cantidad: number, unidadVenta: string): string {
  const labels: Record<string, [string, string]> = {
    caja: ['caja', 'cajas'],
    tabla: ['tabla', 'tablas'],
    un: ['unidad', 'unidades'],
  };
  const [singular, plural] = labels[unidadVenta] || ['unidad', 'unidades'];
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

export function getUnidadLabel(unidadVenta: string): string {
  const labels: Record<string, string> = {
    caja: 'cajas',
    tabla: 'tablas',
    un: 'unidades',
  };
  return labels[unidadVenta] || 'unidades';
}

export function getUnidadLabelSingular(unidadVenta: string): string {
  const labels: Record<string, string> = {
    caja: 'caja',
    tabla: 'tabla',
    un: 'unidad',
  };
  return labels[unidadVenta] || 'unidad';
}
