import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signMediaUrls } from "./media.server";

export type UploadRow = {
  id: string;
  session_id: string;
  content: string;
  media_type: "image" | "audio" | "document";
  media_url: string | null;
  mediaUrl: string | null;
  created_at: string;
};

/** Everything the user has sent that isn't plain text — used by the "My Uploads" page. */
export const listMyUploads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("messages")
      .select("id, session_id, content, media_type, media_url, created_at")
      .eq("sender", "user")
      .in("media_type", ["image", "audio", "document"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<Omit<UploadRow, "mediaUrl">>;
    const signed = await signMediaUrls(rows.map((r) => r.media_url));
    const uploads: UploadRow[] = rows.map((r, i) => ({ ...r, mediaUrl: signed[i] }));
    return { uploads };
  });
