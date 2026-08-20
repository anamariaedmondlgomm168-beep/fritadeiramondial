import { createHash } from "node:crypto";

import { PRODUCT } from "@/lib/checkout/constants";
import { checkoutEventId, purchaseEventId } from "@/lib/facebook-pixel-events";

import { getActiveFacebookPixels } from "./config.server";
import type { AdminOrder } from "./types.server";

function hashSha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function buildUserData(
  order?: Partial<AdminOrder>,
  extra?: {
    fbp?: string;
    fbc?: string;
    clientIp?: string;
    clientUserAgent?: string;
  },
) {
  const userData: Record<string, unknown> = {};
  if (order?.buyerEmail) userData.em = [hashSha256(order.buyerEmail)];
  if (order?.buyerPhone) {
    const digits = order.buyerPhone.replace(/\D/g, "");
    const phone = digits.startsWith("55") ? digits : `55${digits}`;
    userData.ph = [hashSha256(phone)];
  }
  if (order?.buyerName) {
    const parts = order.buyerName.trim().split(/\s+/);
    if (parts[0]) userData.fn = [hashSha256(parts[0])];
    if (parts.length > 1) userData.ln = [hashSha256(parts[parts.length - 1])];
  }
  if (extra?.fbp) userData.fbp = extra.fbp;
  if (extra?.fbc) userData.fbc = extra.fbc;
  if (extra?.clientIp) userData.client_ip_address = extra.clientIp;
  if (extra?.clientUserAgent) userData.client_user_agent = extra.clientUserAgent;
  return userData;
}

export async function fireFacebookCAPI(input: {
  eventName: string;
  eventId: string;
  sourceUrl?: string;
  customData?: Record<string, unknown>;
  order?: Partial<AdminOrder>;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  clientUserAgent?: string;
}): Promise<void> {
  const pixels = (await getActiveFacebookPixels()).filter((pixel) => pixel.accessToken.trim());
  if (pixels.length === 0) return;

  const userData = buildUserData(input.order, {
    fbp: input.fbp,
    fbc: input.fbc,
    clientIp: input.clientIp,
    clientUserAgent: input.clientUserAgent,
  });

  const customData = {
    currency: "BRL",
    content_name: PRODUCT.name,
    content_ids: [PRODUCT.id],
    content_type: "product",
    ...input.customData,
  };

  await Promise.allSettled(
    pixels.map(async (pixel) => {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${pixel.pixelId}/events`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: [
                {
                  event_name: input.eventName,
                  event_time: Math.floor(Date.now() / 1000),
                  event_id: input.eventId,
                  action_source: "website",
                  event_source_url: input.sourceUrl,
                  user_data: userData,
                  custom_data: customData,
                },
              ],
              access_token: pixel.accessToken,
            }),
          },
        );
        if (!response.ok) {
          const body = await response.text();
          console.error(`Facebook CAPI error (${pixel.pixelId}):`, body);
        }
      } catch (err) {
        console.error(`Facebook CAPI error (${pixel.pixelId}):`, err);
      }
    }),
  );
}

export async function fireFacebookPurchase(order: AdminOrder): Promise<void> {
  await fireFacebookCAPI({
    eventName: "Purchase",
    eventId: purchaseEventId(order.paymentId ?? order.id),
    customData: {
      value: order.amountCents / 100,
      currency: "BRL",
      order_id: order.id,
    },
    order,
  });
}

export async function fireFacebookInitiateCheckout(order: Partial<AdminOrder>): Promise<void> {
  if (!order.id) return;
  await fireFacebookCAPI({
    eventName: "InitiateCheckout",
    eventId: checkoutEventId(order.id),
    customData: {
      value: (order.amountCents ?? 0) / 100,
      currency: "BRL",
    },
    order,
  });
}
