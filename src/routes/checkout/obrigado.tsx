import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Mail, Package, Store, Truck } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

import { CheckoutHeader, CheckoutSteps } from "@/components/checkout/CheckoutHeader";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { PRODUCT } from "@/lib/checkout/constants";
import { formatCurrency } from "@/lib/checkout/format";

const obrigadoSearchSchema = z.object({
  orderId: z.string().optional(),
  amount: z.coerce.number().optional(),
  paymentId: z.string().optional(),
});

export const Route = createFileRoute("/checkout/obrigado")({
  validateSearch: obrigadoSearchSchema,
  head: () => ({
    meta: [{ title: "Pedido confirmado — Fritadeira Mondial" }],
  }),
  component: ObrigadoPage,
});

function ObrigadoPage() {
  const { orderId, amount, paymentId } = Route.useSearch();

  useEffect(() => {
    if (!paymentId) return;
    void import("@/lib/facebook-pixel-browser").then((m) =>
      m.trackPurchase({
        paymentId,
        amount: amount ?? PRODUCT.price,
      }),
    );
  }, [paymentId, amount]);

  const displayAmount = amount ?? PRODUCT.price;
  const shortOrderId = orderId ? orderId.slice(-8).toUpperCase() : null;

  return (
    <StorefrontLayout bottomPadding="pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
        <CheckoutHeader title="Pedido confirmado" subtitle="Compra realizada com sucesso" backTo="/" />
        <CheckoutSteps current="done" />

        <div className="px-4 pt-2">
          <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white">
            <div className="px-5 pb-5 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-neutral-900">Obrigado pela compra!</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Seu pagamento PIX foi confirmado. Em breve você receberá os detalhes do pedido por
                e-mail.
              </p>
              {shortOrderId ? (
                <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-emerald-200">
                  Pedido #{shortOrderId}
                </p>
              ) : null}
            </div>

            <div className="border-t border-emerald-100 bg-white px-5 py-4">
              <div className="flex gap-3">
                <img
                  src={PRODUCT.image}
                  alt={PRODUCT.name}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-neutral-100"
                />
                <div className="min-w-0 text-left">
                  <p className="line-clamp-2 text-sm font-semibold text-neutral-900">{PRODUCT.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{PRODUCT.brand}</p>
                  <p className="mt-1 text-base font-bold text-rose-600">{formatCurrency(displayAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-bold text-neutral-900">Próximos passos</h3>
            <ul className="mt-4 space-y-4">
              <li className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Pagamento confirmado</p>
                  <p className="text-xs text-neutral-500">Recebemos seu PIX com sucesso.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100">
                  <Mail className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Confirmação por e-mail</p>
                  <p className="text-xs text-neutral-500">
                    Enviaremos o comprovante e o número de rastreio quando disponível.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <Package className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Separação do pedido</p>
                  <p className="text-xs text-neutral-500">Seu produto será preparado para envio.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Truck className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Entrega em todo o Brasil</p>
                  <p className="text-xs text-neutral-500">Prazo estimado de 8 a 13 dias úteis.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
            <Store className="h-4 w-4 shrink-0" />
            <span className="font-medium">Loja verificada · Envio nacional · Compra 100% segura</span>
          </div>

          <Link
            to="/"
            className="mt-6 block w-full rounded-full bg-rose-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
          >
            Voltar à loja
          </Link>
        </div>
    </StorefrontLayout>
  );
}
