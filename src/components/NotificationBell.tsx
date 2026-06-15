import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellDot, CheckCheck, AlertTriangle, CheckCircle2, Coins, XCircle, PauseCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/billing.functions";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

const typeIcon: Record<string, React.ReactNode> = {
  payment_issue: <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />,
  payment_resolved: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
  subscription_created: <Coins className="w-4 h-4 text-primary shrink-0 mt-0.5" />,
  subscription_canceled: <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />,
  subscription_paused: <PauseCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
};

export function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyNotifications);
  const markReadFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getFn(),
    staleTime: 30_000,
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  // Supabase Realtime — push new notifications into cache instantly
  useEffect(() => {
    if (!userId) return;
    channelRef.current = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [userId, qc]);

  const markRead = useMutation({
    mutationFn: (id: string) => markReadFn({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      qc.setQueryData(["notifications"], (old: any) => ({
        ...old,
        notifications: old?.notifications?.map((n: Notification) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      }));
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllFn({ data: undefined as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="notification-bell-btn"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        >
          {unread > 0 ? (
            <>
              <BellDot className="w-5 h-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
            </>
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 max-h-[480px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                id={`notification-item-${n.id}`}
                className={cn(
                  "w-full text-left px-4 py-3 flex gap-3 border-b last:border-0 transition-colors hover:bg-accent/50",
                  !n.read && "bg-primary/5",
                )}
                onClick={() => {
                  if (!n.read) markRead.mutate(n.id);
                }}
              >
                {typeIcon[n.type] ?? <Bell className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />}
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
