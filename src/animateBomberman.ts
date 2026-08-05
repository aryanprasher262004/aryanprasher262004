import { Grid } from "./buildGrid";

export interface TimingConfig {
  introDuration: number; // "PRESS START" blink screen
  moveDuration: number; // walking one column over
  fuseDuration: number; // bomb sitting + fuse burning
  explosionDuration: number; // cross explosion + fade
  outroDuration: number; // "LEVEL COMPLETE"
}

export interface Timeline {
  order: number[]; // column indices, in visit order
  timing: TimingConfig;
  totalDuration: number;
  // fraction (0..1 of totalDuration) at which bomberman ARRIVES at column i's slot
  arriveFractions: number[];
  // fraction at which the bomb for column i actually detonates
  detonateFractions: number[];
  // fraction at which the explosion has fully faded for column i
  clearFractions: number[];
}

// Small deterministic PRNG (mulberry32) so the "random" path is reproducible
// for a given seed but still changes from one generation to the next.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dayOfYearSeed(date = new Date()): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  const oneDay = 86400000;
  return Math.floor(diff / oneDay);
}

/**
 * Builds the day-by-day visiting order. Every column is guaranteed to be
 * visited exactly once per loop (so the whole graph gets revealed every
 * cycle); the order itself is shuffled with a seed derived from the current
 * date, so the run looks different day to day without needing per-tile
 * pathfinding (which would blow the SVG size/time budget for ~370+ tiles).
 */
export function buildColumnOrder(columns: number, seed = dayOfYearSeed()): number[] {
  const order = Array.from({ length: columns }, (_, i) => i);
  const rand = mulberry32(seed);

  // Fisher-Yates shuffle, then bias it back toward "mostly left to right"
  // by only swapping within a small local window -- this keeps consecutive
  // moves short (so walking looks continuous) while still varying the
  // exact path day to day.
  const WINDOW = 5;
  for (let i = 0; i < order.length; i++) {
    const windowEnd = Math.min(order.length - 1, i + WINDOW);
    const j = i + Math.floor(rand() * (windowEnd - i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  // Every other day, walk the whole route in reverse for extra variety.
  if (seed % 2 === 1) order.reverse();

  return order;
}

export function buildTimeline(grid: Grid, timing?: Partial<TimingConfig>): Timeline {
  const cfg: TimingConfig = {
    introDuration: 2.5,
    moveDuration: 0.15,
    fuseDuration: 0.25,
    explosionDuration: 0.15,
    outroDuration: 2.5,
    ...timing,
  };

  const order = buildColumnOrder(grid.columns);
  const perColumn = cfg.moveDuration + cfg.fuseDuration + cfg.explosionDuration;
  const total = cfg.introDuration + perColumn * order.length + cfg.outroDuration;

  const arriveFractions: number[] = [];
  const detonateFractions: number[] = [];
  const clearFractions: number[] = [];

  let t = cfg.introDuration;
  for (let i = 0; i < order.length; i++) {
    t += cfg.moveDuration;
    arriveFractions.push(t / total);
    t += cfg.fuseDuration;
    detonateFractions.push(t / total);
    t += cfg.explosionDuration;
    clearFractions.push(t / total);
  }

  return {
    order,
    timing: cfg,
    totalDuration: total,
    arriveFractions,
    detonateFractions,
    clearFractions,
  };
}
