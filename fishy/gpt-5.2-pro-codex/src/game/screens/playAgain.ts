import type { Rect } from "../geom";
import {
  type Button,
  clickButton,
  drawButton,
  measureTextBox,
  updateButtonsHover,
} from "../ui";

export type PlayAgainResult = "playAgain" | null;

export type PlayAgainState = {
  buttons: Button[];
};

export function createPlayAgainState(): PlayAgainState {
  return { buttons: [] };
}

function layout(
  ctx: CanvasRenderingContext2D,
  playArea: Rect,
  state: PlayAgainState,
): void {
  const fontPx = 52;
  const label = "PLAY AGAIN";
  const box = measureTextBox(ctx, label, fontPx);
  const center = {
    x: playArea.x + playArea.w / 2,
    y: playArea.y + playArea.h * 0.52,
  };
  state.buttons = [
    {
      id: "playAgain",
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

export function updatePlayAgain(params: {
  ctx: CanvasRenderingContext2D;
  playArea: Rect;
  state: PlayAgainState;
  pointer: import("../ui").Pointer;
}): PlayAgainResult {
  const { ctx, playArea, state, pointer } = params;
  layout(ctx, playArea, state);
  updateButtonsHover(pointer, state.buttons);
  return clickButton(pointer, state.buttons) === "playAgain"
    ? "playAgain"
    : null;
}

export function drawPlayAgain(params: {
  ctx: CanvasRenderingContext2D;
  playArea: Rect;
  state: PlayAgainState;
}): void {
  const { ctx, state } = params;
  ctx.save();
  for (const b of state.buttons) drawButton(ctx, b);
  ctx.restore();
}
