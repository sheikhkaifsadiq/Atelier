import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const rateResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        pipelineId: z.string().uuid(),
        score: z.number().int().min(-1).max(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("training_data_pipeline")
      .update({ quality_score: data.score })
      .eq("id", data.pipelineId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        messageId: z.string().max(255).optional(),
        pipelineId: z.string().uuid().optional().nullable(),
        reason: z.string().min(1).max(80),
        details: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("message_reports").insert({
      user_id: userId,
      message_id: data.messageId ?? null,
      pipeline_id: data.pipelineId ?? null,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
