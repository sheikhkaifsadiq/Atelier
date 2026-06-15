import { useEffect, useState } from "react";

/**
 * Token-by-token typewriter. Renders `text` progressively, then calls `onDone`.
 */
export default function Typewriter({ text = "", speed = 12, onDone, render }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const step = Math.max(1, Math.floor(text.length / 200)); // bigger jumps for long replies
    const id = setInterval(() => {
      i = Math.min(text.length, i + step);
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone && onDone();
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return render ? render(shown) : <>{shown}</>;
}
