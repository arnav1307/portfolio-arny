"use client";

import { useEffect, useState } from "react";
import { CONTACT } from "@/lib/data";

/**
 * "WANT" — the middle-of-page day/date/time/location readout.
 *
 * Ported from Framer's own "Current Local Time" code component
 * (LocalTime.tsx, already installed in the DP project as the instance
 * named "WANT" — https://www.framer.com/marketplace/components/current-local-time/),
 * not rebuilt from scratch. That instance's own controls are the spec:
 * timeFormat 12 Hour, dateFormat DD/MM/YYYY, showLocation + showUTC both
 * on, separator "_" in rgb(114, 209, 219) (now --scrabble-blue, tokenized
 * per the site's no-hardcoded-hex rule).
 *
 * ⚠️ Corrected against a real screenshot of the live WANT node
 * (framer.agent.readProject screenshot query), not just its property
 * controls — the controls tell you WHAT'S on, not the exact string the
 * component actually builds. Two things the first port got wrong:
 *   1. No space padding around "_" — real render is
 *      "Mon_31/08/2026_06:24:47 PM_UTC (UTC+0)", glued tight, not
 *      "Mon _ 31/08/2026 _ ...". Fixed by removing the flex gap around
 *      the separator glyphs themselves (the gap now comes from the
 *      separator's own leading/trailing margin, not a row-level gap).
 *   2. Location format is the source's formatLocationDisplay() exactly:
 *      "{city}, {country} (UTC{offset})" when both city/country resolve,
 *      falling back to just "(UTC{offset})" when they don't (that's what
 *      the screenshot shows, because Framer's own renderer resolved to a
 *      timezone with no country mapped). This port fixes to Amsterdam,
 *      which DOES resolve to "Netherlands" in the source's own
 *      TIMEZONE_TO_COUNTRY table, so the real expected output here is
 *      "Amsterdam, Netherlands (UTC+2)" in summer / "(UTC+1)" in winter
 *      — verified by running the source's actual offset math locally,
 *      not guessed.
 *
 * Deliberate deviation from the raw component: the Framer version reads
 * the VIEWER's own browser timezone. This site already has one fixed
 * location — Amsterdam, via CONTACT.location.tz (see time-widget.tsx /
 * use-amsterdam-time.ts) — so this always shows Amsterdam's day/date/UTC
 * offset, not wherever the visitor happens to be.
 *
 * Type: Open Sauce One (--font-display), matching the real Framer
 * instance's own font control exactly (Arnav corrected this — an earlier
 * version used --font-mono instead). See the .local-time-widget block in
 * globals.css for the note on the weight substitution (SemiBold isn't in
 * the self-hosted set, 700 is the nearest available).
 */

const TZ = CONTACT.location.tz;

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: TZ,
});

function formatDateDMY(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

function formatTime12h(now: Date): { hour: string; minute: string; second: string; ampm: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: TZ,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    hour: get("hour").padStart(2, "0"),
    minute: get("minute"),
    second: get("second"),
    ampm: get("dayPeriod").toUpperCase(),
  };
}

/**
 * Amsterdam's UTC offset in minutes, computed the same way the source
 * component computes the viewer's own offset (comparing a UTC-formatted
 * and TZ-formatted reading of the same instant) — DST-aware, so this
 * reads +1 in winter and +2 in summer without a hardcoded value.
 */
function amsterdamOffsetMinutes(now: Date): number {
  const utcString = now.toLocaleString("en-US", { timeZone: "UTC" });
  const tzString = now.toLocaleString("en-US", { timeZone: TZ });
  const utcDate = new Date(utcString);
  const tzDate = new Date(tzString);
  return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
}

/** Matches the source's own UTC-string builder exactly (sign + hours[:minutes]). */
function formatUTCOffset(offsetMinutes: number): string {
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  return offsetMins > 0
    ? `UTC${sign}${offsetHours}:${String(offsetMins).padStart(2, "0")}`
    : `UTC${sign}${offsetHours}`;
}

/** Matches the source's formatLocationDisplay() verbatim. */
function formatLocationDisplay(city: string, country: string, utc: string): string {
  const parts = [city, country].filter(Boolean);
  const locationText = parts.join(", ");
  return locationText ? `${locationText} (${utc})` : `(${utc})`;
}

type Parts = {
  day: string;
  date: string;
  hour: string;
  minute: string;
  second: string;
  ampm: string;
  location: string;
};

function readParts(now: Date): Parts {
  const { hour, minute, second, ampm } = formatTime12h(now);
  const utc = formatUTCOffset(amsterdamOffsetMinutes(now));
  return {
    day: WEEKDAY_FORMATTER.format(now),
    date: formatDateDMY(now),
    hour,
    minute,
    second,
    ampm,
    location: formatLocationDisplay(CONTACT.location.city, "Netherlands", utc),
  };
}

const SEPARATOR = "_";

function Separator() {
  return <span className="local-time-sep">{SEPARATOR}</span>;
}

/**
 * Renders null until mount — the formatted values are timezone/locale
 * dependent, so printing them during SSR would hydration-mismatch (same
 * guard as use-amsterdam-time.ts).
 */
export function LocalTimeWidget() {
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    const tick = () => setParts(readParts(new Date()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!parts) return null;

  return (
    <div className="local-time-widget" aria-live="off">
      <span>{parts.day}</span>
      <Separator />
      <span className="tabular-nums">{parts.date}</span>
      <Separator />
      <span className="tabular-nums">
        {parts.hour}:{parts.minute}:{parts.second}
      </span>
      <span>{parts.ampm}</span>
      <Separator />
      <span>{parts.location}</span>
    </div>
  );
}
