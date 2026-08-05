import { ContributionCalendar } from "./fetchContributions";

// GitHub's own profile graph uses an 11px cell pitch (10px square + ~1-3px gap
// depending on renderer). We reproduce a close analogue that reads well at
// README scale.
export const CELL_SIZE = 10;
export const CELL_GAP = 3;
export const CELL_PITCH = CELL_SIZE + CELL_GAP; // 13
export const GRID_TOP_PADDING = 20; // room for HUD text above the grid
export const GRID_LEFT_PADDING = 10;

export type Level = 0 | 1 | 2 | 3 | 4;

export interface Tile {
  col: number; // week index (0-based, left -> right)
  row: number; // weekday index (0 = Sunday, top -> bottom)
  x: number; // pixel x of the tile's top-left corner
  y: number; // pixel y of the tile's top-left corner
  date: string;
  count: number;
  level: Level;
}

export interface Grid {
  tiles: Tile[];
  columns: number;
  rows: number;
  width: number;
  height: number;
}

function levelFromGitHub(levelStr: string): Level {
  switch (levelStr) {
    case "NONE":
      return 0;
    case "FIRST_QUARTILE":
      return 1;
    case "SECOND_QUARTILE":
      return 2;
    case "THIRD_QUARTILE":
      return 3;
    case "FOURTH_QUARTILE":
      return 4;
    default:
      return 0;
  }
}

export function buildGrid(calendar: ContributionCalendar): Grid {
  const tiles: Tile[] = [];
  const columns = calendar.weeks.length;
  const rows = 7;

  calendar.weeks.forEach((week, col) => {
    week.days.forEach((day) => {
      const row = day.weekday;
      tiles.push({
        col,
        row,
        x: GRID_LEFT_PADDING + col * CELL_PITCH,
        y: GRID_TOP_PADDING + row * CELL_PITCH,
        date: day.date,
        count: day.contributionCount,
        level: levelFromGitHub(day.contributionLevel),
      });
    });
  });

  const width = GRID_LEFT_PADDING * 2 + columns * CELL_PITCH;
  const height = GRID_TOP_PADDING + rows * CELL_PITCH + 40; // + HUD/footer room

  return { tiles, columns, rows, width, height };
}
