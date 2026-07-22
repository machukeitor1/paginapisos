const LABEL_BY_SKU: Record<string, string> = {
  'RIW301-NATURAL': 'Unidad',
  'RIW301-MADERA': 'Unidad',
  'RIW301-BLANCO': 'Unidad',
  'RIW301-GRISPLATA': 'Unidad',
  'RIW301-GRISGRAFITO': 'Unidad',
  'RIW201-CHOCOLATE': 'Unidad',
  'RIW201-MADERA': 'Unidad',
};

const LABEL_BY_PREFIX: Record<string, string> = {
  'REM': 'm²',
  'REG': 'm²',
  'PIM': 'm²',
  'SPC': 'm²',
  'PIP': 'm²',
  'PEP': 'm²',
  'PEW': 'Unidad',
  'REP': 'Unidad',
  'RPU': 'Unidad',
  'APU': 'Unidad',
  'RIW': 'Tabla',
  'REW': 'Tabla',
  'CVW': 'Tabla',
  'CEW': 'Kit con accesorios',
};

export function getDisplayLabel(sku: string, fallback: string): string {
  const skuLabel = LABEL_BY_SKU[sku];
  if (skuLabel) return skuLabel;

  const prefix = sku.substring(0, 3);
  const prefixLabel = LABEL_BY_PREFIX[prefix];
  if (prefixLabel) return prefixLabel;

  return fallback || 'm²';
}
