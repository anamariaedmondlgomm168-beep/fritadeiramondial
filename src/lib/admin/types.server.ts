export type OrderStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled";

export type CheckoutStep = "identification" | "shipping" | "payment" | "pix";

export type WebhookEventType = "venda_pendente" | "venda_aprovada";

export interface AdminOrder {
  id: string;
  paymentId?: string;
  referenceId?: string;
  status: OrderStatus;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerCpf?: string;
  amountCents: number;
  voltage?: string;
  shippingId?: string;
  orderBumpIds?: string[];
  checkoutStep?: CheckoutStep;
  checkoutStepUpdatedAt?: string;
  gateway?: string;
  qrCodeCopied?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEntry {
  id: string;
  url: string;
  events: WebhookEventType[];
  active: boolean;
  label?: string;
}

export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "checkout_start"
  | "checkout_step"
  | "pix_created"
  | "purchase";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  sessionId?: string;
  orderId?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface AdminStore {
  orders: AdminOrder[];
  webhooks: WebhookEntry[];
  analytics: AnalyticsEvent[];
}
