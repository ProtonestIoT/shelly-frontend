"use client";

import { useEffect, useState } from "react";

import { formatTime } from "@/src/lib/format";

export default function LocalTimeLabel() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <time dateTime={now.toISOString()} suppressHydrationWarning>
      {formatTime(now)}
    </time>
  );
}
