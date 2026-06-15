import GlassModal from "./GlassModal";
import { useAuth } from "../../context/AuthContext";

export default function ProfileModal({ open, onClose }) {
  const { user, logout } = useAuth();
  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Profile"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={() => { logout(); onClose(); }}>
            Sign out
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3 mb-4">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-accent-500/30 flex items-center justify-center text-lg font-semibold">
            {(user?.display_name || user?.username || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-medium">{user?.display_name || user?.username}</div>
          <div className="text-xs text-ink-400">{user?.email}</div>
        </div>
      </div>
      <div className="text-ink-300 text-sm">
        Roles: {(user?.roles || []).join(", ") || "user"}
      </div>
    </GlassModal>
  );
}
