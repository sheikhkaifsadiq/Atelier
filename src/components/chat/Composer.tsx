import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Mic,
  Send,
  Loader2,
  Square,
  Image as ImageIcon,
  Music,
  FileText,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export type ComposerAttachment = {
  file: File;
  kind: "image" | "audio";
  previewUrl: string;
};

export function Composer({
  disabled,
  onSend,
  onSendAudioRecording,
}: {
  disabled?: boolean;
  /** Send typed text and/or a staged attachment. */
  onSend: (payload: { text: string; attachment: ComposerAttachment | null }) => void;
  /** Voice recordings are sent immediately, like a WhatsApp voice note. */
  onSendAudioRecording: (f: File) => void;
}) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearAttachment = () => {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  const stageFile = (file: File, expected: "image" | "audio") => {
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    if (expected === "image" && !isImage) {
      toast.error("Please select an image file");
      return;
    }
    if (expected === "audio" && !isAudio) {
      toast.error("Please select an audio file");
      return;
    }
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment({
      file,
      kind: expected,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (disabled) return;
    if (!t && !attachment) return;
    onSend({ text: t, attachment });
    setText("");
    setAttachment(null); // ChatView owns the preview lifecycle from here
  };

  const startRecording = async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "";
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        stopStream();
        if (blob.size > 800) {
          const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
          onSendAudioRecording(file);
        } else {
          toast.error("Recording too short");
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      console.error(err);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  };

  const cancelRecording = () => {
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.ondataavailable = null as never;
      recRef.current.onstop = null as never;
      recRef.current.stop();
    }
    stopStream();
    chunksRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setElapsed(0);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (recording) {
    return (
      <div className="relative flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 shadow-sm p-3">
        <span className="relative flex h-3 w-3 ml-1">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
        </span>
        <span className="text-sm font-medium">Listening…</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {mm}:{ss}
        </span>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={cancelRecording}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={stopRecording}>
          <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
          Send
        </Button>
      </div>
    );
  }

  const canSend = !disabled && (!!text.trim() || !!attachment);

  return (
    <form
      onSubmit={submit}
      className="relative flex flex-col gap-2 rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring p-2"
    >
      {/* Hidden inputs per category */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) stageFile(f, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) stageFile(f, "audio");
          e.target.value = "";
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => {
          e.target.value = "";
          toast.info("Document uploads are coming soon");
        }}
      />

      {/* Staged attachment chip (compact, ChatGPT-style) */}
      {attachment && (
        <div className="flex flex-wrap gap-2 px-1 pt-1">
          <div className="group relative inline-flex items-center gap-2 rounded-lg border bg-background/70 pl-1 pr-2 py-1 max-w-[220px]">
            {attachment.kind === "image" ? (
              <img
                src={attachment.previewUrl}
                alt={attachment.file.name}
                className="w-9 h-9 rounded-md object-cover border shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-md border bg-primary/10 grid place-items-center text-primary shrink-0">
                <Music className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium truncate max-w-[120px]">{attachment.file.name}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{attachment.kind}</div>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              aria-label="Remove attachment"
              className="ml-1 grid place-items-center w-5 h-5 rounded-full bg-foreground/80 text-background hover:bg-foreground shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Attach"
              disabled={disabled}
            >
              {attachment ? <Plus className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-44">
            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
              <Music className="w-4 h-4 mr-2" />
              Audio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => docInputRef.current?.click()}>
              <FileText className="w-4 h-4 mr-2" />
              Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          title="Talk — record voice, get a text reply"
          disabled={disabled}
          onClick={startRecording}
        >
          <Mic className="w-4 h-4" />
        </Button>

        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          placeholder={attachment ? "Add a message…" : "Message Atelier…"}
          className="flex-1 resize-none bg-transparent outline-none px-1 py-2 max-h-40 text-sm"
          disabled={disabled}
        />

        <Button type="submit" size="icon" disabled={!canSend}>
          {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </form>
  );
}
