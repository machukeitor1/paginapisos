import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const prisma = new PrismaClient();

const CF_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

async function downloadFromCloudinary(url: string): Promise<Buffer> {
  const tmpFile = join(tmpdir(), "dl_" + Date.now() + ".tmp");
  try {
    execSync('curl.exe --ssl-no-revoke -s -L -o "' + tmpFile + '" "' + url + '"', { timeout: 30000 });
    return readFileSync(tmpFile);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`R2 upload failed (${res.status}): ${err}`);
  }

  return `${PUBLIC_URL}/${key}`;
}

function extractPublicId(url: string): string {
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)$/);
  return match ? match[1] : url.split("/").pop() || "unknown";
}

function extractFilename(publicId: string): string {
  const parts = publicId.split("/");
  return parts[parts.length - 1];
}

async function migrateImage(cloudinaryUrl: string, r2Key: string): Promise<string> {
  const filename = extractFilename(r2Key);
  console.log("  Downloading: " + filename);
  const buffer = await downloadFromCloudinary(cloudinaryUrl);

  let contentType = "image/webp";
  if (cloudinaryUrl.includes(".jpg") || cloudinaryUrl.includes(".jpeg")) {
    contentType = "image/jpeg";
  }

  const r2Url = await uploadToR2(r2Key, buffer, contentType);
  console.log("  Uploaded to R2: " + r2Key);
  return r2Url;
}

async function migrateBannerWithVariants(cloudinaryUrl: string, baseName: string): Promise<string> {
  console.log("  Downloading banner: " + baseName);
  const buffer = await downloadFromCloudinary(cloudinaryUrl);

  const ext = cloudinaryUrl.includes(".webp") ? "webp" : "jpg";
  const variants = [
    { width: 400, suffix: "w400" },
    { width: 800, suffix: "w800" },
    { width: 1200, suffix: "w1200" },
  ];

  for (const v of variants) {
    const resized = await sharp(buffer)
      .resize(v.width, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const key = "banners/" + baseName + "_" + v.suffix + ".webp";
    await uploadToR2(key, resized, "image/webp");
    console.log("  Variant " + v.width + "w: " + key);
  }

  const originalKey = "banners/" + baseName + "_original." + ext;
  const originalBuffer = await sharp(buffer)
    .webp({ quality: 85 })
    .toBuffer();
  await uploadToR2(originalKey, originalBuffer, "image/webp");
  console.log("  Original: " + originalKey);

  return PUBLIC_URL + "/" + originalKey;
}

async function main() {
  console.log("Migrating images from Cloudinary to Cloudflare R2 (via REST API)...\n");

  // 1. Migrate Product images
  console.log("=== Migrating product images ===");
  const productos = await prisma.producto.findMany({
    select: { id: true, slug: true, imagenes: true },
  });

  let productosMigrados = 0;
  for (const prod of productos) {
    const imgs: string[] = JSON.parse(prod.imagenes || "[]");
    const newImgs: string[] = [];
    let changed = false;

    for (let i = 0; i < imgs.length; i++) {
      const url = imgs[i];
      if (url.includes("res.cloudinary.com")) {
        const publicId = extractPublicId(url);
        const filename = extractFilename(publicId);
        const r2Key = "productos/" + filename;
        try {
          const newUrl = await migrateImage(url, r2Key);
          newImgs.push(newUrl);
          changed = true;
        } catch (e: any) {
          console.log("  ERROR migrating " + filename + ": " + e.message);
          newImgs.push(url);
        }
      } else {
        newImgs.push(url);
      }
    }

    if (changed) {
      await prisma.producto.update({
        where: { id: prod.id },
        data: { imagenes: JSON.stringify(newImgs) },
      });
      productosMigrados++;
    }
  }
  console.log("Products migrated: " + productosMigrados + "\n");

  // 2. Migrate Banner images
  console.log("=== Migrating banner images ===");
  const banners = await prisma.banner.findMany({
    select: { id: true, titulo: true, imagen: true, imagenMovil: true },
  });

  let bannersMigrados = 0;
  for (const banner of banners) {
    let changed = false;

    if (banner.imagen && banner.imagen.includes("res.cloudinary.com")) {
      console.log("  Banner " + banner.id + " - desktop:");
      try {
        const newUrl = await migrateBannerWithVariants(
          banner.imagen,
          "banner-" + banner.id + "-desktop"
        );
        await prisma.banner.update({
          where: { id: banner.id },
          data: { imagen: newUrl },
        });
        changed = true;
      } catch (e: any) {
        console.log("  ERROR: " + e.message);
      }
    }

    if (banner.imagenMovil && banner.imagenMovil.includes("res.cloudinary.com")) {
      console.log("  Banner " + banner.id + " - mobile:");
      try {
        const newUrl = await migrateBannerWithVariants(
          banner.imagenMovil,
          "banner-" + banner.id + "-mobile"
        );
        await prisma.banner.update({
          where: { id: banner.id },
          data: { imagenMovil: newUrl },
        });
        changed = true;
      } catch (e: any) {
        console.log("  ERROR: " + e.message);
      }
    }

    if (changed) bannersMigrados++;
  }
  console.log("Banners migrated: " + bannersMigrados + "\n");

  // 3. Migrate Category images
  console.log("=== Migrating category images ===");
  const categorias = await prisma.categoria.findMany({
    select: { id: true, slug: true, imagen: true },
  });

  let catsMigradas = 0;
  for (const cat of categorias) {
    if (cat.imagen && cat.imagen.includes("res.cloudinary.com")) {
      const publicId = extractPublicId(cat.imagen);
      const filename = extractFilename(publicId);
      const r2Key = "productos/" + filename;
      try {
        const newUrl = await migrateImage(cat.imagen, r2Key);
        await prisma.categoria.update({
          where: { id: cat.id },
          data: { imagen: newUrl },
        });
        catsMigradas++;
      } catch (e: any) {
        console.log("  ERROR migrating category " + cat.slug + ": " + e.message);
      }
    }
  }
  console.log("Categories migrated: " + catsMigradas + "\n");

  // 4. Migrate Config logo
  console.log("=== Migrating config logo ===");
  const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
  if (config?.logo && config.logo.includes("res.cloudinary.com")) {
    const publicId = extractPublicId(config.logo);
    const filename = extractFilename(publicId);
    const r2Key = "productos/" + filename;
    try {
      const newUrl = await migrateImage(config.logo, r2Key);
      await prisma.configuracion.update({
        where: { id: 1 },
        data: { logo: newUrl },
      });
      console.log("Logo migrated\n");
    } catch (e: any) {
      console.log("  ERROR migrating logo: " + e.message + "\n");
    }
  } else {
    console.log("Logo is not from Cloudinary or does not exist\n");
  }

  console.log("=== MIGRATION COMPLETE ===");
  console.log("Database URLs now point to Cloudflare R2");
}

main()
  .catch((e) => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
