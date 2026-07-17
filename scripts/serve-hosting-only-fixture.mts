import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "dist");
const port = Number(process.env.NONGA_FIXTURE_SERVE_PORT || 4177);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function send(res: http.ServerResponse, status: number, body: Buffer | string, type: string) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  res.end(body);
}

function safeJoin(base: string, requestPath: string): string | null {
  const decoded = decodeURIComponent(requestPath.split("?")[0] || "/");
  const cleaned = decoded.replace(/^\/+/, "");
  const full = path.resolve(base, cleaned || "index.html");
  if (!full.startsWith(base)) return null;
  return full;
}

if (!fs.existsSync(root)) {
  console.error(`dist/ not found. Run: npm run build:hosting-only-fixture`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || "/";
  if (urlPath.startsWith("/api/") || urlPath === "/api") {
    send(
      res,
      404,
      JSON.stringify({
        success: false,
        message: "Hosting-only fixture serve: /api is not available",
        fixture: true,
      }),
      "application/json; charset=utf-8"
    );
    return;
  }

  let filePath = safeJoin(root, urlPath);
  if (!filePath) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback
    filePath = path.join(root, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = TYPES[ext] || "application/octet-stream";
  send(res, 200, fs.readFileSync(filePath), type);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Hosting-only fixture static server: http://127.0.0.1:${port}`);
  console.log("SPA fallback enabled; /api intentionally unavailable");
});
