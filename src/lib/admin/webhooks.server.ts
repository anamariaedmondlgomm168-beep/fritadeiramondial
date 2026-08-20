import type { AdminOrder, WebhookEventType } from "./types.server";
import { readStore } from "./store.server";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  orderId: string;
  paymentId?: string;
  status: string;
  amountCents: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  product: string;
  gateway?: string;
}

function buildPayload(event: WebhookEventType, order: AdminOrder): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    orderId: order.id,
    paymentId: order.paymentId,
    status: order.status,
    amountCents: order.amountCents,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    product: "Fritadeira Air Fryer Mondial AFON-12L-BI",
    gateway: order.gateway,
  };
}

export async function fireWebhookEvent(
  eventType: WebhookEventType,
  order: AdminOrder,
): Promise<void> {
  const store = readStore();
  const targets = store.webhooks.filter(
    (w) => w.active && w.url.trim() && w.events.includes(eventType),
  );

  if (targets.length === 0) return;

  const payload = buildPayload(eventType, order);

  await Promise.allSettled(
    targets.map(async (webhook) => {
      try {
        await fetch(webhook.url.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error(`Webhook error (${webhook.url}):`, err);
      }
    }),
  );
}
