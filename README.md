# AI ChatBot — Enterprise Upgrade

Frontend: React (CRA) · Backend: Node.js + Express + PostgreSQL · AI: Gemini.

## Run locally

```bash
# 1. Configure env
cp backend/.env.example backend/.env   # fill in DATABASE_URL, JWT_SECRET, PASSWORD_PEPPER, GEMINI_API_KEY, GOOGLE_* (optional)

# 2. Apply migrations
cd backend && npm install && npm run migrate

# 3. Start backend (port 5000)
npm run dev

# 4. Start frontend (port 3000) — in another terminal
cd ../frontend && npm install && npm start
```

## What's new (vs. the original ZIP)

### Security
- **Salt + Pepper** password hashing: `HMAC-SHA256(password, PASSWORD_PEPPER)` → bcrypt (cost 12). Legacy hashes auto-upgrade on first successful login.
- Strict per-user ownership checks on every session/message/feedback row.

### API
- Versioned routing under `/api/v1/{auth,chat,users,sessions,feedback}`. Legacy `/api/*` paths preserved.

### Chat
- Persistent chat sessions with titles, sorted by recency, grouped Today / Previous 7 Days / Older in the UI.
- **Contextual memory**: last 10 messages of the session are sent to Gemini on every call.
- Streaming-style typewriter rendering on assistant messages, skeleton loaders, animated typing dots.
- Thumbs-up / thumbs-down feedback per assistant message.

### Billing
- `users.credits` (NUMERIC). Default 100. Costs: text 0.1 / image 0.5 / audio 0.3.
- `requireCredits` middleware blocks calls with `402` when the balance is insufficient.
- Frontend `CreditGuard` intercepts 402 and opens the upgrade modal.

### Google OAuth
- `GET /api/v1/auth/google` → callback returns to `${FRONTEND_URL}/auth/callback?accessToken=…&refreshToken=…`.
- Users found by `google_id` first, then merged onto matching email if one exists.

### RLHF pipeline
- Every assistant reply is logged async into `training_data_pipeline` (prompt, response, model, media_type, session_id, user_id).
- Thumbs feedback writes `quality_score` (+1 / −1) on the same row — your future model's training set.

## File map (new)

```
backend/
  migrations/001_enterprise_upgrade.sql
  src/
    services/{session,billing,training,google-auth}.service.js
    middlewares/credits.middleware.js
    controllers/{session,feedback,user}.controller.js
    routes/v1/{index,auth,chat,users,sessions,feedback}.routes.js
    utils/password.js                  # rewritten with pepper
frontend/
  tailwind.config.js, postcss.config.js
  src/
    components/layout/{AppShell,Sidebar,SessionGroup}.js
    components/chat/{Composer,MessageBubble,Typewriter,SkeletonBubble,TypingDots,FeedbackButtons}.js
    components/modals/{GlassModal,SettingsModal,ProfileModal,CreditsModal}.js
    components/CreditGuard.js
    pages/{Chat,AuthCallback}.js       # reworked
    services/{session,feedback,user}.service.js
```
