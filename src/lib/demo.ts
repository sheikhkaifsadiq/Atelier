// Shared demo-account constants.
//
// These credentials intentionally live in the client bundle: the whole point
// of the demo account is that reviewers can see and use it. It is a sandboxed,
// low-value account — never reuse this password for anything real.
//
// The account is created/kept-alive server-side (see demo.functions.ts and
// routes/api/public/keep-alive.ts) so the login below always works, even on a
// fresh or paused Supabase project.

export const DEMO_EMAIL = "demo@atelier.app";
export const DEMO_PASSWORD = "AtelierDemo2025!";
export const DEMO_USERNAME = "Guest Reviewer";

// Credits the demo account is topped up to on each keep-alive / demo sign-in.
export const DEMO_CREDITS = 100;
