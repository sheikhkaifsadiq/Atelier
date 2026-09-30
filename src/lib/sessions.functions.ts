import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signMediaUrls } from "./media.server";


export const listSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ title: z.string().min(1).max(120).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title: data.title ?? "New chat" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { session: row };
  });

export const getSessionMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [
      { data: session, error: sErr },
      { data: messages, error: mErr },
      { data: pipelines, error: pErr },
    ] = await Promise.all([
      supabase
        .from("chat_sessions")
        .select("id, title, created_at, updated_at")
        .eq("id", data.sessionId)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id, sender, content, media_type, media_url, created_at, turn_id, variant_index")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("training_data_pipeline")
        .select("id, model_response, created_at")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true }),
    ]);
    if (sErr) throw new Error(sErr.message);
    if (mErr) throw new Error(mErr.message);
    if (pErr) console.error("pipeline fetch failed", pErr);

    const byResponse = new Map<string, string[]>();
    for (const p of pipelines ?? []) {
      const arr = byResponse.get(p.model_response) ?? [];
      arr.push(p.id);
      byResponse.set(p.model_response, arr);
    }
    const paths = (messages ?? []).map((m) => (m as { media_url?: string }).media_url ?? null);
    const signed = await signMediaUrls(paths);
    const enriched = (messages ?? []).map((m, i) => {
      const mediaUrl = signed[i];
      const base = { ...m, mediaUrl } as typeof m & { mediaUrl: string | null; pipelineId?: string | null };
      if (m.sender !== "bot") return base;
      const ids = byResponse.get(m.content);
      const pipelineId = ids?.shift() ?? null;
      return { ...base, pipelineId };
    });
    return { session, messages: enriched };
  });

export const searchSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ q: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const q = data.q.trim();
    // Use ilike with escaped wildcards
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    const pattern = `%${safe}%`;

    const [titleRes, msgRes] = await Promise.all([
      supabase
        .from("chat_sessions")
        .select("id, title, updated_at")
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("messages")
        .select("session_id, content, sender, created_at")
        .eq("user_id", userId)
        .ilike("content", pattern)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);
    if (titleRes.error) throw new Error(titleRes.error.message);
    if (msgRes.error) throw new Error(msgRes.error.message);

    // Collect matching session ids from messages, then fetch their titles
    const msgSessionIds = Array.from(
      new Set((msgRes.data ?? []).map((m) => m.session_id)),
    );
    const titleIds = new Set((titleRes.data ?? []).map((s) => s.id));
    const missingIds = msgSessionIds.filter((id) => !titleIds.has(id));

    let extra: Array<{ id: string; title: string; updated_at: string }> = [];
    if (missingIds.length > 0) {
      const { data: rows, error } = await supabase
        .from("chat_sessions")
        .select("id, title, updated_at")
        .in("id", missingIds);
      if (error) throw new Error(error.message);
      extra = rows ?? [];
    }

    const snippets = new Map<string, string>();
    for (const m of msgRes.data ?? []) {
      if (snippets.has(m.session_id)) continue;
      const idx = m.content.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 30);
      const end = Math.min(m.content.length, idx + q.length + 40);
      snippets.set(
        m.session_id,
        (start > 0 ? "…" : "") + m.content.slice(start, end) + (end < m.content.length ? "…" : ""),
      );
    }

    const all = [...(titleRes.data ?? []), ...extra]
      .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
      .map((s) => ({
        id: s.id,
        title: s.title,
        updated_at: s.updated_at,
        snippet: snippets.get(s.id) ?? null,
        titleMatch: titleIds.has(s.id),
      }));

    return { results: all };
  });

export const renameSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("chat_sessions")
      .update({ title: data.title, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { session: row };
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("chat_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
