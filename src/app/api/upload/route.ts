import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-100);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  // "proof" (booking screenshot) or "qr" (payment QR code)
  const kind = form.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 });
  }
  if (kind !== "proof" && kind !== "qr") {
    return NextResponse.json({ error: "kind không hợp lệ" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Chỉ chấp nhận ảnh PNG/JPEG/WebP" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Ảnh vượt quá 8MB" }, { status: 400 });
  }

  const filename = `${session.user.id}-${Date.now()}-${sanitizeFilename(file.name)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${kind}/${filename}`, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  }

  // Local dev fallback — no Vercel Blob store configured. Writes straight
  // into public/uploads so the file is servable immediately, same as it
  // would be from Blob's public URL. Never used in production: the deploy
  // guide requires BLOB_READ_WRITE_TOKEN to be set there, and Vercel's
  // filesystem is read-only/ephemeral for serverless functions anyway.
  const uploadDir = path.join(process.cwd(), "public", "uploads", kind);
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${kind}/${filename}` });
}
