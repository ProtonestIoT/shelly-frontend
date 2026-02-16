"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "@/src/lib/utils";

import InfoTooltip from "./info-tooltip";
import { getUtilizationBand } from "./status";

interface GaugeProps {
  label: string;
  value: number | null;
  size?: "sm" | "md" | "lg";
}

function getGaugeColor(value: number): string {
  const band = getUtilizationBand(value);

  if (band === "running") {
    return "hsl(var(--status-running))";
  }
  if (band === "idle") {
    return "hsl(var(--status-idle))";
  }
  return "hsl(var(--status-disconnected))";
}

function getGaugeBandLabel(value: number): string {
  const band = getUtilizationBand(value);

  if (band === "running") {
    return "Good";
  }
  if (band === "idle") {
    return "Below target";
  }
  return "Critical";
}

export default function Gauge({ label, value, size = "md" }: GaugeProps) {
  const innerShadowId = useId();
  const lineShadowId = useId();
  const dimensions = { sm: 80, md: 120, lg: 160 };
  const strokeWidths = { sm: 6, md: 8, lg: 10 };
  const fontSizes = { sm: 14, md: 20, lg: 28 };

  const dimension = dimensions[size];
  const strokeWidth = strokeWidths[size];
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized =
    typeof value === "number" ? Math.min(Math.max(Math.round(value), 0), 100) : 0;
  const dashOffset = circumference - (normalized / 100) * circumference;
  const [animatedDashOffset, setAnimatedDashOffset] = useState(circumference);
  const color = getGaugeColor(normalized);
  const statusText = typeof value === "number" ? getGaugeBandLabel(normalized) : "Unknown";

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
      <InfoTooltip
        label={
          typeof value === "number"
            ? `${label} utilization: ${normalized}% - ${statusText}`
            : `${label} utilization is unavailable from current API`
        }
      >
        <button
          type="button"
          className="flex cursor-help flex-col items-center gap-1"
          aria-label={`${label} gauge details`}
        >
          <svg width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`}>
            <defs>
              <filter id={innerShadowId} x="-40%" y="-40%" width="180%" height="180%">
                <feOffset in="SourceAlpha" dx="0" dy="0.45" result="offset" />
                <feGaussianBlur in="offset" stdDeviation="0.6" result="blur" />
                <feComposite
                  in="blur"
                  in2="SourceAlpha"
                  operator="arithmetic"
                  k2="-1"
                  k3="1"
                  result="innerShadow"
                />
                <feColorMatrix
                  in="innerShadow"
                  type="matrix"
                  values="0 0 0 0 0.1 0 0 0 0 0.13 0 0 0 0 0.2 0 0 0 0.28 0"
                  result="shadowColor"
                />
                <feBlend in="SourceGraphic" in2="shadowColor" mode="multiply" />
              </filter>
              <filter id={lineShadowId} x="-50%" y="-50%" width="200%" height="200%">
                <feOffset in="SourceAlpha" dx="0" dy="0.35" result="lineOffset" />
                <feGaussianBlur in="lineOffset" stdDeviation="0.55" result="lineBlur" />
                <feComposite
                  in="lineBlur"
                  in2="SourceAlpha"
                  operator="arithmetic"
                  k2="-1"
                  k3="1"
                  result="lineInnerShadow"
                />
                <feColorMatrix
                  in="lineInnerShadow"
                  type="matrix"
                  values="0 0 0 0 0.1 0 0 0 0 0.13 0 0 0 0 0.2 0 0 0 0.24 0"
                  result="lineShadowColor"
                />
                <feBlend in="SourceGraphic" in2="lineShadowColor" mode="multiply" />
              </filter>
            </defs>
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius + strokeWidth * 0.35}
              fill="hsl(var(--card))"
              filter={`url(#${innerShadowId})`}
            />
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
              filter={`url(#${lineShadowId})`}
              className="transition-all duration-1200 ease-[cubic-bezier(0.22,1,0.36,1)]"
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
              {typeof value === "number" ? `${normalized}%` : "--"}
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
