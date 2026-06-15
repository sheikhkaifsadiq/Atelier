export default function SkeletonBubble() {
  return (
    <div className="flex items-start gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-ink-700" />
      <div className="flex-1 space-y-2 max-w-xl">
        <div className="h-3 w-3/5 bg-ink-700 rounded" />
        <div className="h-3 w-4/5 bg-ink-700/80 rounded" />
        <div className="h-3 w-2/5 bg-ink-700/60 rounded" />
      </div>
    </div>
  );
}
