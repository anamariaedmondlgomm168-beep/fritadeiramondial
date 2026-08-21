import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StorefrontLayoutProps {
  children: ReactNode;
  className?: string;
  bottomPadding?: string;
}

export function StorefrontLayout({
  children,
  className,
  bottomPadding = "pb-16",
}: StorefrontLayoutProps) {
  return (
    <div className="min-h-dvh w-full bg-neutral-100">
      <div
        className={cn(
          "mx-auto min-h-dvh w-full min-w-0 max-w-[480px] bg-white text-neutral-900",
          bottomPadding,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function StorefrontFixedBottom({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-full max-w-[480px] border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
    </div>
  );
}
