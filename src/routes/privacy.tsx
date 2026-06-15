import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Atelier" },
      { name: "description", content: "How Atelier handles your conversations, uploads, and account data." },
      { property: "og:title", content: "Privacy — Atelier" },
      { property: "og:description", content: "How Atelier handles your conversations, uploads, and account data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border/70">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl">Atelier</Link>
          <Link to="/auth"><Button size="sm" className="rounded-full px-4">Begin</Button></Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-24 font-serif text-lg leading-relaxed text-foreground/85 space-y-8">
        <header>
          <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-3 font-sans">§ Privacy</p>
          <h1 className="font-display text-5xl leading-tight">A short, plain note on your data.</h1>
        </header>

        <section>
          <h2 className="font-display text-2xl mt-10 mb-3">What we store</h2>
          <p>Your account email, an optional display name and avatar, and the messages you send in your chats. That's it.</p>
        </section>

        <section>
          <h2 className="font-display text-2xl mt-10 mb-3">Who can read it</h2>
          <p>Only you. Every row in our database carries your user ID and is gated by row-level security policies. Staff cannot read your conversations.</p>
        </section>

        <section>
          <h2 className="font-display text-2xl mt-10 mb-3">Training</h2>
          <p>When you thumbs-up or thumbs-down a reply, that single signal is stored against your account to improve <em>your</em> assistant. We do not train shared models on your private chats.</p>
        </section>

        <section>
          <h2 className="font-display text-2xl mt-10 mb-3">Deleting your account</h2>
          <p>Two clicks in <Link to="/settings" className="text-primary underline underline-offset-4">Settings</Link>. Every message, every upload, every feedback row is removed. There is no recovery — that's the point.</p>
        </section>

        <section>
          <h2 className="font-display text-2xl mt-10 mb-3">Third parties</h2>
          <p>We use Google Gemini for inference and Supabase for storage. No analytics trackers, no ad networks, no third-party cookies.</p>
        </section>

        <p className="text-muted-foreground italic pt-8">Questions? Write to us. We answer.</p>
      </article>
    </div>
  );
}
