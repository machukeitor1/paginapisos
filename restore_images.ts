import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import https from "https";
import http from "http";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DATA_FILE = path.join(process.cwd(), "scraped_data.json");

async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<string | null> {
  try {
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "productos", public_id: path.parse(filename).name, resource_type: "image" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
    return result.secure_url;
  } catch {
    return null;
  }
}

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
        const cloudinaryUrl = await uploadToCloudinary(buffer, filename);
        resolve(cloudinaryUrl);
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

async function main() {
  console.log("Leyendo scraped_data.json para restaurar imágenes a Cloudinary...");
  const raw = readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw);

  let totalProductos = 0;
  let imagenesSubidas = 0;

  for (const [slugCategoria, info] of Object.entries(data) as any[]) {
    for (const prod of info.productos) {
      totalProductos++;

      if (!prod.sku) continue;

      const baseSlug = slugify(prod.nombre || prod.url?.split("/").pop() || `prod-${totalProductos}`);
      const productSlug = `${baseSlug}-${slugify(prod.sku)}`;

      for (let i = 0; i < (prod.imagenes || []).length; i++) {
        const imgUrl = prod.imagenes[i];
        if (!imgUrl || imgUrl.includes("sharer") || imgUrl.includes("og:image")) continue;

        const ext = path.extname(new URL(imgUrl).pathname) || ".jpg";
        const filename = `${productSlug}-${i + 1}${ext}`;

        process.stdout.write(`\rSubiendo ${filename} a Cloudinary...`);
        
        const cloudinaryUrl = await downloadAndUpload(imgUrl, filename);
        if (cloudinaryUrl) {
          imagenesSubidas++;
        }
      }
    }
  }

  console.log(`\n\n✅ Restauración completa: ${imagenesSubidas} imágenes subidas a Cloudinary.`);
}

main().catch(console.error);
