import { createContext, useCallback, useContext, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/stripe.functions";
import { toast } from "sonner";

type Ctx = {
  open: (info?: { balance?: number }) => void;
};
const CreditsModalContext = createContext<Ctx | null>(null);

export function CreditsModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; balance?: number }>({ open: false });
  const [loading, setLoading] = useState(false);
  const checkout = useServerFn(createCheckoutSession);

  const open = useCallback((info?: { balance?: number }) => {
    setState({ open: true, balance: info?.balance });
  }, []);

  const balance = state.balance !== undefined ? Number(state.balance) : 0;
  const isOut = balance <= 0;

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

  return (
    <CreditsModalContext.Provider value={{ open }}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 grid place-items-center mb-2">
              <Coins className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center">
              {isOut ? "You're out of credits" : "Running low on credits"}
            </DialogTitle>
            <DialogDescription className="text-center">
              Current balance: <span className="font-medium">{balance.toFixed(1)}</span>.
              {" "}Go Limitless for <strong>$1/month</strong> — 1,500 credits, every month. Cancel anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setState({ open: false })} disabled={loading}>
              Not now
            </Button>
            <Button onClick={handleSubscribe} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              Subscribe — $1/month
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CreditsModalContext.Provider>
  );
}

export function useCreditsModal() {
  const ctx = useContext(CreditsModalContext);
  if (!ctx) throw new Error("useCreditsModal outside provider");
  return ctx;
}
