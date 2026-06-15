import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  XCircle,
  RefreshCw,
  Plus,
  PlayCircle,
  Coins,
  ExternalLink,
  FileText,
  LifeBuoy,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPaymentHistory, getSubscriptionTimeline, requestRefund } from "@/lib/billing.functions";

// ─── Subscription Timeline ───────────────────────────────────────────────────

type SubEvent = {
  id: string;
  event_type: string;
  status: string | null;
  period_end: string | null;
  created_at: string;
};

const eventMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  created: {
    label: "Subscribed",
    icon: <Plus className="w-4 h-4" />,
    color: "text-emerald-500",
  },
  renewed: {
    label: "Renewed",
    icon: <RefreshCw className="w-4 h-4" />,
    color: "text-primary",
  },
  paused: {
    label: "Paused",
    icon: <PauseCircle className="w-4 h-4" />,
    color: "text-amber-500",
  },
  resumed: {
    label: "Resumed",
    icon: <PlayCircle className="w-4 h-4" />,
    color: "text-emerald-500",
  },
  canceled: {
    label: "Canceled",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-muted-foreground",
  },
  payment_failed: {
    label: "Payment failed",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-destructive",
  },
  payment_recovered: {
    label: "Payment recovered",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-500",
  },
  updated: {
    label: "Updated",
    icon: <RefreshCw className="w-4 h-4" />,
    color: "text-muted-foreground",
  },
};

export function SubscriptionTimeline({ nextBillingDate }: { nextBillingDate?: Date | null }) {
  const getFn = useServerFn(getSubscriptionTimeline);
  const { data, isLoading } = useQuery({
    queryKey: ["subscription-timeline"],
    queryFn: () => getFn(),
    staleTime: 60_000,
  });

  const events: SubEvent[] = data?.events ?? [];

  return (
    <div className="space-y-4">
      {/* Next billing date banner */}
      {nextBillingDate && (
        <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-3">
          <RefreshCw className="w-4 h-4 text-primary shrink-0" />
          <div className="text-sm">
            <span className="font-medium">Next billing date: </span>
            <span className="text-muted-foreground">
              {format(nextBillingDate, "MMMM d, yyyy")}
            </span>
          </div>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading timeline…</div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No subscription history yet
        </div>
      ) : (
        <div className="relative">
          {/* vertical guide line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />
          <div className="space-y-4">
            {events.map((ev) => {
              const meta = eventMeta[ev.event_type] ?? eventMeta.updated;
              return (
                <div key={ev.id} className="flex gap-3 items-start relative">
                  <div
                    className={`mt-0.5 w-9 h-9 rounded-full border bg-background grid place-items-center shrink-0 z-10 ${meta.color}`}
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0 pt-1.5">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(ev.created_at), "MMM d, yyyy · h:mm a")}
                      {ev.period_end && (
                        <span className="ml-2 opacity-70">
                          · Period ends {format(new Date(ev.period_end), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment History Tab ──────────────────────────────────────────────────────

type Invoice = {
  id: string;
  amount_paid: number | null;
  currency: string | null;
  status: string | null;
  billing_reason: string | null;
  period_start: string | null;
  period_end: string | null;
  invoice_pdf: string | null;
  hosted_url: string | null;
  created_at: string;
};

type CreditGrant = {
  id: string;
  amount: number;
  reason: string;
  stripe_invoice_id: string | null;
  created_at: string;
};

function formatAmount(cents: number | null, currency: string | null) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency?.toUpperCase() ?? "USD",
  }).format(cents / 100);
}

function invoiceStatusBadge(status: string | null) {
  switch (status) {
    case "paid":
      return <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 border-0">Paid</Badge>;
    case "open":
      return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-0">Open</Badge>;
    case "void":
      return <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">Void</Badge>;
    default:
      return <Badge variant="outline">{status ?? "—"}</Badge>;
  }
}

function creditGrantLabel(reason: string) {
  switch (reason) {
    case "subscription_create": return "New subscription";
    case "subscription_cycle": return "Monthly renewal";
    case "manual": return "Manual grant";
    default: return reason;
  }
}

export function PaymentHistoryPanel() {
  const getFn = useServerFn(getPaymentHistory);
  const refundFn = useServerFn(requestRefund);
  
  const { data, isLoading } = useQuery({
    queryKey: ["payment-history"],
    queryFn: () => getFn(),
    staleTime: 60_000,
  });

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const refundMutation = useMutation({
    mutationFn: (reason: string) => refundFn({ data: { reason } }),
    onSuccess: () => {
      toast.success("Refund request submitted successfully. Support will contact you shortly.");
      setRefundOpen(false);
      setRefundReason("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit refund request");
    }
  });

  const invoices: Invoice[] = data?.invoices ?? [];
  const grants: CreditGrant[] = data?.creditGrants ?? [];

  return (
    <Tabs defaultValue="invoices" id="payment-history-tabs">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
        <TabsList>
          <TabsTrigger value="invoices" id="tab-invoices">
            <FileText className="w-4 h-4 mr-1.5" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="credits" id="tab-credit-grants">
            <Coins className="w-4 h-4 mr-1.5" />
            Credit grants
          </TabsTrigger>
        </TabsList>

        <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
              <LifeBuoy className="w-3.5 h-3.5 mr-1.5" />
              Request Refund
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a Refund</DialogTitle>
              <DialogDescription>
                Having an issue? Tell us why you are requesting a refund and our support team will process it. 
                Refunds are subject to our terms of service and usage limits.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Textarea 
                placeholder="Please describe why you are requesting a refund..." 
                className="min-h-[100px]"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
              <Button 
                className="w-full" 
                disabled={!refundReason.trim() || refundMutation.isPending}
                onClick={() => refundMutation.mutate(refundReason)}
              >
                {refundMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices tab */}
      <TabsContent value="invoices">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No invoices yet</div>
        ) : (
          <div className="divide-y rounded-lg border overflow-hidden">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-accent/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {formatAmount(inv.amount_paid, inv.currency)}
                    </span>
                    {invoiceStatusBadge(inv.status)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {inv.period_start && inv.period_end
                      ? `${format(new Date(inv.period_start), "MMM d")} – ${format(new Date(inv.period_end), "MMM d, yyyy")}`
                      : format(new Date(inv.created_at), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {inv.hosted_url && (
                    <a
                      href={inv.hosted_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={`invoice-view-${inv.id}`}
                      className="text-xs flex items-center gap-1 text-primary hover:underline"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {inv.invoice_pdf && (
                    <a
                      href={inv.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={`invoice-pdf-${inv.id}`}
                      className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                    >
                      PDF <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Credit grants tab */}
      <TabsContent value="credits">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : grants.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No credit grants yet</div>
        ) : (
          <div className="divide-y rounded-lg border overflow-hidden">
            {grants.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-accent/30 transition-colors">
                <Coins className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">+{Number(g.amount).toFixed(0)} credits</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {creditGrantLabel(g.reason)} · {format(new Date(g.created_at), "MMM d, yyyy")}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0 shrink-0">
                  Granted
                </Badge>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
