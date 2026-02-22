"use client";

import ListboxSwitcher from "@/src/components/dashboard/listbox-switcher";
import { DASHBOARD_COPY } from "@/src/lib/dashboard-copy";

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
      triggerAriaLabel={DASHBOARD_COPY.channelSwitcherTriggerAria}
      listAriaLabel={DASHBOARD_COPY.channelSwitcherListAria}
      placeholder={DASHBOARD_COPY.channelSwitcherPlaceholder}
      menuWidthClass="w-40"
    />
  );
}
