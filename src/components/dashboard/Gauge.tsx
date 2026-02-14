"use client";

import { useEffect, useState } from "react";

import { cn } from "@/src/lib/utils";

import InfoTooltip from "./InfoTooltip";

interface GaugeProps {
  label: string;
  value: number;
  size?: "sm" | "md" | "lg";
}

function getGaugeColor(value: number): string {
  if (value >= 60) {
    return "hsl(var(--status-running))";
  }
  if (value >= 30) {
    return "hsl(var(--status-idle))";
  }
  return "hsl(var(--status-disconnected))";
}

export default function Gauge({ label, value, size = "md" }: GaugeProps) {
  const dimensions = { sm: 80, md: 120, lg: 160 };
  const strokeWidths = { sm: 6, md: 8, lg: 10 };
  const fontSizes = { sm: 14, md: 20, lg: 28 };

  const dimension = dimensions[size];
  const strokeWidth = strokeWidths[size];
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.min(Math.max(Math.round(value), 0), 100);
  const dashOffset = circumference - (normalized / 100) * circumference;
  const [animatedDashOffset, setAnimatedDashOffset] = useState(circumference);
  const color = getGaugeColor(normalized);
  const statusText = normalized >= 60 ? "Good" : normalized >= 30 ? "Below target" : "Critical";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAnimatedDashOffset(dashOffset);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [circumference, dashOffset]);

  return (
    <div className="animate-soft-pop flex flex-1 items-center justify-center rounded-lg border border-border bg-card px-3 py-4">
      <InfoTooltip label={`${label} occupancy: ${normalized}% - ${statusText}`}>
        <button
          type="button"
          className="flex cursor-help flex-col items-center gap-1"
          aria-label={`${label} gauge details`}
        >
          <svg width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`}>
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={animatedDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${dimension / 2} ${dimension / 2})`}
              className="transition-all duration-1000 ease-out"
            />
            <text
              x={dimension / 2}
              y={dimension / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="hsl(var(--foreground))"
              fontSize={fontSizes[size]}
              fontWeight="bold"
              fontFamily="'JetBrains Mono', monospace"
            >
              {normalized}%
            </text>
          </svg>
          <span
            className={cn(
              "tracking-wider text-muted-foreground uppercase",
              size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm",
            )}
          >
            {label}
          </span>
        </button>
      </InfoTooltip>
    </div>
  );
}
