import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import GlassModal from "./GlassModal";
import { fetchCredits } from "../../services/user.service";

export default function CreditsModal({ open, info, onClose }) {
  const { data } = useQuery({
    queryKey: ["credits"],
    queryFn: fetchCredits,
    enabled: open,
  });

  const balance = info?.balance ?? data?.credits ?? 0;
  const costs = data?.costs ?? { text: 0.1, image: 0.5, audio: 0.3 };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={info ? "Out of credits" : "Your credits"}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary">
            <Sparkles className="w-4 h-4" /> Upgrade plan
          </button>
        </>
      }
    >
      {info && (
        <p className="mb-4 text-rose-300">
          You need at least <b>{info.required}</b> credit{info.required === 1 ? "" : "s"} for
          a {info.type} request, but only have <b>{Number(balance).toFixed(2)}</b>.
        </p>
      )}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
        <div className="text-xs uppercase text-ink-400 tracking-wider">Balance</div>
        <div className="text-3xl font-semibold mt-1">{Number(balance).toFixed(2)}</div>
      </div>
      <ul className="space-y-1 text-ink-300">
        <li>Text · <span className="text-ink-100">{costs.text} credits</span></li>
        <li>Image · <span className="text-ink-100">{costs.image} credits</span></li>
        <li>Audio · <span className="text-ink-100">{costs.audio} credits</span></li>
      </ul>
    </GlassModal>
  );
}
