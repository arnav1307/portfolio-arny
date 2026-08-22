import Image from "next/image";

/**
 * FolderWithTools — 3D folder + three tool stickers peeking from the pocket.
 *
 * ┌─ TUNE POSITIONS HERE ──────────────────────────────────────────────────┐
 * Percentages are relative to the folder box. Negative `top` = peek above.
 * Edit these numbers; nothing else needs touching.
 * └────────────────────────────────────────────────────────────────────────┘
 */
const POS = {
  /** Claude (left). */
  claude: {
    left: "-6%",
    top: "-8%",
    width: "40%",
    rotate: -18,
    z: 3,
  },
  /** Framer (center, behind the flanks — tallest peek). */
  framer: {
    left: "26%",
    top: "-35%",
    width: "35%",
    rotate: 3,
    z: 1,
  },
  /** Cursor (right). */
  cursor: {
    left: "54%",
    top: "-11%",
    width: "40%",
    rotate: 10,
    z: 2,
  },
} as const;

/**
 * White sticker outline. Layered drop-shadows follow the SVG silhouette
 * (box-shadow only draws a rectangle). Bump px for a thicker border.
 */
const STICKER_OUTLINE =
  "drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff) drop-shadow(0 1.5px 0 #fff) drop-shadow(0 -1.5px 0 #fff) drop-shadow(1px 1px 0 #fff) drop-shadow(-1px 1px 0 #fff) drop-shadow(1px -1px 0 #fff) drop-shadow(-1px -1px 0 #fff)";

const TOOLS = [
  {
    key: "claude",
    src: "/assets/opening-dp/tools/claude-ai.svg",
    pos: POS.claude,
    /** Keep brand terracotta. */
    filter: STICKER_OUTLINE,
  },
  {
    key: "framer",
    src: "/assets/opening-dp/tools/framer.svg",
    pos: POS.framer,
    /** Source fill is white — blacken so it reads on the blue folder. */
    filter: `brightness(0) ${STICKER_OUTLINE}`,
  },
  {
    key: "cursor",
    src: "/assets/opening-dp/tools/cursor-code.svg",
    pos: POS.cursor,
    /** Source fill is light grey — blacken to match sticker ref. */
    filter: `brightness(0) ${STICKER_OUTLINE}`,
  },
] as const;

type FolderWithToolsProps = {
  /** Optional class on the outer box (grid item already sizes it). */
  className?: string;
};

export function FolderWithTools({ className }: FolderWithToolsProps) {
  return (
    <div className={`relative h-full w-full overflow-visible ${className ?? ""}`}>
      <Image
        src="/assets/opening-dp/img-06-folder.png"
        alt=""
        fill
        sizes="18vw"
        className="object-contain"
        priority={false}
      />

      {TOOLS.map(({ key, src, pos, filter }) => (
        <Image
          key={key}
          src={src}
          alt=""
          width={64}
          height={64}
          className="pointer-events-none absolute h-auto"
          style={{
            left: pos.left,
            top: pos.top,
            width: pos.width,
            zIndex: pos.z,
            transform: `rotate(${pos.rotate}deg)`,
            filter,
          }}
        />
      ))}
    </div>
  );
}

/** Re-export so callers can import POS for docs / quick edits in one place. */
export { POS as FOLDER_TOOLS_POS };
