import { STACK_COPY, STACK_GROUPS, STACK_MORE } from "@/lib/stack-data";
import { ToolIcon } from "@/components/ui/tool-icon";
import { Reveal } from "@/components/motion/reveal";

/**
 * Stack — grouped icon grid (spec §2), replacing the old chip rows entirely.
 *
 * Layout (Arnav 2026-07-30): the four groups sit two-per-row rather than
 * stacked, so the section uses its width instead of running as a tall column —
 * PROGRAMMING + CLOUD AND PLATFORM on the first line, AI AND PRODUCTIVITY +
 * AFTER HOURS on the second, `+ MORE…` centred underneath.
 *
 * Rest state: every icon is the same flat ink colour. On hover the icon returns
 * to its own brand colour, a dark tooltip shows the tool name, and the tile
 * gains a ring (ss3/ss4). Icons flagged `holdOnHover` keep the rest treatment —
 * their marks are white, so "restoring the brand colour" would erase them.
 *
 * The two floating Framer shapes that used to live here were DELETED from the
 * project on 2026-07-28 — they never read the way Arnav wanted. Don't re-add
 * them; the PNGs are gone too.
 *
 * Hover is CSS, not GSAP: it's direct pointer feedback, so it belongs on the
 * compositor (same reasoning as .desk-object).
 *
 * No hooks → server-safe. ToolIcon reads from disk at render.
 */

export function Stack() {
  return (
    <section
      id="stack"
      className="stack-section flex w-full flex-col items-center justify-center"
    >
      <div className="stack-inner">
        <h2 className="type-label text-muted">{STACK_COPY.eyebrow}</h2>
        <p className="stack-title">{STACK_COPY.title}</p>
        <p className="stack-blurb">{STACK_COPY.blurb}</p>

        {/* One max-content column so "+ more…" centres against the tiles.
            Icons reveal at 250ms rather than the 400ms default (spec §0). */}
        <Reveal
          className="stack-blocks"
          selector=".stack-icon"
          stagger={0.03}
          duration={0.25}
        >
          <div className="stack-groups">
            {STACK_GROUPS.map((group) => (
              <div key={group.label} className="stack-group">
                <h3 className="type-label stack-group-label text-muted">
                  {group.label}
                </h3>

                <ul className="stack-grid">
                  {group.tools.map((tool) => {
                    const inner = (
                      <>
                        <ToolIcon icon={tool.icon} />
                        {/* Tooltip is a sibling of the artwork so the tile's
                          overflow never clips it. */}
                        <span className="stack-tip">{tool.name}</span>
                      </>
                    );

                    return (
                      <li key={tool.name}>
                        {tool.href ? (
                          <a
                            href={tool.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            data-cursor="pointer"
                            aria-label={tool.name}
                            className="stack-icon"
                            data-rest={tool.rest}
                            data-icon={tool.icon}
                            data-hold={tool.holdOnHover ? "true" : undefined}
                          >
                            {inner}
                          </a>
                        ) : (
                          <span
                            className="stack-icon"
                            data-cursor="pointer"
                            data-rest={tool.rest}
                            data-icon={tool.icon}
                            data-hold={tool.holdOnHover ? "true" : undefined}
                            role="img"
                            aria-label={tool.name}
                          >
                            {inner}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <p className="stack-more type-label text-muted">{STACK_MORE}</p>
        </Reveal>
      </div>
    </section>
  );
}
