import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  callGemini,
  historyToChatMsgs,
  MODEL_VERSION,
  type ChatMsg,
} from "./ai-gateway.server";
import { uploadDataUrl, signMediaUrl } from "./media.server";

const COSTS = { text: 0.1, image: 0.5, audio: 0.3 } as const;
const HISTORY_LIMIT = 10;

const CREDIT_ERROR = "INSUFFICIENT_CREDITS";

async function deductOr402(userId: string, amount: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("deduct_credits", {
    _user_id: userId,
    _amount: amount,
  });
  if (error) throw new Error(error.message);
  if (data === null) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    // Encoded in message so it survives TanStack serverFn error serialization.
    throw new Error(`${CREDIT_ERROR}:${Number(prof?.credits ?? 0)}`);
  }
  return Number(data);
}

async function ensureSession(
  supabase: ReturnType<typeof Object>,
  userId: string,
  sessionId: string | undefined,
  fallbackTitle: string,
): Promise<{ id: string; isNew: boolean; title: string }> {
  if (sessionId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("chat_sessions")
      .select("id, title")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return { id: data.id, isNew: false, title: data.title };
  }
  const title = fallbackTitle.slice(0, 60) || "New chat";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("chat_sessions")
    .insert({ user_id: userId, title })
    .select("id, title")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, isNew: true, title: data.title };
}

async function loadHistory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  sessionId: string,
): Promise<{ sender: "user" | "bot"; content: string }[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("sender, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .reverse()
    .map((m: { sender: "user" | "bot"; content: string }) => ({
      sender: m.sender,
      content: m.content,
    }));
}

async function persistTurn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  sessionId: string,
  userContent: string,
  botContent: string,
  mediaType: "text" | "image" | "audio",
  mediaUrl: string | null = null,
): Promise<string> {
  const turnId = crypto.randomUUID();
  const { error } = await supabase.from("messages").insert([
    { session_id: sessionId, user_id: userId, sender: "user", content: userContent, media_type: mediaType, media_url: mediaUrl, turn_id: turnId, variant_index: 0 },
    { session_id: sessionId, user_id: userId, sender: "bot", content: botContent, media_type: "text", turn_id: turnId, variant_index: 0 },
  ]);
  if (error) throw new Error(error.message);
  await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  return turnId;
}

async function persistTurnWithRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  sessionId: string,
  userContent: string,
  botContent: string,
  mediaType: "image" | "audio",
  mediaUrl: string,
): Promise<{
  turnId: string;
  userMsgId: string | null;
  botMsgId: string | null;
  createdAt: string | null;
}> {
  const turnId = crypto.randomUUID();
  const { data, error } = await supabase
    .from("messages")
    .insert([
      { session_id: sessionId, user_id: userId, sender: "user", content: userContent, media_type: mediaType, media_url: mediaUrl, turn_id: turnId, variant_index: 0 },
      { session_id: sessionId, user_id: userId, sender: "bot", content: botContent, media_type: "text", turn_id: turnId, variant_index: 0 },
    ])
    .select("id, sender, created_at");
  if (error) throw new Error(error.message);
  await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  const userMsg = data?.find((m: { sender: string }) => m.sender === "user");
  const botMsg = data?.find((m: { sender: string }) => m.sender === "bot");
  return {
    turnId,
    userMsgId: userMsg?.id ?? null,
    botMsgId: botMsg?.id ?? null,
    createdAt: userMsg?.created_at ?? botMsg?.created_at ?? null,
  };
}

async function logTraining(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  sessionId: string,
  userPrompt: string,
  modelResponse: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("training_data_pipeline")
    .insert({
      user_id: userId,
      session_id: sessionId,
      user_prompt: userPrompt,
      model_response: modelResponse,
      model_version: MODEL_VERSION,
    })
    .select("id")
    .single();
  if (error) {
    console.error("training pipeline insert failed", error);
    return null;
  }
  return data.id as string;
}

/* ============ TEXT ============ */
const TextInput = z.object({
  message: z.string().min(1).max(8000),
  sessionId: z.string().uuid().optional(),
});

