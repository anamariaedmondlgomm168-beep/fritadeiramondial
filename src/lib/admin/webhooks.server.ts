import { PRODUCT } from "@/lib/checkout/constants";

import { getEffectiveWebhooks } from "./config.server";
import type { AdminOrder, WebhookEventType } from "./types.server";

export interface WebhookPayload {
  event: WebhookEventType;
  title: string;
  text: string;
  timestamp: string;
  orderId: string;
  paymentId?: string;
  status: string;
  amountCents: number;
  amount: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  product: string;
  gateway?: string;
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildPayload(event: WebhookEventType, order: AdminOrder): WebhookPayload {
  const amount = formatAmount(order.amountCents);
  const buyer = order.buyerName?.trim() || "Cliente";
  const title = event === "venda_pendente" ? "Venda pendente" : "Venda aprovada";
  const text =
    event === "venda_pendente"
      ? `${buyer} gerou PIX de ${amount}`
      : `${buyer} pagou ${amount}`;

  return {
    event,
    title,
    text,
    timestamp: new Date().toISOString(),
    orderId: order.id,
    paymentId: order.paymentId,
    status: order.status,
    amountCents: order.amountCents,
    amount,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    product: PRODUCT.gatewayName,
    gateway: order.gateway,
  };
}

export async function fireWebhookEvent(
  eventType: WebhookEventType,
  order: AdminOrder,
): Promise<{ sent: number; failed: number }> {
  const targets = (await getEffectiveWebhooks()).filter((webhook) =>
    webhook.events.includes(eventType),
  );

  if (targets.length === 0) {
    console.warn(`No active webhooks configured for ${eventType}`);
    return { sent: 0, failed: 0 };
  }

  const payload = buildPayload(eventType, order);
  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    targets.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          failed += 1;
          const body = await response.text().catch(() => "");
          console.error(
            `Webhook failed (${webhook.label ?? webhook.url}) [${response.status}]:`,
            body.slice(0, 300),
          );
          return;
        }
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`Webhook error (${webhook.label ?? webhook.url}):`, err);
      }
    }),
  );

  return { sent, failed };
}

export async function testWebhookDelivery(
  webhookUrl: string,
  eventType: WebhookEventType = "venda_pendente",
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const payload = buildPayload(eventType, {
    id: "test-order",
    status: eventType === "venda_aprovada" ? "approved" : "pending",
    amountCents: 6990,
    buyerName: "Teste Pushcut",
    buyerEmail: "teste@exemplo.com",
    buyerPhone: "11999999999",
    paymentId: "test-payment",
    gateway: "legacy",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { ok: false, status: response.status, error: await response.text() };
    }
    return { ok: true, status: response.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao enviar webhook",
    };
  }
}
