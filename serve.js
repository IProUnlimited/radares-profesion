"use strict";
/**
 * Servidor estático para los radares.
 * - Cache headers para mejor performance
 * - CORS soporte para llamadas al backend
 * - Logging opcional de requests
 *
 * Uso: node serve.js  →  http://localhost:8080
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".svg":  "image/svg+xml",
};

const CACHE_CONTROL = {
  html: "public, max-age=600, must-revalidate",
  static: "public, max-age=31536000, immutable",
  api: "no-store, no-cache"
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  const file = path.join(ROOT, url);

  if (!file.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("forbidden");
  }

  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("not found");
    }

    const ext = path.extname(file);
    const mimeType = MIME[ext] || "application/octet-stream";

    let cacheControl = CACHE_CONTROL.static;
    if (ext === ".html") cacheControl = CACHE_CONTROL.html;
    else if (ext === ".json") cacheControl = CACHE_CONTROL.api;

    const headers = {
      "Content-Type": mimeType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN"
    };

    const acceptGzip = (req.headers["accept-encoding"] || "").includes("gzip");
    const shouldCompress = acceptGzip && buf.length > 1024 && (ext === ".js" || ext === ".css" || ext === ".html");

    if (shouldCompress) {
      headers["Content-Encoding"] = "gzip";
      zlib.gzip(buf, (err, compressed) => {
        if (err) {
          res.writeHead(200, headers);
          return res.end(buf);
        }
        headers["Content-Length"] = compressed.length;
        res.writeHead(200, headers);
        res.end(compressed);
      });
    } else {
      res.writeHead(200, headers);
      res.end(buf);
    }
  });
}).listen(PORT, () => console.log(`Radares en http://localhost:${PORT}`));
