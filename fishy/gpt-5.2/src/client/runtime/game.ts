import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "./constants";
import {
  clear,
  drawBackdrop,
  drawCenteredButtonText,
  drawDemoFish,
  drawFishbones,
  drawForeground,
  drawFullBackground,
  drawGhostFish,
  drawMenuTitle,
  drawRun,
  drawScore,
  measureCenteredText,
} from "./draw";
import {
  computeIntent,
  handleCollisions,
  newRunState,
  type RunState,
  updateRun,
} from "./entities";
import { createKeyboardInput } from "./input";
import { clamp } from "./math";
import { createPointer } from "./pointer";

type GameDeps = Readonly<{
  canvas: HTMLCanvasElement;
  root: HTMLElement;
  fullscreenButton: HTMLButtonElement;
}>;

type Screen =
  | { kind: "menu" }
  | { kind: "instructions" }
  | { kind: "play"; run: RunState }
  | { kind: "gameOver"; run: RunState; ghostY: number; ghostTargetY: number }
  | { kind: "playAgain"; run: RunState };

type Button = {
  id: string;
  label: string;
  x: number;
  y: number;
  fontSize: number;
  onClick: () => void;
};

export function createGame({ canvas, root, fullscreenButton }: GameDeps) {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Unable to get 2D context");
  const ctx = maybeCtx;

  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

  function layout() {
    const scale = Math.min(
      window.innerWidth / GAME_WIDTH,
      window.innerHeight / GAME_HEIGHT,
    );
    const cssW = Math.floor(GAME_WIDTH * scale);
    const cssH = Math.floor(GAME_HEIGHT * scale);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
  }

  layout();
  window.addEventListener("resize", layout);

  ctx.imageSmoothingEnabled = true;

  const kb = createKeyboardInput();
  const detachKeyboard = kb.attach(window);

  const {
    pointer,
    consumeClick,
    detach: detachPointer,
  } = createPointer(canvas, { w: GAME_WIDTH, h: GAME_HEIGHT });

  let hoveredButtonId: string | null = null;
  let screen: Screen = { kind: "menu" };

  function startNewGame() {
    screen = { kind: "play", run: newRunState() };
  }

  function toggleFullscreen() {
    const doc = document as Document & { fullscreenElement?: Element | null };
    if (doc.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void root.requestFullscreen();
  }

  fullscreenButton.addEventListener("click", toggleFullscreen);

  function buttonsForScreen(): Button[] {
    switch (screen.kind) {
      case "menu":
        return [
          {
            id: "play",
            label: "PLAY",
            x: GAME_WIDTH / 2,
            y: 340,
            fontSize: 54,
            onClick: startNewGame,
          },
          {
            id: "instructions",
            label: "INSTRUCTIONS",
            x: GAME_WIDTH / 2,
            y: 416,
            fontSize: 54,
            onClick: () => {
              screen = { kind: "instructions" };
            },
          },
        ];
      case "instructions":
        return [
          {
            id: "back",
            label: "BACK",
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT - 42,
            fontSize: 58,
            onClick: () => {
              screen = { kind: "menu" };
            },
          },
        ];
      case "gameOver": {
        const run = screen.run;
        return [
          {
            id: "ok",
            label: "OK",
            x: GAME_WIDTH / 2,
            y: 470,
            fontSize: 62,
            onClick: () => {
              screen = { kind: "playAgain", run };
            },
          },
        ];
      }
      case "playAgain":
        return [
          {
            id: "playAgain",
            label: "PLAY AGAIN",
            x: GAME_WIDTH / 2,
            y: 330,
            fontSize: 66,
            onClick: startNewGame,
          },
        ];
      case "play":
        return [];
    }
  }

  function updateHover(buttons: Button[]) {
    hoveredButtonId = null;
    if (!pointer.inside) {
      canvas.style.cursor = "default";
      return;
    }
    for (const b of buttons) {
      const rect = measureCenteredText(ctx, b.label, b.x, b.y, b.fontSize);
      if (
        pointer.x >= rect.x &&
        pointer.x <= rect.x + rect.w &&
        pointer.y >= rect.y &&
        pointer.y <= rect.y + rect.h
      ) {
        hoveredButtonId = b.id;
        break;
      }
    }
    canvas.style.cursor = hoveredButtonId ? "pointer" : "default";
  }

  function handleClicks(buttons: Button[]) {
    if (!consumeClick()) return;
    if (!pointer.inside) return;
    for (const b of buttons) {
      const rect = measureCenteredText(ctx, b.label, b.x, b.y, b.fontSize);
      if (
        pointer.x >= rect.x &&
        pointer.x <= rect.x + rect.w &&
        pointer.y >= rect.y &&
        pointer.y <= rect.y + rect.h
      ) {
        b.onClick();
        break;
      }
    }
  }

  let last = performance.now();
  let time = 0;

  function frame(now: number) {
    const dt = clamp((now - last) / 1000, 0, 1 / 15);
    last = now;
    time += dt;

    const buttons = buttonsForScreen();
    updateHover(buttons);
    handleClicks(buttons);

    const input = kb.get();

    if (screen.kind === "play") {
      const intent = computeIntent(input.keys);
      updateRun(screen.run, dt, intent);
      const hit = handleCollisions(screen.run);
      if (hit === "died") {
        // Move into game over.
        const ghostStartY = 520;
        const ghostTargetY = 150;
        screen = {
          kind: "gameOver",
          run: screen.run,
          ghostY: ghostStartY,
          ghostTargetY,
        };
      }
    } else if (screen.kind === "gameOver") {
      const speed = 210;
      screen.ghostY = Math.max(screen.ghostTargetY, screen.ghostY - speed * dt);
    }

    render(buttons, input.anyMovementKey);
    requestAnimationFrame(frame);
  }

  function render(buttons: Button[], anyMovementKey: boolean) {
    clear(ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    switch (screen.kind) {
      case "menu": {
        drawFullBackground(ctx, time);
        drawMenuTitle(ctx, time);
        for (const b of buttons)
          drawCenteredButtonText(
            ctx,
            b.label,
            b.x,
            b.y,
            b.fontSize,
            hoveredButtonId === b.id,
          );
        break;
      }
      case "instructions": {
        drawFullBackground(ctx, time);
        drawInstructions(ctx, time);
        for (const b of buttons)
          drawCenteredButtonText(
            ctx,
            b.label,
            b.x,
            b.y,
            b.fontSize,
            hoveredButtonId === b.id,
          );
        break;
      }
      case "play": {
        drawBackdrop(ctx, time);
        drawScore(ctx, screen.run.score);
        drawFishbones(ctx, screen.run.eaten);
        drawRun(ctx, screen.run, time, anyMovementKey);
        drawForeground(ctx, time);
        break;
      }
      case "gameOver": {
        drawFullBackground(ctx, time);
        drawScore(ctx, screen.run.score);
        drawFishbones(ctx, screen.run.eaten);
        drawGameOver(ctx, time, screen.ghostY);
        for (const b of buttons)
          drawCenteredButtonText(
            ctx,
            b.label,
            b.x,
            b.y,
            b.fontSize,
            hoveredButtonId === b.id,
          );
        break;
      }
      case "playAgain": {
        drawFullBackground(ctx, time);
        drawScore(ctx, screen.run.score);
        drawFishbones(ctx, screen.run.eaten);
        for (const b of buttons)
          drawCenteredButtonText(
            ctx,
            b.label,
            b.x,
            b.y,
            b.fontSize,
            hoveredButtonId === b.id,
          );
        break;
      }
    }
  }

  function drawGameOver(
    ctx2: CanvasRenderingContext2D,
    t: number,
    ghostY: number,
  ) {
    ctx2.save();
    ctx2.fillStyle = COLORS.ui;
    ctx2.font = `140px "Comic Sans MS", "Comic Sans", sans-serif`;
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.shadowColor = "rgba(0,0,0,0.15)";
    ctx2.shadowBlur = 2;
    ctx2.fillText("GULP!!!", GAME_WIDTH / 2, 250);
    ctx2.restore();

    drawGhostFish(ctx2, GAME_WIDTH / 2, ghostY, 76, t);
  }

  function drawInstructions(ctx2: CanvasRenderingContext2D, t: number) {
    ctx2.save();
    ctx2.fillStyle = COLORS.ui;
    ctx2.font = `46px "Comic Sans MS", "Comic Sans", sans-serif`;
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";

    ctx2.fillText("Eat smaller fish to grow bigger!", GAME_WIDTH / 2, 92);
    ctx2.fillText("Don't get eaten by bigger fish!", GAME_WIDTH / 2, 215);
    ctx2.fillText(
      "Use the arrow keys to control movement",
      GAME_WIDTH / 2,
      355,
    );

    // Example fish pairs (simple).
    ctx2.globalAlpha = 0.9;
    ctx2.restore();

    // Fish examples.
    drawDemoFish(ctx2, GAME_WIDTH / 2 - 46, 135, 60, 1, 22, t);
    drawDemoFish(ctx2, GAME_WIDTH / 2 + 62, 135, 32, 1, 150, t * 1.2);

    drawDemoFish(ctx2, GAME_WIDTH / 2 - 60, 260, 110, 1, 120, t * 0.9);
    drawDemoFish(ctx2, GAME_WIDTH / 2 + 96, 260, 60, 1, 22, t * 1.1);

    drawArrowKeys(ctx2, GAME_WIDTH / 2, 432);

    ctx2.save();
    ctx2.fillStyle = COLORS.uiLight;
    ctx2.font = `54px "Comic Sans MS", "Comic Sans", sans-serif`;
    ctx2.textAlign = "center";
    ctx2.textBaseline = "top";
    ctx2.fillText(
      "The bigger the fish, the more you will grow,",
      GAME_WIDTH / 2,
      525,
    );
    ctx2.fillText("and the more points you will recieve!", GAME_WIDTH / 2, 585);
    ctx2.restore();
  }

  function drawArrowKeys(ctx2: CanvasRenderingContext2D, x: number, y: number) {
    const keyW = 60;
    const keyH = 56;
    const gap = 10;

    const keyColor = "rgba(255,255,255,0.75)";
    const stroke = "rgba(0,0,0,0.18)";
    const glyph = "rgba(60,60,60,0.75)";

    function key(
      cx: number,
      cy: number,
      dir: "up" | "down" | "left" | "right",
    ) {
      const rx = cx - keyW / 2;
      const ry = cy - keyH / 2;
      ctx2.save();
      ctx2.fillStyle = keyColor;
      ctx2.strokeStyle = stroke;
      ctx2.lineWidth = 3;
      roundRect(ctx2, rx, ry, keyW, keyH, 10);
      ctx2.fill();
      ctx2.stroke();

      ctx2.fillStyle = glyph;
      ctx2.beginPath();
      const s = 12;
      if (dir === "up") {
        ctx2.moveTo(cx, cy - s);
        ctx2.lineTo(cx - s, cy + s);
        ctx2.lineTo(cx + s, cy + s);
      } else if (dir === "down") {
        ctx2.moveTo(cx, cy + s);
        ctx2.lineTo(cx - s, cy - s);
        ctx2.lineTo(cx + s, cy - s);
      } else if (dir === "left") {
        ctx2.moveTo(cx - s, cy);
        ctx2.lineTo(cx + s, cy - s);
        ctx2.lineTo(cx + s, cy + s);
      } else {
        ctx2.moveTo(cx + s, cy);
        ctx2.lineTo(cx - s, cy - s);
        ctx2.lineTo(cx - s, cy + s);
      }
      ctx2.closePath();
      ctx2.fill();

      ctx2.restore();
    }

    key(x, y - (keyH + gap) / 2, "up");
    key(x, y + (keyH + gap) / 2, "down");
    key(x - (keyW + gap), y + (keyH + gap) / 2, "left");
    key(x + (keyW + gap), y + (keyH + gap) / 2, "right");
  }

  function roundRect(
    ctx2: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx2.beginPath();
    ctx2.moveTo(x + radius, y);
    ctx2.arcTo(x + w, y, x + w, y + h, radius);
    ctx2.arcTo(x + w, y + h, x, y + h, radius);
    ctx2.arcTo(x, y + h, x, y, radius);
    ctx2.arcTo(x, y, x + w, y, radius);
    ctx2.closePath();
  }

  return {
    start() {
      requestAnimationFrame(frame);
    },
    destroy() {
      detachKeyboard();
      detachPointer();
      fullscreenButton.removeEventListener("click", toggleFullscreen);
      window.removeEventListener("resize", layout);
    },
  };
}
