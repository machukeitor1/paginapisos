import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const lastCot = await prisma.cotizacion.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const nextNum = lastCot ? lastCot.id + 1 : 1;
    return NextResponse.json({ numero: `COT-${String(nextNum).padStart(4, "0")}` });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
