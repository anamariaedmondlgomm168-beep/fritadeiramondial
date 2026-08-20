import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, Loader2, QrCode } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import {
  getPixPaymentStatus,
  simulatePixApproval,
} from "@/lib/api/checkout.functions";
import { formatCurrency } from "@/lib/checkout/format";
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
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrCode)}`;
  }
  return undefined;
}

function PixPaymentPage() {
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

  useEffect(() => {
    if (!orderId) return;
    void import("@/lib/facebook-pixel-browser").then((m) =>
      m.trackInitiateCheckout({
        orderId,
        amount: searchAmount ?? amount ?? 69.9,
      }),
    );
  }, [orderId, searchAmount, amount]);

  useEffect(() => {
    if (status !== "approved" || !paymentId) return;
    void import("@/lib/facebook-pixel-browser").then((m) =>
      m.trackPurchase({
        paymentId,
        amount: amount ?? searchAmount ?? 69.9,
      }),
    );
  }, [status, paymentId, amount, searchAmount]);

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
      setTimeout(() => setCopied(false), 2000);
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
  const isApproved = status === "approved";

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-[480px] px-4 py-6 pb-16">
        <div className="text-center">
          <div
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
              isApproved ? "bg-emerald-100" : "bg-sky-100",
            )}
          >
            {isApproved ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <QrCode className="h-8 w-8 text-sky-600" />
            )}
          </div>
          <h1 className="mt-4 text-xl font-bold">
            {isApproved ? "Pagamento confirmado!" : "Pague com PIX"}
          </h1>
          {amount != null ? (
            <p className="mt-1 text-lg font-semibold text-rose-600">{formatCurrency(amount)}</p>
          ) : null}
          <p className="mt-2 text-sm text-neutral-600">
            {isApproved
              ? "Recebemos seu pagamento. Em breve você receberá a confirmação por e-mail."
              : "Escaneie o QR Code ou copie o código abaixo para concluir sua compra."}
          </p>
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          </div>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {!loading && !isApproved ? (
          <div className="mt-8 space-y-4">
            {demoMode ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Modo demonstração — pagamento simulado localmente (configure LEGACY_PUBLIC_KEY e
                LEGACY_SECRET_KEY para produção).
              </div>
            ) : null}

            {imgSrc ? (
              <div className="flex justify-center rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <img src={imgSrc} alt="QR Code PIX" className="h-56 w-56 object-contain" />
              </div>
            ) : null}

            {qrCode ? (
              <div>
                <label className="text-xs font-semibold text-neutral-600">Pix Copia e Cola</label>
                <div className="mt-2 flex gap-2">
                  <textarea
                    readOnly
                    value={qrCode}
                    rows={3}
                    className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 p-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => void copyPixCode()}
                    className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            ) : null}

            <p className="text-center text-xs text-neutral-500">
              Aguardando confirmação… atualizamos a cada 5 segundos.
            </p>

            {demoMode ? (
              <button
                type="button"
                onClick={() => void handleSimulate()}
                disabled={simulating}
                className="w-full rounded-full border border-orange-300 bg-orange-50 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-70"
              >
                {simulating ? "Simulando…" : "Simular pagamento aprovado (demo)"}
              </button>
            ) : null}
          </div>
        ) : null}

        {isApproved ? (
          <div className="mt-8 space-y-3">
            <Link
              to="/"
              className="block w-full rounded-full bg-rose-500 py-3 text-center text-sm font-semibold text-white"
            >
              Voltar à loja
            </Link>
          </div>
        ) : (
          <Link
            to="/checkout"
            className="mt-8 block text-center text-sm font-medium text-sky-600 hover:underline"
          >
            Voltar ao checkout
          </Link>
        )}
      </div>
    </div>
  );
}
