import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const r2 = new S3Client({
  region: "auto",
  endpoint: "https://" + process.env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

async function downloadFromCloudinary(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to download: " + url + " (" + res.status + ")");
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }));
  return PUBLIC_URL + "/" + key;
}

function extractPublicId(url: string): string {
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)$/);
  return match ? match[1] : url.split("/").pop() || "unknown";
}

function extractFilename(publicId: string): string {
  const parts = publicId.split("/");
  return parts[parts.length - 1];
}

export async function GET() {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); };

  try {
    log("=== Migrating Cloudinary -> R2 ===");

    const productos = await prisma.producto.findMany({ select: { id: true, slug: true, imagenes: true } });
    let migrated = 0;

    for (const prod of productos) {
      const imgs: string[] = JSON.parse(prod.imagenes || "[]");
      const newImgs: string[] = [];
      let changed = false;

      for (const url of imgs) {
        if (url.includes("res.cloudinary.com")) {
          const publicId = extractPublicId(url);
          const filename = extractFilename(publicId);
          const r2Key = "productos/" + filename;
          try {
            const buffer = await downloadFromCloudinary(url);
            const ct = url.includes(".jpg") || url.includes(".jpeg") ? "image/jpeg" : "image/webp";
            const newUrl = await uploadToR2(r2Key, buffer, ct);
            newImgs.push(newUrl);
            changed = true;
            log("OK: " + filename);
          } catch (e: any) {
            log("ERR: " + filename + " - " + e.message);
            newImgs.push(url);
          }
        } else {
          newImgs.push(url);
        }
      }

      if (changed) {
        await prisma.producto.update({ where: { id: prod.id }, data: { imagenes: JSON.stringify(newImgs) } });
        migrated++;
      }
    }
    log("Products migrated: " + migrated);

    const banners = await prisma.banner.findMany({ select: { id: true, imagen: true, imagenMovil: true } });
    let bannersMigrated = 0;

    for (const banner of banners) {
      if (banner.imagen && banner.imagen.includes("res.cloudinary.com")) {
        try {
          const buffer = await downloadFromCloudinary(banner.imagen);
          const baseName = "banner-" + banner.id + "-desktop";

          for (const v of [{ w: 400, s: "w400" }, { w: 800, s: "w800" }, { w: 1200, s: "w1200" }]) {
            const resized = await sharp(buffer).resize(v.w, null, { withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
            await uploadToR2("banners/" + baseName + "_" + v.s + ".webp", resized, "image/webp");
          }
          const origBuf = await sharp(buffer).webp({ quality: 85 }).toBuffer();
          const origKey = "banners/" + baseName + "_original.webp";
          await uploadToR2(origKey, origBuf, "image/webp");
          await prisma.banner.update({ where: { id: banner.id }, data: { imagen: PUBLIC_URL + "/" + origKey } });
          bannersMigrated++;
          log("Banner " + banner.id + " desktop OK");
        } catch (e: any) {
          log("Banner " + banner.id + " desktop ERR: " + e.message);
        }
      }

      if (banner.imagenMovil && banner.imagenMovil.includes("res.cloudinary.com")) {
        try {
          const buffer = await downloadFromCloudinary(banner.imagenMovil);
          const baseName = "banner-" + banner.id + "-mobile";
          for (const v of [{ w: 400, s: "w400" }, { w: 800, s: "w800" }, { w: 1200, s: "w1200" }]) {
            const resized = await sharp(buffer).resize(v.w, null, { withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
            await uploadToR2("banners/" + baseName + "_" + v.s + ".webp", resized, "image/webp");
          }
          const origBuf = await sharp(buffer).webp({ quality: 85 }).toBuffer();
          const origKey = "banners/" + baseName + "_original.webp";
          await uploadToR2(origKey, origBuf, "image/webp");
          await prisma.banner.update({ where: { id: banner.id }, data: { imagenMovil: PUBLIC_URL + "/" + origKey } });
          log("Banner " + banner.id + " mobile OK");
        } catch (e: any) {
          log("Banner " + banner.id + " mobile ERR: " + e.message);
        }
      }
    }
    log("Banners migrated: " + bannersMigrated);

    const categorias = await prisma.categoria.findMany({ select: { id: true, slug: true, imagen: true } });
    let catsMigrated = 0;
    for (const cat of categorias) {
      if (cat.imagen && cat.imagen.includes("res.cloudinary.com")) {
        try {
          const publicId = extractPublicId(cat.imagen);
          const filename = extractFilename(publicId);
          const buffer = await downloadFromCloudinary(cat.imagen);
          const ct = cat.imagen.includes(".jpg") ? "image/jpeg" : "image/webp";
          const newUrl = await uploadToR2("productos/" + filename, buffer, ct);
          await prisma.categoria.update({ where: { id: cat.id }, data: { imagen: newUrl } });
          catsMigrated++;
          log("Category " + cat.slug + " OK");
        } catch (e: any) {
          log("Category " + cat.slug + " ERR: " + e.message);
        }
      }
    }
    log("Categories migrated: " + catsMigrated);

    const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
    if (config?.logo && config.logo.includes("res.cloudinary.com")) {
      try {
        const publicId = extractPublicId(config.logo);
        const filename = extractFilename(publicId);
        const buffer = await downloadFromCloudinary(config.logo);
        const ct = config.logo.includes(".png") ? "image/png" : "image/webp";
        const newUrl = await uploadToR2("productos/" + filename, buffer, ct);
        await prisma.configuracion.update({ where: { id: 1 }, data: { logo: newUrl } });
        log("Logo OK");
      } catch (e: any) {
        log("Logo ERR: " + e.message);
      }
    }

    log("=== MIGRATION COMPLETE ===");
    return NextResponse.json({ success: true, logs });
  } catch (e: any) {
    log("FATAL: " + e.message);
    return NextResponse.json({ success: false, logs }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
