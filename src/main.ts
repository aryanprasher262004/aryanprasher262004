import * as fs from "fs";
import * as path from "path";
import { fetchContributions } from "./fetchContributions";
import { buildGrid } from "./buildGrid";
import { buildTimeline } from "./animateBomberman";
import { generateSvg } from "./generateSvg";

async function main() {
  const username = process.env.GH_USERNAME;
  const token = process.env.GH_TOKEN;

  if (!username) throw new Error("GH_USERNAME env var is required");
  if (!token) throw new Error("GH_TOKEN env var is required");

  const calendar = await fetchContributions(username, token);
  const grid = buildGrid(calendar);
  const timeline = buildTimeline(grid);

  const svg = generateSvg(grid, timeline, {
    username,
    totalContributions: calendar.totalContributions,
  });

  const sizeKb = Buffer.byteLength(svg, "utf8") / 1024;
  console.log(`Generated bomberman.svg (${sizeKb.toFixed(1)} KB, ${timeline.totalDuration.toFixed(1)}s loop)`);
  if (sizeKb > 1024) {
    console.warn("WARNING: output exceeds 1MB budget.");
  }

  const outDir = path.join(process.cwd(), "output");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "bomberman.svg"), svg, "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
