import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { CheckoutHeader, CheckoutSteps } from "@/components/checkout/CheckoutHeader";
import {
  getPixPaymentStatus,
  simulatePixApproval,
} from "@/lib/api/checkout.functions";
import { PRODUCT } from "@/lib/checkout/constants";
import { formatCurrency } from "@/lib/checkout/format";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { cn } from "@/lib/utils";

const pixSearchSchema = z.object({
  paymentId: z.string().min(1),
  orderId: z.string().optional(),
  amount: z.coerce.number().optional(),
});

export const Route = createFileRoute("/checkout/pix")({
  validateSearch: pixSearchSchema,
  head: () => ({
    meta: [{ title: "Pagamento PIX — Fritadeira Mondial" }],
  }),
  component: PixPaymentPage,
});

function qrImageSrc(qrCodeBase64?: string, qrCode?: string): string | undefined {
  if (qrCodeBase64) {
    return qrCodeBase64.startsWith("data:")
      ? qrCodeBase64
      : `data:image/png;base64,${qrCodeBase64}`;
  }
  if (qrCode) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCode)}`;
  }
  return undefined;
}

function PixPaymentPage() {
  const navigate = useNavigate();
  const { paymentId, orderId, amount: searchAmount } = Route.useSearch();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "cancelled">(
    "pending",
  );
  const [amount, setAmount] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | undefined>();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | undefined>();
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const displayAmount = amount ?? searchAmount ?? PRODUCT.price;

  useEffect(() => {
    if (!orderId) return;
    void import("@/lib/facebook-pixel-browser").then((m) =>
      m.trackInitiateCheckout({
        orderId,
        amount: displayAmount,
      }),
    );
  }, [orderId, displayAmount]);

  useEffect(() => {
    if (status !== "approved") return;
    void navigate({
      to: "/checkout/obrigado",
      search: {
        orderId,
        amount: displayAmount,
        paymentId,
      },
    });
  }, [status, navigate, orderId, displayAmount, paymentId]);

  const refreshStatus = useCallback(async () => {
    try {
      const result = await getPixPaymentStatus({ data: { paymentId } });
      setStatus(result.status);
      setAmount(result.amount);
      setQrCode(result.qrCode);
      setQrCodeBase64(result.qrCodeBase64);
      setDemoMode(result.demoMode);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao consultar pagamento.");
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(() => {
      void refreshStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [status, refreshStatus]);

  const copyPixCode = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar o código PIX.");
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setError(null);
    try {
      const result = await simulatePixApproval({ data: { paymentId } });
      setStatus(result.status);
      setAmount(result.amount);
      setDemoMode(result.demoMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na simulação.");
    } finally {
      setSimulating(false);
    }
  };

  const imgSrc = qrImageSrc(qrCodeBase64, qrCode);

  return (
    <StorefrontLayout bottomPadding="pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
        <CheckoutHeader title="Pagamento PIX" subtitle="Escaneie ou copie o código para pagar" />
        <CheckoutSteps current="pix" />

        <div className="px-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center gap-3">
              <img
                src={PRODUCT.image}
                alt={PRODUCT.name}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-neutral-900">{PRODUCT.name}</p>
                <p className="mt-1 text-xs text-neutral-500">Total a pagar</p>
              </div>
              <p className="text-lg font-bold text-rose-600">{formatCurrency(displayAmount)}</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              <p className="text-sm text-neutral-500">Gerando seu PIX…</p>
            </div>
          ) : null}

          {error ? (
            <p className="mt-6 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>
          ) : null}

          {!loading ? (
            <div className="mt-6 space-y-5">
              {demoMode ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
                  Modo demonstração — pagamento simulado localmente. Configure{" "}
                  <span className="font-semibold">LEGACY_PUBLIC_KEY</span> e{" "}
                  <span className="font-semibold">LEGACY_SECRET_KEY</span> para produção.
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700">
                <ShieldCheck className="h-4 w-4" />
                Pagamento instantâneo e 100% seguro
              </div>

              {imgSrc ? (
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      QR Code PIX
                    </p>
                  </div>
                  <div className="flex justify-center p-4 sm:p-5">
                    <div className="w-full max-w-56 rounded-xl border-2 border-dashed border-sky-200 bg-white p-3">
                      <img
                        src={imgSrc}
                        alt="QR Code PIX"
                        className="aspect-square w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-sky-600" />
                  <h2 className="text-sm font-bold text-neutral-900">Como pagar</h2>
                </div>
                <ol className="mt-3 space-y-2.5 text-sm text-neutral-600">
                  <li className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                      1
                    </span>
                    <span>Abra o app do seu banco ou carteira digital.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                      2
                    </span>
                    <span>Escolha pagar com PIX e escaneie o QR Code acima.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                      3
                    </span>
                    <span>Confirme o valor de {formatCurrency(displayAmount)} e finalize.</span>
                  </li>
                </ol>
              </div>

              {qrCode ? (
                <div>
                  <label className="text-xs font-semibold text-neutral-700">Pix Copia e Cola</label>
                  <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                    <textarea
                      readOnly
                      value={qrCode}
                      rows={3}
                      className="w-full resize-none bg-transparent p-3 text-xs leading-relaxed text-neutral-700 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyPixCode()}
                    className={cn(
                      "mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white transition",
                      copied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-sky-600 hover:bg-sky-700",
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Código copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar código PIX
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                </span>
                <p className="text-xs text-neutral-600">
                  Aguardando confirmação do pagamento… verificamos a cada 5 segundos.
                </p>
              </div>

              {demoMode ? (
                <button
                  type="button"
                  onClick={() => void handleSimulate()}
                  disabled={simulating}
                  className="w-full rounded-full border border-orange-300 bg-orange-50 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-70"
                >
                  {simulating ? "Simulando…" : "Simular pagamento aprovado (demo)"}
                </button>
              ) : null}
            </div>
          ) : null}

          <Link
            to="/checkout"
            className="mt-8 block text-center text-sm font-medium text-sky-600 hover:underline"
          >
            Voltar ao checkout
          </Link>
        </div>
    </StorefrontLayout>
  );
}
