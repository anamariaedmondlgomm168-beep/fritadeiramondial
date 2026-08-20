import type { CheckoutFormData } from "@/lib/checkout/schemas";

export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface PixPaymentResult {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: string;
  demo?: boolean;
}

export type CreatePixInput = CheckoutFormData;

export interface PaymentGateway {
  createPixPayment(input: CreatePixInput): Promise<PixPaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PixPaymentResult>;
}
