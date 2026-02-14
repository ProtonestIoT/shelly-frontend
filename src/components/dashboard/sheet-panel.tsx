"use client";

import { ExternalLink } from "lucide-react";

import DashboardCard from "./dashboard-card";
import SectionHeading from "./section-heading";

interface SheetPanelProps {
  url: string;
}

export default function SheetPanel({ url }: SheetPanelProps) {
  return (
    <DashboardCard>
      <SectionHeading>Google Sheets Access</SectionHeading>

      <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border bg-secondary">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 font-medium text-foreground transition hover:bg-background"
        >
          Open Source Sheet
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </DashboardCard>
  );
}