export const sendText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => TextInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const balance = await deductOr402(userId, COSTS.text);

    const session = await ensureSession(supabase, userId, data.sessionId, data.message);
    const history = await loadHistory(supabase, session.id);
    const msgs: ChatMsg[] = [
      ...historyToChatMsgs(history),
      { role: "user", content: data.message },
    ];
    const reply = await callGemini(msgs);
    await persistTurn(supabase, userId, session.id, data.message, reply, "text");
    const pipelineId = await logTraining(supabase, userId, session.id, data.message, reply);
    return {
      sessionId: session.id,
      sessionTitle: session.title,
      reply,
      pipelineId,
      credits: balance,
      isNewSession: session.isNew,
    };
  });

/* ============ IMAGE ============ */
const ImageInput = z.object({
  message: z.string().max(2000).optional(),
  sessionId: z.string().uuid().optional(),
  fileName: z.string().max(200),
  mimeType: z.string().regex(/^image\//),
  dataUrl: z.string().startsWith("data:"),
});

export const sendImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const balance = await deductOr402(userId, COSTS.image);
    const prompt = data.message?.trim() || "Describe this image in detail.";
    const userContent = data.message?.trim() || "";
    const mediaPath = await uploadDataUrl(userId, data.fileName, data.mimeType, data.dataUrl);
    const session = await ensureSession(supabase, userId, data.sessionId, userContent || `🖼️ ${data.fileName}`);
    const history = await loadHistory(supabase, session.id);
    const msgs: ChatMsg[] = [
      ...historyToChatMsgs(history),
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: data.dataUrl } },
        ],
      },
    ];
    const reply = await callGemini(msgs);
    const saved = await persistTurnWithRows(supabase, userId, session.id, userContent, reply, "image", mediaPath);
    const pipelineId = await logTraining(supabase, userId, session.id, userContent || `🖼️ ${data.fileName}`, reply);
    const mediaUrl = await signMediaUrl(mediaPath);
    return {
      sessionId: session.id,
      sessionTitle: session.title,
      reply,
      pipelineId,
      credits: balance,
      isNewSession: session.isNew,
      mediaUrl,
      ...saved,
    };
  });

/* ============ AUDIO (best-effort: transcribe-style prompt) ============ */
const AudioInput = z.object({
  sessionId: z.string().uuid().optional(),
  fileName: z.string().max(200),
  mimeType: z.string(),
  dataUrl: z.string().startsWith("data:"),
});

export const sendAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => AudioInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const balance = await deductOr402(userId, COSTS.audio);
    const userContent = "";
    const mediaPath = await uploadDataUrl(userId, data.fileName, data.mimeType, data.dataUrl);
    const session = await ensureSession(supabase, userId, data.sessionId, `🎙️ ${data.fileName}`);
    const history = await loadHistory(supabase, session.id);

    // Strip "data:audio/xxx;base64," prefix to raw base64
    const commaIdx = data.dataUrl.indexOf(",");
    const base64 = commaIdx >= 0 ? data.dataUrl.slice(commaIdx + 1) : data.dataUrl;
    const subtype = (data.mimeType.split("/")[1] || "mpeg").split(";")[0];
    const format = subtype === "mpeg" ? "mp3" : subtype; // OpenAI uses "mp3" not "mpeg"

    let reply = "";
    try {
      reply = await callGemini([
        ...historyToChatMsgs(history),
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this audio and then answer or respond helpfully to its content." },
            { type: "input_audio", input_audio: { data: base64, format } },
          ],
        },
      ]);
    } catch (e) {
      // Fallback if the gateway/model rejects audio: graceful acknowledgement
      const msg = (e as Error).message;
      console.warn("Audio inference failed, falling back:", msg);
      reply = await callGemini([
        ...historyToChatMsgs(history),
        {
          role: "user",
          content:
            `The user uploaded an audio file named "${data.fileName}" but the audio backend rejected it (${msg.slice(0, 120)}). ` +
            `Apologize briefly in one short sentence and ask them to describe the audio content in text.`,
        },
      ]);
    }

    const saved = await persistTurnWithRows(supabase, userId, session.id, userContent, reply, "audio", mediaPath);
    const pipelineId = await logTraining(supabase, userId, session.id, `🎙️ ${data.fileName}`, reply);
    const mediaUrl = await signMediaUrl(mediaPath);
    return {
      sessionId: session.id,
      sessionTitle: session.title,
      reply,
      pipelineId,
      credits: balance,
      isNewSession: session.isNew,
      mediaUrl,
      ...saved,
    };
  });

