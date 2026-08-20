import { randomUUID } from "node:crypto";

import {
  ORDER_BUMPS,
  PRODUCT,
  calculateTotal,
  getShippingOption,
} from "@/lib/checkout/constants";
import { onlyDigits } from "@/lib/checkout/format";

import type { CreatePixInput, PaymentGateway, PixPaymentResult } from "./types.server";

const LEGACY_API = "https://api.legacyecombrasil.com";

interface LegacyCredentials {
  publicKey: string;
  secretKey: string;
}

function authHeader({ publicKey, secretKey }: LegacyCredentials): string {
  const encoded = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  return `Basic ${encoded}`;
}

function formatPhone(phone: string): string {
  const digits = onlyDigits(phone);
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function mapLegacyStatus(status: string): PixPaymentResult["status"] {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return "approved";
    case "REFUSED":
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
    case "CANCELED":
      return "cancelled";
    default:
      return "pending";
  }
}

function extractPixCode(body: Record<string, unknown>): string | undefined {
  const pix = body.pix as Record<string, unknown> | undefined;
  if (typeof pix?.qrcode === "string") return pix.qrcode;
  if (typeof body.pixCopyAndPaste === "string") return body.pixCopyAndPaste;
  return undefined;
}

function mapLegacyPayment(body: Record<string, unknown>): PixPaymentResult {
  const amountCents = Number(body.amount ?? 0);
  return {
    paymentId: String(body.id ?? ""),
    status: mapLegacyStatus(String(body.status ?? "PENDING")),
    amount: amountCents / 100,
    qrCode: extractPixCode(body),
    expiresAt: typeof body.createdAt === "string" ? body.createdAt : undefined,
    demo: false,
  };
}

function buildItems(input: CreatePixInput, amountCents: number) {
  const bumps = ORDER_BUMPS.filter(
    (b) => b.enabled && input.orderBumpIds.includes(b.id),
  );
  const shipping = getShippingOption(input.shippingId);

  const items = [
    {
      title: PRODUCT.name,
      quantity: 1,
      unitPrice: Math.round(PRODUCT.price * 100),
      description: `Voltagem: ${input.voltage}`,
    },
  ];

  if (shipping.price > 0) {
    items.push({
      title: shipping.label,
      quantity: 1,
      unitPrice: Math.round(shipping.price * 100),
      description: shipping.description,
    });
  }

  for (const bump of bumps) {
    items.push({
      title: bump.title,
      quantity: 1,
      unitPrice: Math.round(bump.price * 100),
      description: bump.description,
    });
  }

  const itemsTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (itemsTotal !== amountCents && items.length > 0) {
    items[0] = {
      ...items[0],
      unitPrice: amountCents - items.slice(1).reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    };
  }

  return items;
}

async function legacyFetch(
  credentials: LegacyCredentials,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${LEGACY_API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(credentials),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function parseLegacyError(body: Record<string, unknown>, fallback: string): string {
  if (typeof body.message === "string") return body.message;
  if (typeof body.error === "string") return body.error;
  if (typeof body.code === "string") return body.code;
  return fallback;
}

export function createLegacyGateway(
  credentials: LegacyCredentials,
  options?: { webhookUrl?: string; payerIp?: string },
): PaymentGateway {
  return {
    async createPixPayment(input: CreatePixInput): Promise<PixPaymentResult> {
      const amountCents = Math.round(
        calculateTotal(input.shippingId, input.orderBumpIds) * 100,
      );
      const referenceId = randomUUID();

      const payload = {
        paymentMethod: "PIX",
        amount: amountCents,
        referenceId,
        webhookUrl: options?.webhookUrl,
        isPhysicalProduct: true,
        payerIp: options?.payerIp ?? "127.0.0.1",
        customer: {
          name: input.name.trim(),
          document: onlyDigits(input.cpf),
          email: input.email.trim(),
          phone: formatPhone(input.phone),
          address: {
            street: input.street.trim(),
            number: input.number.trim(),
            zipCode: onlyDigits(input.cep).replace(/(\d{5})(\d{3})/, "$1-$2"),
            city: input.city.trim(),
            state: input.state.trim().toUpperCase(),
            ...(input.complement?.trim() ? { complement: input.complement.trim() } : {}),
            ...(input.neighborhood.trim()
              ? { neighborhood: input.neighborhood.trim() }
              : {}),
          },
        },
        items: buildItems(input, amountCents),
      };

      const response = await legacyFetch(credentials, "/payin", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          parseLegacyError(body, "Nao foi possivel criar o pagamento PIX na Legacy."),
        );
      }

      const result = mapLegacyPayment(body);
      if (!result.qrCode) {
        throw new Error("Legacy nao retornou o codigo PIX.");
      }

      return result;
    },

    async getPaymentStatus(paymentId: string): Promise<PixPaymentResult> {
      const response = await legacyFetch(credentials, `/payin/${paymentId}`, {
        method: "GET",
      });

      const body = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          parseLegacyError(body, "Nao foi possivel consultar o pagamento na Legacy."),
        );
      }

      return mapLegacyPayment(body);
    },
  };
}
