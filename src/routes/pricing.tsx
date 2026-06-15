import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/lib/stripe.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Atelier" },
      { name: "description", content: "$1/month. 1500 credits, every month. Cancel anytime." },
      { property: "og:title", content: "Pricing — Atelier" },
      { property: "og:description", content: "$1/month. 1500 credits, every month. Cancel anytime." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const checkout = useServerFn(createCheckoutSession);

  useEffect(() => {
    // Only reachable from the landing page (or via Stripe return).
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "landing" || params.get("checkout") === "1") {
      sessionStorage.setItem("pricing_allowed", "1");
      setAllowed(true);
      return;
    }
    if (sessionStorage.getItem("pricing_allowed") === "1") {
      setAllowed(true);
      return;
    }
    const ref = document.referrer;
    if (ref && new URL(ref).pathname === "/") {
      sessionStorage.setItem("pricing_allowed", "1");
      setAllowed(true);
      return;
    }
    navigate({ to: "/", replace: true });
  }, [navigate]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { url } = await checkout({ data: undefined as never });
      if (url) window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message || "Could not start checkout");
      setLoading(false);
    }
  };

  if (!allowed) return null;

  const features = [
    "1,500 credits every month",
    "Text, voice & image chats",
    "Full chat history & exports",
    "Priority inference",
    "Cancel anytime — no lock-in",
  ];

  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border/70">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl">Atelier</Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-3">§ One plan. One dollar.</p>
        <h1 className="font-display text-5xl sm:text-6xl leading-tight">
          Atelier Limitless. <em className="italic text-primary">$1/month.</em>
        </h1>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          1,500 credits refreshed every month. Cancel anytime — your card never gets surprised.
        </p>

        <div className="mt-12 border border-primary rounded-sm p-10 bg-card/60 text-left shadow-[0_20px_60px_-30px_rgba(89,125,124,0.6)]">
          <span className="text-[10px] tracking-[0.25em] uppercase text-primary inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> The only plan you need
          </span>
          <h3 className="font-display text-3xl mt-2">Atelier Limitless</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-6xl">$1</span>
            <span className="text-muted-foreground">/ month</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/85">{f}</span>
              </li>
            ))}
          </ul>
          <Button onClick={handleSubscribe} disabled={loading} className="mt-8 w-full rounded-full">
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            Subscribe — $1/month
          </Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Secured by Stripe. Cancel anytime from the billing portal.
          </p>
        </div>
      </section>
    </div>
  );
}
