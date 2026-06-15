# AI Chat Platform — Self-Hosted Edition

> **Important:** This codebase was originally built on [Lovable](https://lovable.dev) using **Lovable Cloud** (a managed Supabase) and the **Lovable AI Gateway**. This ZIP is a **standalone export** — it is **no longer connected to the Lovable platform**. You are responsible for provisioning your own backend (Supabase), your own AI provider keys, your own storage bucket, and your own hosting. Everything in this README assumes you are running the project outside of Lovable.

---

## 1. Project Overview

A full-stack AI chat application with:

- **Multi-modal chat** — text, image upload + caption, and voice/audio message recording
- **Streaming AI responses** powered by Google Gemini (via the Lovable AI Gateway in the original; swappable for direct Gemini / OpenAI / OpenRouter)
- **Chat session history** with sidebar (collapsible to 4rem icon-only mode)
- **My Uploads page** showing every image / audio file the user has sent, with previews
- **Authentication** (email/password + Google OAuth) through Supabase Auth
- **Credits system** — each user gets 100 credits at signup; messages deduct credits server-side
- **Public share links** — share a chat session read-only via `/share/$token`
- **Message reporting / quality scoring** stored in `training_data_pipeline` and `message_reports`
- **Row Level Security (RLS)** on every user table — users only see their own data
- **Server-side rendering** via TanStack Start v1 (React 19 + Vite 7), targeting edge runtimes (Cloudflare Workers / Node)

### High-level architecture

```
┌────────────────────┐       ┌────────────────────────┐       ┌────────────────────┐
│  Browser (React)   │ ───▶  │ TanStack Start server   │ ───▶  │   Supabase (DB +   │
│  - Routes (file    │       │ - createServerFn RPC    │       │   Auth + Storage)  │
│    based)          │       │ - /api/public/* routes  │       └────────────────────┘
│  - Tailwind v4 +   │       │ - SSR / streaming       │                 │
│    shadcn/ui       │       └────────────────────────┘                 │
└────────────────────┘                  │                                │
                                        ▼                                │
                              ┌────────────────────┐                     │
                              │  AI Provider       │ ◀───────────────────┘
                              │  (Gemini / OpenAI) │   service-role key
                              └────────────────────┘   (server-only)
```

### Tech stack

| Layer       | Tech                                                   |
|-------------|--------------------------------------------------------|
| Framework   | TanStack Start v1 + TanStack Router + TanStack Query   |
| Build tool  | Vite 7                                                 |
| UI          | React 19, Tailwind CSS v4, shadcn/ui, Radix primitives |
| Backend     | Supabase (Postgres, Auth, Storage, RLS)                |
| Server code | `createServerFn` (RPC) + file-based `/api/public/*`    |
| AI          | Google Gemini 2.5 Flash (default) via HTTP             |
| Auth        | Supabase Auth — email/password + Google OAuth          |

---

## 2. What's in the ZIP

```
.
├── src/                          # Frontend + server functions
│   ├── routes/                   # File-based routes (TanStack Start)
│   │   ├── __root.tsx            # Root layout
│   │   ├── index.tsx             # Landing page
│   │   ├── auth.tsx              # Sign in / sign up
│   │   ├── pricing.tsx, features.tsx, privacy.tsx
│   │   ├── share.$token.tsx      # Public read-only chat share
│   │   ├── _authenticated/       # Gated subtree (chat, uploads, settings)
│   │   └── api/                  # Public HTTP routes (webhooks)
│   ├── components/               # UI components (chat, sidebar, composer…)
│   ├── lib/                      # *.functions.ts (server fns) + *.server.ts helpers
│   │   ├── ai-gateway.server.ts  # AI provider call
│   │   ├── chat.functions.ts     # sendText / sendImage / sendAudio
│   │   ├── sessions.functions.ts # chat sessions CRUD
│   │   ├── uploads.functions.ts  # list uploaded media
│   │   └── media.server.ts       # storage helpers
│   ├── integrations/supabase/    # Auto-generated Supabase clients (browser + server)
│   ├── styles.css                # Tailwind v4 + design tokens (oklch)
│   ├── router.tsx, start.ts      # Bootstrap
│   └── routeTree.gen.ts          # Auto-generated — DO NOT EDIT
├── supabase/
│   ├── migrations/               # All schema migrations (run in order)
│   └── config.toml               # Supabase CLI config
├── public/                       # Static assets
├── package.json, vite.config.ts, tsconfig.json
├── components.json               # shadcn config
└── README.md (this file)
```

---

## 3. Prerequisites

- **Node.js 20+** and **bun** (or npm/pnpm)
- **Supabase CLI** — `npm i -g supabase` (or `brew install supabase/tap/supabase`)
- A **Supabase project** (free tier at https://supabase.com works)
- A **Google AI Studio API key** for Gemini (free tier at https://aistudio.google.com/apikey) — or any compatible LLM provider
- (Optional) Google Cloud OAuth client if you want Google sign-in

---

## 4. Database setup

### Tables (created by migrations in `supabase/migrations/`)

| Table                     | Purpose                                              |
|---------------------------|------------------------------------------------------|
| `profiles`                | User profile + credit balance + role                 |
| `chat_sessions`           | One row per chat conversation, optional share token  |
| `messages`                | Every user/AI message (text, image url, audio url)   |
| `training_data_pipeline`  | Quality-rated prompt/response pairs                  |
| `message_reports`         | User-flagged messages                                |

### Database functions

- `handle_new_user()` — trigger on `auth.users` insert; creates a `profiles` row with 100 credits
- `deduct_credits(_user_id, _amount)` — atomic credit deduction
- `prevent_profile_role_change()` — blocks privilege escalation via profile updates
- `touch_updated_at()` — updates `updated_at` timestamps

### Storage bucket

- `chat-media` (private) — stores uploaded images and audio messages. Signed URLs are generated server-side.

### Apply schema to your own Supabase project

```bash
# Login to Supabase CLI
supabase login

# Link to your project (get the ref from your Supabase dashboard URL)
supabase link --project-ref <YOUR_PROJECT_REF>

# Push all migrations
supabase db push

# Create the storage bucket
supabase storage create chat-media --public=false
```

Or run the SQL files manually in the Supabase SQL editor in chronological order.

---

## 5. Environment variables

Create a `.env` file at the project root. **None of the original Lovable values work** — you must provide your own.

```bash
# ---- Client-visible (must be VITE_ prefixed) ----
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...      # the "anon"/"publishable" key
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF

# ---- Server-only (never exposed to the browser) ----
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGc...            # same as above, but read server-side
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...           # SECRET — service role key, bypasses RLS
SUPABASE_PROJECT_ID=YOUR_PROJECT_REF

# ---- AI provider ----
# The original used LOVABLE_API_KEY against https://ai.gateway.lovable.dev.
# Replace with your own. The simplest swap is Google Gemini:
GEMINI_API_KEY=AIza...                         # from https://aistudio.google.com/apikey
# or, if you keep an OpenAI-compatible gateway:
# OPENAI_API_KEY=sk-...
# OPENAI_BASE_URL=https://api.openai.com/v1
```

Where to find each Supabase value:
- **URL / project ref** — Supabase dashboard → Project Settings → API
- **Publishable (anon) key** — same page, "anon public"
- **Service role key** — same page, "service_role" (click reveal). **Never commit this. Never ship it to the browser.**

---

## 6. Removing Lovable-specific code

The Lovable export ships with two pieces that only work on Lovable's infrastructure. Swap them out before going live:

### 6.1 `LOVABLE_API_KEY` → your AI provider

**File:** `src/lib/ai-gateway.server.ts`

Find the fetch to `https://ai.gateway.lovable.dev/...` (or similar) and replace with a direct Gemini call:

```ts
// Replace the Lovable gateway call with:
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userMessage }] },
      ],
    }),
  },
);
const json = await res.json();
const reply = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
```

For image input, Gemini accepts inline base64:
```ts
parts: [{ text: caption }, { inline_data: { mime_type: "image/png", data: base64 } }]
```

For audio transcription, swap to **OpenAI Whisper** (`/v1/audio/transcriptions`) or **Gemini 1.5** audio input — both accept the raw audio file.

### 6.2 `@lovable.dev/cloud-auth-js` (Google OAuth broker)

The original calls `lovable.auth.signInWithOAuth("google", ...)`. Outside Lovable, replace with native Supabase OAuth:

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/auth/callback` },
});
```

Then enable Google in **Supabase Dashboard → Authentication → Providers → Google**, paste your Google Cloud OAuth client ID + secret, and add the callback URL `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` to the Google Cloud console.

You can also `bun remove @lovable.dev/cloud-auth-js` once all references are gone.

### 6.3 Optional cleanup

- Delete `src/integrations/supabase/auth-attacher.ts` only if you also remove every `requireSupabaseAuth` middleware — otherwise keep it; it works fine with any Supabase project.
- The file headers that say "auto-generated by Lovable — do not edit" can be edited freely now; they are just plain code.

---

## 7. Local development

```bash
# 1. Install deps
bun install              # or: npm install

# 2. Make sure .env is filled in (section 5)

# 3. Run the dev server
bun run dev              # opens http://localhost:5173

# 4. Type-check / build production
bun run build
bun run preview          # serve the production build locally
```

The dev server runs both the Vite frontend and the TanStack Start server functions in one process. Server fns are callable from the browser as typed RPC.

---

## 8. Deploying online (outside Lovable)

TanStack Start outputs a Node-compatible server by default. Pick one:

### Option A — Vercel (easiest)

1. `bun add -d @tanstack/start-adapter-vercel` (if not already present — check `vite.config.ts`)
2. Push the repo to GitHub.
3. Import on https://vercel.com/new → framework preset "Other" / "Vite".
4. Add every env var from section 5 in **Settings → Environment Variables**.
5. Build command: `bun run build`. Output directory: `.output` (or whatever the adapter writes).
6. Deploy. Update Supabase **Auth → URL Configuration → Site URL** to your Vercel URL.

### Option B — Cloudflare Workers (edge)

Already configured for `nodejs_compat`. Use the `@tanstack/start-adapter-cloudflare` adapter and `wrangler deploy`. Beware: native Node APIs like `child_process` and `sharp` will not work — keep all server code to fetch / Buffer / crypto.

### Option C — Any Node host (Render, Railway, Fly.io, your VPS)

1. `bun run build` → produces `.output/server/index.mjs`
2. `node .output/server/index.mjs` (set `PORT` env var)
3. Put nginx / Caddy in front for HTTPS.
4. Set every env var on the host.

### Option D — Docker

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", ".output/server/index.mjs"]
```

### Post-deploy checklist

- [ ] Supabase **Auth → URL Configuration → Site URL** matches your prod domain
- [ ] Supabase **Auth → URL Configuration → Redirect URLs** includes `https://yourdomain.com/**`
- [ ] Google OAuth (if used) → authorized JavaScript origins + redirect URIs updated
- [ ] Storage bucket `chat-media` exists and is **private**
- [ ] All migrations ran (`supabase db push` against prod project)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set as a SECRET env var (never a `VITE_` var)
- [ ] Hit `/auth`, sign up, send a message — confirm credits decrement and AI replies

---

## 9. Security notes

- RLS is enabled on every `public.*` table; policies scope rows to `auth.uid()`.
- `service_role` is used only inside server fns (never sent to the browser).
- `chat-media` bucket is private; access goes through signed URLs created server-side.
- Role escalation is blocked by the `prevent_profile_role_change` trigger.
- Webhook routes under `/api/public/*` must verify signatures before processing — none ship with the project, but if you add one, follow the pattern in `src/routes/api/`.

---

## 10. Troubleshooting

| Symptom                                                | Fix                                                                                              |
|--------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| `Unauthorized: No authorization header provided`       | Browser has no Supabase session — sign in. Verify `attachSupabaseAuth` is registered in `src/start.ts`. |
| `Unsupported provider: provider is not enabled`        | Enable Google (or other) in Supabase Auth → Providers.                                           |
| Blank page on `/chat` after refresh                    | Confirm the `_authenticated` route has `ssr: false` and the gate uses `supabase.auth.getUser()`. |
| `permission denied for table X`                        | Missing `GRANT` — run the migration's GRANT block or grant manually.                             |
| AI replies are empty / `LOVABLE_API_KEY not set`       | You skipped section 6.1 — swap to your own provider.                                             |
| Audio plays then disappears                            | Make sure migration `20260606120318_*.sql` ran (adds audio media_type handling).                 |

---

## 11. License & attribution

You own this code. The original scaffolding came from the Lovable platform but no longer depends on it. The Supabase, TanStack, Radix, and shadcn pieces retain their original MIT licenses.

Happy hacking.
