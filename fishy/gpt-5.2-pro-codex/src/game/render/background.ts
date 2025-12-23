import { COLORS } from "../colors";
import type { Rect } from "../geom";

function drawWater(ctx: CanvasRenderingContext2D, area: Rect): void {
  const g = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
  g.addColorStop(0, COLORS.waterTop);
  g.addColorStop(1, COLORS.waterBottom);
  ctx.fillStyle = g;
  ctx.fillRect(area.x, area.y, area.w, area.h);
}

function drawBorder(ctx: CanvasRenderingContext2D, area: Rect): void {
  ctx.save();
  ctx.strokeStyle = COLORS.borderMagenta;
  ctx.lineWidth = 4;
  ctx.strokeRect(area.x + 2, area.y + 2, area.w - 4, area.h - 4);
  ctx.restore();
}

function drawSand(ctx: CanvasRenderingContext2D, area: Rect): void {
  const sandH = Math.max(110, area.h * 0.16);
  const y0 = area.y + area.h - sandH;
  const baseY = area.y + area.h;

  const g = ctx.createLinearGradient(0, y0, 0, baseY);
  g.addColorStop(0, COLORS.sandTop);
  g.addColorStop(1, COLORS.sandBottom);
  ctx.fillStyle = g;

  ctx.beginPath();
  ctx.moveTo(area.x, baseY);

  const segments = 6;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = area.x + t * area.w;
    const wave =
      Math.sin(t * Math.PI * 2.2) * 26 + Math.sin(t * Math.PI * 4.6 + 0.9) * 14;
    const y = y0 + sandH * 0.45 + wave;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(area.x + area.w, baseY);
  ctx.closePath();
  ctx.fill();
}

function drawSeaweed(ctx: CanvasRenderingContext2D, area: Rect): void {
  ctx.save();
  const sandH = Math.max(110, area.h * 0.16);
  const bottom = area.y + area.h;
  const base = bottom - sandH * 0.15;

  const stalks = [
    { x: area.x + area.w * 0.08, h: 220, w: 12, a: -0.9 },
    { x: area.x + area.w * 0.22, h: 320, w: 18, a: 0.5 },
    { x: area.x + area.w * 0.42, h: 200, w: 10, a: -0.3 },
    { x: area.x + area.w * 0.63, h: 240, w: 11, a: 0.8 },
    { x: area.x + area.w * 0.82, h: 260, w: 16, a: -0.4 },
  ];

  for (const s of stalks) {
    ctx.lineWidth = s.w;
    ctx.strokeStyle = COLORS.seaweed;
    ctx.beginPath();
    ctx.moveTo(s.x, base);
    const c1x = s.x + Math.sin(s.a) * 28;
    const c1y = base - s.h * 0.35;
    const c2x = s.x + Math.sin(s.a + 0.8) * 45;
    const c2y = base - s.h * 0.7;
    const endx = s.x + Math.sin(s.a + 1.4) * 55;
    const endy = base - s.h;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endx, endy);
    ctx.stroke();

    // Inner darker line for depth.
    ctx.lineWidth = Math.max(2, s.w * 0.28);
    ctx.strokeStyle = COLORS.seaweedDark;
    ctx.beginPath();
    ctx.moveTo(s.x, base);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endx, endy);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  playArea: Rect,
): void {
  drawWater(ctx, playArea);
  drawSeaweed(ctx, playArea);
  drawSand(ctx, playArea);
  drawBorder(ctx, playArea);
}
