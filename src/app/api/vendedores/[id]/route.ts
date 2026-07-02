import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const updateData: any = {
      nombre: data.nombre,
      rut: data.rut,
      telefono: data.telefono || null,
      email: data.email || null,
      activo: data.activo !== false,
    };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    const vendedor = await prisma.vendedor.update({
      where: { id: parseInt(params.id) },
      data: updateData,
      select: { id: true, nombre: true, rut: true, telefono: true, email: true, activo: true },
    });
    return NextResponse.json(vendedor);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe otro vendedor con ese RUT" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.vendedor.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2003") {
      return NextResponse.json({ error: "No se puede eliminar: el vendedor tiene cotizaciones asociadas" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
