import { COLORS } from "./colors";
import type { Rect } from "./geom";
import { clamp } from "./geom";

export type Pointer = {
  x: number;
  y: number;
  isDown: boolean;
  justReleased: boolean;
};

export type Button = {
  id: string;
  label: string;
  rect: Rect;
  center: { x: number; y: number };
  fontPx: number;
  hovered: boolean;
};

export function newPointer(): Pointer {
  return { x: 0, y: 0, isDown: false, justReleased: false };
}

export function pointerInRect(p: Pointer, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function updateButtonsHover(pointer: Pointer, buttons: Button[]): void {
  for (const b of buttons) b.hovered = pointerInRect(pointer, b.rect);
}

export function clickButton(
  pointer: Pointer,
  buttons: Button[],
): string | null {
  if (!pointer.justReleased) return null;
  for (const b of buttons) {
    if (b.hovered) return b.id;
  }
  return null;
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  button: Button,
): void {
  const scale = button.hovered ? 1.18 : 1;
  ctx.save();
  ctx.translate(button.center.x, button.center.y);
  ctx.scale(scale, scale);
  ctx.translate(-button.center.x, -button.center.y);

  ctx.font = `${button.fontPx}px "Comic Sans MS", "Comic Sans", cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.seaText;
  ctx.shadowColor = COLORS.seaTextShadow;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText(button.label, button.center.x, button.center.y);
  ctx.restore();
}

export function measureTextBox(
  ctx: CanvasRenderingContext2D,
  label: string,
  fontPx: number,
): { w: number; h: number } {
  ctx.save();
  ctx.font = `${fontPx}px "Comic Sans MS", "Comic Sans", cursive`;
  const m = ctx.measureText(label);
  // A forgiving height so hover is easy on canvas.
  const h = fontPx * 1.25;
  ctx.restore();
  return { w: clamp(m.width, 1, 10_000), h };
}
