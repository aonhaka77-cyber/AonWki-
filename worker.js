const ORIGIN = "https://raw.githubusercontent.com/aonhaka77-cyber/AonWki-/main";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8"
};

async function handle(request) {
  const incoming = new URL(request.url);
  let pathname;
  try {
    pathname = decodeURIComponent(incoming.pathname);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (pathname === "/") pathname = "/index.html";
  if (pathname.includes("..") || pathname.includes("\\") || pathname.includes("\0")) {
    return new Response("Bad Request", { status: 400 });
  }

  const target = ORIGIN + pathname + incoming.search;
  const upstream = await fetch(target, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: { "Accept": request.headers.get("Accept") || "*/*" },
    cf: { cacheTtl: 300, cacheEverything: true }
  });

  const headers = new Headers(upstream.headers);
  const filename = pathname.toLowerCase();
  const extension = filename.slice(filename.lastIndexOf("."));
  if (MIME_TYPES[extension]) headers.set("Content-Type", MIME_TYPES[extension]);
  headers.set("Cache-Control", "public, max-age=300, s-maxage=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.delete("content-security-policy");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

addEventListener("fetch", event => {
  event.respondWith(handle(event.request));
});