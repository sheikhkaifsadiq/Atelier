import GlassModal from "./GlassModal";

export default function SettingsModal({ open, onClose }) {
  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Settings"
      footer={<button className="btn-primary" onClick={onClose}>Done</button>}
    >
      <p className="text-ink-300">Theme, model and notification preferences will live here.</p>
    </GlassModal>
  );
}
