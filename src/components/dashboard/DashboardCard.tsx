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
          ? "rounded-lg border border-border bg-card bg-card-subtle p-4 shadow-xs"
          : "rounded-xl border border-border bg-card bg-card-subtle p-5 shadow-xs",
        "animate-fade-up motion-smooth",
        className,
      )}
    >
      {children}
    </section>
  );
}
