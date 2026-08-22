import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * ToolIcon — inlines a tool SVG from public/icons/tools/ into the markup.
 *
 * Why inline rather than <img> or next/image: the stack grid's whole hover
 * behaviour is "rest state is one flat colour, hover restores the brand
 * colour" (spec §2). CSS cannot reach inside an <img>, so the artwork has to be
 * in the document. This is a server component — the file read happens at
 * render on the server, and nothing ships to the client.
 *
 * The SVG's own width/height attributes are stripped so the tile controls size;
 * everything else (paths, gradients, defs) is left untouched.
 */

const ICON_DIR = path.join(process.cwd(), "public", "icons", "tools");

/** Gradient/clip/mask ids are global once inlined — collisions would make two
 *  icons share one gradient. Namespacing them per icon keeps them separate. */
function namespaceIds(svg: string, key: string): string {
  const ids = [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  let out = svg;
  for (const id of ids) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`id="${safe}"`, "g"), `id="${key}-${id}"`)
      .replace(new RegExp(`url\\(#${safe}\\)`, "g"), `url(#${key}-${id})`)
      .replace(new RegExp(`href="#${safe}"`, "g"), `href="#${key}-${id}"`);
  }
  return out;
}

export async function ToolIcon({ icon }: { icon: string }) {
  const raw = await readFile(path.join(ICON_DIR, `${icon}.svg`), "utf8");

  const svg = namespaceIds(raw, icon)
    // Strip the XML prolog and any generator comments — invalid inside JSX HTML.
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Let the tile size the icon rather than the file's own dimensions.
    // preserveAspectRatio keeps tall/wide artwork (framer is 256×384, aws is
    // 304×182) inside the square tile instead of stretching or overflowing.
    .replace(/\s(width|height)="[^"]*"/g, "")
    .replace(/\spreserveAspectRatio="[^"]*"/g, "")
    .replace(/<svg /, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ')
    .trim();

  return (
    <span
      className="stack-icon-art"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
