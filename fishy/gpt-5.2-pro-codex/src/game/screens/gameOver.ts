import { COLORS } from "../colors";
import type { Rect } from "../geom";
import { drawGhostFish } from "../render/fish";
import { drawCenteredText } from "../render/hud";
import {
  type Button,
  clickButton,
  drawButton,
  measureTextBox,
  updateButtonsHover,
} from "../ui";

export type GameOverResult = "ok" | null;

export type GameOverState = {
  ghostY: number;
  ghostStopped: boolean;
  buttons: Button[];
};

export function createGameOverState(playArea: Rect): GameOverState {
  return {
    ghostY: playArea.y + playArea.h * 0.72,
    ghostStopped: false,
    buttons: [],
  };
}

function layout(
  ctx: CanvasRenderingContext2D,
  playArea: Rect,
  state: GameOverState,
): void {
  const fontPx = 44;
  const label = "OK";
  const box = measureTextBox(ctx, label, fontPx);
  const center = {
    x: playArea.x + playArea.w / 2,
    y: playArea.y + playArea.h * 0.58,
  };
  state.buttons = [
    {
      id: "ok",
      label,
      rect: {
        x: center.x - box.w / 2,
        y: center.y - box.h / 2,
        w: box.w,
        h: box.h,
      },
      center,
      fontPx,
      hovered: false,
    },
  ];
}

export function updateGameOver(params: {
  ctx: CanvasRenderingContext2D;
  playArea: Rect;
  state: GameOverState;
  dt: number;
  pointer: import("../ui").Pointer;
}): GameOverResult {
  const { ctx, playArea, state, dt, pointer } = params;
  layout(ctx, playArea, state);
  updateButtonsHover(pointer, state.buttons);

  const stopY = playArea.y + playArea.h * 0.23;
  if (!state.ghostStopped) {
    state.ghostY -= dt * 110;
    if (state.ghostY <= stopY) {
      state.ghostY = stopY;
      state.ghostStopped = true;
    }
  }

  return clickButton(pointer, state.buttons) === "ok" ? "ok" : null;
}

export function drawGameOver(params: {
  ctx: CanvasRenderingContext2D;
  playArea: Rect;
  state: GameOverState;
}): void {
  const { ctx, playArea, state } = params;
  ctx.save();

  // Large "GULP!!!"
  ctx.font = `132px "Comic Sans MS", "Comic Sans", cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.seaText;
  ctx.shadowColor = COLORS.seaTextShadow;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 6;
  ctx.shadowBlur = 0;
  ctx.fillText(
    "GULP!!!",
    playArea.x + playArea.w / 2,
    playArea.y + playArea.h * 0.38,
  );

  for (const b of state.buttons) drawButton(ctx, b);

  // Ghost fish moving upward.
  drawGhostFish(ctx, playArea.x + playArea.w / 2, state.ghostY, 88, 34);

  // Subtle highlight above title like screenshot
  drawCenteredText(
    ctx,
    playArea.x + playArea.w / 2,
    playArea.y + playArea.h * 0.13,
    "",
    1,
  );

  ctx.restore();
}
