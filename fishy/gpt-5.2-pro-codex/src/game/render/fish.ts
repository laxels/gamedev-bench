import { COLORS } from "../colors";
import type { Bubble, NpcFish, Player } from "../world/entities";

function shade(hue: number, s: number, l: number, a = 1): string {
  return `hsla(${hue} ${s}% ${l}% / ${a})`;
}

export function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, b.life / 2.0));
  ctx.fillStyle = COLORS.bubble;
  ctx.strokeStyle = COLORS.bubbleStroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFishBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  facing: -1 | 1,
  hue: number,
  swimT: number,
  eyeScale: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  const tailW = w * 0.28;
  const bodyW = w - tailW;
  const bodyH = h;

  const wave = Math.sin(swimT * Math.PI * 2) * 0.12;

  const bodyGrad = ctx.createLinearGradient(
    -bodyW * 0.4,
    -bodyH,
    bodyW * 0.6,
    bodyH,
  );
  bodyGrad.addColorStop(0, shade(hue, 55, 78));
  bodyGrad.addColorStop(1, shade(hue, 65, 58));

  // Body (rounded capsule-ish).
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyW * 0.5, bodyH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail.
  ctx.fillStyle = shade(hue, 55, 70);
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.5, 0);
  ctx.quadraticCurveTo(
    -bodyW * 0.5 - tailW * 0.35,
    -bodyH * 0.32,
    -bodyW * 0.5 - tailW,
    -bodyH * 0.05,
  );
  ctx.quadraticCurveTo(
    -bodyW * 0.5 - tailW * 0.25,
    0,
    -bodyW * 0.5 - tailW,
    bodyH * 0.05,
  );
  ctx.quadraticCurveTo(
    -bodyW * 0.5 - tailW * 0.35,
    bodyH * 0.32,
    -bodyW * 0.5,
    0,
  );
  ctx.closePath();
  ctx.fill();

  // Fin (animated slightly).
  ctx.save();
  ctx.translate(bodyW * 0.02, bodyH * 0.15);
  ctx.rotate(wave);
  ctx.fillStyle = shade(hue, 45, 64, 0.9);
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.06, 0);
  ctx.quadraticCurveTo(bodyW * 0.12, -bodyH * 0.22, bodyW * 0.22, 0);
  ctx.quadraticCurveTo(bodyW * 0.1, bodyH * 0.18, -bodyW * 0.06, 0);
  ctx.fill();
  ctx.restore();

  // Gills.
  ctx.strokeStyle = shade(hue, 30, 40, 0.45);
  ctx.lineWidth = Math.max(1, h * 0.06);
  for (let i = 0; i < 3; i++) {
    const gx = bodyW * 0.16 + i * bodyW * 0.07;
    ctx.beginPath();
    ctx.arc(gx, 0, bodyH * 0.22, -0.9, 0.9);
    ctx.stroke();
  }

  // Mouth (small V at front).
  ctx.strokeStyle = shade(hue, 55, 30, 0.45);
  ctx.lineWidth = Math.max(1, h * 0.05);
  ctx.beginPath();
  ctx.moveTo(bodyW * 0.52, -bodyH * 0.06);
  ctx.lineTo(bodyW * 0.56, 0);
  ctx.lineTo(bodyW * 0.52, bodyH * 0.06);
  ctx.stroke();

  // Eye.
  const ex = bodyW * 0.28;
  const ey = -bodyH * 0.18;
  const er = Math.max(2.2, bodyH * 0.12) * eyeScale;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(ex + er * 0.16, ey + er * 0.08, er * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ex + er * 0.26, ey - er * 0.15, er * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawNpcFish(
  ctx: CanvasRenderingContext2D,
  fish: NpcFish,
  t: number,
): void {
  const swimT = t * 2.2 + fish.id * 0.13;
  drawFishBody(
    ctx,
    fish.x,
    fish.y,
    fish.w,
    fish.h,
    fish.facing,
    fish.hue,
    swimT,
    1,
  );
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  isSwimming: boolean,
  t: number,
): void {
  const swimT = isSwimming ? t * 3.6 : 0;
  const pulse = player.eatPulse;
  ctx.save();
  ctx.translate(player.x, player.y);
  const s = 1 + pulse * 0.06;
  ctx.scale(s, s);
  ctx.translate(-player.x, -player.y);
  drawFishBody(
    ctx,
    player.x,
    player.y,
    player.w,
    player.h,
    player.facing,
    28,
    swimT,
    1.06,
  );
  ctx.restore();
}

export function drawGhostFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.62;
  drawFishBody(ctx, x, y, w, h, 1, 205, 0, 0.9);
  ctx.restore();
}
