import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

const CREDITS_PER_CYCLE = 1500;

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key =
          process.env.ROTATED_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!key || !webhookSecret) {
          return new Response("Stripe not configured", { status: 500 });
        }
        const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });
        const body = await request.text();

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
        } catch (e) {
          return new Response(`Bad signature: ${(e as Error).message}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // ---- Idempotency / event dedup ----
        const { error: dedupErr } = await supabaseAdmin
          .from("stripe_events")
          .insert({ id: event.id, type: event.type });
        if (dedupErr) {
          if ((dedupErr as { code?: string }).code === "23505") {
            return new Response(JSON.stringify({ received: true, duplicate: true }), {
              headers: { "Content-Type": "application/json" },
            });
          }
          console.error("[stripe-webhook] dedup insert failed", dedupErr);
          return new Response("Dedup error", { status: 500 });
        }

        // ---- Enqueue job (decouples email/API failures from Stripe ack) ----
        const { error: queueErr } = await supabaseAdmin.from("webhook_jobs").insert({
          stripe_event_id: event.id,
          event_type: event.type,
          payload: event as unknown as Record<string, unknown>,
          status: "pending",
        });
        if (queueErr) {
          console.error("[stripe-webhook] failed to enqueue job", queueErr);
          // Roll back dedup so Stripe retries
          await supabaseAdmin.from("stripe_events").delete().eq("id", event.id);
          return new Response("Queue error", { status: 500 });
        }

        // ---- Process the job inline (best-effort; failures won't block ack) ----
        try {
          await processWebhookEvent(event, stripe, supabaseAdmin);

          await supabaseAdmin
            .from("webhook_jobs")
            .update({ status: "done", processed_at: new Date().toISOString() })
            .eq("stripe_event_id", event.id)
            .eq("status", "pending");
        } catch (e) {
          console.error("[stripe-webhook] inline processing failed, job stays pending for retry", event.type, e);
          await supabaseAdmin
            .from("webhook_jobs")
            .update({
              status: "failed",
              attempts: 1,
              last_error: (e as Error).message,
            })
            .eq("stripe_event_id", event.id);
        }

        // Always ack Stripe — job is queued even if processing failed
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

// ============================================================
// Core event processor (also called by the retry job runner)
// ============================================================
export async function processWebhookEvent(
  event: Stripe.Event,
  stripe: Stripe,
  supabaseAdmin: Awaited<ReturnType<typeof import("@/integrations/supabase/client.server")["supabaseAdmin"]["from"]>>["_client"] extends never
    ? any
    : any,
) {
  async function findUserIdByCustomer(customerId: string): Promise<string | null> {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (prof?.id) return prof.id;
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as Stripe.DeletedCustomer).deleted) return null;
    const email = (customer as Stripe.Customer).email;
    if (!email) return null;
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const u = data.users.find((x: { email?: string }) => x.email?.toLowerCase() === email.toLowerCase());
    if (!u) return null;
    await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", u.id);
    return u.id;
  }

  async function grantCredits(
    userId: string,
    amount: number,
    reason: string,
    stripeInvoiceId?: string,
  ) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("credits, subscription_status")
      .eq("id", userId)
      .single();
    // Prevent granting positive credits if canceled, but allow negative deductions (e.g. refunds)
    if (prof?.subscription_status === "canceled" && amount > 0) return;
    const next = Number(prof?.credits ?? 0) + amount;
    await supabaseAdmin.from("profiles").update({ credits: next }).eq("id", userId);
    // Audit log
    await supabaseAdmin.from("credit_grants").insert({
      user_id: userId,
      amount,
      reason,
      stripe_invoice_id: stripeInvoiceId ?? null,
      stripe_event_id: event.id,
    });
  }

  async function applySubscription(sub: Stripe.Subscription, uid: string) {
    const item = sub.items.data[0];
    const periodEnd = item?.current_period_end ?? (sub as any).current_period_end;
    await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: sub.status,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        payment_issue: sub.status === "past_due" || sub.status === "unpaid",
      })
      .eq("id", uid);
  }

  async function logSubscriptionEvent(
    userId: string,
    eventType: string,
    status?: string,
    periodEnd?: string | null,
  ) {
    await supabaseAdmin.from("subscription_events").insert({
      user_id: userId,
      event_type: eventType,
      status: status ?? null,
      period_end: periodEnd ?? null,
      stripe_event_id: event.id,
    });
  }

  async function createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
  ) {
    await supabaseAdmin.from("notifications").insert({ user_id: userId, type, title, body });
  }

  async function sendEmail(to: string, subject: string, html: string) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Atelier <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
  }

  async function getUserEmail(userId: string): Promise<string | null> {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const uid = s.metadata?.user_id || s.client_reference_id;
      if (uid && s.mode === "subscription") {
        if (s.customer && typeof s.customer === "string") {
          await supabaseAdmin
            .from("profiles")
            .update({ stripe_customer_id: s.customer })
            .eq("id", uid);
        }
        let periodEnd: string | null = null;
        if (s.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof s.subscription === "string" ? s.subscription : s.subscription.id,
          );
          await applySubscription(sub, uid);
          const item = sub.items.data[0];
          const pe = item?.current_period_end ?? (sub as any).current_period_end;
          periodEnd = pe ? new Date(pe * 1000).toISOString() : null;
        }
        await grantCredits(uid, CREDITS_PER_CYCLE, "subscription_create");
        await logSubscriptionEvent(uid, "created", "active", periodEnd);
        await createNotification(
          uid,
          "subscription_created",
          "Welcome to Atelier Limitless!",
          "Your subscription is active. 1,500 credits have been added to your account.",
        );
        const email = await getUserEmail(uid);
        if (email) {
          await sendEmail(
            email,
            "Welcome to Atelier Limitless! 🎉",
            `<p>Hi there,</p>
             <p>Your Atelier Limitless subscription is now active. We've added <strong>1,500 credits</strong> to your account.</p>
             <p>Enjoy unlimited AI-powered conversations!</p>`,
          );
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.resumed": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const uid =
        (sub.metadata?.user_id as string | undefined) ||
        (await findUserIdByCustomer(customerId));
      if (uid) {
        await applySubscription(sub, uid);
        const item = sub.items.data[0];
        const pe = item?.current_period_end ?? (sub as any).current_period_end;
        const periodEnd = pe ? new Date(pe * 1000).toISOString() : null;
        const evType =
          event.type === "customer.subscription.created"
            ? "created"
            : event.type === "customer.subscription.resumed"
              ? "resumed"
              : "updated";
        await logSubscriptionEvent(uid, evType, sub.status, periodEnd);
      }
      break;
    }

    case "customer.subscription.paused": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const uid =
        (sub.metadata?.user_id as string | undefined) ||
        (await findUserIdByCustomer(customerId));
      if (uid) {
        await applySubscription(sub, uid);
        await logSubscriptionEvent(uid, "paused", sub.status);
        await createNotification(
          uid,
          "subscription_paused",
          "Subscription paused",
          "Your Atelier subscription has been paused. Resume anytime from the billing portal.",
        );
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const uid =
        (sub.metadata?.user_id as string | undefined) ||
        (await findUserIdByCustomer(customerId));
      if (uid) {
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "canceled",
            cancel_at_period_end: false,
            stripe_subscription_id: null,
          })
          .eq("id", uid);
        await logSubscriptionEvent(uid, "canceled", "canceled");
        await createNotification(
          uid,
          "subscription_canceled",
          "Subscription canceled",
          "Your Atelier Limitless subscription has been canceled. Your remaining credits are still available.",
        );
        const email = await getUserEmail(uid);
        if (email) {
          await sendEmail(
            email,
            "Your Atelier subscription has been canceled",
            `<p>Your Atelier Limitless subscription has been canceled.</p>
             <p>Your remaining credits are still available. <a href="${process.env.APP_ORIGIN || "http://localhost:3000"}/chat">Re-subscribe anytime.</a></p>`,
          );
        }
      }
      break;
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.billing_reason === "subscription_create") break;
      if (inv.billing_reason && inv.billing_reason !== "subscription_cycle") break;
      const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      if (!customerId) break;
      const uid = await findUserIdByCustomer(customerId);
      if (uid) {
        // Clear payment issue flag
        await supabaseAdmin
          .from("profiles")
          .update({ payment_issue: false })
          .eq("id", uid);

        // Cache invoice
        await supabaseAdmin.from("stripe_invoices").upsert({
          id: inv.id,
          user_id: uid,
          amount_paid: inv.amount_paid,
          currency: inv.currency,
          status: inv.status,
          billing_reason: inv.billing_reason,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          invoice_pdf: (inv as any).invoice_pdf ?? null,
          hosted_url: (inv as any).hosted_invoice_url ?? null,
        });

        await grantCredits(uid, CREDITS_PER_CYCLE, "subscription_cycle", inv.id);
        await logSubscriptionEvent(uid, "renewed", "active");
        await createNotification(
          uid,
          "payment_resolved",
          "Payment successful — credits renewed",
          `Your subscription has renewed and 1,500 credits have been added to your account.`,
        );
        const email = await getUserEmail(uid);
        if (email) {
          await sendEmail(
            email,
            "Your Atelier subscription has renewed",
            `<p>Your Atelier Limitless subscription has renewed successfully.</p>
             <p>We've added <strong>1,500 credits</strong> to your account.</p>`,
          );
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      if (!customerId) break;
      const uid = await findUserIdByCustomer(customerId);
      if (uid) {
        await supabaseAdmin
          .from("profiles")
          .update({ payment_issue: true, subscription_status: "past_due" })
          .eq("id", uid);

        // Cache failed invoice
        await supabaseAdmin.from("stripe_invoices").upsert({
          id: inv.id,
          user_id: uid,
          amount_paid: inv.amount_paid,
          currency: inv.currency,
          status: "open",
          billing_reason: inv.billing_reason,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          invoice_pdf: (inv as any).invoice_pdf ?? null,
          hosted_url: (inv as any).hosted_invoice_url ?? null,
        });

        await logSubscriptionEvent(uid, "payment_failed", "past_due");
        await createNotification(
          uid,
          "payment_issue",
          "Payment failed — action required",
          "We couldn't process your latest payment. Update your card in the billing portal to keep your credits.",
        );

        // Email alert (errors here are isolated — won't re-throw)
        try {
          const customer = await stripe.customers.retrieve(customerId);
          const email = (customer as Stripe.Customer).email;
          if (email) {
            await sendEmail(
              email,
              "Payment issue with your Atelier subscription",
              `<p>Your latest payment for Atelier Limitless didn't go through.</p>
               <p>Please <a href="${process.env.APP_ORIGIN || "http://localhost:3000"}/chat">update your payment method</a> in the billing portal to keep your monthly credits.</p>`,
            );
          }
        } catch (e) {
          console.warn("[stripe-webhook] payment_failed email send failed", e);
        }
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
      if (!customerId) break;
      const uid = await findUserIdByCustomer(customerId);
      if (uid) {
        // Calculate the ratio of the refund (e.g., partial or full)
        const ratio = charge.amount_refunded / charge.amount;
        const creditsToRevoke = Math.floor(CREDITS_PER_CYCLE * ratio);
        
        if (creditsToRevoke > 0) {
          await grantCredits(uid, -creditsToRevoke, "refund_issued");
          await createNotification(
            uid,
            "refund_issued",
            "Refund Processed",
            `A refund has been processed. ${creditsToRevoke} credits have been deducted from your account.`,
          );
        }
      }
      break;
    }

    default:
      break;
  }
}
