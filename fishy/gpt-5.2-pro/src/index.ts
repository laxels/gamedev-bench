const PUBLIC_ROOT = new URL("../public/", import.meta.url);
const CLIENT_ENTRY = new URL("./client.ts", import.meta.url);

const PORT = Number(Bun.env.PORT ?? "3000") || 3000;
const HOST = Bun.env.HOST ?? "0.0.0.0";

type BuildCache = {
  bytes: Uint8Array;
};

let clientCache: BuildCache | null = null;

function contentTypeFor(pathname: string): string {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (pathname.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

async function buildClientJs(): Promise<Uint8Array> {
  const result = await Bun.build({
    entrypoints: [CLIENT_ENTRY],
    target: "browser",
    format: "esm",
    sourcemap: "inline",
    minify: false,
  });

  if (!result.success) {
    const message = result.logs.map((l) => l.message).join("\n");
    throw new Error(`Failed to build client:\n${message}`);
  }

  const output = result.outputs[0];
  return new Uint8Array(await output.arrayBuffer());
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/client.js") {
      try {
        if (!clientCache) {
          clientCache = { bytes: await buildClientJs() };
        }

        return new Response(clientCache.bytes, {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(message, {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

    // simple traversal protection
    if (pathname.includes("..")) {
      return new Response("Bad Request", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const fileUrl = new URL(`.${pathname}`, PUBLIC_ROOT);
    const file = Bun.file(fileUrl);

    if (!(await file.exists())) {
      return new Response("Not Found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    return new Response(file, {
      headers: {
        "content-type": contentTypeFor(pathname),
        "cache-control": "no-store",
      },
    });
  },
});

console.log(`Fishy running at http://${server.hostname}:${server.port}`);