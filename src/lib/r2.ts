import sharp from "sharp";

const CF_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
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

export async function deleteFromR2(key: string): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`R2 delete failed (${res.status}): ${err}`);
  }
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
