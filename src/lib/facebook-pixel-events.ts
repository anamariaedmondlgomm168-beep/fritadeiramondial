import { PRODUCT } from "@/lib/checkout/constants";

export function checkoutEventId(orderId: string): string {
  return `checkout_${orderId}`;
}

export function purchaseEventId(paymentId: string): string {
  return `purchase_${paymentId}`;
}

export function productEventPayload(value = PRODUCT.price) {
  return {
    content_name: PRODUCT.name,
    content_ids: [PRODUCT.id],
    content_type: "product",
    value,
    currency: "BRL",
  };
}
