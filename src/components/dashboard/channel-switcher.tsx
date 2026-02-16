"use client";

import ListboxSwitcher from "@/src/components/dashboard/listbox-switcher";

interface ChannelSwitcherProps {
  channels: string[];
  selected: string | null;
  onSelect: (channel: string) => void;
  disabled?: boolean;
}

export default function ChannelSwitcher({
  channels,
  selected,
  onSelect,
  disabled = false,
}: ChannelSwitcherProps) {
  const items = channels.map((channel) => ({
    id: channel,
    label: channel,
    meta: "CHANNEL",
  }));

  return (
    <ListboxSwitcher
      items={items}
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      triggerAriaLabel="Select channel"
      listAriaLabel="Channel list"
      placeholder="Select Channel"
      menuWidthClass="w-40"
    />
  );
}
