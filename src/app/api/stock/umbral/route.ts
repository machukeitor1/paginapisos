import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const categoriaId = parseInt(String(body.categoriaId));
    const stockMinimo = Number(body.stockMinimo);
    const soloSinUmbral = Boolean(body.soloSinUmbral);

    if (!Number.isFinite(categoriaId)) {
      return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
    }
    if (!Number.isFinite(stockMinimo) || stockMinimo < 0) {
      return NextResponse.json({ error: "El stock mínimo debe ser 0 o más" }, { status: 400 });
    }

    const where: any = { categoriaId };
    if (soloSinUmbral) where.stockMinimo = 0;

    const { count } = await prisma.producto.updateMany({ where, data: { stockMinimo } });
    return NextResponse.json({ success: true, actualizados: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar umbral" }, { status: 500 });
  }
}
