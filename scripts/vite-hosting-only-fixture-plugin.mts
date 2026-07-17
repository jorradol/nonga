import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const FIXTURE_IMAGE = "/fixture/placeholder-car.svg";
const pluginDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Hosting-only fixture build transforms:
 * - rewrite remote Unsplash/marketing image URLs to local placeholder
 * - drop Google Fonts @import (system font fallback via CSS variables)
 * - stub Firebase SDK modules
 * Active only when VITE_NONGA_UI_FIXTURE=true.
 */
export function hostingOnlyFixtureIsolationPlugin(): Plugin {
  const enabled = () => process.env.VITE_NONGA_UI_FIXTURE === "true";

  return {
    name: "nonga-hosting-only-fixture-isolation",
    enforce: "pre",
    apply: "build",
    config() {
      if (!enabled()) return undefined;
      const stubDir = path.resolve(pluginDir, "../src/fixture/stubs");
      return {
        resolve: {
          alias: [
            {
              find: /^firebase\/app$/,
              replacement: path.join(stubDir, "firebaseAppStub.ts"),
            },
            {
              find: /^firebase\/auth$/,
              replacement: path.join(stubDir, "firebaseAuthStub.ts"),
            },
            {
              find: /^firebase\/firestore$/,
              replacement: path.join(stubDir, "firebaseFirestoreStub.ts"),
            },
          ],
        },
      };
    },
    transform(code, id) {
      if (!enabled()) return null;

      let next = code;
      let changed = false;

      // Always strip Gemini default endpoint — including from node_modules client SDKs.
      if (/generativelanguage\.googleapis\.com/i.test(next)) {
        next = next.replace(
          /https:\/\/generativelanguage\.googleapis\.com/gi,
          "https://127.0.0.1/fixture-blocked-gemini"
        );
        changed = true;
      }

      // Neutralize FakePlaceholder / AIza-shaped keys from applet config leftovers.
      if (/AIzaSyFakePlaceholder/i.test(next) || /AIza[0-9A-Za-z_-]{20,}/.test(next)) {
        next = next.replace(/AIzaSyFakePlaceholder[0-9A-Za-z_-]*/gi, "");
        next = next.replace(/AIza[0-9A-Za-z_-]{20,}/g, "");
        changed = true;
      }

      if (id.includes("node_modules")) {
        return changed ? { code: next, map: null } : null;
      }

      if (/images\.unsplash\.com/i.test(next)) {
        next = next.replace(
          /https:\/\/images\.unsplash\.com\/[^"'`\s)\\]*/gi,
          FIXTURE_IMAGE
        );
        changed = true;
      }

      if (/api\.dicebear\.com/i.test(next)) {
        next = next.replace(
          /https:\/\/api\.dicebear\.com\/[^"'`\s)\\]*/gi,
          FIXTURE_IMAGE
        );
        changed = true;
      }

      // Remove Google Fonts @import only — do not leave empty @import "".
      if (/fonts\.googleapis\.com/i.test(next)) {
        next = next.replace(
          /@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com[^;]*;\s*/gi,
          "/* Gate D1 fixture: Google Fonts import removed — system font fallback */\n"
        );
        next = next.replace(
          /@import\s*["']https:\/\/fonts\.googleapis\.com[^"']*["']\s*;?/gi,
          "/* Gate D1 fixture: Google Fonts import removed — system font fallback */\n"
        );
        changed = true;
      }
      // Clean any accidental empty import left by prior transforms.
      next = next.replace(/@import\s+["']{2}\s*;?/g, "");
      next = next.replace(/@import\s+url\(["']{0,2}\)["']?\s*;?/g, "");

      if (id.includes("index.css") && next.includes("--font-sans:")) {
        next = next.replace(
          /--font-sans:\s*[^;]+;/g,
          "--font-sans: ui-sans-serif, system-ui, sans-serif;"
        );
        next = next.replace(
          /--font-display:\s*[^;]+;/g,
          "--font-display: ui-sans-serif, system-ui, sans-serif;"
        );
        next = next.replace(
          /--font-mono:\s*[^;]+;/g,
          "--font-mono: ui-monospace, monospace;"
        );
        changed = true;
      }

      return changed ? { code: next, map: null } : null;
    },
    generateBundle(_options, bundle) {
      if (!enabled()) return;
      for (const item of Object.values(bundle)) {
        if (item.type !== "asset" || typeof item.source !== "string") continue;
        if (!item.fileName.endsWith(".css")) continue;
        let css = item.source;
        css = css.replace(
          /@import\s*url\(['"]?https:\/\/fonts\.googleapis\.com[^;]*;\s*/gi,
          "/* Gate D1 fixture: Google Fonts removed */"
        );
        css = css.replace(
          /@import\s*["']https:\/\/fonts\.googleapis\.com[^"']*["'];?/gi,
          "/* Gate D1 fixture: Google Fonts removed */"
        );
        css = css.replace(/https:\/\/fonts\.googleapis\.com\/[^"'\\\s)]*/gi, "");
        css = css.replace(/https:\/\/fonts\.gstatic\.com\/[^"'\\\s)]*/gi, "");
        item.source = css;
      }
    },
  };
}
