"use client";

import type { MachineListItem } from "@/src/types/dashboard";
import ListboxSwitcher from "@/src/components/dashboard/listbox-switcher";

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
      triggerAriaLabel="Select machine"
      listAriaLabel="Machine list"
      placeholder="Select Machine"
      menuWidthClass="w-56"
    />
  );
}
