import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";
import https from "https";
import http from "http";
import { uploadToR2 } from "../src/lib/r2";

const prisma = new PrismaClient();
const DATA_FILE = path.join(process.cwd(), "scraped_data.json");

async function downloadAndUpload(url: string, filename: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proto = url.startsWith("https") ? https : http;
    const req = proto.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          downloadAndUpload(res.headers.location, filename).then(resolve);
        } else {
          resolve(null);
        }
        return;
      }
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const ext = path.extname(filename).toLowerCase();
        const ct = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/webp";
        try {
          const r2Url = await uploadToR2("productos/" + filename, buffer, ct);
          resolve(r2Url);
        } catch {
          resolve(null);
        }
      });
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const RENDIMIENTOS: Record<string, { rendimiento: number; unidadVenta: string }> = {
  REM: { rendimiento: 8.8, unidadVenta: "caja" },
  SPC: { rendimiento: 2.64, unidadVenta: "caja" },
  PIM: { rendimiento: 2.3, unidadVenta: "caja" },
};

function calcularRendimiento(sku: string, dimensiones: string | null): { rendimiento: number; unidadVenta: string } {
  const prefix = sku.substring(0, 3);
  if (RENDIMIENTOS[prefix]) return RENDIMIENTOS[prefix];

  if (dimensiones) {
    const match = dimensiones.match(/([\d.]+)\s*cm\s*x\s*([\d.]+)\s*cm/);
    if (match) {
      const m2 = (parseFloat(match[1]) / 100) * (parseFloat(match[2]) / 100);
      if (m2 > 0) return { rendimiento: Math.round(m2 * 10000) / 10000, unidadVenta: "un" };
    }
  }

  return { rendimiento: 1, unidadVenta: "un" };
}

async function main() {
  console.log("Reading scraped data...");
  const raw = readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw);

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

      const existing = await prisma.producto.findUnique({ where: { sku: prod.sku } });
      if (existing) {
        console.log(`  [EXIST] ${prod.sku} ya existe`);
        continue;
      }

      const r2Images: string[] = [];
      for (let i = 0; i < (prod.imagenes || []).length; i++) {
        const imgUrl = prod.imagenes[i];
        if (!imgUrl || imgUrl.includes("sharer") || imgUrl.includes("og:image")) continue;

        const ext = path.extname(new URL(imgUrl).pathname) || ".jpg";
        const filename = `${productSlug}-${i + 1}${ext}`;

        const r2Url = await downloadAndUpload(imgUrl, filename);
        if (r2Url) {
          r2Images.push(r2Url);
          totalImagenes++;
        }
      }

      try {
        const precioBase = prod.precio_m2 || prod.precio_unitario || 0;
        const cfg = calcularRendimiento(prod.sku, prod.dimensiones || null);
        const precioUnitario = Math.round(precioBase * cfg.rendimiento);

        await prisma.producto.create({
          data: {
            nombre: prod.nombre,
            slug: productSlug,
            sku: prod.sku,
            descripcion: prod.descripcion || "",
            dimensiones: prod.dimensiones || null,
            unidad: "m2",
            precio: precioBase,
            precioAntes: null,
            descuento: null,
            rendimiento: cfg.rendimiento,
            unidadVenta: cfg.unidadVenta,
            precioUnitario,
            marca: "",
            imagenes: JSON.stringify(r2Images),
            destacado: false,
            activo: true,
            orden: 0,
            categoriaId: categoria.id,
          },
        });
        productosInsertados++;
        console.log(`  [OK] ${prod.sku} - ${r2Images.length} imagenes (rend=${cfg.rendimiento} ${cfg.unidadVenta}, pu=${precioUnitario})`);
      } catch (e: any) {
        console.log(`  [ERROR] ${prod.sku}: ${e.message}`);
      }
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Productos procesados: ${totalProductos}`);
  console.log(`Productos insertados: ${productosInsertados}`);
  console.log(`Imagenes subidas a R2: ${totalImagenes}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
