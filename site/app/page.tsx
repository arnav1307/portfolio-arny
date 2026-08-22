import { Opening } from "@/components/sections/opening";
import { OpeningDP } from "@/components/sections/opening-dp";
import { Experience } from "@/components/sections/experience";
import { SelectedWork } from "@/components/sections/selected-work";
import { RightNow } from "@/components/sections/right-now";
import { Desk } from "@/components/sections/desk";
import { Stack } from "@/components/sections/stack";
import { Contact } from "@/components/sections/contact";
import { FooterNav } from "@/components/sections/footer-nav";

/**
 * A/B toggle for the opening section — flip to compare the mood-board
 * scroll-scrub candidate (OpeningDP, design/moodboard/dp-opening-v2/) against
 * the locked DotField half-split (Opening). Same one-line-flag spirit as
 * terminal-shot.tsx's USE_REAL_SCREENSHOT. Default false: Opening is still
 * the shipped section until Arnav picks a winner.
 */
const USE_DP_OPENING = true;

export default function Home() {
  return (
    <main className="flex flex-col">
      {USE_DP_OPENING ? <OpeningDP /> : <Opening />}

      {/* Order per spec (2026-07-30): Experience → Stack → Desk.
          ⚠️ Experience copy is a DRAFT pending Arnav's review. */}
      <Experience />

      {/* ⚠️ PLACEMENT NOT CONFIRMED. The spec's default is "after Experience,
          before Stack" — Arnav to confirm the final slot. */}
      <SelectedWork />

      <Stack />

      {/* Desk carries id="desk" itself — the CONTACT nav link scrolls here.
          Its content is unchanged; only its position moved (Arnav confirmed). */}
      <Desk />

      {/* Globe + visitor geolocation + weather. Reference puts it between the
          hero and the work section; here it sits before Contact as a breather
          before the booking block. Placement open for Arnav. */}
      <RightNow />

      <Contact />

      {/* Inside the page, not providers.tsx — see the note in footer-nav. */}
      <FooterNav />
    </main>
  );
}
