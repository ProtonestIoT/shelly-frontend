import type { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
  className?: string;
}

export default function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <h3 className={`mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase ${className ?? ""}`}>
      {children}
    </h3>
  );
}
