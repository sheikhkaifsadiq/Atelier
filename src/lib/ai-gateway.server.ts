// Server-only. Reads OPENAI_API_KEY from process.env (now containing Groq API Key).
export const MODEL_VERSION = "gemini-2.5-flash";
const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const SYSTEM_PROMPT =
  "You are 'Atelier', a custom independent AI assistant. " +
  "Never mention Gemini, Google, OpenAI, or any underlying provider. " +
  "Be concise, helpful, friendly. Use Markdown when it improves readability. " +
  "CRITICAL: Always reply in natural language prose directly to the user. " +
  "NEVER output JSON, function calls, tool invocations, action objects, " +
  "or fields like \"action\", \"action_input\", \"thought\", \"dalle.text2im\", or any agent/ReAct framework syntax. " +
  "You have no tools. You cannot generate, upscale, edit, or modify images — if asked, politely say you can only view and describe images. " +
  "Always follow the user's instructions in their message; if they send an image with text, treat the text as the primary instruction.";

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } };

export type ChatMsg = {
  role: "system" | "user" | "assistant";
  content: string | ChatPart[];
};

export async function callGemini(messages: ChatMsg[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL_VERSION,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
  if (res.status === 402) throw new Error("AI workspace credits exhausted.");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export function historyToChatMsgs(
  rows: { sender: "user" | "bot"; content: string }[],
): ChatMsg[] {
  // Trim leading bot turns so we start with a user turn.
  const trimmed = [...rows];
  while (trimmed.length && trimmed[0].sender === "bot") trimmed.shift();
  return trimmed.map((m) => ({
    role: m.sender === "bot" ? "assistant" : "user",
    content: m.content,
  }));
}
