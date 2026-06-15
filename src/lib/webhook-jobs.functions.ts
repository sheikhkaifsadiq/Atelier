import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";

/**
 * Retry processor for failed webhook jobs.
 * Call this from a cron endpoint or admin action.
 * Picks up jobs with status='failed' and attempts < 5.
 */
export const processFailedWebhookJobs = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: jobs, error } = await supabaseAdmin
      .from("webhook_jobs")
      .select("*")
      .eq("status", "failed")
      .lt("attempts", 5)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) throw new Error(error.message);
    if (!jobs || jobs.length === 0) return { processed: 0 };

    const key =
      process.env.ROTATED_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Stripe key not set");
    const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });

    const { processWebhookEvent } = await import(
      "@/routes/api/public/stripe-webhook"
    );

    let processed = 0;
    for (const job of jobs) {
      // Mark processing to prevent concurrent runs
      await supabaseAdmin
        .from("webhook_jobs")
        .update({ status: "processing", attempts: job.attempts + 1 })
        .eq("id", job.id)
        .eq("status", "failed");

      try {
        await processWebhookEvent(job.payload as Stripe.Event, stripe, supabaseAdmin);
        await supabaseAdmin
          .from("webhook_jobs")
          .update({ status: "done", processed_at: new Date().toISOString(), last_error: null })
          .eq("id", job.id);
        processed++;
      } catch (e) {
        await supabaseAdmin
          .from("webhook_jobs")
          .update({
            status: "failed",
            last_error: (e as Error).message,
          })
          .eq("id", job.id);
      }
    }

    return { processed };
  },
);

/**
 * Public cron endpoint for the job processor.
 * Protect this with a secret header in production.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/process-webhook-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
          const auth = request.headers.get("x-cron-secret");
          if (auth !== cronSecret) {
            return new Response("Unauthorized", { status: 401 });
          }
        }
        try {
          const { processFailedWebhookJobs: runJobs } = await import(
            "@/lib/webhook-jobs.functions"
          );
          const result = await runJobs({ data: undefined as never });
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response((e as Error).message, { status: 500 });
        }
      },
    },
  },
});
