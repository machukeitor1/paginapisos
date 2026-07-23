import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import sharp from "sharp";

const VARIANTS = [
  { width: 400, suffix: "w400" },
  { width: 800, suffix: "w800" },
  { width: 1200, suffix: "w1200" },
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const baseName = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    const baseKey = `productos/${baseName}`;

    // Convert original to WebP
    const webpBuffer = await sharp(buffer)
      .resize(1600, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Upload original (WebP)
    const originalKey = `${baseKey}_original.webp`;
    await uploadToR2(originalKey, webpBuffer, "image/webp");

    // Generate and upload size variants
    const urls: Record<string, string> = {};
    urls.original = `${process.env.R2_PUBLIC_URL}/${originalKey}`;

    for (const v of VARIANTS) {
      const resized = await sharp(buffer)
        .resize(v.width, null, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const key = `${baseKey}_${v.suffix}.webp`;
      await uploadToR2(key, resized, "image/webp");
      urls[v.suffix] = `${process.env.R2_PUBLIC_URL}/${key}`;
    }

    return NextResponse.json({
      url: urls.original,
      urls,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al subir archivo" }, { status: 500 });
  }
}
