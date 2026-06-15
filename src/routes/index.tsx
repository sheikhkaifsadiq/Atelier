import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartLogo } from "@/components/SmartLogo";
import deskPhoto from "@/assets/desk.jpg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier — a quiet, considered AI assistant" },
      {
        name: "description",
        content:
          "An assistant built the slow way. Voice, image, and text — kept private, kept yours, and gently learning from your feedback.",
      },
    ],
  }),
  component: Landing,
});

/* small inline scribble used as a section divider */
function Scribble({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 18" className={className} aria-hidden="true">
      <path
        d="M2 12 Q 30 2, 60 10 T 120 8 T 180 11 T 218 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Landing() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen text-foreground">
      {/* Top bar */}
      <header className="border-b border-border/70">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between text-sm">
          <div className="flex items-center">
            <SmartLogo className="h-10 sm:h-12 w-auto" alt="Atelier — home" />
          </div>

          <nav className="hidden md:flex items-center gap-7 text-muted-foreground">
            <Link to="/features" className="hover:text-foreground transition">Features</Link>
            <a href="/pricing?from=landing" className="hover:text-foreground transition">Pricing</a>
            <Link to="/privacy" className="hover:text-foreground transition">Privacy</Link>
            <a href="#story" className="hover:text-foreground transition">The idea</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden sm:inline text-muted-foreground hover:text-foreground transition">
              Sign in
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-full px-4">Begin</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Tiny dateline — like a printed paper */}
      <div className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        <span>Vol. 01 · No. 04</span>
        <span className="hidden sm:inline">Printed at home, in small batches</span>
        <span>
          {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-10 sm:pt-14 pb-24 relative">
        <div className="grid grid-cols-12 gap-x-8 gap-y-10 items-start">
          {/* Headline column */}
          <div className="col-span-12 lg:col-span-7 relative">
            <h1 className="font-display text-5xl sm:text-6xl lg:text-[5.2rem] leading-[1.02] tracking-tight">
              An assistant that<br />
              <span className="ink-underline">listens first,</span><br />
              then <em className="italic text-primary">thinks with you.</em>
            </h1>


            <p className="mt-8 max-w-xl text-lg text-foreground/80 leading-relaxed">
              Atelier is a small writing room. You bring a thought — typed, spoken,
              or photographed — and it answers, gently, in your direction.
              Nothing you say leaves your account.
              <sup className="text-primary font-hand text-xl ml-0.5">*</sup>
              Nothing is sold. The room is yours.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link to="/auth">
                <Button size="lg" className="h-12 px-7 rounded-full">
                  Open the room
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <a href="#story" className="text-sm underline underline-offset-4 decoration-clay hover:text-primary">
                Read the story first
              </a>
              <span className="font-hand text-clay text-xl rotate-[-3deg] hidden sm:inline">
                ← takes about 3 minutes
              </span>
            </div>

            <p className="mt-12 text-xs text-muted-foreground italic max-w-md leading-relaxed">
              <span className="text-primary font-hand text-base mr-1">*</span>
              Truly. We checked twice. The database row is locked to your account
              and we don't keep a spare key.
            </p>
          </div>

          {/* Photograph + polaroid stack */}
          <aside className="col-span-12 lg:col-span-5 relative">
            <div className="relative">
              {/* tape */}
              <div className="absolute -top-3 left-10 w-24 h-5 bg-clay/60 rotate-[-4deg] z-10 mix-blend-screen rounded-[1px] shadow-sm" />
              <div className="absolute -top-3 right-12 w-20 h-5 bg-clay/60 rotate-[3deg] z-10 mix-blend-screen rounded-[1px] shadow-sm" />
              <img
                src={deskPhoto}
                alt="A writing desk, photographed from above"
                width={1280}
                height={960}
                className="w-full h-auto object-cover rounded-[2px] shadow-[0_22px_50px_-20px_rgba(0,0,0,0.7)] rotate-[-1.2deg]"
              />

              <p className="font-hand text-clay text-xl mt-4 ml-2 rotate-[-1deg]">
                — Wednesday, the desk. Coffee, again.
              </p>
            </div>

            {/* pull-quote, offset like a clipping */}
            <div className="mt-8 sm:ml-6 lg:ml-[-24px] sm:max-w-sm relative rotate-[1.5deg] bg-card border border-border p-6 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)]">
              <span className="absolute -top-3 left-4 bg-background px-2 text-accent font-display text-3xl leading-none">“</span>
              <p className="font-display text-xl italic leading-snug text-foreground">
                I wanted something that felt like writing in the margin of a
                good book — not like shouting at a search engine.
              </p>
              <p className="font-hand text-clay text-lg mt-4">— Mara, who reads a lot</p>
            </div>
          </aside>
        </div>

        {/* dateline-style stats */}
        <div className="mt-24 grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4 border-t border-border pt-6 text-sm">
          <Stat n="100" label="free credits, on us" />
          <Stat n="0" label="trackers, third parties" />
          <Stat n="3" label="ways in — text, voice, image" />
          <Stat n="∞" label="chats remembered, by date" italic />
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="border-y border-border bg-sand/30">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-12 gap-8 relative">
          <div className="hidden lg:block lg:col-span-2">
            <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground sticky top-8">
              § 01 — The idea
            </p>
            <Scribble className="text-clay w-24 mt-3" />
          </div>
          <div className="col-span-12 lg:col-span-8 relative">
            <h2 className="font-display text-4xl sm:text-5xl leading-tight relative z-10">
              We didn't set out to build a chatbot.{" "}
              <em className="italic text-primary">We were tired of them.</em>
            </h2>

            <div className="mt-8 space-y-6 text-lg leading-relaxed text-foreground/85 font-serif">
              <p className="first-letter:font-display first-letter:text-7xl first-letter:float-left first-letter:mr-3 first-letter:leading-[0.85] first-letter:text-primary first-letter:font-medium">
                Most AI tools feel like a stranger trying to sell you something.
                Bright lights, gradient banners, a chirpy assistant who has
                never met you. We wanted the opposite — a tool that begins
                quietly, holds the page for you, and gets{" "}
                <span className="relative inline-block">
                  out of the way
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 top-[55%] h-px bg-clay rotate-[-2deg]"
                  />
                </span>{" "}
                <span className="font-hand text-clay text-xl">stays in the room</span>{" "}
                when you start writing.
              </p>
              <p>
                Atelier remembers the last thing you said. It listens to a
                voice note as well as it reads a sentence. When you give it a
                thumbs up or down, it puts that note in a small ledger and
                slowly learns the shape of how <em>you</em> like to be answered.
              </p>
              <p className="text-muted-foreground">
                — Built in a kitchen, on weekends, over a great deal of coffee.
              </p>
            </div>

            {/* hand-drawn arrow / coffee ring */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute right-4 -top-2 w-24 h-24 rounded-full border-[3px] border-clay/40 rotate-[18deg] z-0"
              style={{
                clipPath: "polygon(0 0, 100% 0, 100% 78%, 75% 78%, 75% 100%, 0 100%)",
              }}
            />
          </div>
          <div className="col-span-12 lg:col-span-2 lg:text-right">
            <p className="font-hand text-clay text-xl leading-tight">
              three minutes,<br />if you read slowly ☕
            </p>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-12 gap-8 mb-16">
          <div className="col-span-12 lg:col-span-5">
            <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-3">§ 02 — How it works</p>
            <h2 className="font-display text-4xl sm:text-5xl leading-tight">
              A short tour, <em className="italic">the long way round.</em>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7 text-foreground/75 leading-relaxed pt-8 font-serif text-lg">
            Four small things make Atelier feel different. None of them are
            clever on their own. Together, they're the whole point.
          </div>
        </div>

        <ol className="space-y-20">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="grid grid-cols-12 gap-8 items-start"
            >
              <div className="col-span-3 lg:col-span-2 relative">
                <div className="font-display text-7xl text-clay leading-none">
                  {(i + 1).toString().padStart(2, "0")}
                </div>
                <Scribble className="text-clay/60 w-16 mt-1" />
              </div>
              <div className="col-span-9 lg:col-span-7">
                <h3 className="font-display text-3xl leading-snug">{s.title}</h3>
                <p className="mt-3 text-foreground/80 leading-relaxed max-w-prose font-serif text-lg">
                  {s.body}
                </p>
                {s.note && (
                  <p className="mt-2 font-hand text-clay text-xl rotate-[-1deg] inline-block">
                    {s.note}
                  </p>
                )}
              </div>
              <div className="hidden lg:block lg:col-span-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  {s.aside}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* LETTER */}
      <section id="letter" className="bg-sand/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 lg:col-start-2 relative">
            <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-6">
              A short letter
            </p>
            <div className="font-display text-[1.6rem] leading-relaxed italic text-foreground/90 space-y-5">
              <p>Dear reader,</p>
              <p>
                If you've made it this far, you are exactly the person we
                built this for. Try it once, see how it feels. If it doesn't
                fit, delete your account in two clicks and we'll take the
                hint — no email, no apology form, no "are you sure?".
              </p>
              <p>And if it does fit, write us back. We answer.</p>
            </div>

            {/* signature */}
            <div className="mt-10 flex items-end gap-4">
              <p className="font-hand text-4xl text-primary rotate-[-3deg] leading-none">
                — J. &amp; R.
              </p>
              <p className="text-xs text-muted-foreground pb-1 italic">
                (the two of us, somewhere with a kettle on)
              </p>
            </div>
          </div>
          <aside className="col-span-12 lg:col-span-3 lg:col-start-10 pt-12 lg:pt-2 text-sm text-muted-foreground border-l border-border/70 lg:pl-6 space-y-3">
            <p className="uppercase tracking-[0.25em] text-[11px]">In this issue</p>
            <ul className="space-y-1.5 font-serif text-base">
              <li>· The idea<span className="float-right tabular-nums">p. 1</span></li>
              <li>· How it works<span className="float-right tabular-nums">p. 2</span></li>
              <li>· A short letter<span className="float-right tabular-nums">p. 3</span></li>
              <li>· Questions, often asked<span className="float-right tabular-nums">p. 4</span></li>
            </ul>
            <p className="pt-6 font-hand text-clay text-lg rotate-[1deg]">
              ☞ best read with tea
            </p>
          </aside>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-3">§ 04 — Often asked</p>
            <h2 className="font-display text-4xl leading-tight">
              Questions we've already <em className="italic">had</em>.
            </h2>
            <Scribble className="text-clay w-32 mt-4" />
          </div>
          <dl className="col-span-12 lg:col-span-8 divide-y divide-border border-t border-b border-border">
            {FAQS.map((q) => (
              <div key={q.q} className="py-6 grid sm:grid-cols-3 gap-4">
                <dt className="font-display text-xl text-foreground sm:col-span-1">{q.q}</dt>
                <dd className="text-foreground/80 leading-relaxed sm:col-span-2 font-serif text-lg">{q.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="border border-border rounded-[2px] p-10 sm:p-14 bg-card/70 grid grid-cols-12 gap-8 items-center relative">
          <span
            aria-hidden="true"
            className="absolute -top-3 left-12 px-3 py-1 bg-background border border-border text-[10px] uppercase tracking-[0.3em] text-muted-foreground rotate-[-2deg]"
          >
            P. S.
          </span>
          <div className="col-span-12 md:col-span-8">
            <h2 className="font-display text-4xl leading-tight">
              Pull up a chair.
            </h2>
            <p className="mt-3 text-foreground/75 max-w-lg font-serif text-lg">
              Free to try. Sign in with email or Google. We'll never ask for a card.
            </p>
            <p className="font-hand text-clay text-xl mt-3 rotate-[-1deg]">
              the kettle's on →
            </p>
          </div>
          <div className="col-span-12 md:col-span-4 md:text-right">
            <Link to="/auth">
              <Button size="lg" className="h-12 px-8 rounded-full">
                Begin writing
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="font-display text-lg text-foreground">Atelier</div>
          <p className="italic">© {year} — set in Cormorant &amp; Karla, made on a kitchen table.</p>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="#story" className="hover:text-foreground">The idea</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ n, label, italic }: { n: string; label: string; italic?: boolean }) {
  return (
    <div>
      <div className={`font-display text-3xl leading-none ${italic ? "italic" : ""}`}>{n}</div>
      <div className="text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

const STEPS = [
  {
    title: "You begin. However feels natural.",
    body: "Type a sentence, dictate a voice note on the walk home, or drop in a photo of a page you've been reading. Atelier accepts all three without ceremony.",
    note: "even bad handwriting counts.",
    aside: "Text · Voice · Image",
  },
  {
    title: "It answers — slowly, in your direction.",
    body: "Responses stream in word by word, like someone thinking out loud. You can interrupt, change your mind, or ask it to start over without losing the thread.",
    note: null as string | null,
    aside: "Streaming, token by token",
  },
  {
    title: "Every chat is kept, gently and privately.",
    body: "Conversations are grouped by day in the sidebar. Export any of them to JSON or PDF whenever you like. They live in your account and nowhere else.",
    note: "yours. exportable. forgettable.",
    aside: "Yours, exportable",
  },
  {
    title: "Your taste teaches it.",
    body: "A thumbs up or down on any reply is quietly noted. Over time, that ledger is what trains a small model in your own voice — independent of any large provider.",
    note: null as string | null,
    aside: "RLHF, the kind way",
  },
];

const FAQS = [
  {
    q: "Who can read my chats?",
    a: "Only you. Every row in the database is locked to your account by policy — not by promise.",
  },
  {
    q: "Will it train on my words?",
    a: "Only if you say so, with a thumbs up or down. Silence is treated as silence.",
  },
  {
    q: "Can I leave?",
    a: "In two clicks. Account deletion wipes every message, every recording, every note we kept.",
  },
  {
    q: "What does it cost?",
    a: "100 credits when you join, on us. After that, simple per-message pricing. No subscriptions to forget.",
  },
];
