import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export function Typewriter({ text, cps = 80 }: { text: string; cps?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const step = Math.max(1, Math.round(text.length / (1500 / (1000 / cps))));
    const id = setInterval(() => {
      setN((prev) => {
        const next = prev + step;
        if (next >= text.length) {
          clearInterval(id);
          return text.length;
        }
        return next;
      });
    }, 1000 / cps);
    return () => clearInterval(id);
  }, [text, cps]);

  const shown = text.slice(0, n);
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown>{shown || " "}</ReactMarkdown>
    </div>
  );
}
