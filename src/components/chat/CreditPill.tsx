import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { Coins, Sparkles } from "lucide-react";
import { getMyProfile } from "@/lib/profile.functions";
import { useCreditsModal } from "./CreditsModal";

const LOW_THRESHOLD = 20;

export function CreditPill() {
  const fn = useServerFn(getMyProfile);
  const credits = useCreditsModal();
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => fn(),
    refetchOnWindowFocus: false,
  });
  const numeric = data?.profile?.credits == null ? null : Number(data.profile.credits);
  const isLow = numeric !== null && numeric < LOW_THRESHOLD;

  // Auto-prompt once per session when balance is low.
  const prompted = useRef(false);
  useEffect(() => {
    if (isLow && !prompted.current) {
      prompted.current = true;
      credits.open({ balance: numeric ?? 0 });
    }
  }, [isLow, numeric, credits]);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
          isLow ? "bg-destructive/10 border-destructive/40 text-destructive" : "bg-card"
        }`}
      >
        <Coins className={`w-3.5 h-3.5 ${isLow ? "text-destructive" : "text-amber-500"}`} />
        <span className="tabular-nums">{numeric === null ? "—" : numeric.toFixed(1)}</span>
        <span className={isLow ? "" : "text-muted-foreground"}>credits</span>
      </div>
      {isLow && (
        <button
          onClick={() => credits.open({ balance: numeric ?? 0 })}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          <Sparkles className="w-3 h-3" />
          Go limitless
        </button>
      )}
    </div>
  );
}
