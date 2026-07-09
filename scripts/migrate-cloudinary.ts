import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BANNER_DIR = path.join(process.cwd(), "public", "banner");

async function uploadFile(filepath: string): Promise<string | null> {
  try {
    const buffer = readFileSync(filepath);
    const relativePath = path.relative(process.cwd(), filepath);
    const folder = path.dirname(relativePath).replace(/\\/g, "/");
    const publicId = path.parse(filepath).name;

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, resource_type: "image" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return result.secure_url;
  } catch (err) {
    console.error(`  Error subiendo ${filepath}:`, err);
    return null;
  }
}

function collectImages(dir: string): { localPath: string; localUrl: string }[] {
  const results: { localPath: string; localUrl: string }[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return results;

  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (statSync(fullPath).isFile()) {
      const localUrl = "/" + path.relative(path.join(process.cwd(), "public"), fullPath).replace(/\\/g, "/");
      results.push({ localPath: fullPath, localUrl });
    }
  }
  return results;
}

function buildUrlMap(localImages: { localPath: string; localUrl: string }[], cloudinaryUrls: (string | null)[]): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < localImages.length; i++) {
    if (cloudinaryUrls[i]) {
      map.set(localImages[i].localUrl, cloudinaryUrls[i]!);
    }
  }
  return map;
}

function replaceUrlsInJsonArray(jsonStr: string, urlMap: Map<string, string>): string {
  try {
    const urls = JSON.parse(jsonStr);
    if (!Array.isArray(urls)) return jsonStr;
    const updated = urls.map((u: string) => urlMap.get(u) || u);
    return JSON.stringify(updated);
  } catch {
    return jsonStr;
  }
}

async function main() {
  console.log("=== Migración de imágenes locales a Cloudinary ===\n");

  // 1. Colectar todas las imágenes locales
  const uploadImages = collectImages(UPLOAD_DIR);
  const bannerImages = collectImages(BANNER_DIR);
  const allImages = [...uploadImages, ...bannerImages];

  if (allImages.length === 0) {
    console.log("No se encontraron imágenes locales para migrar.");
    return;
  }

  console.log(`Imágenes encontradas: ${allImages.length}`);
  console.log(`  - public/uploads/: ${uploadImages.length}`);
  console.log(`  - public/banner/: ${bannerImages.length}\n`);

  // 2. Subir cada imagen a Cloudinary
  console.log("Subiendo imágenes a Cloudinary...");
  const cloudinaryUrls = await Promise.all(
    allImages.map((img) => uploadFile(img.localPath))
  );

  const successCount = cloudinaryUrls.filter(Boolean).length;
  console.log(`\nSubidas exitosamente: ${successCount}/${allImages.length}\n`);

  // 3. Construir mapa de URLs locales -> Cloudinary
  const urlMap = buildUrlMap(allImages, cloudinaryUrls);

  if (urlMap.size === 0) {
    console.log("No se pudo subir ninguna imagen. Abortando.");
    return;
  }

  // 4. Actualizar Producto.imagenes
  console.log("Actualizando productos...");
  const productos = await prisma.producto.findMany({ select: { id: true, imagenes: true } });
  let prodUpdated = 0;
  for (const prod of productos) {
    const newImagenes = replaceUrlsInJsonArray(prod.imagenes, urlMap);
    if (newImagenes !== prod.imagenes) {
      await prisma.producto.update({ where: { id: prod.id }, data: { imagenes: newImagenes } });
      prodUpdated++;
    }
  }
  console.log(`  Productos actualizados: ${prodUpdated}`);

  // 5. Actualizar Banner.imagen e imagenMovil
  console.log("Actualizando banners...");
  const banners = await prisma.banner.findMany();
  let bannerUpdated = 0;
  for (const b of banners) {
    const data: any = {};
    if (b.imagen && urlMap.has(b.imagen)) {
      data.imagen = urlMap.get(b.imagen);
    }
    if (b.imagenMovil && urlMap.has(b.imagenMovil)) {
      data.imagenMovil = urlMap.get(b.imagenMovil);
    }
    if (Object.keys(data).length > 0) {
      await prisma.banner.update({ where: { id: b.id }, data });
      bannerUpdated++;
    }
  }
  console.log(`  Banners actualizados: ${bannerUpdated}`);

  // 6. Actualizar Categoria.imagen
  console.log("Actualizando categorías...");
  const categorias = await prisma.categoria.findMany();
  let catUpdated = 0;
  for (const c of categorias) {
    if (c.imagen && urlMap.has(c.imagen)) {
      await prisma.categoria.update({ where: { id: c.id }, data: { imagen: urlMap.get(c.imagen) } });
      catUpdated++;
    }
  }
  console.log(`  Categorías actualizadas: ${catUpdated}`);

  // 7. Actualizar Configuracion.logo
  console.log("Actualizando configuración...");
  const configs = await prisma.configuracion.findMany();
  let cfgUpdated = 0;
  for (const cfg of configs) {
    if (cfg.logo && urlMap.has(cfg.logo)) {
      await prisma.configuracion.update({ where: { id: cfg.id }, data: { logo: urlMap.get(cfg.logo) } });
      cfgUpdated++;
    }
  }
  console.log(`  Configuraciones actualizadas: ${cfgUpdated}`);

  console.log(`\n✅ Migración completada.`);
  console.log(`   ${successCount} imágenes subidas a Cloudinary.`);
  console.log(`   ${prodUpdated + bannerUpdated + catUpdated + cfgUpdated} registros actualizados en BD.`);
  console.log(`\nIMPORTANTE: Las imágenes locales en public/uploads/ y public/banner/`);
  console.log(`aún existen. Puedes eliminarlas manualmente una vez verifiques que todo funciona.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
