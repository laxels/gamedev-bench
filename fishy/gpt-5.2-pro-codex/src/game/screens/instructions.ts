import { COLORS } from "../colors";
import type { Rect } from "../geom";
import {
  type Button,
  clickButton,
  drawButton,
  measureTextBox,
  updateButtonsHover,
} from "../ui";

export type InstructionsResult = "back" | null;

export type InstructionsState = {
  buttons: Button[];
};

export function createInstructionsState(): InstructionsState {
  return { buttons: [] };
}

function layout(
  ctx: CanvasRenderingContext2D,
  playArea: Rect,
  state: InstructionsState,
): void {
  const fontPx = 46;
  const label = "BACK";
  const box = measureTextBox(ctx, label, fontPx);
  const center = {
    x: playArea.x + playArea.w / 2,
    y: playArea.y + playArea.h - 52,
  };
  state.buttons = [
    {
      id: "back",
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

export function updateInstructions(params: {
  ctx: CanvasRenderingContext2D;
  playArea: Rect;
  state: InstructionsState;
  pointer: import("../ui").Pointer;
}): InstructionsResult {
  const { ctx, playArea, state, pointer } = params;
  layout(ctx, playArea, state);
  updateButtonsHover(pointer, state.buttons);
  return clickButton(pointer, state.buttons) === "back" ? "back" : null;
}

function textLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fontPx: number,
  text: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${fontPx}px "Comic Sans MS", "Comic Sans", cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.seaText;
  ctx.shadowColor = COLORS.seaTextShadow;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 0;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    ctx.fillText(line, x, y + (i - (lines.length - 1) / 2) * (fontPx * 1.05));
  }
  ctx.restore();
}

function drawArrowKey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
): void {
  const size = 54;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.strokeStyle = "rgba(80,80,80,0.6)";
  ctx.lineWidth = 3;
  roundRect(ctx, -size / 2, -size / 2, size, size, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(50,50,50,0.75)";
  ctx.font = `46px "Comic Sans MS", "Comic Sans", cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 2);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawInstructions(params: {
  ctx: CanvasRenderingContext2D;
  playArea: Rect;
  state: InstructionsState;
}): void {
  const { ctx, playArea, state } = params;
  ctx.save();

  const cx = playArea.x + playArea.w / 2;
  textLine(ctx, cx, playArea.y + 78, 40, "Eat smaller fish to grow bigger!", 1);
  textLine(ctx, cx, playArea.y + 210, 44, "Don't get eaten by bigger fish!", 1);
  textLine(
    ctx,
    cx,
    playArea.y + 398,
    44,
    "Use the arrow keys to control movement",
    1,
  );

  // Arrow keys cluster (simple replica).
  const kx = cx;
  const ky = playArea.y + 530;
  drawArrowKey(ctx, kx, ky - 60, "↑");
  drawArrowKey(ctx, kx - 60, ky, "←");
  drawArrowKey(ctx, kx, ky, "↓");
  drawArrowKey(ctx, kx + 60, ky, "→");

  textLine(
    ctx,
    cx,
    playArea.y + playArea.h * 0.78,
    50,
    "The bigger the fish, the more you will grow,\nand the more points you will recieve!",
    0.65,
  );

  for (const b of state.buttons) drawButton(ctx, b);

  ctx.restore();
}
