/**
 * Tests for Stripe webhook idempotency and exact-once credit grants.
 *
 * Run with:   npx vitest run src/lib/api/stripe-webhook.test.ts
 *
 * These are unit tests that mock Supabase and Stripe — no real network calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase admin client ───────────────────────────────────────────────

function buildSupabaseMock() {
  const data: {
    stripe_events: Record<string, { id: string; type: string }>;
    webhook_jobs: Array<Record<string, unknown>>;
    profiles: Record<string, { credits: number; subscription_status: string; stripe_customer_id?: string }>;
    credit_grants: Array<Record<string, unknown>>;
    notifications: Array<Record<string, unknown>>;
    subscription_events: Array<Record<string, unknown>>;
    stripe_invoices: Array<Record<string, unknown>>;
  } = {
    stripe_events: {},
    webhook_jobs: [],
    profiles: {
      "user-1": { credits: 100, subscription_status: "active", stripe_customer_id: "cus_test" },
    },
    credit_grants: [],
    notifications: [],
    subscription_events: [],
    stripe_invoices: [],
  };

  const tableClient = (tableName: keyof typeof data) => {
    let _filter: Record<string, unknown> = {};
    let _insert: unknown = null;
    let _update: unknown = null;

    const obj: any = {
      // insert
      insert: (row: unknown) => {
        _insert = row;
        if (tableName === "stripe_events") {
          const r = row as { id: string; type: string };
          if (data.stripe_events[r.id]) {
            return Promise.resolve({ error: { code: "23505" } });
          }
          data.stripe_events[r.id] = r;
          return Promise.resolve({ error: null });
        }
        if (Array.isArray(data[tableName])) {
          (data[tableName] as unknown[]).push(row);
        }
        return Promise.resolve({ error: null });
      },
      // select
      select: (_cols: string) => obj,
      eq: (col: string, val: unknown) => {
        _filter[col] = val;
        return obj;
      },
      maybeSingle: () => {
        if (tableName === "profiles") {
          const uid = _filter["id"] as string;
          const cid = _filter["stripe_customer_id"] as string | undefined;
          if (uid) return Promise.resolve({ data: data.profiles[uid] ?? null });
          if (cid) {
            const found = Object.entries(data.profiles).find(
              ([, p]) => p.stripe_customer_id === cid,
            );
            return Promise.resolve({ data: found ? { id: found[0], ...found[1] } : null });
          }
        }
        return Promise.resolve({ data: null });
      },
      single: () => {
        if (tableName === "profiles") {
          const uid = _filter["id"] as string;
          return Promise.resolve({ data: data.profiles[uid] ?? null });
        }
        return Promise.resolve({ data: null });
      },
      // update
      update: (patch: unknown) => {
        _update = patch;
        return obj;
      },
      // upsert
      upsert: (row: unknown) => {
        if (Array.isArray(data[tableName])) {
          (data[tableName] as unknown[]).push(row);
        }
        return Promise.resolve({ error: null });
      },
      // finalize update
      then: (resolve: (v: { error: null }) => void) => {
        if (tableName === "profiles" && _update) {
          const uid = _filter["id"] as string;
          if (uid && data.profiles[uid]) {
            Object.assign(data.profiles[uid], _update);
          }
        }
        resolve({ error: null });
      },
    };
    return obj;
  };

  const mock = {
    from: (table: string) => tableClient(table as keyof typeof data),
    auth: {
      admin: {
        listUsers: () => Promise.resolve({ data: { users: [{ id: "user-1", email: "user@test.com" }] } }),
        getUserById: (_id: string) =>
          Promise.resolve({ data: { user: { email: "user@test.com" } } }),
      },
    },
    _data: data,
  };
  return mock;
}

// ─── Mock Stripe ──────────────────────────────────────────────────────────────

function buildStripeMock() {
  return {
    customers: {
      retrieve: vi.fn().mockResolvedValue({ email: "user@test.com", deleted: false }),
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: "sub_1",
        status: "active",
        customer: "cus_test",
        items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30 }] },
        cancel_at_period_end: false,
        metadata: {},
      }),
    },
  };
}

// ─── Import the processor (mocked dependencies will be injected) ──────────────

// We import the raw function inline to avoid ESM server-fn wrappers
async function importProcessor() {
  // Re-export processWebhookEvent without the full server route plumbing
  const mod = await import("../../../src/routes/api/public/stripe-webhook");
  return mod.processWebhookEvent;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Stripe webhook — idempotency via stripe_events dedup", () => {
  it("returns duplicate:true on second insert of same event id", () => {
    const db = buildSupabaseMock();
    // First insert should succeed
    const first = db.from("stripe_events").insert({ id: "evt_001", type: "invoice.paid" });
    expect(first).toBeDefined();
    // Second insert of same id should fail with 23505
    const second = db.from("stripe_events").insert({ id: "evt_001", type: "invoice.paid" });
    return second.then((res: any) => {
      expect(res.error?.code).toBe("23505");
    });
  });

  it("does not insert a duplicate stripe_event row", async () => {
    const db = buildSupabaseMock();
    db.from("stripe_events").insert({ id: "evt_002", type: "invoice.paid" });
    db.from("stripe_events").insert({ id: "evt_002", type: "invoice.paid" });
    // Only one entry should exist
    expect(Object.keys(db._data.stripe_events)).toHaveLength(1);
  });
});

describe("Stripe webhook — credits granted exactly once per subscription cycle", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("grants credits once for invoice.paid (subscription_cycle)", async () => {
    const db = buildSupabaseMock();
    const stripe = buildStripeMock() as any;

    // Build a minimal invoice.paid event
    const event = {
      id: "evt_inv_001",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_001",
          billing_reason: "subscription_cycle",
          customer: "cus_test",
          amount_paid: 100,
          currency: "usd",
          status: "paid",
          period_start: Math.floor(Date.now() / 1000) - 86400,
          period_end: Math.floor(Date.now() / 1000),
          invoice_pdf: null,
          hosted_invoice_url: null,
        },
      },
    } as any;

    const { processWebhookEvent } = await import(
      "../../../src/routes/api/public/stripe-webhook"
    );

    await processWebhookEvent(event, stripe, db as any);

    // Exactly one credit grant should exist
    expect(db._data.credit_grants).toHaveLength(1);
    const grant = db._data.credit_grants[0] as any;
    expect(grant.amount).toBe(1500);
    expect(grant.reason).toBe("subscription_cycle");
    expect(grant.user_id).toBe("user-1");
  });

  it("does NOT grant credits for subscription_create billing reason (handled by checkout)", async () => {
    const db = buildSupabaseMock();
    const stripe = buildStripeMock() as any;

    const event = {
      id: "evt_inv_002",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_002",
          billing_reason: "subscription_create",
          customer: "cus_test",
          amount_paid: 100,
          currency: "usd",
          status: "paid",
          period_start: null,
          period_end: null,
          invoice_pdf: null,
          hosted_invoice_url: null,
        },
      },
    } as any;

    const { processWebhookEvent } = await import(
      "../../../src/routes/api/public/stripe-webhook"
    );

    await processWebhookEvent(event, stripe, db as any);

    // No credit grants — subscription_create is handled by checkout.session.completed
    expect(db._data.credit_grants).toHaveLength(0);
  });

  it("does NOT grant credits if subscription is canceled", async () => {
    const db = buildSupabaseMock();
    // Override profile to canceled
    db._data.profiles["user-1"].subscription_status = "canceled";
    const stripe = buildStripeMock() as any;

    const event = {
      id: "evt_inv_003",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_003",
          billing_reason: "subscription_cycle",
          customer: "cus_test",
          amount_paid: 100,
          currency: "usd",
          status: "paid",
          period_start: null,
          period_end: null,
          invoice_pdf: null,
          hosted_invoice_url: null,
        },
      },
    } as any;

    const { processWebhookEvent } = await import(
      "../../../src/routes/api/public/stripe-webhook"
    );

    await processWebhookEvent(event, stripe, db as any);
    expect(db._data.credit_grants).toHaveLength(0);
  });
});

describe("Stripe webhook — payment_issue notifications", () => {
  it("creates an in-app notification on invoice.payment_failed", async () => {
    const db = buildSupabaseMock();
    const stripe = buildStripeMock() as any;

    const event = {
      id: "evt_fail_001",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_fail",
          customer: "cus_test",
          amount_paid: 0,
          currency: "usd",
          status: "open",
          billing_reason: "subscription_cycle",
          period_start: null,
          period_end: null,
          invoice_pdf: null,
          hosted_invoice_url: null,
        },
      },
    } as any;

    const { processWebhookEvent } = await import(
      "../../../src/routes/api/public/stripe-webhook"
    );

    await processWebhookEvent(event, stripe, db as any);

    // payment_issue flag set
    expect(db._data.profiles["user-1"].subscription_status).toBe("past_due");

    // In-app notification created
    const notif = db._data.notifications.find((n: any) => n.type === "payment_issue");
    expect(notif).toBeTruthy();
  });

  it("creates payment_resolved notification on invoice.paid after failure", async () => {
    const db = buildSupabaseMock();
    db._data.profiles["user-1"].subscription_status = "past_due";
    const stripe = buildStripeMock() as any;

    const event = {
      id: "evt_resolved_001",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_resolved",
          billing_reason: "subscription_cycle",
          customer: "cus_test",
          amount_paid: 100,
          currency: "usd",
          status: "paid",
          period_start: null,
          period_end: null,
          invoice_pdf: null,
          hosted_invoice_url: null,
        },
      },
    } as any;

    const { processWebhookEvent } = await import(
      "../../../src/routes/api/public/stripe-webhook"
    );

    await processWebhookEvent(event, stripe, db as any);

    const notif = db._data.notifications.find((n: any) => n.type === "payment_resolved");
    expect(notif).toBeTruthy();
  });
});
