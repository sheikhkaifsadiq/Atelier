import { createServerFn } from "@tanstack/react-start";
import { DEMO_CREDITS, DEMO_EMAIL, DEMO_PASSWORD, DEMO_USERNAME } from "./demo";

/**
 * Idempotently create (or refresh) the single demo account.
 *
 * Safe to expose publicly: it is scoped to ONE hard-coded email, so the worst a
 * caller can do is re-provision the shared demo account. It:
 *   1. creates the demo auth user if missing (email pre-confirmed),
 *   2. resets its password so the advertised credentials always work,
 *   3. tops its credits back up so the demo never runs dry.
 *
 * Any read/write here also counts as Supabase activity, which keeps a
 * free-tier project from auto-pausing.
 */
export async function seedDemoUser(): Promise<{
  created: boolean;
  userId: string | null;
}> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  // Find the demo user (paginate defensively; the project is tiny).
  let userId: string | null = null;
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase(),
    );
    if (match) {
      userId = match.id;
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  let created = false;
  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { username: DEMO_USERNAME, is_demo: true },
    });
    if (error) throw new Error(error.message);
    userId = data.user?.id ?? null;
    created = true;
  } else {
    // Keep the advertised password valid even if it drifted.
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
  }

  if (userId) {
    // Top the demo account's credits back up so it never runs dry.
    // (The handle_new_user trigger seeds credits on create; this covers reuse.)
    await supabaseAdmin
      .from("profiles")
      .update({ credits: DEMO_CREDITS, username: DEMO_USERNAME })
      .eq("id", userId)
      .lt("credits", DEMO_CREDITS);
  }

  return { created, userId };
}

/**
 * Public server function used by the "Try the demo account" button on /auth.
 * Ensures the demo user exists before the browser attempts to sign in.
 */
export const ensureDemoUser = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const { created } = await seedDemoUser();
      return { ok: true, created };
    } catch (e) {
      console.error("[demo] ensureDemoUser failed", e);
      return { ok: false, error: (e as Error).message };
    }
  },
);
