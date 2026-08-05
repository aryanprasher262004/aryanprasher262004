import { Grid, Level, CELL_SIZE, CELL_PITCH, GRID_TOP_PADDING } from "./buildGrid";
import { Timeline } from "./animateBomberman";
import { buildSpriteDefs, pixelText, SPRITE_SIZE } from "./pixelSprites";

// GitHub-ish green ramp for revealed tiles (levels 0-4). Level 0 stays the
// same neutral gray it started as -- nothing to reveal there.
const LEVEL_COLOR: Record<Level, string> = {
  0: "#2d333b",
  1: "#0e4429",
  2: "#006d32",
  3: "#26a641",
  4: "#39d353",
};

const GRAY = "#2d333b";
const BG = "#05060a";
const WALK_LANE_Y_OFFSET = 12; // px above the grid Bomberman walks along

function columnX(grid: Grid, col: number): number {
  // center-x of a column, in the same coordinate space as the tiles
  const tile = grid.tiles.find((t) => t.col === col);
  return (tile?.x ?? 0) + CELL_SIZE / 2;
}

function fmt(n: number): string {
  return n.toFixed(4);
}

export function generateSvg(
  grid: Grid,
  timeline: Timeline,
  meta: { username: string; totalContributions: number }
): string {
  const { totalDuration, order, arriveFractions, detonateFractions, clearFractions, timing } =
    timeline;

  const walkLaneY = GRID_TOP_PADDING - WALK_LANE_Y_OFFSET;
  const spawnX = columnX(grid, order[0]) - CELL_PITCH * 2;

  // ---- Bomberman movement keyframes -------------------------------------
  const moveKeyTimes: number[] = [0, timing.introDuration / totalDuration];
  const moveValues: string[] = [`${fmt(spawnX)},${fmt(walkLaneY)}`, `${fmt(spawnX)},${fmt(walkLaneY)}`];

  order.forEach((col, i) => {
    const x = columnX(grid, col);
    moveKeyTimes.push(arriveFractions[i], detonateFractions[i], clearFractions[i]);
    moveValues.push(`${fmt(x)},${fmt(walkLaneY)}`, `${fmt(x)},${fmt(walkLaneY)}`, `${fmt(x)},${fmt(walkLaneY)}`);
  });
  moveKeyTimes.push(1);
  moveValues.push(moveValues[moveValues.length - 1]);

  const bombermanAnim = `
    <animateTransform attributeName="transform" type="translate"
      dur="${fmt(totalDuration)}s" repeatCount="indefinite" calcMode="linear"
      keyTimes="${moveKeyTimes.map((k) => fmt(Math.min(1, k))).join(";")}"
      values="${moveValues.join(";")}" />`;

  // Walk-cycle leg swap, independent of the big translate loop.
  const walkCycle = `
    <animate href="#bm-frame-a" attributeName="opacity" attributeType="CSS"
      values="1;0;1" keyTimes="0;0.5;1" dur="0.5s" repeatCount="indefinite" />
    <animate href="#bm-frame-b" attributeName="opacity" attributeType="CSS"
      values="0;1;0" keyTimes="0;0.5;1" dur="0.5s" repeatCount="indefinite" />`;

  // ---- Per-column bomb + explosion + tile reveal -------------------------
  const columnPieces: string[] = [];

  order.forEach((col, i) => {
    const x = columnX(grid, col);
    const arrive = arriveFractions[i];
    const detonate = detonateFractions[i];
    const clear = clearFractions[i];
    const bombY = walkLaneY + 2;

    // bomb: appear when bomberman arrives, disappear at detonation
    columnPieces.push(`
      <use href="#bomb" x="${fmt(x - SPRITE_SIZE / 2)}" y="${fmt(bombY)}" opacity="0">
        <animate attributeName="opacity" dur="${fmt(totalDuration)}s" repeatCount="indefinite"
          keyTimes="0;${fmt(arrive)};${fmt(Math.max(arrive, detonate - 0.0005))};${fmt(detonate)};1"
          values="0;1;1;0;0" />
      </use>`);

    // explosion cross: five flame cells, centered on the column, spanning
    // the grid rows -- classic up/down/left/right + center burst.
    const centerRow = grid.tiles.find((t) => t.col === col && t.row === 3);
    const cy = (centerRow?.y ?? GRID_TOP_PADDING) + CELL_SIZE / 2;
    const offsets: [number, number][] = [
      [0, 0],
      [0, -CELL_PITCH],
      [0, CELL_PITCH],
      [-CELL_PITCH, 0],
      [CELL_PITCH, 0],
    ];
    const flames = offsets
      .map(
        ([dx, dy]) => `
        <use href="#flame" x="${fmt(x + dx - SPRITE_SIZE / 2)}" y="${fmt(
          cy + dy - SPRITE_SIZE / 2
        )}" />`
      )
      .join("");

    columnPieces.push(`
      <g opacity="0">
        <animate attributeName="opacity" dur="${fmt(totalDuration)}s" repeatCount="indefinite"
          keyTimes="0;${fmt(detonate)};${fmt((detonate + clear) / 2)};${fmt(clear)};1"
          values="0;0;1;0;0" />
        ${flames}
      </g>`);

    // tile reveals for this column: gray -> level color, staggered slightly
    const tiles = grid.tiles.filter((t) => t.col === col);
    tiles.forEach((tile, rowIdx) => {
      if (tile.level === 0) return; // nothing to reveal, stays gray
      const stagger = rowIdx * 0.0015;
      const revealAt = Math.min(0.999, detonate + stagger);
      columnPieces.push(`
        <rect x="${fmt(tile.x)}" y="${fmt(tile.y)}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2"
          fill="${LEVEL_COLOR[tile.level]}" opacity="0">
          <animate attributeName="opacity" dur="${fmt(totalDuration)}s" repeatCount="indefinite"
            keyTimes="0;${fmt(revealAt)};1" values="0;1;1" />
        </rect>`);
    });
  });

  // ---- Base grid (always-gray tiles underneath the reveals) -------------
  const baseTiles = grid.tiles
    .map(
      (t) =>
        `<rect x="${fmt(t.x)}" y="${fmt(t.y)}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2" fill="${GRAY}" />`
    )
    .join("");

  // ---- HUD: PRESS START intro + LEVEL COMPLETE outro ---------------------
  const introEnd = timing.introDuration / totalDuration;
  const outroStart = 1 - timing.outroDuration / totalDuration;

  const pressStart = `
    <g>
      ${pixelText("PRESS START", grid.width / 2, grid.height - 8, {
        size: 9,
        fill: "#39d353",
        id: "press-start-text",
      })}
      <animate href="#press-start-text" attributeName="opacity" attributeType="CSS"
        dur="${fmt(totalDuration)}s" repeatCount="indefinite"
        keyTimes="0;${fmt(introEnd * 0.15)};${fmt(introEnd * 0.3)};${fmt(introEnd * 0.45)};${fmt(
    introEnd * 0.6
  )};${fmt(introEnd * 0.75)};${fmt(introEnd * 0.95)};${fmt(introEnd)};1"
        values="1;0;1;0;1;0;1;0;0" />
    </g>`;

  const levelComplete = `
    <g opacity="0">
      <animate attributeName="opacity" dur="${fmt(totalDuration)}s" repeatCount="indefinite"
        keyTimes="0;${fmt(outroStart)};${fmt(outroStart + 0.01)};1" values="0;0;1;1" />
      ${pixelText("LEVEL COMPLETE", grid.width / 2, grid.height / 2 - 4, {
        size: 11,
        fill: "#ffe14d",
      })}
      ${pixelText(`SCORE ${meta.totalContributions.toString().padStart(5, "0")}`, grid.width / 2, grid.height / 2 + 12, {
        size: 8,
        fill: "#e6ffe6",
      })}
    </g>`;

  const hudScore = pixelText(`@${meta.username}  ${meta.totalContributions} contributions`, grid.width / 2, 12, {
    size: 7,
    fill: "#7ee787",
  });

  const bombermanGroup = `
    <g transform="translate(${fmt(spawnX)},${fmt(walkLaneY)})">
      ${bombermanAnim}
      <g transform="scale(1)">
        <use href="#bm-a" id="bm-frame-a" x="${fmt(-SPRITE_SIZE / 2)}" y="${fmt(-SPRITE_SIZE)}" />
        <use href="#bm-b" id="bm-frame-b" x="${fmt(-SPRITE_SIZE / 2)}" y="${fmt(-SPRITE_SIZE)}" opacity="0" />
        ${walkCycle}
      </g>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${grid.width}" height="${grid.height}" viewBox="0 0 ${grid.width} ${grid.height}">
  <defs>
    ${buildSpriteDefs()}
  </defs>
  <rect x="0" y="0" width="${grid.width}" height="${grid.height}" fill="${BG}" />
  ${hudScore}
  ${baseTiles}
  ${columnPieces.join("")}
  ${bombermanGroup}
  ${pressStart}
  ${levelComplete}
</svg>`;
}
