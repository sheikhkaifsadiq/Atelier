import { useState, useMemo } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  MessageSquarePlus,
  Trash2,
  MoreHorizontal,
  Download,
  FileJson,
  FileText,
  Settings,
  FolderOpen,
  Search,
  X,
} from "lucide-react";
import atelierLogo from "@/assets/atelier-logo.png";
import { SmartLogo } from "@/components/SmartLogo";
import { ShareChatButton } from "./ShareChatButton";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { listSessions, deleteSession, searchSessions } from "@/lib/sessions.functions";
import { exportSession } from "@/lib/export.functions";
import { downloadSessionJson, downloadSessionPdf } from "@/lib/export-client";


type SessionRow = { id: string; title: string; created_at: string; updated_at: string };

function groupSessions(rows: SessionRow[]) {
  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;
  const today: SessionRow[] = [];
  const week: SessionRow[] = [];
  const older: SessionRow[] = [];
  for (const r of rows) {
    const age = (now - new Date(r.updated_at).getTime()) / day;
    if (age < 1) today.push(r);
    else if (age < 7) week.push(r);
    else older.push(r);
  }
  return { today, week, older };
}

export function AppSidebar() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listSessions);
  const remove = useServerFn(deleteSession);
  const doExport = useServerFn(exportSession);
  const doSearch = useServerFn(searchSessions);

  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const handleExport = async (id: string, format: "json" | "pdf") => {
    try {
      const data = await doExport({ data: { sessionId: id } });
      if (format === "json") downloadSessionJson(data);
      else downloadSessionPdf(data);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => list(),
  });
  const sessions = data?.sessions ?? [];
  const groups = groupSessions(sessions as SessionRow[]);

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ["search-sessions", trimmed],
    queryFn: () => doSearch({ data: { q: trimmed } }),
    enabled: trimmed.length > 1,
    staleTime: 10_000,
  });
  const searchResults = useMemo(
    () => (trimmed.length > 1 ? searchData?.results ?? [] : []),
    [trimmed, searchData],
  );

  const handleNewChat = () => {
    setQuery("");
    nav({ to: "/chat" });
  };

  const del = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.setQueryData<{ sessions: SessionRow[] }>(["sessions"], (prev) => ({
        sessions: (prev?.sessions ?? []).filter((s) => s.id !== id),
      }));
      if (pathname.includes(id)) nav({ to: "/chat" });
    },
  });

  const onSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const renderGroup = (label: string, items: SessionRow[]) =>
    items.length > 0 && (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <AnimatePresence initial={false}>
              {items.map((s) => {
                const active = pathname.endsWith(`/${s.id}`);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SidebarMenuItem className="group/item relative">
                      <SidebarMenuButton asChild isActive={active}>
                        <Link
                          to="/chat/$sessionId"
                          params={{ sessionId: s.id }}
                          className="truncate"
                        >
                          <span className="truncate">{s.title || "New chat"}</span>
                        </Link>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="absolute right-1 top-1.5 opacity-0 group-hover/item:opacity-100 transition p-1 rounded hover:bg-sidebar-accent"
                            aria-label="Session actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <div className="px-1 py-0.5">
                            <ShareChatButton sessionId={s.id} asMenuItem />
                          </div>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Download className="w-4 h-4 mr-2" /> Export
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleExport(s.id, "json")}>
                                <FileJson className="w-4 h-4 mr-2" /> JSON
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(s.id, "pdf")}>
                                <FileText className="w-4 h-4 mr-2" /> PDF
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => del.mutate(s.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden grid place-items-center shrink-0 bg-primary/5 group-data-[collapsible=icon]:flex hidden">
            <img src={atelierLogo} alt="Atelier" className="w-11 h-11 object-contain" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <SmartLogo className="h-9 w-auto" />
          </div>
        </div>
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          variant="secondary"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="group-data-[collapsible=icon]:hidden">New chat</span>
        </Button>
        <div className="relative group-data-[collapsible=icon]:hidden">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="pl-8 pr-8 h-9 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link to="/uploads">
            <FolderOpen className="w-4 h-4" />
            <span className="group-data-[collapsible=icon]:hidden">My Uploads</span>
          </Link>
        </Button>
      </SidebarHeader>


      <SidebarContent className="group-data-[collapsible=icon]:hidden">
        {trimmed.length > 1 ? (
          <SidebarGroup>
            <SidebarGroupLabel>
              {searching ? "Searching…" : `Results (${searchResults.length})`}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {searchResults.length === 0 && !searching ? (
                <div className="px-3 py-3 text-xs text-muted-foreground">No matches.</div>
              ) : (
                <SidebarMenu>
                  {searchResults.map((r) => {
                    const active = pathname.endsWith(`/${r.id}`);
                    return (
                      <SidebarMenuItem key={r.id}>
                        <SidebarMenuButton asChild isActive={active} className="h-auto py-2">
                          <Link
                            to="/chat/$sessionId"
                            params={{ sessionId: r.id }}
                            className="flex flex-col items-start gap-0.5"
                          >
                            <span className="truncate w-full text-sm">
                              {r.title || "New chat"}
                            </span>
                            {r.snippet && (
                              <span className="truncate w-full text-[11px] text-muted-foreground">
                                {r.snippet}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-6 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Your chats appear here.
          </div>
        ) : (
          <>
            {renderGroup("Today", groups.today)}
            {renderGroup("Previous 7 Days", groups.week)}
            {renderGroup("Older", groups.older)}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-1">
        <Button asChild variant="ghost" size="sm" className="justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link to="/settings">
            <Settings className="w-4 h-4 group-data-[collapsible=icon]:mr-0 mr-2" />
            <span className="group-data-[collapsible=icon]:hidden">Settings</span>
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" onClick={onSignOut}>
          <LogOut className="w-4 h-4 group-data-[collapsible=icon]:mr-0 mr-2" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}


