import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const UNITARIO_SKUS: Record<string, boolean> = {
  AIW001: true,
  AEW101: true, AEW102: true,
  ATW101: true, ATW102: true,
  'AIM101-GRAFITO': true, 'AIM101-CREMA': true, 'AIM101-CEDRO': true,
  'AIM101-MADERA': true, 'AIM101-NEGRO': true, 'AIM101-BLANCO': true,
  'AUM101-GRAFITO': true, 'AUM101-CREMA': true, 'AUM101-CEDRO': true,
  'AUM101-MADERA': true, 'AUM101-NEGRO': true, 'AUM101-BLANCO': true,
  'ATM101-GRAFITO': true, 'ATM101-CREMA': true, 'ATM101-CEDRO': true,
  'ATM101-MADERA': true, 'ATM101-NEGRO': true, 'ATM101-BLANCO': true,
  'NPS101-NATURAL': true, 'NPS101-CARBON': true, 'NPS101-GRAFITO': true,
  'NPS101-CREMA': true, 'NPS101-GRISPIEDRA': true,
  'CPS101-GRAFITO': true, 'CPS101-CARBON': true, 'CPS101-CREMA': true,
  'CPS101-GRISPIEDRA': true, 'CPS101-NATURAL': true,
  'GPS101-NATURAL': true, 'GPS101-GRISPIEDRA': true, 'GPS101-CREMA': true,
  'GPS101-GRAFITO': true, 'GPS101-CARBON': true,
};

function getUnidadForSku(sku: string): string {
  return UNITARIO_SKUS[sku] ? 'un' : 'm2';
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
