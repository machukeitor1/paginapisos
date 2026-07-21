import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  // Count images still on Cloudinary
  const products = await prisma.producto.findMany({ select: { imagenes: true } });
  let totalR2 = 0;
  let totalCloudinary = 0;
  for (const p of products) {
    const imgs: string[] = JSON.parse(p.imagenes || "[]");
    for (const url of imgs) {
      if (url.includes("r2.dev")) totalR2++;
      else if (url.includes("cloudinary")) totalCloudinary++;
    }
  }

  const banners = await prisma.banner.findMany({ select: { imagen: true, imagenMovil: true } });
  for (const b of banners) {
    if (b.imagen?.includes("r2.dev")) totalR2++;
    else if (b.imagen?.includes("cloudinary")) totalCloudinary++;
    if (b.imagenMovil?.includes("r2.dev")) totalR2++;
    else if (b.imagenMovil?.includes("cloudinary")) totalCloudinary++;
  }

  const cats = await prisma.categoria.findMany({ select: { imagen: true } });
  for (const c of cats) {
    if (c.imagen?.includes("r2.dev")) totalR2++;
    else if (c.imagen?.includes("cloudinary")) totalCloudinary++;
  }

  const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
  if (config?.logo?.includes("r2.dev")) totalR2++;
  else if (config?.logo?.includes("cloudinary")) totalCloudinary++;

  console.log("=== Migration Verification ===");
  console.log("Total images on R2: " + totalR2);
  console.log("Total images on Cloudinary: " + totalCloudinary);

  if (totalCloudinary === 0) {
    console.log("ALL images migrated to R2!");
  } else {
    console.log("WARNING: " + totalCloudinary + " images still on Cloudinary");
  }
}

verify()
  .catch((e) => console.error("Error:", e))
  .finally(() => prisma.$disconnect());
