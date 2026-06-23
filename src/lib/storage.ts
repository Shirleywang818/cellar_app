import "server-only";
import { randomUUID } from "crypto";
import { extname } from "path";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export const MAX_LABEL_IMAGE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function assertValidLabelImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Please upload a JPEG, PNG, WebP, HEIC, or HEIF image.");
  }

  if (file.size > MAX_LABEL_IMAGE_BYTES) {
    throw new Error("Please upload an image smaller than 10 MB.");
  }
}

export async function uploadTempLabelImage(file: File) {
  assertValidLabelImage(file);

  const supabase = createServiceClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = MIME_EXTENSIONS[file.type] ?? extname(file.name).replace(".", "") ?? "jpg";
  const path = `pending/${env.OWNER_USER_ID}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload label image: ${error.message}`);
  }

  return { path, bytes, mimeType: file.type };
}

export async function finalizeLabelImage(photoPath: string | null | undefined) {
  if (!photoPath || !photoPath.startsWith("pending/")) {
    return photoPath ?? null;
  }

  const supabase = createServiceClient();
  const finalPath = photoPath.replace(/^pending\//, "labels/");

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .move(photoPath, finalPath);

  if (error) {
    throw new Error(`Failed to finalize label image: ${error.message}`);
  }

  return finalPath;
}

export async function createSignedLabelUrl(photoPath: string | null) {
  if (!photoPath) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(photoPath, 60 * 10);

  if (error) {
    return null;
  }

  return data.signedUrl;
}
