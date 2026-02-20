"use client";

import type { ReactNode } from "react";

interface ControlButtonProps {
  children: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick: () => void;
}

export default function ControlButton({
  children,
  disabled = false,
  fullWidth = false,
  onClick,
}: ControlButtonProps) {
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-10 text-sm ${widthClass} cursor-pointer rounded-md border border-primary/40 bg-primary/12 px-4 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
