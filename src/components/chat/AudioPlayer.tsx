import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download } from "lucide-react";

function fmt(t: number) {
  if (!isFinite(t) || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  variant = "user",
}: {
  src: string;
  variant?: "user" | "bot";
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onWait = () => setLoading(true);
    const onPlay = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("waiting", onWait);
    a.addEventListener("playing", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("waiting", onWait);
      a.removeEventListener("playing", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
    } else {
      a.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const v = Number(e.target.value);
    a.currentTime = (v / 100) * duration;
    setCurrent(a.currentTime);
  };

  const progress = duration ? (current / duration) * 100 : 0;

  const isUser = variant === "user";
  const fg = isUser ? "text-primary-foreground" : "text-foreground";
  const subtle = isUser ? "text-primary-foreground/70" : "text-muted-foreground";
  const btnBg = isUser
    ? "bg-primary-foreground/15 hover:bg-primary-foreground/25"
    : "bg-primary/10 hover:bg-primary/20";
  const trackBg = isUser ? "bg-primary-foreground/20" : "bg-muted";
  const fillBg = isUser ? "bg-primary-foreground" : "bg-primary";

  return (
    <div
      className={`flex items-center gap-3 min-w-[240px] max-w-[320px] rounded-xl px-2.5 py-2 ${
        isUser ? "bg-primary-foreground/5" : "bg-background/40"
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className={`shrink-0 w-9 h-9 rounded-full grid place-items-center transition-colors ${btnBg} ${fg}`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {loading ? (
          <span
            className={`w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin`}
          />
        ) : playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 translate-x-[1px]" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`relative h-1.5 rounded-full ${trackBg}`}>
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${fillBg}`}
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={seek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>
        <div className={`mt-1 flex justify-between text-[10px] tabular-nums ${subtle}`}>
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <a
        href={src}
        download
        className={`shrink-0 p-1.5 rounded-md transition-colors ${subtle} hover:${fg}`}
        aria-label="Download audio"
        title="Download"
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
