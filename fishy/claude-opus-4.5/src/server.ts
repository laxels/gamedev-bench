import { readFileSync } from "node:fs";
import { join } from "node:path";

const srcDir = import.meta.dir;

async function buildGame(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(srcDir, "game/index.ts")],
    minify: false,
    target: "browser",
  });

  if (!result.success) {
    console.error("Build failed:", result.logs);
    throw new Error("Build failed");
  }

  const output = result.outputs[0];
  if (!output) {
    throw new Error("No output file generated");
  }

  return await output.text();
}

let cachedGameJs: string | null = null;

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = readFileSync(join(srcDir, "index.html"), "utf-8");
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/game.js") {
      // Rebuild on each request in dev mode
      try {
        cachedGameJs = await buildGame();
        return new Response(cachedGameJs, {
          headers: { "Content-Type": "application/javascript" },
        });
      } catch (e) {
        console.error(e);
        return new Response("Build error", { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Fishy game running at http://localhost:${server.port}`);
