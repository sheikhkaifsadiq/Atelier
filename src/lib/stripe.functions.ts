import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ATELIER_PRICE_ID = "price_1TfeDQIAmnnNtfMm1mXKJlAh";
export const ATELIER_PRODUCT_ID = "prod_Uey9NDmkhnTcM5";

function getStripe() {
  const key = process.env.ROTATED_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe key not set");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = getStripe();
    const { supabase, userId } = context;
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) throw new Error("No email on user");

    const origin =
      process.env.APP_ORIGIN ||
      process.env.VITE_APP_ORIGIN ||
      "http://localhost:3000";

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: ATELIER_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/chat?upgraded=1`,
      cancel_url: `${origin}/chat?upgrade_cancelled=1`,
      client_reference_id: userId,
      metadata: { user_id: userId },
      subscription_data: { metadata: { user_id: userId } },
    });

    return { url: session.url };
  });

export const openCustomerPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = getStripe();
    const { supabase } = context;
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) throw new Error("No email on user");
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data[0]) throw new Error("No Stripe customer yet");
    const origin = process.env.APP_ORIGIN || "http://localhost:3000";
    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/chat`,
    });
    return { url: portal.url };
  });
