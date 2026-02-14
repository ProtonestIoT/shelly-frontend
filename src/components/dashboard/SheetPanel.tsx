"use client";

import DashboardCard from "./DashboardCard";
import SectionHeading from "./SectionHeading";

interface SheetPanelProps {
  mode: "embed" | "link";
  url: string;
}

export default function SheetPanel({ mode, url }: SheetPanelProps) {
  return (
    <DashboardCard>
      <SectionHeading>Google Sheets Access</SectionHeading>

      {mode === "embed" ? (
        <iframe
          title="Machine occupancy source sheet"
          src={url}
          className="h-[420px] w-full rounded-md border border-border"
        />
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border bg-secondary">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-ring bg-muted px-4 py-2 font-medium text-foreground transition hover:bg-background"
          >
            Open Source Sheet
          </a>
        </div>
      )}
    </DashboardCard>
  );
}
