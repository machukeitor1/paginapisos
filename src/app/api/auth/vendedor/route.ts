import { NextResponse } from "next/server";
import { authenticateVendedor, verifyVendedorToken } from "@/lib/auth-vendedor";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("vendedor_token")?.value;
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const payload = verifyVendedorToken(token);
    if (!payload) return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }
    const token = await authenticateVendedor(email, password);
    if (!token) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set("vendedor_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("vendedor_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
