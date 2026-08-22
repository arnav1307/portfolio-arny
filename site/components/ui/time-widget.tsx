"use client";

import { CONTACT } from "@/lib/data";
import { useAmsterdamTime } from "@/lib/use-amsterdam-time";

/**
 * Nav live-time widget — ticking clock + zone label ("10:16:48 EST"), matching
 * the Framer "Site Chrome" template (Time Widget + EST, no city text; the city
 * moved to the vertical rail in the opening section).
 *
 * Renders a stable placeholder on server + first client paint (time is
 * client-only + locale-variable → would hydration-mismatch otherwise), then
 * fills in after mount.
 */
export function TimeWidget() {
  // The zone label is a fixed string from data.ts (Arnav wants "CET" shown
  // year-round), so only the clock ticks. Shared with the footer band.
  const time = useAmsterdamTime();

  return (
    <span className="type-time uppercase tracking-[0.15em] text-ink">
      <span className="tabular-nums">{time ?? "--:--:--"}</span>{" "}
      <span className="text-muted">{CONTACT.location.label}</span>
    </span>
  );
}
