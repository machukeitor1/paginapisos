import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "webp";
    const timestamp = Date.now();
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const key = `productos/${filename}`;

    const contentType = file.type || "image/webp";
    const url = await uploadToR2(key, buffer, contentType);

    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al subir archivo" }, { status: 500 });
  }
}
