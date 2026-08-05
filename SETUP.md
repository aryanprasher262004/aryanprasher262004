# Bomberman GitHub README animation — setup

## What this replaces
Delete `pacman.yml` and drop these files in instead (paths match what's already
in your repo: `.github/workflows/`, plus new `src/` and `output/`):

```
.github/workflows/bomberman.yml
src/fetchContributions.ts
src/buildGrid.ts
src/pixelSprites.ts
src/animateBomberman.ts
src/generateSvg.ts
src/main.ts
package.json
tsconfig.json
.gitignore
```

## One-time setup

1. **Create the `output` branch** (the workflow pushes the generated SVG here,
   same pattern as your pacman one):
   ```bash
   git checkout --orphan output
   git rm -rf .
   git commit --allow-empty -m "init output branch"
   git push origin output
   git checkout main
   ```

2. **No extra secrets needed.** The workflow uses the built-in
   `secrets.GITHUB_TOKEN` for both the GraphQL contribution fetch and the
   push to `output` — same as it would for pacman. If your repo has
   branch protection on `output`, allow the `github-actions[bot]` actor to
   push, or the "Publish SVG" step will fail.

3. **Update your README** — replace the pacman `<img>` with:
   ```md
   <p align="center">
     <img src="https://raw.githubusercontent.com/<USERNAME>/<USERNAME>/output/bomberman.svg" alt="Bomberman contribution animation" />
   </p>
   ```
   Swap `<USERNAME>` for your actual GitHub username (`aryanprasher262004`,
   based on the sidebar in your screenshot).

4. **Run it once manually**: Actions tab → "Bomberman Contribution Animation"
   → "Run workflow". Check the `output` branch got a `bomberman.svg` commit,
   then confirm it renders on the README.

## Local test (optional, before pushing)
```bash
npm install
GH_USERNAME=<your-username> GH_TOKEN=<a PAT with read:user scope> npm run build && npm run generate
open output/bomberman.svg   # or just open the file in a browser
```

## Design notes / trade-offs (read before you ask "why isn't it per-tile?")

- **Bombs land per column (week), not per individual day-tile.** A true
  per-day path (~370+ tiles/year) with full SMIL timelines for each would
  either blow past the 1 MB budget or force each cell's dwell time down to
  the point of being imperceptible. One bomb per column reveals all 7 days
  in that week with a classic vertical+horizontal cross burst — same visual
  payoff, ~53 events instead of ~370, keeps the file around 150–200 KB.
- **Path "randomization"** is a seeded local shuffle (small window, so
  Bomberman's steps stay short and continuous) plus a coin-flip on
  left-to-right vs right-to-left per day, seeded off the day of year. Every
  column is still guaranteed to be visited exactly once per loop. A fully
  unconstrained random walk risks long empty walking stretches or blowing
  the 25–40s loop budget.
- **Pixel font**: the "PRESS START" / "LEVEL COMPLETE" / score text uses a
  bold monospace `<text>` element rather than a bitmap/pixel font baked into
  paths, to avoid embedding font data (keeps it "no external assets" and
  small). It reads as retro-ish at the sizes used but isn't a literal 8-bit
  bitmap font — swap in real per-glyph pixel paths in `pixelText()` if you
  want that exactly.
- **Timing**: intro 2.5s + ~0.55s per column × columns (~53) + outro 2.5s
  lands around 33–35s, inside your 25–40s spec.
- Everything renders with `<rect>`, `<use>`, `<animate>`, `<animateTransform>`
  only — no `<image>`, no `foreignObject`, no embedded JS — so it's safe for
  GitHub's README sanitizer.
