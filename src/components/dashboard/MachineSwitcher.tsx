"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { MachineListItem, MachineStatus } from "@/src/types/dashboard";
import { cn } from "@/src/lib/utils";

const stateColors: Record<MachineStatus, string> = {
  RUNNING: "bg-status-running",
  IDLE: "bg-status-idle",
  DISCONNECTED: "bg-status-disconnected",
};

interface MachineSwitcherProps {
  machines: MachineListItem[];
  selected: string | null;
  onSelect: (machineId: string) => void;
  disabled?: boolean;
}

export default function MachineSwitcher({
  machines,
  selected,
  onSelect,
  disabled = false,
}: MachineSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const current = machines.find((machine) => machine.id === selected);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const selectedIndex = machines.findIndex((machine) => machine.id === selected);
    const fallbackIndex = selectedIndex >= 0 ? selectedIndex : 0;
    optionsRef.current[fallbackIndex]?.focus();
  }, [machines, open, selected]);

  function focusOption(index: number) {
    const lastIndex = machines.length - 1;
    if (lastIndex < 0) {
      return;
    }

    const wrappedIndex = index < 0 ? lastIndex : index > lastIndex ? 0 : index;
    optionsRef.current[wrappedIndex]?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || machines.length === 0}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-label="Select machine"
        onClick={() => setOpen((previous) => !previous)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {current ? (
          <span className={cn("h-2 w-2 rounded-full", stateColors[current.state])} aria-hidden="true" />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-left">{current?.name ?? "Select Machine"}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Machine list"
          className="animate-soft-pop absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg"
        >
          {machines.map((machine, index) => (
            <button
              key={machine.id}
              type="button"
              role="option"
              aria-selected={machine.id === selected}
              ref={(element) => {
                optionsRef.current[index] = element;
              }}
              onClick={() => {
                onSelect(machine.id);
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusOption(index + 1);
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  focusOption(index - 1);
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  focusOption(0);
                }
                if (event.key === "End") {
                  event.preventDefault();
                  focusOption(machines.length - 1);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  triggerRef.current?.focus();
                }
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                machine.id === selected && "bg-muted font-semibold",
              )}
            >
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", stateColors[machine.state])}
                aria-hidden="true"
              />
              <span className="truncate">{machine.name}</span>
              <span className="ml-auto text-[10px] tracking-wider text-muted-foreground uppercase font-data">
                {machine.state}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
