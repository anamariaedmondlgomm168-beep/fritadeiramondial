import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertAdmin,
  createAdminToken,
  getAdminPassword,
  verifyAdminToken,
} from "@/lib/admin/auth.server";
import { createDraftOrder } from "@/lib/admin/orders.server";
import { readStore, saveWebhooks, trackAnalyticsEvent } from "@/lib/admin/store.server";
import type { CheckoutStep, WebhookEntry } from "@/lib/admin/types.server";

const tokenSchema = z.object({ token: z.string().min(1) });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const expected = getAdminPassword();
    if (data.password !== expected) {
      throw new Error("Senha incorreta.");
    }
    return { token: createAdminToken(data.password) };
  });

export const adminVerify = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => ({ valid: verifyAdminToken(data.token) }));

export const adminGetDashboard = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const store = readStore();
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const approved = store.orders.filter((o) => o.status === "approved");
    const pending = store.orders.filter((o) => o.status === "pending");
    const draft = store.orders.filter((o) => o.status === "draft");

    const revenueToday = approved
      .filter((o) => new Date(o.updatedAt) >= todayStart)
      .reduce((s, o) => s + o.amountCents, 0);

    const live = store.orders.filter((o) => {
      if (o.status !== "draft" && o.status !== "pending") return false;
      const last = o.checkoutStepUpdatedAt || o.updatedAt;
      return now - new Date(last).getTime() < 5 * 60 * 1000;
    });

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayOrders = approved.filter((o) => {
        const t = new Date(o.updatedAt);
        return t >= d && t < next;
      });
      return {
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        vendas: dayOrders.length,
        receita: dayOrders.reduce((s, o) => s + o.amountCents, 0) / 100,
      };
    });

    return {
      stats: {
        totalOrders: store.orders.length,
        approvedCount: approved.length,
        pendingCount: pending.length,
        draftCount: draft.length,
        liveCount: live.length,
        revenueTotal: approved.reduce((s, o) => s + o.amountCents, 0),
        revenueToday,
      },
      chart: last7,
      recentOrders: store.orders.slice(0, 10),
      liveOrders: live,
    };
  });

export const adminGetOrders = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(1),
      status: z.enum(["all", "draft", "pending", "approved", "rejected", "cancelled"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const store = readStore();
    const orders =
      !data.status || data.status === "all"
        ? store.orders
        : store.orders.filter((o) => o.status === data.status);
    return { orders };
  });

export const adminGetWebhooks = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    return { webhooks: readStore().webhooks };
  });

export const adminSaveWebhooks = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(1),
      webhooks: z.array(
        z.object({
          id: z.string(),
          url: z.string(),
          events: z.array(z.enum(["venda_pendente", "venda_aprovada"])),
          active: z.boolean(),
          label: z.string().optional(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const webhooks = saveWebhooks(data.webhooks as WebhookEntry[]);
    return { webhooks };
  });

export const adminGetAnalytics = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const store = readStore();
    const events = store.analytics;

    const count = (type: string) => events.filter((e) => e.type === type).length;

    const funnel = [
      { step: "Visitantes", count: count("page_view") + count("product_view") },
      { step: "Checkout", count: count("checkout_start") },
      { step: "PIX gerado", count: count("pix_created") },
      { step: "Compra", count: count("purchase") },
    ];

    const byDay = new Map<string, number>();
    for (const e of events.filter((ev) => ev.type === "purchase")) {
      const day = new Date(e.createdAt).toLocaleDateString("pt-BR");
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    const purchasesByDay = Array.from(byDay.entries())
      .slice(0, 14)
      .map(([date, total]) => ({ date, total }))
      .reverse();

    return { funnel, purchasesByDay, totalEvents: events.length };
  });

export const trackProductView = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sessionId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    trackAnalyticsEvent({
      type: "product_view",
      sessionId: data?.sessionId,
    });
    return { ok: true };
  });

export const trackCheckoutStep = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.string().optional(),
      step: z.enum(["identification", "shipping", "payment", "pix"]),
      voltage: z.string().optional(),
      partial: z
        .object({
          name: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          cpf: z.string().optional(),
          shippingId: z.enum(["free", "express"]).optional(),
          orderBumpIds: z.array(z.string()).optional(),
          voltage: z.enum(["127V", "220V"]).optional(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const order = createDraftOrder({
      sessionId: data.sessionId,
      step: data.step as CheckoutStep,
      voltage: data.voltage,
      partial: data.partial,
    });
    return { sessionId: order.id };
  });
