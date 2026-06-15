import { jsPDF } from "jspdf";

type ExportPayload = {
  session: { id: string; title: string; created_at: string; updated_at: string };
  messages: Array<{
    id: string;
    sender: string;
    content: string;
    media_type: string;
    created_at: string;
  }>;
  feedback: Array<{
    id: string;
    user_prompt: string;
    model_response: string;
    model_version: string;
    quality_score: number | null;
    created_at: string;
  }>;
  exportedAt: string;
};

function safeFileBase(title: string, id: string) {
  const slug = (title || "chat")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "chat";
  return `${slug}-${id.slice(0, 8)}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSessionJson(data: ExportPayload) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, `${safeFileBase(data.session.title, data.session.id)}.json`);
}

export function downloadSessionPdf(data: ExportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const line = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {},
  ) => {
    const { size = 11, bold = false, color = [20, 20, 20], gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const wrapped = doc.splitTextToSize(text, maxW);
    for (const ln of wrapped) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(ln, margin, y);
      y += size + gap;
    }
  };

  // Header
  line(data.session.title || "Chat session", { size: 18, bold: true, gap: 6 });
  line(`Exported ${new Date(data.exportedAt).toLocaleString()}`, {
    size: 9,
    color: [120, 120, 120],
    gap: 4,
  });
  line(`Session ID: ${data.session.id}`, { size: 9, color: [120, 120, 120], gap: 12 });

  // Feedback lookup by prompt for joining
  const scoreByPrompt = new Map<string, number | null>();
  for (const f of data.feedback) scoreByPrompt.set(f.user_prompt, f.quality_score);

  for (let i = 0; i < data.messages.length; i++) {
    const m = data.messages[i];
    const when = new Date(m.created_at).toLocaleString();
    const who = m.sender === "user" ? "You" : "AI";
    line(`${who} • ${when}`, { size: 9, bold: true, color: [90, 90, 200], gap: 4 });
    line(m.content || "(empty)", { size: 11, gap: 4 });
    if (m.sender === "bot") {
      const prev = data.messages[i - 1];
      const score = prev ? scoreByPrompt.get(prev.content) : undefined;
      if (score === 1 || score === -1) {
        const label = score === 1 ? "👍 Helpful" : "👎 Not helpful";
        line(label, { size: 9, color: [120, 120, 120], gap: 8 });
      } else {
        y += 4;
      }
    } else {
      y += 4;
    }
  }

  doc.save(`${safeFileBase(data.session.title, data.session.id)}.pdf`);
}
