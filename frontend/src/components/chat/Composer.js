import { useRef, useState } from "react";
import { Paperclip, Send, Image as ImageIcon, Mic } from "lucide-react";

export default function Composer({ onSendText, onSendImage, onSendAudio, disabled }) {
  const [text, setText] = useState("");
  const imageRef = useRef(null);
  const audioRef = useRef(null);

  const submit = (e) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || disabled) return;
    setText("");
    onSendText(v);
  };

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-2 flex items-end gap-2">
      <button
        type="button"
        onClick={() => imageRef.current?.click()}
        className="btn-ghost !p-2"
        title="Upload image"
        disabled={disabled}
      >
        <ImageIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => audioRef.current?.click()}
        className="btn-ghost !p-2"
        title="Upload audio"
        disabled={disabled}
      >
        <Mic className="w-4 h-4" />
      </button>

      <textarea
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit(e);
        }}
        placeholder="Message the AI…"
        className="flex-1 bg-transparent resize-none max-h-40 px-2 py-2 text-sm placeholder-ink-400 focus:outline-none"
        disabled={disabled}
      />

      <button
        type="submit"
        className="btn-primary !p-2"
        disabled={disabled || !text.trim()}
        aria-label="Send"
      >
        <Send className="w-4 h-4" />
      </button>

      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSendImage(f);
          e.target.value = "";
        }}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSendAudio(f);
          e.target.value = "";
        }}
      />
    </form>
  );
}

// Tiny export for parents that want a paperclip menu icon
export { Paperclip };
