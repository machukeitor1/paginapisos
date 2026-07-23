const LABEL_BY_SKU: Record<string, string> = {
  'RIW301-NATURAL': 'Unidad',
  'RIW301-MADERA': 'Unidad',
  'RIW301-BLANCO': 'Unidad',
  'RIW301-GRISPLATA': 'Unidad',
  'RIW301-GRISGRAFITO': 'Unidad',
  'RPU101-FACHALETA': 'Unidad',
};

const LABEL_BY_PREFIX: Record<string, string> = {
  'REM': 'm²',
  'REG': 'm²',
  'PIM': 'm²',
  'SPC': 'm²',
  'PIP': 'm²',
  'PEP': 'm²',
  'RPU': 'm²',
  'APU': 'Unidad',
  'CEW': 'Kit con accesorios',
  'PEW': 'Unidad',
  'REP': 'Unidad',
  'RIW': 'Tabla',
  'REW': 'Tabla',
  'CVW': 'Tabla',
};

export function getDisplayLabel(sku: string, unidad: string, displayLabel?: string | null): string {
  if (displayLabel) return displayLabel;

  const skuLabel = LABEL_BY_SKU[sku];
  if (skuLabel) return skuLabel;

  if (unidad === 'un') return 'Unidad';

  const prefix = sku.substring(0, 3);
  return LABEL_BY_PREFIX[prefix] || 'm²';
}
