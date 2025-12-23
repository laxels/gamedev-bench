import { join } from "node:path";

type BuiltAsset = {
  body: ArrayBuffer;
  contentType: string;
};

const PORT = Number(process.env.PORT ?? "3000");
const ROOT_DIR = import.meta.dir;

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function bytesResponse(asset: BuiltAsset): Response {
  return new Response(asset.body, {
    headers: {
      "content-type": asset.contentType,
      "cache-control": "no-store",
    },
  });
}

async function buildClient(): Promise<BuiltAsset> {
  const entry = join(ROOT_DIR, "game", "index.ts");
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "esm",
    sourcemap: "inline",
    minify: false,
  });

  if (!result.success) {
    // Bun prints diagnostics; still throw to fail fast.
    throw new Error("Client build failed");
  }

  const out = result.outputs[0];
  if (!out) throw new Error("Missing client build output");

  return {
    body: await out.arrayBuffer(),
    contentType: "text/javascript; charset=utf-8",
  };
}

const indexHtmlFile = Bun.file(join(ROOT_DIR, "client", "index.html"));
let builtJs: BuiltAsset | null = null;
const isProd = (process.env.NODE_ENV ?? "").toLowerCase() === "production";

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return htmlResponse(await indexHtmlFile.text());
    }

    if (url.pathname === "/app.js") {
      if (!isProd) {
        return bytesResponse(await buildClient());
      }
      builtJs ??= await buildClient();
      return bytesResponse(builtJs);
    }

    return new Response("Not found", { status: 404 });
  },
});

// eslint-disable-next-line no-console
console.log(`Fishy running on http://localhost:${PORT}`);
