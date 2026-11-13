import { supabase } from "@/integrations/supabase/client";

export const IMAGE_BUCKET = "inventory-product-images";
const prefix = `storage://${IMAGE_BUCKET}/`;

export async function readPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 20_000_000) throw new Error("Choose an image smaller than 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("This photo could not be read.")); img.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}
export async function uploadPhoto(photo: string, folder: string) {
  if (!photo.startsWith("data:image/")) return { reference: photo, path: null };
  const blob = await (await fetch(photo)).blob();
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return { reference: prefix + path, path };
}
export async function resolveInventoryImages<T extends { image_url: string | null }>(items: T[]): Promise<T[]> {
  const paths = [...new Set(items.flatMap((item) => item.image_url?.startsWith(prefix) ? [item.image_url.slice(prefix.length)] : []))];
  if (!paths.length) return items;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 3600);
  if (error) throw error;
  const urls = new Map((data ?? []).map((entry) => [entry.path, entry.signedUrl]));
  return items.map((item) => ({ ...item, image_url: item.image_url?.startsWith(prefix) ? urls.get(item.image_url.slice(prefix.length)) ?? null : item.image_url }));
}