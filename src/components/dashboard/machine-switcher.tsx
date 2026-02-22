"use client";

import type { MachineListItem } from "@/src/types/dashboard";
import ListboxSwitcher from "@/src/components/dashboard/listbox-switcher";
import { DASHBOARD_COPY } from "@/src/lib/dashboard-copy";

import { getStatusTheme } from "./status";

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
  const items = machines.map((machine) => ({
    id: machine.id,
    label: machine.name,
    dotClass: getStatusTheme(machine.status).dotClass,
    meta: machine.status,
  }));

  return (
    <ListboxSwitcher
      items={items}
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      triggerAriaLabel={DASHBOARD_COPY.machineSwitcherTriggerAria}
      listAriaLabel={DASHBOARD_COPY.machineSwitcherListAria}
      placeholder={DASHBOARD_COPY.machineSwitcherPlaceholder}
      menuWidthClass="w-56"
    />
  );
}
