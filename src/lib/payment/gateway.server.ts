import { randomUUID } from "node:crypto";

import { calculateTotal, PRODUCT } from "@/lib/checkout/constants";

import { createLegacyGateway } from "./legacy.server";
import { createMercadoPagoGateway } from "./mercadopago.server";
import type { CreatePixInput, PaymentGateway, PixPaymentResult } from "./types.server";

interface DemoPaymentRecord extends PixPaymentResult {
  createdAt: number;
}

const demoPayments = new Map<string, DemoPaymentRecord>();

function buildDemoPixCode(paymentId: string, amount: number): string {
  const amountStr = amount.toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136${paymentId}520400005303986540${amountStr.length}${amountStr}5802BR5925PONTO QUENTE6009SAO PAULO62070503***6304DEMO`;
}

function createDemoGateway(): PaymentGateway {
  return {
    async createPixPayment(input: CreatePixInput): Promise<PixPaymentResult> {
      const paymentId = randomUUID();
      const amount = calculateTotal(input.shippingId, input.orderBumpIds);
      const qrCode = buildDemoPixCode(paymentId, amount);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const record: DemoPaymentRecord = {
        paymentId,
        status: "pending",
        amount,
        qrCode,
        expiresAt,
        demo: true,
      };

      demoPayments.set(paymentId, record);
      return record;
    },

    async getPaymentStatus(paymentId: string): Promise<PixPaymentResult> {
      const record = demoPayments.get(paymentId);
      if (!record) {
        throw new Error("Pagamento nao encontrado.");
      }

      const { createdAt: _createdAt, ...result } = record;
      return result;
    },
  };
}

function hasLegacyCredentials(): boolean {
  return Boolean(
    process.env.LEGACY_PUBLIC_KEY?.trim() && process.env.LEGACY_SECRET_KEY?.trim(),
  );
}

function hasMercadoPagoToken(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

export function isDemoMode(): boolean {
  return !hasLegacyCredentials() && !hasMercadoPagoToken();
}

export function getActiveGatewayName(): "legacy" | "mercadopago" | "demo" {
  if (hasLegacyCredentials()) return "legacy";
  if (hasMercadoPagoToken()) return "mercadopago";
  return "demo";
}

export function getPaymentGateway(options?: {
  payerIp?: string;
}): PaymentGateway {
  const publicKey = process.env.LEGACY_PUBLIC_KEY?.trim();
  const secretKey = process.env.LEGACY_SECRET_KEY?.trim();

  if (publicKey && secretKey) {
    const publicAppUrl = process.env.PUBLIC_APP_URL?.trim();
    const webhookUrl =
      process.env.LEGACY_WEBHOOK_URL?.trim() ||
      (publicAppUrl ? `${publicAppUrl.replace(/\/$/, "")}/api/webhooks/legacy` : undefined);

    return createLegacyGateway(
      { publicKey, secretKey },
      { webhookUrl, payerIp: options?.payerIp },
    );
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (token) {
    return createMercadoPagoGateway(token);
  }

  return createDemoGateway();
}

export function approveDemoPayment(paymentId: string): PixPaymentResult {
  const record = demoPayments.get(paymentId);
  if (!record) {
    throw new Error("Pagamento nao encontrado.");
  }

  record.status = "approved";
  demoPayments.set(paymentId, record);

  const { createdAt: _createdAt, ...result } = record;
  return result;
}
