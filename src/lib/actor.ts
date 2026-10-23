import { getSession } from "./auth";
import { getVendedorSession } from "./auth-vendedor";

export type Actor = {
  tipo: "admin" | "vendedor";
  id: number;
  nombre: string;
};

export async function getActor(): Promise<Actor | null> {
  const admin = await getSession();
  if (admin) return { tipo: "admin", id: admin.id, nombre: admin.email };

  const vendedor = await getVendedorSession();
  if (vendedor) return { tipo: "vendedor", id: vendedor.id, nombre: vendedor.nombre };

  return null;
}
