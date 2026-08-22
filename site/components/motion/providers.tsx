"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "./theme-provider";
import { SmoothProvider } from "./smooth-provider";
import { PageTransition } from "./page-transition";
import { Cursor } from "@/components/ui/cursor";
import { Nav } from "@/components/sections/nav";
import { NavCharm } from "@/components/ui/nav-charm";
import { InterviewAgent } from "@/components/ui/interview-agent";
import { SectionRails } from "@/components/sections/section-rails";

/**
 * Single client boundary that composes site-wide providers + the custom cursor.
 * Mounted once in the root layout so both pages share theme + smooth scroll and
 * the cursor lives above everything.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ThemeProvider>
      {/* Nav + Cursor sit OUTSIDE the smooth wrapper: ScrollSmoother transforms
          #smooth-content, which would drag fixed-position chrome with it. */}
      <PageTransition>
        <Nav />
        {/* Charm hangs off the nav clock — fixed sibling, home only. */}
        <NavCharm />
        {pathname === "/" && <SectionRails />}
        {/* Fixed, so it sits out here with the rest of the chrome. It reads
            useSmoother() to scroll to Contact, hence inside PageTransition. */}
        <InterviewAgent />
        <SmoothProvider>{children}</SmoothProvider>
      </PageTransition>
      <Cursor />
    </ThemeProvider>
  );
}
