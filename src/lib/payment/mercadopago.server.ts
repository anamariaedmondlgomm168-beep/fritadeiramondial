import { randomUUID } from "node:crypto";

import { calculateTotal, PRODUCT } from "@/lib/checkout/constants";
import { onlyDigits } from "@/lib/checkout/format";

import type { CreatePixInput, PaymentGateway, PixPaymentResult } from "./types.server";

const MP_API = "https://api.mercadopago.com";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "Cliente";
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

function mapMercadoPagoStatus(status: string): PixPaymentResult["status"] {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function mapPaymentResponse(body: Record<string, unknown>): PixPaymentResult {
  const poi = body.point_of_interaction as
    | { transaction_data?: Record<string, unknown> }
    | undefined;
  const tx = poi?.transaction_data ?? {};

  return {
    paymentId: String(body.id ?? ""),
    status: mapMercadoPagoStatus(String(body.status ?? "pending")),
    amount: Number(body.transaction_amount ?? 0),
    qrCode: typeof tx.qr_code === "string" ? tx.qr_code : undefined,
    qrCodeBase64: typeof tx.qr_code_base64 === "string" ? tx.qr_code_base64 : undefined,
    ticketUrl: typeof tx.ticket_url === "string" ? tx.ticket_url : undefined,
    expiresAt:
      typeof body.date_of_expiration === "string" ? body.date_of_expiration : undefined,
    demo: false,
  };
}

async function mpFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
      ...(init?.headers ?? {}),
    },
  });
}

export function createMercadoPagoGateway(accessToken: string): PaymentGateway {
  return {
    async createPixPayment(input: CreatePixInput): Promise<PixPaymentResult> {
      const amount = calculateTotal(input.shippingId, input.orderBumpIds);
      const { firstName, lastName } = splitName(input.name);

      const payload = {
        transaction_amount: amount,
        description: PRODUCT.name,
        payment_method_id: "pix",
        payer: {
          email: input.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: "CPF",
            number: onlyDigits(input.cpf),
          },
        },
        metadata: {
          product_id: PRODUCT.id,
          voltage: input.voltage,
          shipping_id: input.shippingId,
          order_bump_ids: input.orderBumpIds.join(","),
          phone: onlyDigits(input.phone),
          address: {
            cep: onlyDigits(input.cep),
            street: input.street,
            number: input.number,
            complement: input.complement ?? "",
            neighborhood: input.neighborhood,
            city: input.city,
            state: input.state,
          },
        },
      };

      const response = await mpFetch(accessToken, "/v1/payments", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof body.message === "string"
            ? body.message
            : "Não foi possível criar o pagamento PIX.";
        throw new Error(message);
      }

      return mapPaymentResponse(body);
    },

    async getPaymentStatus(paymentId: string): Promise<PixPaymentResult> {
      const response = await mpFetch(accessToken, `/v1/payments/${paymentId}`, {
        method: "GET",
      });

      const body = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof body.message === "string"
            ? body.message
            : "Não foi possível consultar o pagamento.";
        throw new Error(message);
      }

      return mapPaymentResponse(body);
    },
  };
}
