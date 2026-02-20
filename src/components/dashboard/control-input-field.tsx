"use client";

interface ControlInputFieldProps {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
}

export default function ControlInputField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  type = "text",
  min,
  max,
  step,
}: ControlInputFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none ring-offset-0 placeholder:text-muted-foreground focus:border-primary"
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}
