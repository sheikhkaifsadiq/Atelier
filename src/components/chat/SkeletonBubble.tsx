import { Sparkles } from "lucide-react";

export function SkeletonBubble() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="space-y-2 max-w-[60%] w-full">
        <div className="h-3 rounded bg-muted animate-pulse w-4/5" />
        <div className="h-3 rounded bg-muted animate-pulse w-3/5" />
        <div className="h-3 rounded bg-muted animate-pulse w-2/5" />
      </div>
    </div>
  );
}
