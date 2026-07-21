import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME!;
export const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function generateBannerVariants(
  buffer: Buffer,
  baseKey: string
): Promise<{ original: string; w400: string; w800: string; w1200: string }> {
  const ext = baseKey.split(".").pop() || "webp";

  const variants = [
    { width: 400, suffix: "w400" },
    { width: 800, suffix: "w800" },
    { width: 1200, suffix: "w1200" },
  ];

  const results: Record<string, string> = {};

  for (const v of variants) {
    const resized = await sharp(buffer)
      .resize(v.width, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const key = baseKey.replace(`.${ext}`, `_${v.suffix}.webp`);
    await uploadToR2(key, resized, "image/webp");
    results[v.suffix] = `${PUBLIC_URL}/${key}`;
  }

  const originalKey = baseKey.replace(`.${ext}`, `_original.${ext}`);
  await uploadToR2(originalKey, buffer, ext === "webp" ? "image/webp" : "image/jpeg");
  results.original = `${PUBLIC_URL}/${originalKey}`;

  return results as { original: string; w400: string; w800: string; w1200: string };
}
