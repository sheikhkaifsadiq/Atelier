import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Return the 30 most recent in-app notifications for the current user. */
export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return { notifications: data ?? [] };
  });

/** Mark a single notification as read. */
export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: { id: string }; context: any }) => {
    const { supabase, userId } = context;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

/** Mark all notifications as read. */
export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    return { ok: true };
  });

/** Get subscription timeline events for the current user. */
export const getSubscriptionTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("subscription_events")
      .select("id, event_type, status, period_end, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { events: data ?? [] };
  });

/** Get invoice history + credit grant events for the current user. */
export const getPaymentHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [invoicesRes, grantsRes] = await Promise.all([
      supabase
        .from("stripe_invoices")
        .select("id, amount_paid, currency, status, billing_reason, period_start, period_end, invoice_pdf, hosted_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("credit_grants")
        .select("id, amount, reason, stripe_invoice_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      invoices: invoicesRes.data ?? [],
      creditGrants: grantsRes.data ?? [],
    };
  });

/** Submit a refund request. Sends an email to the admin. */
export const requestRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { reason: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    // Fetch user details
    const { data: prof } = await supabase
      .from("profiles")
      .select("username, credits, subscription_status, stripe_customer_id")
      .eq("id", userId)
      .single();
      
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("Email service not configured");

    const html = `
      <h2>Refund Request</h2>
      <p><strong>User ID:</strong> ${userId}</p>
      <p><strong>Username:</strong> ${prof?.username || "Unknown"}</p>
      <p><strong>Current Credits:</strong> ${prof?.credits}</p>
      <p><strong>Subscription Status:</strong> ${prof?.subscription_status}</p>
      <p><strong>Stripe Customer ID:</strong> ${prof?.stripe_customer_id}</p>
      <hr />
      <h3>User's Reason:</h3>
      <p>${data.reason.replace(/\\n/g, "<br>")}</p>
      <hr />
      <p><a href="https://dashboard.stripe.com/customers/${prof?.stripe_customer_id}">View Customer in Stripe</a></p>
    `;

    // Send email to admin
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Atelier <onboarding@resend.dev>",
        to: ["sheikhkaifsadiq@gmail.com"], // Assuming this is the admin email based on previous context, or use a default one
        subject: `Refund Request from ${prof?.username || "User"}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Failed to send refund email", await res.text());
      throw new Error("Failed to send refund request");
    }

    return { ok: true };
  });
