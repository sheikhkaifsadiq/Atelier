import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, LogOut, Trash2, Upload, User as UserIcon,
  Shield, Coins, Sparkles, AlertTriangle, CreditCard, History, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyProfile, deleteMyAccount } from "@/lib/profile.functions";
import { createCheckoutSession, openCustomerPortal } from "@/lib/stripe.functions";
import { SubscriptionTimeline, PaymentHistoryPanel } from "@/components/billing/BillingPanels";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — The AI Chatbot" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const deleteFn = useServerFn(deleteMyAccount);
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => getProfile(),
  });

  useEffect(() => {
    if (data?.profile) {
      setUsername(data.profile.username ?? "");
      setAvatarUrl(data.profile.avatar_url ?? null);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { username, avatar_url: avatarUrl } }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please pick an image");
    if (file.size > 4 * 1024 * 1024) return toast.error("Max 4 MB");
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user!.id;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
      await updateFn({ data: { avatar_url: pub.publicUrl } });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Avatar updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const onDelete = async () => {
    try {
      await deleteFn({ data: undefined });
      await supabase.auth.signOut();
      qc.clear();
      toast.success("Account deleted");
      nav({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const profile = data?.profile;
  const initials = (username || "U").slice(0, 2).toUpperCase();
  const periodEnd = profile?.current_period_end ? new Date(profile.current_period_end) : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => nav({ to: "/chat" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to chat
        </button>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">Account settings</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Manage your profile, credits, and account.
          </p>

          {/* Profile */}
          <section className="rounded-2xl border bg-card p-6 mb-5">
            <div className="flex items-center gap-2 mb-5">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">Profile</h2>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <Avatar className="w-16 h-16">
                {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload avatar
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG/JPG up to 4 MB</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={40} />
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </div>
          </section>

          {/* Subscription & Credits with timeline + history tabs */}
          <section className="rounded-2xl border bg-card p-6 mb-5">
            <Tabs defaultValue="subscription" id="settings-billing-tabs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold">Subscription & billing</h2>
                </div>
                <TabsList>
                  <TabsTrigger value="subscription" id="tab-subscription">
                    <Coins className="w-3.5 h-3.5 mr-1" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="timeline" id="tab-timeline">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="history" id="tab-history">
                    <History className="w-3.5 h-3.5 mr-1" />
                    History
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="subscription">
                <SubscriptionPanel profile={profile} />
              </TabsContent>

              <TabsContent value="timeline">
                <SubscriptionTimeline nextBillingDate={periodEnd} />
              </TabsContent>

              <TabsContent value="history">
                <PaymentHistoryPanel />
              </TabsContent>
            </Tabs>
          </section>

          {/* Privacy */}
          <section className="rounded-2xl border bg-card p-6 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">Privacy & security</h2>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>✓ All chats are private — row-level security enforces it.</li>
              <li>✓ Your thumbs up/down feedback trains only your private dataset.</li>
              <li>✓ Account deletion permanently removes chats, messages, and training data.</li>
            </ul>
          </section>

          {/* Danger */}
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="font-semibold text-destructive mb-3">Danger zone</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes your profile, all chats, messages, and training data.
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}

type ProfileLike = {
  credits?: number | string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  payment_issue?: boolean | null;
  stripe_subscription_id?: string | null;
} | null | undefined;

function SubscriptionPanel({ profile }: { profile: ProfileLike }) {
  const checkout = useServerFn(createCheckoutSession);
  const portal = useServerFn(openCustomerPortal);
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);

  const credits = Number(profile?.credits ?? 0);
  const status = profile?.subscription_status ?? null;
  const isActive = status === "active" || status === "trialing";
  const hasIssue = !!profile?.payment_issue || status === "past_due" || status === "unpaid";
  const isCanceled = status === "canceled" || !status;
  const periodEnd = profile?.current_period_end ? new Date(profile.current_period_end) : null;
  const cancelAtEnd = !!profile?.cancel_at_period_end;

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const statusBadge = () => {
    if (hasIssue) return <span className="px-2 py-0.5 rounded-full text-xs bg-destructive/15 text-destructive">Payment issue</span>;
    if (isActive && cancelAtEnd) return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-600">Ending soon</span>;
    if (isActive) return <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-600">Active</span>;
    if (status === "canceled") return <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">Canceled</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">Free</span>;
  };

  const startCheckout = async () => {
    setLoading("checkout");
    try {
      const { url } = await checkout({ data: undefined as never });
      if (url) window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setLoading("portal");
    try {
      const { url } = await portal({ data: undefined as never });
      if (url) window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(null);
    }
  };

  return (
    <div>
      {hasIssue && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-destructive">We couldn't process your last payment</div>
            <div className="text-muted-foreground">
              Update your card in the billing portal to keep your monthly credits.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Subscription & credits</h3>
              {statusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              Text 0.1 · Image 0.5 · Audio 0.3 per request
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">{credits.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">credits</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border bg-background/50 p-3">
          <div className="text-xs text-muted-foreground">Plan</div>
          <div className="text-sm font-medium mt-0.5">
            {isActive ? "Atelier Limitless · $1/month" : "Free"}
          </div>
        </div>
        <div className="rounded-lg border bg-background/50 p-3">
          <div className="text-xs text-muted-foreground">
            {cancelAtEnd ? "Ends on" : isActive ? "Next billing date" : "—"}
          </div>
          <div className="text-sm font-medium mt-0.5">
            {periodEnd ? fmt(periodEnd) : "—"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {isCanceled || !isActive ? (
          <Button onClick={startCheckout} disabled={loading !== null}>
            {loading === "checkout" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Subscribe — $1/month
          </Button>
        ) : (
          <Button variant="outline" onClick={openPortal} disabled={loading !== null}>
            {loading === "portal" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
            Manage subscription
          </Button>
        )}
        {hasIssue && (
          <Button onClick={openPortal} disabled={loading !== null}>
            {loading === "portal" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
            Update payment method
          </Button>
        )}
      </div>

      {!isActive && credits < 20 && (
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-medium text-destructive">Low on credits.</span>{" "}
          Go Limitless for $1/month — 1,500 credits, every month.
        </p>
      )}
    </div>
  );
}
