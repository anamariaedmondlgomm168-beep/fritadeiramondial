import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface CheckoutHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: "/" | "/checkout";
}

export function CheckoutHeader({ title, subtitle, backTo = "/checkout" }: CheckoutHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-neutral-100 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
      <Link to={backTo} className="rounded-full p-1 hover:bg-neutral-100">
        <ArrowLeft className="h-6 w-6" />
      </Link>
      <div>
        <h1 className="text-base font-bold">{title}</h1>
        {subtitle ? <p className="text-xs text-neutral-500">{subtitle}</p> : null}
      </div>
    </header>
  );
}

export function CheckoutSteps({ current }: { current: "checkout" | "pix" | "done" }) {
  const steps = [
    { id: "checkout", label: "Dados" },
    { id: "pix", label: "Pagamento" },
    { id: "done", label: "Confirmação" },
  ] as const;

  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-1 px-3 py-3 sm:gap-2 sm:px-4 sm:py-4">
      {steps.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs ${
                isDone
                  ? "bg-emerald-500 text-white"
                  : isActive
                    ? "bg-sky-600 text-white"
                    : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {isDone ? "✓" : index + 1}
            </div>
            <span
              className={`truncate text-[11px] font-semibold sm:text-xs ${
                isActive ? "text-neutral-900" : isDone ? "text-emerald-700" : "text-neutral-400"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <div
                className={`mx-1 h-px min-w-3 flex-1 ${isDone ? "bg-emerald-300" : "bg-neutral-200"}`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
