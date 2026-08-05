// All sprites are drawn as an 8x8 "pixel" grid of <rect> elements so the
// whole thing stays pure SVG (no <image>, no external fonts, no raster
// assets). Each sprite is registered once inside <defs> and reused with
// <use> to keep file size down.

export const PIXEL = 1.35; // size of one sprite-pixel in SVG user units
export const SPRITE_SIZE = PIXEL * 8; // ~10.8, close to CELL_PITCH

type Palette = Record<string, string>;

function spriteFromRows(rows: string[], palette: Palette, idPrefix: string): string {
  const rects: string[] = [];
  rows.forEach((row, y) => {
    row.split("").forEach((ch, x) => {
      if (ch === "." || !palette[ch]) return;
      rects.push(
        `<rect x="${(x * PIXEL).toFixed(2)}" y="${(y * PIXEL).toFixed(
          2
        )}" width="${PIXEL}" height="${PIXEL}" fill="${palette[ch]}" />`
      );
    });
  });
  return `<g id="${idPrefix}">${rects.join("")}</g>`;
}

// -- Bomberman, facing right, two walk frames (legs alternate) -------------

const BOMBERMAN_PALETTE: Palette = {
  W: "#f4f4f4", // helmet / eyes
  F: "#f2c9a0", // face
  B: "#2f6fd6", // suit
  D: "#1e4fa0", // suit shadow
  P: "#ff8fc7", // gloves
  K: "#12131a", // outline / boots
};

const BOMBERMAN_FRAME_A = [
  ".WWWWWW.",
  "WWWWWWWW",
  "WFFFFFFW",
  ".FFFFFF.",
  "PBBBBBDP",
  ".BBBBBD.",
  "..K..D..",
  ".K....D.",
];

const BOMBERMAN_FRAME_B = [
  ".WWWWWW.",
  "WWWWWWWW",
  "WFFFFFFW",
  ".FFFFFF.",
  "PBBBBBDP",
  ".BBBBBD.",
  ".K....D.",
  "K....D..",
];

// -- Bomb --------------------------------------------------------------

const BOMB_PALETTE: Palette = {
  K: "#14141a",
  H: "#3a3a46", // highlight
  F: "#ffb23c", // fuse
  S: "#ff5f3c", // spark
};

const BOMB_ROWS = [
  "...F....",
  "..S.....",
  "..KKKK..",
  ".KHKKK..",
  ".KKKKK..",
  ".KKKKK..",
  "..KKKK..",
  "........",
];

// -- Explosion: classic cross, one blocky "flame" cell reused 5x -------

const EXPLOSION_PALETTE: Palette = {
  W: "#ffffff",
  Y: "#ffe14d",
  O: "#ff8a1e",
};

const EXPLOSION_ROWS = [
  "..OYYO..",
  ".OYWWYO.",
  "OYWWWWYO",
  "YWWWWWWY",
  "YWWWWWWY",
  "OYWWWWYO",
  ".OYWWYO.",
  "..OYYO..",
];

export function buildSpriteDefs(): string {
  const bombermanA = spriteFromRows(BOMBERMAN_FRAME_A, BOMBERMAN_PALETTE, "bm-a");
  const bombermanB = spriteFromRows(BOMBERMAN_FRAME_B, BOMBERMAN_PALETTE, "bm-b");
  const bomb = spriteFromRows(BOMB_ROWS, BOMB_PALETTE, "bomb");
  const explosionCell = spriteFromRows(EXPLOSION_ROWS, EXPLOSION_PALETTE, "flame");

  return [bombermanA, bombermanB, bomb, explosionCell].join("");
}

// Retro HUD text rendered as blocky SVG <text> (system monospace, bold,
// letter-spaced) rather than an embedded bitmap font -- keeps the file
// self-contained while still reading as "arcade-ish" at small sizes.
export function pixelText(
  content: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    fill?: string;
    anchor?: "start" | "middle" | "end";
    id?: string;
    opacity?: number;
  } = {}
): string {
  const size = opts.size ?? 8;
  const fill = opts.fill ?? "#e6ffe6";
  const anchor = opts.anchor ?? "middle";
  const idAttr = opts.id ? ` id="${opts.id}"` : "";
  const opacity = opts.opacity ?? 1;
  return `<text${idAttr} x="${x}" y="${y}" text-anchor="${anchor}" opacity="${opacity}" font-family="'Courier New', 'Consolas', monospace" font-weight="700" font-size="${size}" letter-spacing="2" fill="${fill}" style="text-shadow:0 0 2px ${fill}">${escapeXml(
    content
  )}</text>`;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
