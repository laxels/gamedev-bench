import { COLORS } from "../colors";
import type { Rect } from "../geom";
import {
  type Button,
  clickButton,
  drawButton,
  measureTextBox,
  updateButtonsHover,
} from "../ui";

export type MenuResult = "play" | "instructions" | null;

export type MenuState = {
  t: number;
  buttons: Button[];
  title: string;
};

export function createMenuState(): MenuState {
  return { t: 0, buttons: [], title: "!FISHY!" };
}

function layoutButtons(
  ctx: CanvasRenderingContext2D,
  playArea: Rect,
  state: MenuState,
): void {
  const labels = [
    { id: "play", label: "PLAY", fontPx: 52 },
    { id: "instructions", label: "INSTRUCTIONS", fontPx: 48 },
  ] as const;

  const centerX = playArea.x + playArea.w / 2;
  const startY = playArea.y + playArea.h * 0.54;
  const gap = 68;

  state.buttons = labels.map((b, i) => {
    const box = measureTextBox(ctx, b.label, b.fontPx);
    const center = { x: centerX, y: startY + i * gap };
    return {
      id: b.id,
      label: b.label,
      rect: {
        x: center.x - box.w / 2,
        y: center.y - box.h / 2,
        w: box.w,
        h: box.h,
      },
      center,
      fontPx: b.fontPx,
      hovered: false,
    };
  });
}

export function updateMenu(params: {
  ctx: CanvasRenderingContext2D;
  playArea: Rect;
  state: MenuState;
  dt: number;
  pointer: import("../ui").Pointer;
}): MenuResult {
  const { ctx, playArea, state, dt, pointer } = params;
  state.t += dt;

  layoutButtons(ctx, playArea, state);
  updateButtonsHover(pointer, state.buttons);
  const clicked = clickButton(pointer, state.buttons);
  if (clicked === "play") return "play";
  if (clicked === "instructions") return "instructions";
  return null;
}

export function drawMenu(params: {
  ctx: CanvasRenderingContext2D;
  playArea: Rect;
  state: MenuState;
}): void {
  const { ctx, playArea, state } = params;
  ctx.save();

  const titleY = playArea.y + playArea.h * 0.18;
  const titleX = playArea.x + playArea.w / 2;

  const text = state.title;
  ctx.font = `140px "Comic Sans MS", "Comic Sans", cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.seaText;
  ctx.shadowColor = COLORS.seaTextShadow;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 6;
  ctx.shadowBlur = 0;

  // Each character bounces independently.
  const totalWidth = ctx.measureText(text).width;
  let x = titleX - totalWidth / 2;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? "";
    const w = ctx.measureText(ch).width;
    const phase = i * 0.65;
    const bounce = Math.sin(state.t * 3.2 + phase) * 10;
    ctx.fillText(ch, x + w / 2, titleY + bounce);
    x += w;
  }

  for (const b of state.buttons) drawButton(ctx, b);

  ctx.restore();
}
