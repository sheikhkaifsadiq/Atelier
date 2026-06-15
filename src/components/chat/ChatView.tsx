import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Composer } from "./Composer";
import { MessageBubble, type BubbleMessage } from "./MessageBubble";
import { SkeletonBubble } from "./SkeletonBubble";
import { TypingDots } from "./TypingDots";
import { useCreditsModal } from "./CreditsModal";
import { getSessionMessages } from "@/lib/sessions.functions";
import { sendImage, sendAudio, editLastUserMessage } from "@/lib/chat.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import atelierLogo from "@/assets/atelier-logo.png";
import atelierWordmark from "@/assets/atelier-logo-full.png";

type MsgRow = {
  id: string;
  sender: "user" | "bot";
  content: string;
  media_type: string;
  created_at?: string;
  pipelineId?: string | null;
  turn_id?: string | null;
  variant_index?: number;
  mediaUrl?: string;
};


type TurnVariant = {
  user: MsgRow;
  bot?: MsgRow;
};

type Turn = {
  /** turn_id, or synthetic id for legacy null-turn rows */
  key: string;
  realTurnId: string | null;
  variants: TurnVariant[];
};

const PROMPTS = [
  "Brainstorm a name for a coffee subscription startup",
  "Explain transformers like I'm 12",
  "Draft a polite follow-up email to a client",
  "Plan a 3-day trip to Lisbon",
];

async function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

/** Group flat messages into ordered turns, each with its variants. */
function buildTurns(msgs: MsgRow[]): Turn[] {
  const turns: Turn[] = [];
  const ordered = msgs
    .map((m, index) => ({ m, index }))
    .sort((a, b) => {
      const aTime = a.m.created_at ? new Date(a.m.created_at).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.m.created_at ? new Date(b.m.created_at).getTime() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      const aVariant = a.m.variant_index ?? 0;
      const bVariant = b.m.variant_index ?? 0;
      if (aVariant !== bVariant) return aVariant - bVariant;
      if (a.m.sender !== b.m.sender) return a.m.sender === "user" ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ m }) => m);
  // Track turn_id → index for grouping variants
  const byTurnId = new Map<string, number>();
  let legacyCounter = 0;

  for (const m of ordered) {
    if (m.sender === "user") {
      const key = m.turn_id ?? `legacy-${legacyCounter++}-${m.id}`;
      const realId = m.turn_id ?? null;
      let idx = realId ? byTurnId.get(realId) : undefined;
      if (idx === undefined) {
        idx = turns.length;
        turns.push({ key, realTurnId: realId, variants: [] });
        if (realId) byTurnId.set(realId, idx);
      }
      turns[idx].variants.push({ user: m });
    } else {
      // bot — attach to the matching turn variant
      if (m.turn_id) {
        const idx = byTurnId.get(m.turn_id);
        if (idx !== undefined) {
          const turn = turns[idx];
          const vi = m.variant_index ?? 0;
          const variant =
            turn.variants.find((v) => (v.user.variant_index ?? 0) === vi) ??
            turn.variants[turn.variants.length - 1];
          if (variant && !variant.bot) variant.bot = m;
          continue;
        }
      }
      // legacy: attach to last turn with no bot yet
      const last = turns[turns.length - 1];
      if (last) {
        const v = last.variants[last.variants.length - 1];
        if (v && !v.bot) {
          v.bot = m;
          continue;
        }
      }
      // orphan bot — render as its own turn with no user
      turns.push({
        key: `orphan-${m.id}`,
        realTurnId: null,
        variants: [{ user: { ...m, sender: "user", content: "" }, bot: m }],
      });
    }
  }

  // Sort variants by variant_index ascending
  for (const t of turns) {
    t.variants.sort(
      (a, b) => (a.user.variant_index ?? 0) - (b.user.variant_index ?? 0),
    );
  }
  return turns;
}

