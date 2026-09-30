import { createFileRoute } from "@tanstack/react-router";

/**
 * Keep-alive + demo-seed cron endpoint.
 *
 * Supabase free-tier projects auto-pause after ~7 days with no activity. This
 * endpoint is hit on a schedule (see vercel.json `crons`) to:
 *   1. touch the database so the project never pauses, and
 *   2. ensure the shared demo account exists and is topped up.
 *
 * Auth: Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`
 * when a CRON_SECRET env var is set. A `?key=` query param is also accepted so
 * the job can be triggered manually. If CRON_SECRET is unset the endpoint still
 * runs (so first-time setup works), but setting it is strongly recommended.
 */
export const Route = createFileRoute("/api/public/keep-alive")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (secret) {
          const url = new URL(request.url);
          const header = request.headers.get("authorization");
          const bearerOk = header === `Bearer ${secret}`;
          const queryOk = url.searchParams.get("key") === secret;
          if (!bearerOk && !queryOk) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          // 1. Touch the DB — this write/read is what prevents auto-pause.
          const { error: pingErr } = await supabaseAdmin
            .from("profiles")
            .select("id", { count: "exact", head: true });
          if (pingErr) throw new Error(pingErr.message);

          // 2. Ensure the demo account is present and healthy.
          const { seedDemoUser } = await import("@/lib/demo.functions");
          const { created } = await seedDemoUser();

          return new Response(
            JSON.stringify({
              ok: true,
              pinged: true,
              demoCreated: created,
              at: new Date().toISOString(),
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          console.error("[keep-alive] failed", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
