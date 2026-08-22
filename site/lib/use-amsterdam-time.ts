"use client";

import { useEffect, useState } from "react";
import { CONTACT } from "@/lib/data";

/**
 * Live Amsterdam clock, shared by the header nav and the footer band
 * (spec §4: "Arnav. · {the same live time the header nav shows}").
 *
 * Returns null until after mount — the value is client-only and locale
 * variable, so rendering it on the server hydration-mismatches. Callers show a
 * fixed-width placeholder for that first paint.
 */
export function useAmsterdamTime(withSeconds = true): string | null {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds ? { second: "2-digit" as const } : {}),
      hour12: false,
      timeZone: CONTACT.location.tz,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [withSeconds]);

  return time;
}
