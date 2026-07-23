import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const CF_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const prisma = new PrismaClient();

async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`R2 upload failed (${res.status}): ${err}`);
  }
  return `${PUBLIC_URL}/${key}`;
}

async function processImage(imageUrl: string): Promise<boolean> {
  // Skip non-R2 images
  if (!imageUrl.includes('r2.dev')) return false;

  try {
    // Generate base key from URL
    const urlPath = imageUrl.replace(PUBLIC_URL + '/', '');
    const ext = urlPath.split('.').pop() || 'jpg';
    const baseName = urlPath.replace(`.${ext}`, '');

    // Check if variants already exist
    const checkKey = `${baseName}_w800.webp`;
    const checkUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(checkKey)}`;
    const checkRes = await fetch(checkUrl, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    });
    if (checkRes.ok) return false; // Already processed

    // Download original
    const res = await fetch(imageUrl);
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to WebP and generate variants
    const webpBuffer = await sharp(buffer)
      .resize(1600, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Upload original WebP
    const originalKey = `${baseName}_original.webp`;
    await uploadToR2(originalKey, webpBuffer, 'image/webp');

    // Generate and upload size variants
    const variants = [
      { width: 400, suffix: 'w400' },
      { width: 800, suffix: 'w800' },
      { width: 1200, suffix: 'w1200' },
    ];

    for (const v of variants) {
      const resized = await sharp(buffer)
        .resize(v.width, null, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const key = `${baseName}_${v.suffix}.webp`;
      await uploadToR2(key, resized, 'image/webp');
    }

    return true;
  } catch (error: any) {
    console.error(`  Error processing ${imageUrl}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Image Migration Script ===\n');

  // Collect all unique image URLs from products
  const products = await prisma.producto.findMany({
    select: { imagenes: true },
  });

  const allImages = new Set<string>();
  for (const p of products) {
    try {
      const imgs: string[] = JSON.parse(p.imagenes);
      imgs.forEach(url => allImages.add(url));
    } catch {}
  }

  // Collect banner images
  const banners = await prisma.banner.findMany({
    select: { imagen: true, imagenMovil: true },
  });
  for (const b of banners) {
    if (b.imagen) allImages.add(b.imagen);
    if (b.imagenMovil) allImages.add(b.imagenMovil);
  }

  // Collect category images
  const categories = await prisma.categoria.findMany({
    select: { imagen: true },
  });
  for (const c of categories) {
    if (c.imagen) allImages.add(c.imagen);
  }

  // Collect config logo
  const config = await prisma.configuracion.findFirst({
    select: { logo: true },
  });
  if (config?.logo) allImages.add(config.logo);

  const imagesToProcess = [...allImages].filter(url => !url.includes('_original.webp') && url.includes('r2.dev'));

  console.log(`Found ${allImages.size} total images`);
  console.log(`${imagesToProcess.length} need processing\n`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < imagesToProcess.length; i++) {
    const url = imagesToProcess[i];
    process.stdout.write(`[${i + 1}/${imagesToProcess.length}] ${url.split('/').pop()}... `);

    const success = await processImage(url);
    if (success) {
      processed++;
      console.log('✓');
    } else {
      skipped++;
      console.log('skipped');
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  await prisma.$disconnect();
}

main().catch(console.error);
