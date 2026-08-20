import type { InputHTMLAttributes, ReactNode } from "react";

import {
  calculateTotal,
  getEnabledOrderBumps,
  getShippingOption,
  PRODUCT,
  SHIPPING_OPTIONS,
  type OrderBump,
  type ShippingOptionId,
} from "@/lib/checkout/constants";
import { formatCurrency, getDiscountPercent } from "@/lib/checkout/format";
import { cn } from "@/lib/utils";

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-base font-bold text-neutral-900", className)}>{children}</h2>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-neutral-700">
      {children}
      {required ? <span className="text-rose-500"> *</span> : null}
    </label>
  );
}

export function FieldInput({
  className,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        className={cn(
          "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-100",
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

interface OrderBumpCardProps {
  bump: OrderBump;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function OrderBumpCard({ bump, checked, onChange }: OrderBumpCardProps) {
  const discount = getDiscountPercent(bump.price, bump.compareAt);

  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
        checked
          ? "border-rose-400 bg-rose-50/40"
          : "border-neutral-200 bg-white hover:border-neutral-300",
      )}
    >
      {bump.badge ? (
        <span className="absolute -top-2.5 left-3 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-bold tracking-wide text-neutral-900">
          {bump.badge}
        </span>
      ) : null}

      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 rounded-full border-neutral-300 accent-rose-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />

      {bump.image ? (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-100 bg-white p-1">
          <img src={bump.image} alt={bump.title} className="h-full w-full object-contain" />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-neutral-900">{bump.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {discount ? (
            <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              -{discount}%
            </span>
          ) : null}
          {bump.compareAt ? (
            <span className="text-xs text-neutral-400 line-through">
              {formatCurrency(bump.compareAt)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-base font-bold text-neutral-900">{formatCurrency(bump.price)}</p>
      </div>
    </label>
  );
}

interface OrderSummaryProps {
  shippingId: ShippingOptionId;
  selectedBumpIds: string[];
}

export function OrderSummary({ shippingId, selectedBumpIds }: OrderSummaryProps) {
  const shipping = getShippingOption(shippingId);
  const bumps = getEnabledOrderBumps().filter((b) => selectedBumpIds.includes(b.id));
  const total = calculateTotal(shippingId, selectedBumpIds);

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <SectionTitle className="text-sm">Resumo do pedido</SectionTitle>
      <div className="mt-3 flex gap-3">
        <img
          src={PRODUCT.image}
          alt={PRODUCT.name}
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 text-sm">
          <p className="line-clamp-2 font-medium text-neutral-900">{PRODUCT.name}</p>
          <p className="mt-1 text-xs text-neutral-500">{PRODUCT.brand}</p>
          <p className="mt-1 font-semibold text-rose-600">{formatCurrency(PRODUCT.price)}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 border-t border-neutral-200 pt-3 text-sm">
        <li className="flex justify-between gap-2">
          <span className="text-neutral-600">Frete ({shipping.label})</span>
          <span className="font-medium">
            {shipping.price === 0 ? "Grátis" : formatCurrency(shipping.price)}
          </span>
        </li>
        {bumps.map((bump) => (
          <li key={bump.id} className="flex justify-between gap-2">
            <span className="line-clamp-1 text-neutral-600">{bump.title}</span>
            <span className="shrink-0 font-medium">{formatCurrency(bump.price)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-2 border-t border-neutral-200 pt-2 text-base font-bold">
          <span>Total</span>
          <span className="text-rose-600">{formatCurrency(total)}</span>
        </li>
      </ul>

      <p className="mt-2 text-xs text-neutral-500">
        Pagamento exclusivo via PIX. Prazo de entrega: {shipping.eta}.
      </p>
    </div>
  );
}

export { SHIPPING_OPTIONS, getEnabledOrderBumps };
