import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "chat-media";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

/** Upload a base64 data URL to storage. Returns storage path (not URL). */
export async function uploadDataUrl(
  userId: string,
  fileName: string,
  mimeType: string,
  dataUrl: string,
): Promise<string> {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const safeName = fileName.replace(/[^\w.\-]/g, "_");
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function signMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signMediaUrls(paths: (string | null | undefined)[]): Promise<(string | null)[]> {
  const valid = paths.filter((p): p is string => !!p);
  if (valid.length === 0) return paths.map(() => null);
  const { data } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrls(valid, SIGNED_URL_TTL);
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    if (r.path && r.signedUrl) map.set(r.path, r.signedUrl);
  }
  return paths.map((p) => (p ? map.get(p) ?? null : null));
}
