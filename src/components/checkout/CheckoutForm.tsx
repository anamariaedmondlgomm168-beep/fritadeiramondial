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
import { formatCurrency } from "@/lib/checkout/format";
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
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-orange-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-neutral-900">{bump.title}</div>
            <p className="mt-0.5 text-xs text-neutral-600">{bump.description}</p>
          </div>
          <div className="shrink-0 text-right">
            {bump.compareAt ? (
              <div className="text-[10px] text-neutral-400 line-through">
                {formatCurrency(bump.compareAt)}
              </div>
            ) : null}
            <div className="text-sm font-bold text-orange-600">{formatCurrency(bump.price)}</div>
          </div>
        </div>
        {bump.image ? (
          <img
            src={bump.image}
            alt={bump.title}
            className="mt-2 h-16 w-16 rounded-md object-cover"
          />
        ) : null}
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
            <span className="text-neutral-600">{bump.title}</span>
            <span className="font-medium">{formatCurrency(bump.price)}</span>
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
