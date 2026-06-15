import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { getPublicSession, forkPublicSession } from "@/lib/share.functions";
import { supabase } from "@/integrations/supabase/client";

const shareQuery = (token: string) =>
  queryOptions({
    queryKey: ["public-share", token],
    queryFn: () => getPublicSession({ data: { token } }),
  });

export const Route = createFileRoute("/share/$token")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(shareQuery(params.token)),
  component: SharePage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold mb-2">Shared chat unavailable</h1>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Shared chat · Atelier" },
      { name: "description", content: "A shared Atelier conversation." },
    ],
  }),
});

function SharePage() {
  const { token } = Route.useParams();
  const nav = useNavigate();
  const { data } = useSuspenseQuery(shareQuery(token));
  const fork = useServerFn(forkPublicSession);

  const mut = useMutation({
    mutationFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        toast.info("Sign in to continue this chat as your own");
        nav({ to: "/auth" });
        throw new Error("Sign in to continue");
      }
      return fork({ data: { token } });
    },
    onSuccess: (res) => {
      nav({ to: "/chat/$sessionId", params: { sessionId: res.sessionId } });
      toast.success("Forked! This chat is now yours.");
    },
    onError: (e: Error) => {
      if (e.message !== "Sign in to continue") toast.error(e.message);
    },
  });

  const messages = (data.messages ?? []) as Array<{
    id: string;
    sender: "user" | "bot";
    content: string;
    media_type: string;
  }>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b px-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">Atelier</span>
        </Link>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-2">
          {mut.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          Continue this chat
        </Button>
      </header>

      <main className="flex-1 px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 pb-4 border-b">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Shared conversation
            </p>
            <h1 className="text-2xl font-semibold">{data.session.title || "Shared chat"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Read-only view. Continue to fork your own private copy.
            </p>
          </div>
          <div className="space-y-5">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-sm">This chat is empty.</p>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} readOnly />)
            )}
          </div>
          <div className="mt-10 text-center">
            <Button onClick={() => mut.mutate()} disabled={mut.isPending} size="lg" className="gap-2">
              {mut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Continue this chat as your own
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
