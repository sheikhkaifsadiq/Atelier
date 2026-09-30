import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { MODEL_VERSION } from "@/lib/ai-gateway.server";

const BodySchema = z.object({
  message: z.string().min(1).max(8000),
  sessionId: z.string().uuid().optional(),
});

const SYSTEM_PROMPT =
  "You are 'The AI Chatbot', a custom independent AI assistant. " +
  "Never mention Gemini, Google, OpenAI, or any underlying provider. " +
  "Be concise, helpful, friendly. Use Markdown when it improves readability.";

export const Route = createFileRoute("/api/chat/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseAnon = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(supabaseUrl, supabaseAnon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch (e) {
          return new Response((e as Error).message, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: balance, error: deductErr } = await supabaseAdmin.rpc(
          "deduct_credits",
          { _user_id: userId, _amount: 0.1 },
        );
        if (deductErr) return new Response(deductErr.message, { status: 500 });
        if (balance === null) {
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("credits")
            .eq("id", userId)
            .single();
          return new Response(
            JSON.stringify({
              error: "INSUFFICIENT_CREDITS",
              balance: Number(prof?.credits ?? 0),
            }),
            { status: 402, headers: { "content-type": "application/json" } },
          );
        }

        let sessionId = body.sessionId;
        let sessionTitle = "";
        let isNew = false;
        if (sessionId) {
          const { data: s } = await userClient
            .from("chat_sessions")
            .select("id,title")
            .eq("id", sessionId)
            .maybeSingle();
          if (s) sessionTitle = s.title;
          else sessionId = undefined;
        }
        if (!sessionId) {
          const title = body.message.slice(0, 60) || "New chat";
          const { data: s, error } = await userClient
            .from("chat_sessions")
            .insert({ user_id: userId, title })
            .select("id,title")
            .single();
          if (error || !s) return new Response(error?.message ?? "Session error", { status: 500 });
          sessionId = s.id;
          sessionTitle = s.title;
          isNew = true;
        }

        const { data: hist } = await userClient
          .from("messages")
          .select("sender,content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(10);
        const history = (hist ?? []).reverse();

        const key = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY!;
        const upstream = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: MODEL_VERSION,
              stream: true,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...history.map((h) => ({
                  role: h.sender === "bot" ? "assistant" : "user",
                  content: h.content,
                })),
                { role: "user", content: body.message },
              ],
            }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => "");
          return new Response(t || "AI gateway error", { status: upstream.status });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const finalSessionId = sessionId;
        const finalTitle = sessionTitle;
        const isNewSession = isNew;
        const turnId = crypto.randomUUID();

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) =>
              controller.enqueue(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              );

            send("meta", {
              sessionId: finalSessionId,
              sessionTitle: finalTitle,
              isNewSession,
              credits: Number(balance),
              turnId,
            });

            const reader = upstream.body!.getReader();
            let buf = "";
            let fullText = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const json = JSON.parse(payload);
                    const delta = json.choices?.[0]?.delta?.content ?? "";
                    if (delta) {
                      fullText += delta;
                      send("delta", { t: delta });
                    }
                  } catch {
                    /* skip non-json keepalive */
                  }
                }
              }

              const { data: inserted } = await userClient
                .from("messages")
                .insert([
                  {
                    session_id: finalSessionId,
                    user_id: userId,
                    sender: "user",
                    content: body.message,
                    media_type: "text",
                    turn_id: turnId,
                    variant_index: 0,
                  },
                  {
                    session_id: finalSessionId,
                    user_id: userId,
                    sender: "bot",
                    content: fullText,
                    media_type: "text",
                    turn_id: turnId,
                    variant_index: 0,
                  },
                ])
                .select("id, sender, created_at");
              const userMsgId = inserted?.find((m) => m.sender === "user")?.id ?? null;
              const botMsgId = inserted?.find((m) => m.sender === "bot")?.id ?? null;

              await userClient
                .from("chat_sessions")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", finalSessionId);
              const { data: tr } = await userClient
                .from("training_data_pipeline")
                .insert({
                  user_id: userId,
                  session_id: finalSessionId,
                  user_prompt: body.message,
                  model_response: fullText,
                  model_version: MODEL_VERSION,
                })
                .select("id")
                .single();

              send("done", {
                pipelineId: tr?.id ?? null,
                turnId,
                userMsgId,
                botMsgId,
              });
            } catch (e) {
              send("error", { message: (e as Error).message });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
