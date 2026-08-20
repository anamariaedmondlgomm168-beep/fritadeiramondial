import { createFileRoute } from "@tanstack/react-router";

import { markOrderApproved } from "@/lib/admin/orders.server";
import { findOrderByPaymentId } from "@/lib/admin/store.server";

function mapLegacyStatus(status: string): "approved" | "pending" | "rejected" | "cancelled" {
  switch (String(status).toUpperCase()) {
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

export const Route = createFileRoute("/api/webhooks/legacy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Record<string, unknown>;
          const paymentId = String(body.id ?? body.paymentId ?? "");
          const status = mapLegacyStatus(String(body.status ?? "PENDING"));

          if (!paymentId) {
            return Response.json({ ok: false, error: "missing payment id" }, { status: 400 });
          }

          const existing = findOrderByPaymentId(paymentId);

          if (status === "approved") {
            await markOrderApproved({ paymentId, gateway: "legacy" });
          }

          return Response.json({
            ok: true,
            paymentId,
            status,
            orderFound: Boolean(existing),
          });
        } catch (err) {
          console.error("Legacy webhook error:", err);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
