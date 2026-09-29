// out/ 정적 빌드를 GitHub Pages 처럼 /tbyb-mvp-miku 아래에서 서빙한다 (E2E 전용, 의존성 없음).
// 사용: PAGES_BASE_PATH=/tbyb-mvp-miku npm run build && node e2e/serve.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../out", import.meta.url)));
const BASE = (process.env.E2E_BASE_PATH ?? "/tbyb-mvp-miku").replace(/\/$/, "");
const PORT = Number(process.env.E2E_PORT ?? 4321);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

async function send(res, status, file) {
  const body = await readFile(file);
  res.writeHead(status, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(body);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = decodeURIComponent(url.pathname);
  if (path === "/" || path === BASE) {
    res.writeHead(301, { location: `${BASE}/${url.search}` });
    return res.end();
  }
  if (!path.startsWith(`${BASE}/`)) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("not under base path");
  }
  path = path.slice(BASE.length);
  const target = normalize(join(ROOT, path));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  // GitHub Pages 와 같게: 디렉터리는 index.html, 확장자 없는 경로는 슬래시 붙여 리다이렉트
  if (path.endsWith("/")) {
    const index = join(target, "index.html");
    if (await isFile(index)) return send(res, 200, index);
  } else if (await isFile(target)) {
    return send(res, 200, target);
  } else if (await isFile(join(target, "index.html"))) {
    res.writeHead(301, { location: `${BASE}${path}/${url.search}` });
    return res.end();
  }
  return send(res, 404, join(ROOT, "404.html"));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`serving ${ROOT} at http://127.0.0.1:${PORT}${BASE}/`);
});
