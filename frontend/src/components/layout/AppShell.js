import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, MessageSquare, Trash2,
  Settings as SettingsIcon, User as UserIcon, Sparkles,
} from "lucide-react";
import {
  listSessions, createSession, deleteSession,
} from "../../services/session.service";
import { useAuth } from "../../context/AuthContext";
import SettingsModal from "../modals/SettingsModal";
import ProfileModal from "../modals/ProfileModal";
import CreditsModal from "../modals/CreditsModal";

const DAY = 24 * 60 * 60 * 1000;

const groupSessions = (sessions = []) => {
  const now = Date.now();
  const buckets = { Today: [], "Previous 7 Days": [], Older: [] };
  sessions.forEach((s) => {
    const age = now - new Date(s.updated_at).getTime();
    if (age < DAY) buckets.Today.push(s);
    else if (age < 7 * DAY) buckets["Previous 7 Days"].push(s);
    else buckets.Older.push(s);
  });
  return buckets;
};

export default function AppShell({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessionId } = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const [openModal, setOpenModal] = useState(null); // 'settings' | 'profile' | 'credits'

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
  });

  const newChat = useMutation({
    mutationFn: () => createSession(),
    onSuccess: (s) => {
      qc.setQueryData(["sessions"], (prev = []) => [s, ...prev]);
      navigate(`/chat/${s.id}`);
    },
  });

  const del = useMutation({
    mutationFn: (id) => deleteSession(id),
    onSuccess: (_d, id) => {
      qc.setQueryData(["sessions"], (prev = []) => prev.filter((s) => s.id !== id));
      if (id === sessionId) navigate("/chat");
    },
  });

  const groups = useMemo(() => groupSessions(sessions), [sessions]);
  const credits = user?.credits;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 280 }}
        transition={{ type: "spring", stiffness: 240, damping: 28 }}
        className="glass border-r border-white/10 flex flex-col overflow-hidden"
      >
        <div className="p-3 flex items-center justify-between gap-2">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-md bg-accent-500/30 flex items-center justify-center text-accent-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold">AI Chatbot</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="btn-ghost !p-1.5"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="px-3 pb-3 sticky top-0">
          <button
            onClick={() => newChat.mutate()}
            className="btn-primary w-full"
            disabled={newChat.isPending}
          >
            <Plus className="w-4 h-4" /> {!collapsed && "New chat"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-4">
          {!collapsed &&
            Object.entries(groups).map(([label, list]) =>
              list.length ? (
                <div key={label}>
                  <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-ink-400">
                    {label}
                  </div>
                  <ul className="space-y-0.5">
                    {list.map((s) => (
                      <li key={s.id} className="group">
                        <Link
                          to={`/chat/${s.id}`}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm
                                      ${s.id === sessionId ? "bg-white/10 text-white" : "text-ink-200 hover:bg-white/5"}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate flex-1">{s.title || "New chat"}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (window.confirm("Delete this chat?")) del.mutate(s.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          {!collapsed && sessions.length === 0 && (
            <div className="text-xs text-ink-400 px-3 pt-4">
              Your conversations will appear here.
            </div>
          )}
        </div>

        {/* User block */}
        <div className="border-t border-white/10 p-2 space-y-1">
          <button
            onClick={() => setOpenModal("credits")}
            className="btn-ghost w-full justify-start"
            title="Credits"
          >
            <Sparkles className="w-4 h-4 text-accent-400" />
            {!collapsed && (
              <span className="flex-1 text-left">
                {credits != null ? Number(credits).toFixed(2) : "—"} credits
              </span>
            )}
          </button>
          <button onClick={() => setOpenModal("settings")} className="btn-ghost w-full justify-start">
            <SettingsIcon className="w-4 h-4" /> {!collapsed && "Settings"}
          </button>
          <button onClick={() => setOpenModal("profile")} className="btn-ghost w-full justify-start">
            <UserIcon className="w-4 h-4" /> {!collapsed && (user?.display_name || user?.username || "Profile")}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </main>

      <SettingsModal open={openModal === "settings"} onClose={() => setOpenModal(null)} />
      <ProfileModal open={openModal === "profile"} onClose={() => setOpenModal(null)} />
      <CreditsModal open={openModal === "credits"} onClose={() => setOpenModal(null)} />
    </div>
  );
}
