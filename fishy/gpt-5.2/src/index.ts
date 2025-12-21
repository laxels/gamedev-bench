const port = Number(process.env.PORT ?? 3000);

type Asset = {
  contentType: string;
  body: ArrayBuffer;
};

async function buildClient(): Promise<{
  assets: Map<string, Asset>;
  entryUrl: string;
}> {
  const result = await Bun.build({
    entrypoints: ["src/client/main.ts"],
    target: "browser",
    format: "esm",
    splitting: false,
    sourcemap: "inline",
    minify: false,
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("Client build failed");
  }

  const assets = new Map<string, Asset>();
  const entry = result.outputs[0];
  if (!entry) throw new Error("Client build produced no outputs");

  const entryUrl = "/assets/main.js";
  assets.set(entryUrl, {
    contentType: "text/javascript; charset=utf-8",
    body: await entry.arrayBuffer(),
  });

  return { assets, entryUrl };
}

const { assets, entryUrl } = await buildClient();

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fishy</title>
    <style>
      :root {
        --bg: #000;
        --ui: #1c4e76;
      }
      html,
      body {
        height: 100%;
        margin: 0;
        background: var(--bg);
        overflow: hidden;
        font-family: "Comic Sans MS", "Comic Sans", system-ui, -apple-system, Segoe UI, sans-serif;
      }
      #app {
        position: relative;
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg);
        user-select: none;
      }
      canvas {
        display: block;
        background: transparent;
      }
      #fs {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 34px;
        height: 34px;
        border: 0;
        padding: 0;
        background: transparent;
        color: #fff;
        cursor: pointer;
      }
      #fs:hover {
        transform: scale(1.15);
      }
      #fs svg {
        width: 100%;
        height: 100%;
        display: block;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <button id="fs" aria-label="Toggle fullscreen" title="Fullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M8 21H3v-5" />
          <path d="M16 21h5v-5" />
          <path d="M3 3l7 7" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
          <path d="M21 21l-7-7" />
        </svg>
      </button>
    </div>
    <script type="module" src="${entryUrl}"></script>
  </body>
</html>
`;

const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/")
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });

    const asset = assets.get(url.pathname);
    if (asset) {
      return new Response(asset.body, {
        headers: {
          "content-type": asset.contentType,
          "cache-control": "no-store",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Fishy running on http://localhost:${server.port}`);
