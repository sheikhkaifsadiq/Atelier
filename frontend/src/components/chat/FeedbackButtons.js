import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { sendFeedback } from "../../services/feedback.service";

export default function FeedbackButtons({ pipelineId }) {
  const [score, setScore] = useState(0);
  if (!pipelineId) return null;

  const rate = async (v) => {
    if (score === v) return;
    setScore(v);
    try { await sendFeedback(pipelineId, v); } catch { /* ignore */ }
  };

  return (
    <div className="mt-2 flex items-center gap-1 opacity-60 hover:opacity-100 transition">
      <button
        aria-label="Helpful"
        className={`p-1.5 rounded-md hover:bg-white/10 ${score === 1 ? "text-emerald-400" : "text-ink-400"}`}
        onClick={() => rate(1)}
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        aria-label="Not helpful"
        className={`p-1.5 rounded-md hover:bg-white/10 ${score === -1 ? "text-rose-400" : "text-ink-400"}`}
        onClick={() => rate(-1)}
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
}
