import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import https from "https";
import http from "http";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const DATA_FILE = path.join(process.cwd(), "scraped_data.json");

async function downloadFile(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proto = url.startsWith("https") ? https : http;
    const req = proto.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location!, dest).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        resolve(false);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        await writeFile(dest, buffer);
        resolve(true);
      });
      res.on("error", () => resolve(false));
    });
    req.on("error", () => resolve(false));
    req.setTimeout(15000, () => { req.destroy(); resolve(false); });
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Reading scraped data...");
  const raw = readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw);

  await mkdir(UPLOAD_DIR, { recursive: true });

  let totalProductos = 0;
  let totalImagenes = 0;
  let productosInsertados = 0;

  for (const [slugCategoria, info] of Object.entries(data) as any[]) {
    const categoria = await prisma.categoria.findUnique({
      where: { slug: slugCategoria },
    });

    if (!categoria) {
      console.log(`[SKIP] Categoria "${slugCategoria}" no encontrada en DB`);
      continue;
    }

    console.log(`\n=== ${info.nombre} (${slugCategoria}) ===`);

    for (const prod of info.productos) {
      totalProductos++;

      if (!prod.sku) {
        console.log(`  [SKIP] Sin SKU: ${prod.nombre}`);
        continue;
      }

      const baseSlug = slugify(prod.nombre || prod.url?.split("/").pop() || `prod-${totalProductos}`);
      const productSlug = `${baseSlug}-${slugify(prod.sku)}`;

      // Verificar si ya existe
      const existing = await prisma.producto.findUnique({ where: { sku: prod.sku } });
      if (existing) {
        console.log(`  [EXIST] ${prod.sku} ya existe`);
        continue;
      }

      // Descargar imagenes
      const localImages: string[] = [];
      for (let i = 0; i < (prod.imagenes || []).length; i++) {
        const imgUrl = prod.imagenes[i];
        if (!imgUrl || imgUrl.includes("sharer") || imgUrl.includes("og:image")) continue;

        const ext = path.extname(new URL(imgUrl).pathname) || ".jpg";
        const filename = `${productSlug}-${i + 1}${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        if (existsSync(filepath)) {
          localImages.push(`/uploads/${filename}`);
          continue;
        }

        const ok = await downloadFile(imgUrl, filepath);
        if (ok) {
          localImages.push(`/uploads/${filename}`);
          totalImagenes++;
        }
      }

      // Crear producto
      try {
        await prisma.producto.create({
          data: {
            nombre: prod.nombre,
            slug: productSlug,
            sku: prod.sku,
            descripcion: prod.descripcion || "",
            dimensiones: prod.dimensiones || null,
            unidad: "m2",
            precio: prod.precio_m2 || prod.precio_unitario || 0,
            precioAntes: null,
            descuento: null,
            marca: prod.marca || "Marca Propia",
            imagenes: JSON.stringify(localImages),
            destacado: false,
            activo: true,
            orden: 0,
            categoriaId: categoria.id,
          },
        });
        productosInsertados++;
        console.log(`  [OK] ${prod.sku} - ${localImages.length} imagenes`);
      } catch (e: any) {
        console.log(`  [ERROR] ${prod.sku}: ${e.message}`);
      }
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Productos procesados: ${totalProductos}`);
  console.log(`Productos insertados: ${productosInsertados}`);
  console.log(`Imagenes descargadas: ${totalImagenes}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());