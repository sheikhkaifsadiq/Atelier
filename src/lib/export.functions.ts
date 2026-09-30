import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const exportSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ sessionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: session, error: sErr }, { data: messages, error: mErr }, { data: training, error: tErr }] =
      await Promise.all([
        supabase
          .from("chat_sessions")
          .select("id, title, created_at, updated_at")
          .eq("id", data.sessionId)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id, sender, content, media_type, created_at")
          .eq("session_id", data.sessionId)
          .order("created_at", { ascending: true }),
        supabase
          .from("training_data_pipeline")
          .select("id, user_prompt, model_response, model_version, quality_score, created_at")
          .eq("session_id", data.sessionId)
          .order("created_at", { ascending: true }),
      ]);
    if (sErr) throw new Error(sErr.message);
    if (mErr) throw new Error(mErr.message);
    if (tErr) throw new Error(tErr.message);
    if (!session) throw new Error("Session not found");
    return {
      session,
      messages: messages ?? [],
      feedback: training ?? [],
      exportedAt: new Date().toISOString(),
    };
  });
