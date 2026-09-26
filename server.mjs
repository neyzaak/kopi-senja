import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number(process.env.PORT || 4173);

const adminRoute = `/${(process.env.ADMIN_ROUTE || "pemilik-senja-7f3a")
  .replace(/^\/+|\/+$/g, "")}`;
const hiddenRoutes = new Set(["/admin", "/admin/", "/admin.html"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/") pathname = "/index.html";
    const isAdmin = pathname === adminRoute || pathname === `${adminRoute}/`;
    if (isAdmin) pathname = "/admin.html";
    else if (hiddenRoutes.has(pathname)) {
      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      });
      response.end("Halaman tidak ditemukan.");
      return;
    }

    const relativePath = normalize(pathname).replace(/^([/\\])+/, "");
    if (relativePath.includes("..")) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    let filePath = join(root, relativePath);
    const fileStat = await stat(filePath).catch(() => null);

    if (!fileStat || fileStat.isDirectory()) {
      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      response.end("Halaman tidak ditemukan.");
      return;
    }

    const content = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    };
    if (isAdmin) {
      headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
      headers["Cache-Control"] = "no-store";
    }
    response.writeHead(200, headers);
    response.end(content);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Terjadi kesalahan pada server.");
  }
});

server.listen(port, () => {
  console.log(`Kopi Senja berjalan di http://localhost:${port}`);
  console.log(`Link khusus pemilik: http://localhost:${port}${adminRoute}`);
});
