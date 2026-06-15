import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Composer from "../components/chat/Composer";
import MessageBubble from "../components/chat/MessageBubble";
import SkeletonBubble from "../components/chat/SkeletonBubble";
import TypingDots from "../components/chat/TypingDots";
import {
  getSessionMessages, createSession,
} from "../services/session.service";
import { sendText, sendImage, sendAudio } from "../services/chat.service";
import { useAuth } from "../context/AuthContext";

const EMPTY_PROMPTS = [
  "Brainstorm a name for a coffee subscription startup",
  "Explain transformers like I'm 12",
  "Draft a polite follow-up email to a client",
  "Plan a 3-day trip to Lisbon",
];

export default function Chat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { refreshMe } = useAuth();
  const [pending, setPending] = useState(null); // last user message awaiting reply
  const [animateLastId, setAnimateLastId] = useState(null);
  const scrollRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["session-messages", sessionId],
    queryFn: () => getSessionMessages(sessionId),
    enabled: !!sessionId,
  });

  const messages = data?.messages || [];

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  const onResult = (resp, userContent, mediaType = "text") => {
    qc.setQueryData(["session-messages", resp.sessionId], (prev) => {
      const base = prev?.messages || [];
      return {
        session: prev?.session || { id: resp.sessionId, title: resp.sessionTitle },
        messages: [
          ...base,
          { id: `u-${Date.now()}`, sender: "user", content: userContent, media_type: mediaType },
          { id: `b-${Date.now()}`, sender: "bot", content: resp.reply, pipelineId: resp.pipelineId },
        ],
      };
    });
    setAnimateLastId(resp.pipelineId || `b-${Date.now()}`);
    qc.invalidateQueries({ queryKey: ["sessions"] });
    refreshMe();
    setPending(null);
  };

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const s = await createSession();
    qc.setQueryData(["sessions"], (prev = []) => [s, ...prev]);
    navigate(`/chat/${s.id}`, { replace: true });
    return s.id;
  };

  const textMut = useMutation({
    mutationFn: async (text) => {
      const sid = await ensureSession();
      setPending({ content: text });
      return sendText(text, sid);
    },
    onSuccess: (resp, text) => onResult(resp, text, "text"),
    onError: () => setPending(null),
  });

  const imageMut = useMutation({
    mutationFn: async (file) => {
      const sid = await ensureSession();
      setPending({ content: `🖼️ ${file.name}` });
      return sendImage(file, sid);
    },
    onSuccess: (resp, file) => onResult(resp, `🖼️ ${file.name}`, "image"),
    onError: () => setPending(null),
  });

  const audioMut = useMutation({
    mutationFn: async (file) => {
      const sid = await ensureSession();
      setPending({ content: `🎙️ ${file.name}` });
      return sendAudio(file, sid);
    },
    onSuccess: (resp, file) => onResult(resp, `🎙️ ${file.name}`, "audio"),
    onError: () => setPending(null),
  });

  const busy = textMut.isPending || imageMut.isPending || audioMut.isPending;

  return (
    <AppShell>
      <div className="flex-1 min-h-0 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {!sessionId && !messages.length && (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-500/20 border border-accent-500/30 text-accent-400 mb-4">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-semibold mb-2">How can I help today?</h1>
                <p className="text-ink-400 mb-8">Start typing, or try one of these.</p>
                <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  {EMPTY_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => textMut.mutate(p)}
                      className="text-left rounded-xl border border-white/10 hover:border-white/25
                                 bg-white/[0.03] hover:bg-white/[0.06] p-4 transition"
                    >
                      <span className="text-sm text-ink-200">{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && sessionId && (
              <>
                <SkeletonBubble />
                <SkeletonBubble />
              </>
            )}

            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                animate={m.pipelineId && m.pipelineId === animateLastId}
              />
            ))}

            {pending && (
              <>
                <MessageBubble
                  message={{ id: "pending-u", sender: "user", content: pending.content }}
                />
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-accent-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white/5 border border-white/10">
                    <TypingDots />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-4 md:px-8 pb-6">
          <div className="max-w-3xl mx-auto">
            <Composer
              onSendText={(t) => textMut.mutate(t)}
              onSendImage={(f) => imageMut.mutate(f)}
              onSendAudio={(f) => audioMut.mutate(f)}
              disabled={busy}
            />
            <p className="text-[11px] text-ink-500 text-center mt-2">
              The AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