export function ChatView({ sessionId }: { sessionId?: string }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const credits = useCreditsModal();
  const getMessages = useServerFn(getSessionMessages);
  const sendImageFn = useServerFn(sendImage);
  const sendAudioFn = useServerFn(sendAudio);
  const editFn = useServerFn(editLastUserMessage);
  const profileFn = useServerFn(getMyProfile);

  const { data: profileData } = useQuery({
    queryKey: ["me"],
    queryFn: () => profileFn(),
    refetchOnWindowFocus: false,
  });
  const avatarUrl = profileData?.profile?.avatar_url ?? null;
  const username = profileData?.profile?.username ?? null;

  const [pending, setPending] = useState<{ content: string; mediaUrl?: string; mediaType?: "image" | "audio" } | null>(null);
  const [streaming, setStreaming] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [animateLastId, setAnimateLastId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Record<string, number>>({});
  const [editingPending, setEditingPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance < 80);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["session-messages", sessionId],
    queryFn: () => getMessages({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
  });
  const messages = (data?.messages ?? []) as MsgRow[];
  const turns = useMemo(() => buildTurns(messages), [messages]);

  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [messages.length, streaming, atBottom, scrollToBottom]);

  useEffect(() => {
    if (pending) scrollToBottom();
  }, [pending, scrollToBottom]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleError = (err: any) => {
    setPending(null);
    setStreaming("");
    setIsStreaming(false);
    setEditingPending(false);
    const msg: string = err?.message || String(err);
    const m = msg.match(/INSUFFICIENT_CREDITS:([0-9.]+)/);
    if (m) {
      credits.open({ balance: Number(m[1]) });
      return;
    }
    toast.error(msg || "Something went wrong");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSuccess = (resp: any, userContent: string, media: "text" | "image" | "audio", mediaUrl?: string) => {
    const sid = resp.sessionId as string;
    const turnId = resp.turnId ?? crypto.randomUUID();
    const createdAt = resp.createdAt ?? new Date().toISOString();
    qc.setQueryData<{ session: unknown; messages: MsgRow[] }>(
      ["session-messages", sid],
      (prev) => ({
        session: prev?.session ?? { id: sid, title: resp.sessionTitle },
        messages: [
          ...(prev?.messages ?? []),
          {
            id: resp.userMsgId ?? `u-${Date.now()}`,
            sender: "user",
            content: userContent,
            media_type: media,
            created_at: createdAt,
            turn_id: turnId,
            variant_index: 0,
            mediaUrl,
          },
          {
            id: resp.botMsgId ?? `b-${Date.now()}`,
            sender: "bot",
            content: resp.reply,
            media_type: "text",
            created_at: createdAt,
            pipelineId: resp.pipelineId,
            turn_id: turnId,
            variant_index: 0,
          },
        ],
      }),
    );
    setAnimateLastId(resp.pipelineId || `b-${Date.now()}`);
    qc.invalidateQueries({ queryKey: ["sessions"] });
    qc.invalidateQueries({ queryKey: ["me"] });
    if (media !== "text") qc.invalidateQueries({ queryKey: ["my-uploads"] });
    qc.invalidateQueries({ queryKey: ["session-messages", sid] });

    setPending(null);
    if (resp.isNewSession && !sessionId) {
      nav({ to: "/chat/$sessionId", params: { sessionId: sid }, replace: true });
    }
  };


  // ============ TRUE SSE STREAMING for TEXT ============
  const sendStreamingText = async (text: string) => {
    setPending({ content: text });
    setStreaming("");
    setIsStreaming(true);
    try {
      const { data: sessRes } = await supabase.auth.getSession();
      const token = sessRes.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (resp.status === 402) {
        const body = await resp.json().catch(() => ({}));
        credits.open({ balance: Number(body.balance ?? 0) });
        setPending(null);
        setIsStreaming(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error((await resp.text().catch(() => "")) || `Stream error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      type Meta = { sessionId: string; sessionTitle: string; isNewSession: boolean; credits: number; turnId: string };
      type Done = { pipelineId: string | null; turnId: string; userMsgId: string | null; botMsgId: string | null };
      let meta: Meta | null = null;
      let fullText = "";
      let donePayload: Done | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          const lines = evt.split("\n");
          let name = "message";
          let dataStr = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) name = ln.slice(6).trim();
            else if (ln.startsWith("data:")) dataStr += ln.slice(5).trim();
          }
          if (!dataStr) continue;
          let payload: unknown;
          try {
            payload = JSON.parse(dataStr);
          } catch {
            continue;
          }
          if (name === "meta") {
            meta = payload as Meta;
            if (meta?.isNewSession && !sessionId) {
              nav({
                to: "/chat/$sessionId",
                params: { sessionId: meta.sessionId },
                replace: true,
              });
            }
          } else if (name === "delta") {
            const t = (payload as { t: string }).t;
            fullText += t;
            setStreaming(fullText);
          } else if (name === "done") {
            donePayload = payload as Done;
          } else if (name === "error") {
            throw new Error((payload as { message: string }).message);
          }
        }
      }

      const sid = meta?.sessionId ?? sessionId!;
      const turnId = donePayload?.turnId ?? meta?.turnId ?? crypto.randomUUID();
      const createdAt = new Date().toISOString();
      qc.setQueryData<{ session: unknown; messages: MsgRow[] }>(
        ["session-messages", sid],
        (prev) => ({
          session: prev?.session ?? { id: sid, title: meta?.sessionTitle },
          messages: [
            ...(prev?.messages ?? []),
            {
              id: donePayload?.userMsgId ?? `u-${Date.now()}`,
              sender: "user",
              content: text,
              media_type: "text",
              created_at: createdAt,
              turn_id: turnId,
              variant_index: 0,
            },
            {
              id: donePayload?.botMsgId ?? `b-${Date.now()}`,
              sender: "bot",
              content: fullText,
              media_type: "text",
              created_at: createdAt,
              pipelineId: donePayload?.pipelineId ?? null,
              turn_id: turnId,
              variant_index: 0,
            },
          ],
        }),
      );
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      handleError(e);
      return;
    } finally {
      setPending(null);
      setStreaming("");
      setIsStreaming(false);
    }
  };

  const editMut = useMutation({
    mutationFn: async ({
      messageId,
      newContent,
    }: {
      messageId: string;
      newContent: string;
    }) => editFn({ data: { sessionId: sessionId!, messageId, newContent } }),
    onMutate: ({ newContent }) => {
      setEditingPending(true);
      setPending({ content: newContent });
    },
    onSuccess: (res) => {
      const sid = sessionId!;
      qc.setQueryData<{ session: unknown; messages: MsgRow[] }>(
        ["session-messages", sid],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              { ...res.userMessage, sender: "user" as const },
              {
                ...res.botMessage,
                sender: "bot" as const,
                pipelineId: res.botMessage.pipelineId,
              },
            ],
          };
        },
      );
      // Select the new variant for this turn
      setSelectedVariant((s) => ({ ...s, [res.turnId]: res.variantIndex }));
      setAnimateLastId(res.botMessage.pipelineId || `b-${Date.now()}`);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["session-messages", sid] });
      setPending(null);
      setEditingPending(false);
    },
    onError: handleError,
  });

  const imageMut = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      const previewUrl = URL.createObjectURL(file);
      const display = caption;
      setPending({ content: display, mediaUrl: previewUrl, mediaType: "image" });
      const dataUrl = await fileToDataUrl(file);
      const resp = await sendImageFn({
        data: {
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          dataUrl,
          sessionId,
          message: caption || undefined,
        },
      });
      return { resp, previewUrl, display };
    },
    onSuccess: ({ resp, previewUrl, display }) =>
      handleSuccess(resp, display, "image", resp.mediaUrl ?? previewUrl),
    onError: handleError,
  });

  const audioMut = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      const previewUrl = URL.createObjectURL(file);
      const display = caption;
      setPending({ content: display, mediaUrl: previewUrl, mediaType: "audio" });
      const dataUrl = await fileToDataUrl(file);
      const resp = await sendAudioFn({
        data: {
          fileName: file.name,
          mimeType: file.type || "audio/mpeg",
          dataUrl,
          sessionId,
        },
      });
      return { resp, previewUrl, display };
    },
    onSuccess: ({ resp, previewUrl, display }) =>
      handleSuccess(resp, display, "audio", resp.mediaUrl ?? previewUrl),
    onError: handleError,
  });



  const busy = isStreaming || imageMut.isPending || audioMut.isPending || editingPending;

  const lastTurnIndex = turns.length - 1;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div
        ref={scrollRef}
        onScroll={checkAtBottom}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6"
      >
        <div className="max-w-3xl mx-auto space-y-5">
          {!sessionId && !pending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="inline-flex items-center justify-center mb-3">
                <img src={atelierWordmark} alt="Atelier" className="h-9 sm:h-10 w-auto object-contain" />
              </div>

              <h1 className="text-xl font-semibold mb-1">How can I help today?</h1>
              <p className="text-sm text-muted-foreground mb-6">
                An assistant that listens first, then thinks with you.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendStreamingText(p)}
                    className="text-left rounded-xl border bg-card hover:bg-accent transition p-4"
                  >
                    <span className="text-sm">{p}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {isLoading && sessionId && (
            <>
              <SkeletonBubble />
              <SkeletonBubble />
            </>
          )}

          {turns.map((turn, ti) => {
            const total = turn.variants.length;
            // Default selection = last variant
            const selected = Math.min(
              selectedVariant[turn.key] ?? total - 1,
              total - 1,
            );
            const variant = turn.variants[selected];
            const isLastTurn = ti === lastTurnIndex;
            const userMsg = variant.user;
            const botMsg = variant.bot;

            const userBubble: BubbleMessage = userMsg;
            const botBubble: BubbleMessage | undefined = botMsg;

            const pager =
              total > 1
                ? {
                    index: selected,
                    total,
                    onPrev: () =>
                      setSelectedVariant((s) => ({
                        ...s,
                        [turn.key]: Math.max(0, selected - 1),
                      })),
                    onNext: () =>
                      setSelectedVariant((s) => ({
                        ...s,
                        [turn.key]: Math.min(total - 1, selected + 1),
                      })),
                  }
                : undefined;

            return (
              <div key={turn.key} className="space-y-5">
                {(userMsg.content !== "" || userMsg.mediaUrl || userMsg.media_type !== "text") && (
                  <MessageBubble
                    message={userBubble}
                    avatarUrl={avatarUrl}
                    username={username}
                    variant={pager}
                    editable={isLastTurn && !busy}
                    onEditSubmit={async (newContent) => {
                      await editMut.mutateAsync({
                        messageId: userMsg.id,
                        newContent,
                      });
                    }}
                  />
                )}
                {botBubble && (
                  <MessageBubble
                    message={botBubble}
                    animate={
                      !!botBubble.pipelineId && botBubble.pipelineId === animateLastId
                    }
                  />
                )}
              </div>
            );
          })}

          {pending && (
            <>
              <MessageBubble
                message={{
                  id: "p",
                  sender: "user",
                  content: pending.content,
                  media_type: pending.mediaType ?? "text",
                  mediaUrl: pending.mediaUrl,
                }}
                avatarUrl={avatarUrl}
                username={username}
              />

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/5 grid place-items-center shrink-0 overflow-hidden">
                  <img src={atelierLogo} alt="Atelier" className="w-7 h-7 object-contain" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border max-w-[85%]">
                  {streaming ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown>{streaming}</ReactMarkdown>
                    </div>
                  ) : (
                    <TypingDots />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute left-1/2 -translate-x-1/2 bottom-[7.5rem] z-20 flex items-center gap-1.5 rounded-full border bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-md hover:bg-accent transition"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          Scroll to bottom
        </button>
      )}

      <div className="shrink-0 border-t bg-background px-4 md:px-8 py-3">
        <div className="max-w-3xl mx-auto">
          <Composer
            disabled={busy}
            onSend={({ text, attachment }) => {
              setAtBottom(true);
              if (attachment) {
                if (attachment.kind === "image") {
                  imageMut.mutate({ file: attachment.file, caption: text });
                } else {
                  audioMut.mutate({ file: attachment.file, caption: text });
                }
                return;
              }
              if (text) sendStreamingText(text);
            }}
            onSendAudioRecording={(f) => {
              setAtBottom(true);
              audioMut.mutate({ file: f, caption: "" });
            }}
          />

          <p className="text-[11px] text-muted-foreground text-center mt-2">
            The AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
