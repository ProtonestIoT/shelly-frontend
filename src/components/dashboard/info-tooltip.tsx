"use client";

import { useState } from "react";

import * as Tooltip from "@radix-ui/react-tooltip";

interface InfoTooltipProps {
  label: string;
  children: React.ReactNode;
}

export default function InfoTooltip({ label, children }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger
          asChild
          onClick={() => {
            setOpen((current) => !current);
          }}
        >
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={8}
            className="z-[9999] max-w-60 rounded-md border border-overlay-border bg-overlay px-3 py-2 text-xs leading-relaxed text-overlay-foreground shadow-xl"
          >
            {label}
            <Tooltip.Arrow className="fill-overlay" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
