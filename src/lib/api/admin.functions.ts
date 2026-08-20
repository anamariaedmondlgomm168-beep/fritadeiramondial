import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertAdmin,
  createAdminToken,
  getAdminPassword,
  verifyAdminToken,
} from "@/lib/admin/auth.server";
import { createDraftOrder } from "@/lib/admin/orders.server";
import { fireFacebookCAPI } from "@/lib/admin/facebook-pixel.server";
import {
  getPixelConfig,
  getWebhooks,
  readStore,
  savePixelConfig,
  saveWebhooks,
  trackAnalyticsEvent,
} from "@/lib/admin/store.server";
import {
  getWebhookPersistenceHint,
  saveWebhooksConfig,
} from "@/lib/admin/config.server";
import { testWebhookDelivery } from "@/lib/admin/webhooks.server";
import type { CheckoutStep, FacebookPixelEntry, PixelConfig, WebhookEntry } from "@/lib/admin/types.server";

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
    return {
      webhooks: getWebhooks(),
      persistenceHint: getWebhookPersistenceHint(),
    };
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
    const saved = await saveWebhooksConfig(data.webhooks as WebhookEntry[]);
    saveWebhooks(saved.webhooks);
    return {
      webhooks: saved.webhooks,
      persistedTo: saved.persistedTo,
      persistenceHint: getWebhookPersistenceHint(),
    };
  });

export const adminTestWebhook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(1),
      url: z.string().url(),
      event: z.enum(["venda_pendente", "venda_aprovada"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const result = await testWebhookDelivery(data.url, data.event ?? "venda_pendente");
    if (!result.ok) {
      throw new Error(result.error ?? `Webhook retornou status ${result.status ?? "erro"}`);
    }
    return { ok: true, status: result.status };
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


const facebookPixelSchema = z.object({
  id: z.string(),
  pixelId: z.string(),
  accessToken: z.string(),
  active: z.boolean(),
  label: z.string().optional(),
});

export const adminGetPixels = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    return { pixelConfig: getPixelConfig() };
  });

export const adminSavePixels = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(1),
      pixelConfig: z.object({
        facebookPixels: z.array(facebookPixelSchema),
      }),
    }),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const pixelConfig = savePixelConfig(data.pixelConfig as PixelConfig);
    return { pixelConfig };
  });

export const getPublicPixels = createServerFn({ method: "GET" }).handler(async () => {
  const pixels = getPixelConfig().facebookPixels
    .filter((p) => p.active && p.pixelId.trim())
    .map((p) => ({ id: p.id, pixelId: p.pixelId.trim() }));
  return { facebookPixels: pixels };
});

export const fireFacebookConversion = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      eventName: z.string().min(1),
      eventId: z.string().min(1),
      sourceUrl: z.string().optional(),
      customData: z.record(z.unknown()).optional(),
      userData: z
        .object({
          email: z.string().optional(),
          phone: z.string().optional(),
          name: z.string().optional(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    await fireFacebookCAPI({
      eventName: data.eventName,
      eventId: data.eventId,
      sourceUrl: data.sourceUrl,
      customData: data.customData,
      order: {
        buyerEmail: data.userData?.email,
        buyerPhone: data.userData?.phone,
        buyerName: data.userData?.name,
      },
    });
    return { ok: true };
  });
