import { randomUUID } from "node:crypto";

import { calculateTotal } from "@/lib/checkout/constants";
import type { CheckoutFormData } from "@/lib/checkout/schemas";

import { fireWebhookEvent } from "./webhooks.server";
import {
  findOrderById,
  trackAnalyticsEvent,
  upsertOrder,
  updateOrderByPaymentId,
} from "./store.server";
import type { AdminOrder, CheckoutStep, OrderStatus } from "./types.server";

export function createDraftOrder(input: {
  sessionId?: string;
  voltage?: string;
  step?: CheckoutStep;
  partial?: Partial<CheckoutFormData>;
}): AdminOrder {
  const now = new Date().toISOString();
  const existing = input.sessionId
    ? findOrderById(input.sessionId)
    : undefined;

  const shippingId = input.partial?.shippingId ?? existing?.shippingId ?? "free";
  const orderBumpIds = input.partial?.orderBumpIds ?? existing?.orderBumpIds ?? [];
  const amountCents = Math.round(calculateTotal(shippingId, orderBumpIds) * 100);

  const order: AdminOrder = {
    id: existing?.id ?? input.sessionId ?? randomUUID(),
    status: "draft",
    amountCents,
    voltage: input.partial?.voltage ?? input.voltage ?? existing?.voltage,
    shippingId,
    orderBumpIds,
    buyerName: input.partial?.name ?? existing?.buyerName,
    buyerEmail: input.partial?.email ?? existing?.buyerEmail,
    buyerPhone: input.partial?.phone ?? existing?.buyerPhone,
    buyerCpf: input.partial?.cpf ?? existing?.buyerCpf,
    checkoutStep: input.step ?? existing?.checkoutStep ?? "identification",
    checkoutStepUpdatedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  upsertOrder(order);

  if (!existing) {
    trackAnalyticsEvent({
      type: "checkout_start",
      sessionId: order.id,
      orderId: order.id,
    });
  }

  trackAnalyticsEvent({
    type: "checkout_step",
    sessionId: order.id,
    orderId: order.id,
    metadata: { step: order.checkoutStep ?? "identification" },
  });

  return order;
}

export async function registerPendingOrder(input: {
  data: CheckoutFormData;
  paymentId: string;
  gateway: string;
  sessionId?: string;
}): Promise<AdminOrder> {
  const amountCents = Math.round(
    calculateTotal(input.data.shippingId, input.data.orderBumpIds) * 100,
  );
  const now = new Date().toISOString();
  const existing = input.sessionId ? findOrderById(input.sessionId) : undefined;

  const order: AdminOrder = {
    id: existing?.id ?? randomUUID(),
    paymentId: input.paymentId,
    status: "pending",
    amountCents,
    buyerName: input.data.name,
    buyerEmail: input.data.email,
    buyerPhone: input.data.phone,
    buyerCpf: input.data.cpf,
    voltage: input.data.voltage,
    shippingId: input.data.shippingId,
    orderBumpIds: input.data.orderBumpIds,
    checkoutStep: "pix",
    checkoutStepUpdatedAt: now,
    gateway: input.gateway,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  upsertOrder(order);

  trackAnalyticsEvent({
    type: "pix_created",
    sessionId: order.id,
    orderId: order.id,
    metadata: { paymentId: input.paymentId, gateway: input.gateway },
  });

  await fireWebhookEvent("venda_pendente", order);
  return order;
}

export async function markOrderApproved(input: {
  paymentId: string;
  gateway?: string;
}): Promise<AdminOrder | undefined> {
  const existing = updateOrderByPaymentId(input.paymentId, {
    status: "approved" as OrderStatus,
    gateway: input.gateway,
    checkoutStep: "pix",
    checkoutStepUpdatedAt: new Date().toISOString(),
  });

  if (!existing) return undefined;

  trackAnalyticsEvent({
    type: "purchase",
    orderId: existing.id,
    metadata: { paymentId: input.paymentId },
  });

  await fireWebhookEvent("venda_aprovada", existing);
  return existing;
}
