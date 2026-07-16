/**
 * Saved/Favorites count ↔ /saved list parity regression guard
 * Run: npx tsx scripts/test-saved-favorites-count-parity.mts
 */
import fs from "node:fs";
import path from "node:path";
import {
  resolveVisibleFavoriteCars,
  resolveVisibleFavoriteCount,
} from "../src/utils/resolveVisibleFavorites.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

console.log("--- Saved favorites count/list parity ---");

// --- unit: resolver behavior ---
{
  const cars = [
    { id: "car-a", title: "A" },
    { id: "car-b", title: "B" },
  ] as { id: string; title: string }[];

  ok("empty favorites → count 0", resolveVisibleFavoriteCount([], cars as never) === 0);
  ok(
    "stale id only → count 0",
    resolveVisibleFavoriteCount(["tesla-model-3-2023"], cars as never) === 0
  );
  ok(
    "one valid favorite → count 1",
    resolveVisibleFavoriteCount(["car-a"], cars as never) === 1
  );
  ok(
    "valid favorite resolves card",
    resolveVisibleFavoriteCars(["car-a"], cars as never).length === 1 &&
      resolveVisibleFavoriteCars(["car-a"], cars as never)[0]?.id === "car-a"
  );
  ok(
    "mixed valid + stale → count 1",
    resolveVisibleFavoriteCount(["car-b", "ghost-id"], cars as never) === 1
  );
  ok(
    "remove valid favorite → count 0",
    resolveVisibleFavoriteCount([], cars as never) === 0
  );
}

// --- store: no stale mock seed ---
{
  const store = read("src/store.ts");
  ok(
    "store default favorites empty",
    /favorites:\s*\[\]/.test(store),
    "expected favorites: []"
  );
  ok(
    "store no tesla-model-3-2023 seed",
    !store.includes('favorites: ["tesla-model-3-2023"]'),
    ""
  );
}

// --- header uses resolved count, not raw favorites.length ---
{
  const header = read("src/components/Header.tsx");
  ok(
    "header imports resolveVisibleFavoriteCount",
    header.includes("resolveVisibleFavoriteCount"),
    ""
  );
  ok(
    "header reads cars from store",
    header.includes("cars,") || header.includes("cars "),
    ""
  );
  ok(
    "header nav saved count uses resolver",
    /count:\s*resolveVisibleFavoriteCount\(favorites,\s*cars\)/.test(header),
    ""
  );
  ok(
    "header no raw favorites.length badge",
    !/count:\s*favorites\.length/.test(header),
    ""
  );
}

// --- /saved page uses same resolver ---
{
  const app = read("src/App.tsx");
  ok(
    "app imports resolveVisibleFavoriteCars",
    app.includes("resolveVisibleFavoriteCars"),
    ""
  );
  ok(
    "saved view uses resolver",
    /resolveVisibleFavoriteCars\(favorites,\s*cars\)/.test(app),
    ""
  );
  ok(
    "saved view no inline cars.filter favorites",
    !/cars\.filter\(\(c\)\s*=>\s*favorites\.includes\(c\.id\)\)/.test(app),
    ""
  );
}
