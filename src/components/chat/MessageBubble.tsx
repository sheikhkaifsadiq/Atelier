import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Copy, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Typewriter } from "./Typewriter";
import { FeedbackButtons } from "./FeedbackButtons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import atelierLogo from "@/assets/atelier-logo.png";
import { AudioPlayer } from "./AudioPlayer";

export type BubbleMessage = {
  id: string;
  sender: "user" | "bot";
  content: string;
  media_type?: string;
  mediaUrl?: string;
  pipelineId?: string | null;
};


export function MessageBubble({
  message,
  animate,
  readOnly,
  avatarUrl,
  username,
  variant,
  editable,
  onEditSubmit,
}: {
  message: BubbleMessage;
  animate?: boolean;
  readOnly?: boolean;
  avatarUrl?: string | null;
  username?: string | null;
  /** Variant pager for this message's turn. Omitted when single variant. */
  variant?: {
    index: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
  };
  /** True only for the most recent user message. */
  editable?: boolean;
  onEditSubmit?: (newContent: string) => Promise<void> | void;
}) {
  const isUser = message.sender === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const initial = (username?.trim()?.[0] ?? "U").toUpperCase();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const submitEdit = async () => {
    const next = draft.trim();
    if (!next || next === message.content) {
      setEditing(false);
      setDraft(message.content);
      return;
    }
    setSaving(true);
    try {
      await onEditSubmit?.(next);
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save edit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {isUser ? (
        <Avatar className="w-8 h-8 shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={username ?? "You"} /> : null}
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {initial}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary/5 grid place-items-center shrink-0 overflow-hidden">
          <img src={atelierLogo} alt="Atelier" className="w-7 h-7 object-contain" />
        </div>
      )}

      <div className={`max-w-[85%] space-y-1 ${isUser ? "items-end flex flex-col" : ""}`}>
        {editing && isUser ? (
          <div className="w-full min-w-[260px] rounded-2xl border bg-card p-2 space-y-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submitEdit();
                }
              }}
            />
            <div className="flex justify-end gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft(message.content);
                }}
                disabled={saving}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={submitEdit} disabled={saving}>
                {saving ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        ) : isUser && message.mediaUrl && message.media_type === "image" ? (
          <div className="flex flex-col items-end gap-1.5">
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl overflow-hidden border bg-card shadow-sm hover:opacity-90 transition"
            >
              <img
                src={message.mediaUrl}
                alt={message.content || "attachment"}
                className="w-32 h-32 object-cover"
              />
            </a>
            {message.content && (
              <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm leading-relaxed">
                <span className="whitespace-pre-wrap block">{message.content}</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-card border rounded-tl-sm"
            }`}
          >
            {isUser ? (
              <div className="space-y-2">
                {message.mediaUrl && message.media_type === "audio" && (
                  <AudioPlayer src={message.mediaUrl} variant="user" />
                )}
                {message.content && message.media_type !== "audio" && (
                  <span className="whitespace-pre-wrap block">{message.content}</span>
                )}
              </div>
            ) : animate ? (
              <Typewriter text={message.content} />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>

        )}

        {/* Action row */}
        {!readOnly && !editing && (
          <div className={`flex items-center gap-0.5 ${isUser ? "justify-end" : ""}`}>
            {variant && variant.total > 1 && (
              <div className="flex items-center gap-0.5 mr-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={variant.onPrev}
                  disabled={variant.index === 0}
                  className="p-1 rounded hover:bg-accent disabled:opacity-30"
                  aria-label="Previous variant"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="tabular-nums">
                  {variant.index + 1} / {variant.total}
                </span>
                <button
                  type="button"
                  onClick={variant.onNext}
                  disabled={variant.index === variant.total - 1}
                  className="p-1 rounded hover:bg-accent disabled:opacity-30"
                  aria-label="Next variant"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isUser && (
              <>
                <button
                  type="button"
                  onClick={copy}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                  aria-label="Copy"
                  title="Copy"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                {editable && (!message.media_type || message.media_type === "text") && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(message.content);
                      setEditing(true);
                    }}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                    aria-label="Edit message"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}

            {!isUser && (
              <FeedbackButtons
                pipelineId={message.pipelineId}
                messageId={message.id}
                content={message.content}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
