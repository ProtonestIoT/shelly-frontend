import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/src/lib/utils";

interface DashboardCardProps extends ComponentPropsWithoutRef<"section"> {
  children: ReactNode;
  compact?: boolean;
}

export default function DashboardCard({
  children,
  className,
  compact = false,
  ...props
}: DashboardCardProps) {
  return (
    <section
      {...props}
      className={cn(
        compact
          ? "rounded-lg border border-border bg-card p-4 shadow-2xs"
          : "rounded-xl border border-border bg-card p-5 shadow-2xs",
        "animate-fade-up motion-smooth",
        className,
      )}
    >
      {children}
    </section>
  );
}