/* ============ EDIT LAST USER MESSAGE → NEW VARIANT ============ */
const EditInput = z.object({
  sessionId: z.string().uuid(),
  messageId: z.string().uuid(),
  newContent: z.string().min(1).max(8000),
});

export const editLastUserMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => EditInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify session ownership + grab last 2 messages (bot reply, then user msg)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tail, error: tErr } = await (supabase as any)
      .from("messages")
      .select("id, sender, turn_id, variant_index, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: false })
      .limit(4);
    if (tErr) throw new Error(tErr.message);
    if (!tail || tail.length === 0) throw new Error("No messages in this session");

    // The last user message must match messageId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastUser = tail.find((m: any) => m.sender === "user");
    if (!lastUser || lastUser.id !== data.messageId) {
      throw new Error("You can only edit the most recent message");
    }
    // The bot paired with lastUser is inserted in the same statement and
    // therefore shares the same created_at (>=, not strictly >). Pick the
    // most-recent bot row from the tail.
    const bots = tail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.sender === "bot")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastBot = bots[0] as any | undefined;

    // Ensure both have a turn_id (backfill for legacy rows)
    let turnId: string = lastUser.turn_id;
    if (!turnId) {
      turnId = crypto.randomUUID();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("messages").update({ turn_id: turnId }).eq("id", lastUser.id);
    }
    // Backfill the paired bot independently — it may already lack a turn_id
    // even when the user row has one (from older edit attempts).
    if (lastBot && !lastBot.turn_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("messages").update({ turn_id: turnId }).eq("id", lastBot.id);
    }

    // Compute next variant_index
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: variants } = await (supabase as any)
      .from("messages")
      .select("variant_index")
      .eq("turn_id", turnId)
      .order("variant_index", { ascending: false })
      .limit(1);
    const nextIndex = (variants?.[0]?.variant_index ?? 0) + 1;

    // Deduct credits AFTER validation so failed edits don't drain credit
    const balance = await deductOr402(userId, COSTS.text);

    // History = everything BEFORE the original turn
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hist } = await (supabase as any)
      .from("messages")
      .select("sender, content, created_at")
      .eq("session_id", data.sessionId)
      .lt("created_at", lastUser.created_at)
      .order("created_at", { ascending: true })
      .limit(HISTORY_LIMIT);

    const msgs: ChatMsg[] = [
      ...historyToChatMsgs(
        (hist ?? []).map((h: { sender: "user" | "bot"; content: string }) => ({
          sender: h.sender,
          content: h.content,
        })),
      ),
      { role: "user", content: data.newContent },
    ];
    const reply = await callGemini(msgs);

    // Insert new variant pair
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insErr } = await (supabase as any)
      .from("messages")
      .insert([
        {
          session_id: data.sessionId,
          user_id: userId,
          sender: "user",
          content: data.newContent,
          media_type: "text",
          turn_id: turnId,
          variant_index: nextIndex,
        },
        {
          session_id: data.sessionId,
          user_id: userId,
          sender: "bot",
          content: reply,
          media_type: "text",
          turn_id: turnId,
          variant_index: nextIndex,
        },
      ])
      .select("id, sender, content, media_type, created_at, turn_id, variant_index");
    if (insErr) throw new Error(insErr.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newUser = inserted.find((m: any) => m.sender === "user");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newBot = inserted.find((m: any) => m.sender === "bot");

    await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.sessionId);

    const pipelineId = await logTraining(
      supabase,
      userId,
      data.sessionId,
      data.newContent,
      reply,
    );

    return {
      turnId,
      variantIndex: nextIndex,
      userMessage: newUser,
      botMessage: { ...newBot, pipelineId },
      credits: balance,
    };
  });
