const ORIGIN = "https://raw.githubusercontent.com/aonhaka77-cyber/AonWki-/main";

async function handle(request) {
  const incoming = new URL(request.url);
  let pathname = decodeURIComponent(incoming.pathname);
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
