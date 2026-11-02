/**
 * Rebuild the three bundled repo games (from their zips, already extracted as
 * game1/game2/game3) into self-contained HTML files served by the main app at
 * /games/<name>/index.html. Run: npm run build:games
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const GAMES = [
  { dir: "game1", out: "gameplay-1" },
  { dir: "game2", out: "gameplay-2" },
  { dir: "game3", out: "cat-asset" },
];

for (const { dir, out } of GAMES) {
  console.log(`▶ building ${dir} → /games/${out}/`);
  execSync("npx vite build", { cwd: dir, stdio: "inherit" });
  mkdirSync(join("public", "games", out), { recursive: true });
  copyFileSync(join(dir, "dist", "index.html"), join("public", "games", out, "index.html"));
}
console.log("✓ all games bundled into public/games/");
