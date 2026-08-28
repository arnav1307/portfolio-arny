import { Typewriter } from "@/components/ui/typewriter";
import { CalEmbed } from "@/components/ui/cal-embed";
import { CONTACT, TYPEWRITER_HEADLINE, WORK_WITH_ME } from "@/lib/data";

/**
 * Contact — the last section before the footer nav (Framer "Open To Work").
 *
 * ⚠️ The typed headline is UNTOUCHED — Arnav: "keep that, I need it, don't
 * touch that." Only its hover-to-copy-email behaviour was removed (spec §3):
 * the address now lives in a plain line under the calendar instead, so the
 * headline is no longer a button and carries no cursor pill.
 *
 * Below it, with a clear gap, sits the "Work With Me" block and the Cal.com
 * inline embed. The embed must render INSIDE #smooth-content (it scrolls) —
 * see the note in ui/cal-embed.
 *
 * NOTE: no PixelCrab here. It lives in the opening section with its hover
 * message and stays there — Arnav 2026-07-28. Do not add a second one.
 */

const LAYOUT = {
  /** Headline size — floor drops on narrow so the typewriter can wrap cleanly. */
  headline: "clamp(1.35rem, 5.2vw, 4rem)",
} as const;

export function Contact() {
  return (
    <section
      id="contact"
      className="contact-section flex w-full flex-col items-center"
    >
      <p
        className="contact-headline text-center"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: LAYOUT.headline,
          fontWeight: 700,
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          color: "var(--ink)",
        }}
      >
        <Typewriter text={TYPEWRITER_HEADLINE} />
      </p>

      <div className="contact-book">
        <p className="type-label section-eyebrow text-muted">{WORK_WITH_ME.eyebrow}</p>
        <h2 className="contact-book-title">{WORK_WITH_ME.title}</h2>
        <p className="contact-book-blurb">{WORK_WITH_ME.blurb}</p>

        <CalEmbed />

        {/* The address moved here from the headline's copy-on-hover. */}
        <p className="contact-email">
          {WORK_WITH_ME.fallback}{" "}
          <a
            href={`mailto:${CONTACT.email}`}
            data-cursor="pointer"
            className="contact-email-link"
          >
            {CONTACT.email}
          </a>{" "}
          {WORK_WITH_ME.fallbackTail}
        </p>
      </div>
    </section>
  );
}
