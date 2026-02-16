"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/src/lib/utils";

export interface ListboxSwitcherItem {
  id: string;
  label: string;
  meta?: string;
  dotClass?: string;
}

interface ListboxSwitcherProps {
  items: ListboxSwitcherItem[];
  selected: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  triggerAriaLabel: string;
  listAriaLabel: string;
  placeholder: string;
  menuWidthClass?: string;
}

export default function ListboxSwitcher({
  items,
  selected,
  onSelect,
  disabled = false,
  triggerAriaLabel,
  listAriaLabel,
  placeholder,
  menuWidthClass = "w-56",
}: ListboxSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const current = items.find((item) => item.id === selected);

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

    const selectedIndex = items.findIndex((item) => item.id === selected);
    const fallbackIndex = selectedIndex >= 0 ? selectedIndex : 0;
    optionsRef.current[fallbackIndex]?.focus();
  }, [items, open, selected]);

  function focusOption(index: number) {
    const lastIndex = items.length - 1;
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
        disabled={disabled || items.length === 0}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-label={triggerAriaLabel}
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
        className="motion-smooth flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {current?.dotClass ? (
          <span className={cn("h-2 w-2 rounded-full", current.dotClass)} aria-hidden="true" />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-left">{current?.label ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground motion-smooth",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={listAriaLabel}
          className={cn(
            "animate-soft-pop absolute left-0 top-full z-50 mt-1 rounded-lg border border-overlay-border bg-overlay text-overlay-foreground shadow-lg",
            menuWidthClass,
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === selected}
              ref={(element) => {
                optionsRef.current[index] = element;
              }}
              onClick={() => {
                onSelect(item.id);
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
                  focusOption(items.length - 1);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  triggerRef.current?.focus();
                }
              }}
              className={cn(
                "motion-smooth flex w-full items-center gap-2.5 px-3 py-3 text-left text-sm hover:bg-white/8",
                item.id === selected && "bg-white/10 font-semibold",
              )}
            >
              {item.dotClass ? (
                <span className={cn("h-2 w-2 shrink-0 rounded-full", item.dotClass)} aria-hidden="true" />
              ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-overlay-foreground/20" aria-hidden="true" />
              )}
              <span className="truncate">{item.label}</span>
              {item.meta ? (
                <span className="ml-auto text-[10px] tracking-wider text-overlay-foreground/70 uppercase font-data">
                  {item.meta}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
