import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/chat/AppSidebar";
import { CreditPill } from "@/components/chat/CreditPill";
import { CreditsModalProvider } from "@/components/chat/CreditsModal";
import { ShareChatButton } from "@/components/chat/ShareChatButton";
import { SmartLogo } from "@/components/SmartLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { getSessionMessages } from "@/lib/sessions.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatLayout,
});

function ChatTitle({ sessionId }: { sessionId: string }) {
  const getMessages = useServerFn(getSessionMessages);
  const { data } = useQuery({
    queryKey: ["session-messages", sessionId],
    queryFn: () => getMessages({ data: { sessionId } }),
  });
  const title = (data?.session as { title?: string } | null | undefined)?.title;
  if (!title) return null;
  return (
    <span
      className="text-sm font-medium truncate max-w-[40vw] sm:max-w-md text-foreground/90"
      title={title}
    >
      {title}
    </span>
  );
}

function ChatLayout() {
  const params = useParams({ strict: false }) as { sessionId?: string };
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return (
    <CreditsModalProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col h-screen min-h-0">
            <header className="h-12 shrink-0 flex items-center justify-between border-b px-3 bg-background/80 backdrop-blur z-10">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger />
                <SmartLogo className="h-8 w-auto shrink-0" />
                {params.sessionId && (
                  <>
                    <span className="text-muted-foreground/50 px-1">/</span>
                    <ChatTitle sessionId={params.sessionId} />
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {params.sessionId && <ShareChatButton sessionId={params.sessionId} />}
                {userId && <NotificationBell userId={userId} />}
                <CreditPill />
              </div>
            </header>
            <main className="flex-1 flex flex-col min-h-0">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </CreditsModalProvider>
  );
}
