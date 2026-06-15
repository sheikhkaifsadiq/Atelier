import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const setSessionShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), enable: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Verify user owns the session via RLS by reading it first
    const { data: existing, error: rErr } = await supabase
      .from("chat_sessions")
      .select("id, share_token")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!existing) throw new Error("Session not found");

    if (!data.enable) {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ share_token: null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { shareToken: null };
    }
    if (existing.share_token) return { shareToken: existing.share_token };
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase
      .from("chat_sessions")
      .update({ share_token: token })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { shareToken: token };
  });

export const getPublicSession = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z.object({ token: z.string().min(8).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: session, error: sErr } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at, share_token")
      .eq("share_token", data.token)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("This shared chat is not available.");
    const { data: messages, error: mErr } = await supabase
      .from("messages")
      .select("id, sender, content, media_type, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return {
      session: { id: session.id, title: session.title, updated_at: session.updated_at },
      messages: messages ?? [],
    };
  });

export const forkPublicSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ token: z.string().min(8).max(64) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src, error: sErr } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, title")
      .eq("share_token", data.token)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!src) throw new Error("This shared chat is not available.");

    const { data: msgs, error: mErr } = await supabaseAdmin
      .from("messages")
      .select("sender, content, media_type, created_at")
      .eq("session_id", src.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    const { data: newSession, error: nsErr } = await supabaseAdmin
      .from("chat_sessions")
      .insert({ user_id: userId, title: src.title || "Shared chat" })
      .select("id")
      .single();
    if (nsErr) throw new Error(nsErr.message);

    if (msgs && msgs.length > 0) {
      const rows = msgs.map((m) => ({
        session_id: newSession.id,
        user_id: userId,
        sender: m.sender,
        content: m.content,
        media_type: m.media_type,
      }));
      const { error: insErr } = await supabaseAdmin.from("messages").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
    return { sessionId: newSession.id };
  });
