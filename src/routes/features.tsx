import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Mic, Image as ImageIcon, MessageSquare, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Atelier" },
      { name: "description", content: "Voice, image, and text — Atelier's small set of well-considered features." },
      { property: "og:title", content: "Features — Atelier" },
      { property: "og:description", content: "Voice, image, and text — Atelier's small set of well-considered features." },
    ],
  }),
  component: FeaturesPage,
});

const FEATURES = [
  { icon: MessageSquare, title: "Conversational memory", body: "Atelier remembers the thread of every session — across days, across machines." },
  { icon: Mic, title: "Audio in, transcribed", body: "Speak a thought. We turn it into clean text and answer it in kind." },
  { icon: ImageIcon, title: "Image understanding", body: "Drop in a photo. Ask anything — a label, a translation, a critique." },
  { icon: Brain, title: "Learns from feedback", body: "Thumbs-up and thumbs-down quietly teach the model your taste over time." },
  { icon: Lock, title: "Yours, alone", body: "Row-level security ensures no other user — not even staff — can read your room." },
  { icon: Sparkles, title: "Streamed token-by-token", body: "Responses appear as they're written, with no fake typewriter delay." },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border/70">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl">Atelier</Link>
          <Link to="/auth"><Button size="sm" className="rounded-full px-4">Begin</Button></Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-3">§ Features</p>
        <h1 className="font-display text-5xl sm:text-6xl leading-tight">
          A small set of things, <em className="italic text-primary">done with care.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-foreground/80 font-serif leading-relaxed">
          We don't ship a feature unless it earns its place. Here's what made the room.
        </p>

        <div className="mt-16 grid sm:grid-cols-2 gap-8">
          {FEATURES.map((f) => (
            <article key={f.title} className="border border-border rounded-sm p-6 bg-card/40">
              <f.icon className="w-5 h-5 text-primary mb-4" />
              <h3 className="font-display text-2xl leading-tight">{f.title}</h3>
              <p className="mt-3 text-foreground/75 font-serif text-base leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-20 text-center">
          <Link to="/auth"><Button size="lg" className="rounded-full px-8 h-12">Open the room</Button></Link>
        </div>
      </section>
    </div>
  );
}
