import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET || "mi-secreto-super-seguro-2024";

export function generateVendedorToken(id: number, nombre: string): string {
  return jwt.sign({ id, nombre, role: "vendedor" }, SECRET, { expiresIn: "24h" });
}

export function verifyVendedorToken(token: string): { id: number; nombre: string } | null {
  try {
    const payload = jwt.verify(token, SECRET) as { id: number; nombre: string; role: string };
    if (payload.role !== "vendedor") return null;
    return { id: payload.id, nombre: payload.nombre };
  } catch {
    return null;
  }
}

export async function getVendedorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendedor_token")?.value;
  if (!token) return null;
  return verifyVendedorToken(token);
}

export async function authenticateVendedor(email: string, password: string) {
  const vendedor = await prisma.vendedor.findFirst({
    where: { email, activo: true },
  });
  if (!vendedor) return null;
  const valid = await bcrypt.compare(password, vendedor.password);
  if (!valid) return null;
  return generateVendedorToken(vendedor.id, vendedor.nombre);
}
