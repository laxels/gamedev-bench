import { COLORS } from "../colors";
import type { Rect } from "../geom";
import { clamp } from "../geom";

export function drawScore(
  ctx: CanvasRenderingContext2D,
  playArea: Rect,
  score: number,
): void {
  ctx.save();
  ctx.font = `52px "Comic Sans MS", "Comic Sans", cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.seaText;
  ctx.shadowColor = COLORS.seaTextShadow;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 0;
  ctx.fillText(String(score), playArea.x + playArea.w / 2, playArea.y + 18);
  ctx.restore();
}

function drawFishbone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  const w = 70;
  const h = 22;
  const left = x;
  const top = y;
  const midY = top + h / 2;
  const right = left + w;

  // Spine
  ctx.beginPath();
  ctx.moveTo(left, midY);
  ctx.lineTo(right, midY);
  ctx.stroke();

  // Ribs
  const ribs = 5;
  for (let i = 0; i < ribs; i++) {
    const t = (i + 0.6) / (ribs + 0.5);
    const rx = left + t * w;
    const len = (1 - Math.abs(0.5 - t) * 1.3) * h * 0.9;
    ctx.beginPath();
    ctx.moveTo(rx, midY);
    ctx.lineTo(rx - 10, midY - len);
    ctx.moveTo(rx, midY);
    ctx.lineTo(rx - 10, midY + len);
    ctx.stroke();
  }

  // Head
  ctx.beginPath();
  ctx.arc(left - 6, midY, 10, -0.7, 0.7);
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(right, midY);
  ctx.lineTo(right + 18, midY - 10);
  ctx.moveTo(right, midY);
  ctx.lineTo(right + 18, midY + 10);
  ctx.stroke();

  ctx.restore();
}

export function drawFishboneCounters(
  ctx: CanvasRenderingContext2D,
  playArea: Rect,
  totalFishEaten: number,
): void {
  const level1 = totalFishEaten % 5;
  const level2 = Math.floor(totalFishEaten / 5) % 5;
  const level3 = Math.floor(totalFishEaten / 25);

  ctx.save();
  const baseX = playArea.x + 22;
  const baseY = playArea.y + 24;

  // Level 3 (largest) stacks upward slightly.
  for (let i = 0; i < level3; i++) {
    const x = baseX + i * 78;
    drawFishbone(ctx, x, baseY, 1.0);
  }

  // Level 2
  for (let i = 0; i < level2; i++) {
    const x = baseX + i * 58;
    drawFishbone(ctx, x, baseY + 50, 0.78);
  }

  // Level 1
  for (let i = 0; i < level1; i++) {
    const x = baseX + i * 44;
    drawFishbone(ctx, x, baseY + 84, 0.6);
  }

  ctx.restore();
}

export function drawFullscreenIcon(
  ctx: CanvasRenderingContext2D,
  playArea: Rect,
  hovered: boolean,
): { rect: Rect } {
  const size = hovered ? 28 : 24;
  const pad = 16;
  const x = playArea.x + playArea.w - pad - size;
  const y = playArea.y + pad;
  const rect = { x, y, w: size, h: size };

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const k = size * 0.35;

  // Top-right corner arrow.
  ctx.beginPath();
  ctx.moveTo(x + size - k, y + k);
  ctx.lineTo(x + size - k, y);
  ctx.lineTo(x + size, y);
  ctx.stroke();

  // Bottom-left corner arrow.
  ctx.beginPath();
  ctx.moveTo(x + k, y + size - k);
  ctx.lineTo(x + k, y + size);
  ctx.lineTo(x, y + size);
  ctx.stroke();

  ctx.restore();
  return { rect };
}

export function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontPx: number,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.font = `${fontPx}px "Comic Sans MS", "Comic Sans", cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.seaText;
  ctx.shadowColor = COLORS.seaTextShadow;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 0;
  ctx.fillText(text, x, y);
  ctx.restore();
}
