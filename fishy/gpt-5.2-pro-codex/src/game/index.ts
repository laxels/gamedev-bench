import { clamp } from "./geom";
import { createInput } from "./input";
import { drawBackdrop } from "./render/background";
import { drawBubble, drawNpcFish, drawPlayer } from "./render/fish";
import {
  drawFishboneCounters,
  drawFullscreenIcon,
  drawScore,
} from "./render/hud";
import {
  createGameOverState,
  drawGameOver,
  updateGameOver,
} from "./screens/gameOver";
import {
  createInstructionsState,
  drawInstructions,
  updateInstructions,
} from "./screens/instructions";
import { createMenuState, drawMenu, updateMenu } from "./screens/menu";
import {
  createPlayAgainState,
  drawPlayAgain,
  updatePlayAgain,
} from "./screens/playAgain";
import type { PersistentStats, ScreenKind } from "./screens/types";
import { newPointer, pointerInRect } from "./ui";
import {
  createWorld,
  isPlayerSwimming,
  type PlayBounds,
  updateWorld,
  type World,
} from "./world/update";

type Layout = {
  canvasW: number;
  canvasH: number;
  playArea: { x: number; y: number; w: number; h: number };
  bounds: PlayBounds;
  spawn: { left: number; right: number; top: number; bottom: number };
};

function computeLayout(viewW: number, viewH: number): Layout {
  // Keep a consistent aspect ratio, like the original: wide play rectangle.
  const ratio = 1882 / 1327; // from screenshots
  let canvasW = viewW;
  let canvasH = Math.round(viewW / ratio);
  if (canvasH > viewH) {
    canvasH = viewH;
    canvasW = Math.round(viewH * ratio);
  }

  const margin = 6;
  const playArea = {
    x: Math.floor((viewW - canvasW) / 2) + margin,
    y: Math.floor((viewH - canvasH) / 2) + margin,
    w: canvasW - margin * 2,
    h: canvasH - margin * 2,
  };

  // In-game movement bounds: slightly inset from play area, leaving border.
  const bounds: PlayBounds = {
    left: playArea.x + 12,
    right: playArea.x + playArea.w - 12,
    top: playArea.y + 10,
    bottom: playArea.y + playArea.h - 110, // above sand
  };

  // Spawn rect is wider than play area.
  const spawn = {
    left: playArea.x - 200,
    right: playArea.x + playArea.w + 200,
    top: bounds.top + 20,
    bottom: bounds.bottom - 10,
  };

  return { canvasW, canvasH, playArea, bounds, spawn };
}

