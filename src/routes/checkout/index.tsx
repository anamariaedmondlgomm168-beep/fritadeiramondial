import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MapPin, Truck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  FieldInput,
  FieldLabel,
  getEnabledOrderBumps,
  OrderBumpCard,
  OrderSummary,
  SectionTitle,
  SHIPPING_OPTIONS,
} from "@/components/checkout/CheckoutForm";
import { createPixPayment } from "@/lib/api/checkout.functions";
import { trackCheckoutStep } from "@/lib/api/admin.functions";
import type { ShippingOptionId, Voltage } from "@/lib/checkout/constants";
import {
  formatCep,
  formatCpf,
  formatPhone,
  onlyDigits,
} from "@/lib/checkout/format";
import {
  checkoutSchema,
  type CheckoutFormData,
} from "@/lib/checkout/schemas";
import { cn } from "@/lib/utils";
import { z } from "zod";

const SESSION_KEY = "mondial_checkout_session";

const checkoutSearchSchema = z.object({
  voltage: z.enum(["127V", "220V"]).optional(),
});

export const Route = createFileRoute("/checkout/")({
  validateSearch: checkoutSearchSchema,
  head: () => ({
    meta: [{ title: "Checkout — Fritadeira Mondial" }],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { voltage: searchVoltage } = Route.useSearch();
  const [cepLoading, setCepLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem(SESSION_KEY) ?? undefined;
  });

  const enabledBumps = getEnabledOrderBumps();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      voltage: searchVoltage ?? undefined,
      shippingId: "free",
      orderBumpIds: [],
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const shippingId = watch("shippingId");
  const orderBumpIds = watch("orderBumpIds");
  const voltage = watch("voltage");
  const cepValue = watch("cep");

  useEffect(() => {
    if (searchVoltage) {
      setValue("voltage", searchVoltage);
    }
  }, [searchVoltage, setValue]);

  useEffect(() => {
    void trackCheckoutStep({
      data: {
        sessionId,
        step: "identification",
        voltage: searchVoltage,
      },
    }).then((res) => {
      setSessionId(res.sessionId);
      localStorage.setItem(SESSION_KEY, res.sessionId);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setTimeout(() => {
      const values = form.getValues();
      const step = values.street && values.city ? "shipping" : "identification";
      void trackCheckoutStep({
        data: {
          sessionId,
          step,
          voltage: values.voltage,
          partial: {
            name: values.name || undefined,
            email: values.email || undefined,
            phone: values.phone || undefined,
            cpf: values.cpf || undefined,
            shippingId: values.shippingId,
            orderBumpIds: values.orderBumpIds,
            voltage: values.voltage,
          },
        },
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [sessionId, shippingId, orderBumpIds, voltage, cepValue, form]);

  useEffect(() => {
    const digits = onlyDigits(cepValue ?? "");
    if (digits.length !== 8) return;

    let cancelled = false;
    const loadCep = async () => {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = (await res.json()) as {
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        };
        if (cancelled || data.erro) return;
        if (data.logradouro) setValue("street", data.logradouro, { shouldValidate: true });
        if (data.bairro) setValue("neighborhood", data.bairro, { shouldValidate: true });
        if (data.localidade) setValue("city", data.localidade, { shouldValidate: true });
        if (data.uf) setValue("state", data.uf, { shouldValidate: true });
      } catch {
        /* ignore CEP lookup errors */
      } finally {
        if (!cancelled) setCepLoading(false);
      }
    };

    void loadCep();
    return () => {
      cancelled = true;
    };
  }, [cepValue, setValue]);

  const toggleBump = (bumpId: string, checked: boolean) => {
    const current = form.getValues("orderBumpIds");
    if (checked) {
      setValue("orderBumpIds", [...new Set([...current, bumpId])], { shouldValidate: true });
    } else {
      setValue(
        "orderBumpIds",
        current.filter((id) => id !== bumpId),
        { shouldValidate: true },
      );
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      const result = await createPixPayment({ data: { ...data, sessionId } });
      await navigate({
        to: "/checkout/pix",
        search: { paymentId: result.paymentId },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao iniciar pagamento.");
    }
  });

  const setVoltage = (value: Voltage) => {
    setValue("voltage", value, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-[480px] pb-32">
        <header className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
          <Link to="/" className="rounded-full p-1 hover:bg-neutral-100">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-base font-bold">Finalizar compra</h1>
            <p className="text-xs text-neutral-500">Pagamento 100% PIX</p>
          </div>
        </header>

        <form id="checkout-form" onSubmit={onSubmit} className="space-y-6 px-4 pt-5">
          <OrderSummary shippingId={shippingId} selectedBumpIds={orderBumpIds} />

          <section>
            <SectionTitle>Dados pessoais</SectionTitle>
            <div className="mt-3 space-y-3">
              <div>
                <FieldLabel htmlFor="name" required>
                  Nome completo
                </FieldLabel>
                <FieldInput id="name" autoComplete="name" error={errors.name?.message} {...register("name")} />
              </div>
              <div>
                <FieldLabel htmlFor="email" required>
                  E-mail
                </FieldLabel>
                <FieldInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="phone" required>
                    Telefone
                  </FieldLabel>
                  <FieldInput
                    id="phone"
                    inputMode="tel"
                    error={errors.phone?.message}
                    {...register("phone", {
                      onChange: (e) => {
                        e.target.value = formatPhone(e.target.value);
                      },
                    })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="cpf" required>
                    CPF
                  </FieldLabel>
                  <FieldInput
                    id="cpf"
                    inputMode="numeric"
                    error={errors.cpf?.message}
                    {...register("cpf", {
                      onChange: (e) => {
                        e.target.value = formatCpf(e.target.value);
                      },
                    })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-sky-600" />
              <SectionTitle className="mb-0">Voltagem</SectionTitle>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["127V", "220V"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVoltage(v)}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-semibold transition",
                    voltage === v
                      ? "border-sky-600 bg-sky-50 text-sky-700"
                      : "border-neutral-300 text-neutral-700 hover:border-neutral-400",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            {errors.voltage ? (
              <p className="mt-2 text-xs text-rose-600">{errors.voltage.message}</p>
            ) : null}
          </section>

          <section>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              <SectionTitle className="mb-0">Endereço de entrega</SectionTitle>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <FieldLabel htmlFor="cep" required>
                  CEP {cepLoading ? <span className="text-neutral-400">(buscando…)</span> : null}
                </FieldLabel>
                <FieldInput
                  id="cep"
                  inputMode="numeric"
                  error={errors.cep?.message}
                  {...register("cep", {
                    onChange: (e) => {
                      e.target.value = formatCep(e.target.value);
                    },
                  })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="street" required>
                  Rua
                </FieldLabel>
                <FieldInput id="street" error={errors.street?.message} {...register("street")} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel htmlFor="number" required>
                    Número
                  </FieldLabel>
                  <FieldInput id="number" error={errors.number?.message} {...register("number")} />
                </div>
                <div className="col-span-2">
                  <FieldLabel htmlFor="complement">Complemento</FieldLabel>
                  <FieldInput id="complement" {...register("complement")} />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="neighborhood" required>
                  Bairro
                </FieldLabel>
                <FieldInput
                  id="neighborhood"
                  error={errors.neighborhood?.message}
                  {...register("neighborhood")}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <FieldLabel htmlFor="city" required>
                    Cidade
                  </FieldLabel>
                  <FieldInput id="city" error={errors.city?.message} {...register("city")} />
                </div>
                <div>
                  <FieldLabel htmlFor="state" required>
                    UF
                  </FieldLabel>
                  <FieldInput
                    id="state"
                    maxLength={2}
                    className="uppercase"
                    error={errors.state?.message}
                    {...register("state", {
                      onChange: (e) => {
                        e.target.value = e.target.value.toUpperCase().slice(0, 2);
                      },
                    })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-600" />
              <SectionTitle className="mb-0">Opções de frete</SectionTitle>
            </div>
            <div className="mt-3 space-y-2">
              {SHIPPING_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                    shippingId === option.id
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-neutral-200 hover:border-neutral-300",
                  )}
                >
                  <input
                    type="radio"
                    value={option.id}
                    className="mt-1 accent-emerald-600"
                    {...register("shippingId")}
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-xs text-neutral-600">{option.description}</div>
                    <div className="mt-1 text-xs text-neutral-500">{option.eta}</div>
                  </div>
                  <div className="text-sm font-bold text-emerald-700">
                    {option.price === 0 ? "Grátis" : `R$ ${option.price.toFixed(2).replace(".", ",")}`}
                  </div>
                </label>
              ))}
            </div>
          </section>

          {enabledBumps.length > 0 ? (
            <section>
              <SectionTitle>Ofertas especiais</SectionTitle>
              <div className="mt-3 space-y-2">
                {enabledBumps.map((bump) => (
                  <OrderBumpCard
                    key={bump.id}
                    bump={bump}
                    checked={orderBumpIds.includes(bump.id)}
                    onChange={(checked) => toggleBump(bump.id, checked)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {submitError ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>
          ) : null}
        </form>
      </div>

      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-neutral-200 bg-white px-4 py-3">
        <button
          type="submit"
          form="checkout-form"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando PIX…
            </>
          ) : (
            "Pagar com PIX"
          )}
        </button>
      </div>
    </div>
  );
}
