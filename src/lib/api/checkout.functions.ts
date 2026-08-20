import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { createPixSchema } from "@/lib/checkout/schemas";
import {
  approveDemoPayment,
  getActiveGatewayName,
  getPaymentGateway,
  isDemoMode,
} from "@/lib/payment/gateway.server";

function resolvePayerIp(): string {
  const forwarded = getRequestHeader("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = getRequestHeader("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "127.0.0.1";
}

export const createPixPayment = createServerFn({ method: "POST" })
  .inputValidator(createPixSchema)
  .handler(async ({ data }) => {
    const gateway = getPaymentGateway({ payerIp: resolvePayerIp() });
    const result = await gateway.createPixPayment(data);
    return {
      ...result,
      demoMode: isDemoMode(),
      gateway: getActiveGatewayName(),
    };
  });

export const getPixPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ paymentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const gateway = getPaymentGateway({ payerIp: resolvePayerIp() });
    const result = await gateway.getPaymentStatus(data.paymentId);
    return {
      ...result,
      demoMode: isDemoMode(),
      gateway: getActiveGatewayName(),
    };
  });

export const simulatePixApproval = createServerFn({ method: "POST" })
  .inputValidator(z.object({ paymentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!isDemoMode()) {
      throw new Error("Simulacao disponivel apenas em modo demonstracao.");
    }
    const result = approveDemoPayment(data.paymentId);
    return { ...result, demoMode: true, gateway: "demo" as const };
  });