function ensureCanvas(root: HTMLElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  c.style.width = `${window.innerWidth}px`;
  c.style.height = `${window.innerHeight}px`;
  root.appendChild(c);
  return c;
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

type Game = {
  kind: ScreenKind;
  menu: ReturnType<typeof createMenuState>;
  instructions: ReturnType<typeof createInstructionsState>;
  gameOver: ReturnType<typeof createGameOverState> | null;
  playAgain: ReturnType<typeof createPlayAgainState>;
  world: World | null;
  stats: PersistentStats;
};

function newGame(layout: Layout): World {
  return createWorld(layout.bounds, layout.spawn);
}

function syncPersistentFromWorld(game: Game): void {
  if (!game.world) return;
  game.stats = { ...game.world.stats };
}

export function main(): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root");

  const canvas = ensureCanvas(root);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Missing 2d context");

  const { state: input, dispose: disposeInput } = createInput();
  const pointer = newPointer();

  const updateCanvasSize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };
  window.addEventListener("resize", updateCanvasSize);

  const pointerPos = (ev: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    pointer.y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
  };
  canvas.addEventListener("pointermove", (ev) => pointerPos(ev));
  canvas.addEventListener("pointerdown", (ev) => {
    pointerPos(ev);
    pointer.isDown = true;
  });
  canvas.addEventListener("pointerup", (ev) => {
    pointerPos(ev);
    pointer.isDown = false;
    pointer.justReleased = true;
  });

  let layout = computeLayout(canvas.width, canvas.height);

  const game: Game = {
    kind: "menu",
    menu: createMenuState(),
    instructions: createInstructionsState(),
    gameOver: null,
    playAgain: createPlayAgainState(),
    world: null,
    stats: { fishEaten: 0, score: 0 },
  };

  let t = 0;
  let last = performance.now();

  const frame = (now: number) => {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    t += dt;

    // Recompute layout every frame to handle resize/fullscreen smoothly.
    layout = computeLayout(canvas.width, canvas.height);

    // Clear whole viewport (black background outside play area).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Backdrop
    drawBackdrop(ctx, layout.playArea);

    // Fullscreen button
    const viewRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
    const fsHover = pointerInRect(pointer, {
      x: viewRect.x + viewRect.w - 56,
      y: viewRect.y,
      w: 48,
      h: 48,
    });
    const { rect: fsRect } = drawFullscreenIcon(ctx, viewRect, fsHover);
    if (pointer.justReleased && pointerInRect(pointer, fsRect))
      toggleFullscreen();

    // Screen logic
    if (game.kind === "menu") {
      const res = updateMenu({
        ctx,
        playArea: layout.playArea,
        state: game.menu,
        dt,
        pointer,
      });
      if (res === "play") {
        game.world = newGame(layout);
        game.stats = { fishEaten: 0, score: 0 };
        game.kind = "play";
      } else if (res === "instructions") {
        game.kind = "instructions";
      }
      drawMenu({ ctx, playArea: layout.playArea, state: game.menu });
    } else if (game.kind === "instructions") {
      const res = updateInstructions({
        ctx,
        playArea: layout.playArea,
        state: game.instructions,
        pointer,
      });
      if (res === "back") game.kind = "menu";
      drawInstructions({
        ctx,
        playArea: layout.playArea,
        state: game.instructions,
      });
    } else if (game.kind === "play") {
      if (!game.world) game.world = newGame(layout);
      updateWorld({ world: game.world, dt, input, pointer });
      syncPersistentFromWorld(game);

      // Draw bubbles behind fish
      for (const b of game.world.bubbles) drawBubble(ctx, b);
      for (const f of game.world.npcs) drawNpcFish(ctx, f, t);
      drawPlayer(ctx, game.world.player, isPlayerSwimming(input), t);

      drawFishboneCounters(ctx, layout.playArea, game.world.stats.fishEaten);
      drawScore(ctx, layout.playArea, game.world.stats.score);

      if (game.world.ended) {
        game.kind = "gameOver";
        game.gameOver = createGameOverState(layout.playArea);
      }
    } else if (game.kind === "gameOver") {
      const st = game.gameOver ?? createGameOverState(layout.playArea);
      game.gameOver = st;
      const res = updateGameOver({
        ctx,
        playArea: layout.playArea,
        state: st,
        dt,
        pointer,
      });
      if (res === "ok") game.kind = "playAgain";
      drawGameOver({ ctx, playArea: layout.playArea, state: st });

      // Persistent HUD
      drawFishboneCounters(ctx, layout.playArea, game.stats.fishEaten);
      drawScore(ctx, layout.playArea, game.stats.score);
    } else if (game.kind === "playAgain") {
      const res = updatePlayAgain({
        ctx,
        playArea: layout.playArea,
        state: game.playAgain,
        pointer,
      });
      if (res === "playAgain") {
        game.world = newGame(layout);
        game.stats = { fishEaten: 0, score: 0 };
        game.gameOver = null;
        game.kind = "play";
      }
      drawPlayAgain({ ctx, playArea: layout.playArea, state: game.playAgain });
      drawFishboneCounters(ctx, layout.playArea, game.stats.fishEaten);
      drawScore(ctx, layout.playArea, game.stats.score);
    }

    // reset per-frame input edges
    pointer.justReleased = false;

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);

  window.addEventListener("beforeunload", () => {
    disposeInput();
  });
}

main();
