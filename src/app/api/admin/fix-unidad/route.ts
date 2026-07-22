import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const M2_PREFIXES = ['REM', 'REG', 'PIM', 'SPC', 'PIP', 'PEP'];

const UNIDAD_BY_SKU: Record<string, string> = {
  'RIW301-NATURAL': 'un',
  'RIW301-MADERA': 'un',
  'RIW301-BLANCO': 'un',
  'RIW301-GRISPLATA': 'un',
  'RIW301-GRISGRAFITO': 'un',
  'RIW201-CHOCOLATE': 'un',
  'RIW201-MADERA': 'un',
};

function getUnidadForSku(sku: string): string {
  const override = UNIDAD_BY_SKU[sku];
  if (override) return override;
  const prefix = sku.substring(0, 3);
  return M2_PREFIXES.includes(prefix) ? 'm2' : 'un';
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const productos = await prisma.producto.findMany({
    select: { id: true, sku: true, unidad: true },
  });

  let updated = 0;
  let unchanged = 0;
  const changes: { sku: string; from: string; to: string }[] = [];

  for (const prod of productos) {
    const correcta = getUnidadForSku(prod.sku);
    if (prod.unidad !== correcta) {
      await prisma.producto.update({
        where: { id: prod.id },
        data: { unidad: correcta },
      });
      changes.push({ sku: prod.sku, from: prod.unidad, to: correcta });
      updated++;
    } else {
      unchanged++;
    }
  }

  return NextResponse.json({ updated, unchanged, total: productos.length, changes });
}
