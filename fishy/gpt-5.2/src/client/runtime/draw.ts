import { COLORS, GAME_HEIGHT, GAME_WIDTH, SAND_HEIGHT } from "./constants";
import type { Bubble, NPCFish, Player, RunState } from "./entities";
import { clamp, easeOutCubic, lerp } from "./math";

export function clear(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  g.addColorStop(0, "#b9dcff");
  g.addColorStop(0.75, "#5b87c8");
  g.addColorStop(1, "#3e6db3");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Soft vignette.
  const vg = ctx.createRadialGradient(
    GAME_WIDTH * 0.5,
    GAME_HEIGHT * 0.55,
    50,
    GAME_WIDTH * 0.5,
    GAME_HEIGHT * 0.55,
    GAME_WIDTH * 0.8,
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // A faint layer of seaweed behind fish.
  drawSeaweedBack(ctx, t);
}

export function drawForeground(ctx: CanvasRenderingContext2D, t: number) {
  drawSeaweedFront(ctx, t);
  drawSand(ctx);

  // Border
  ctx.save();
  ctx.strokeStyle = COLORS.borderDark;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, GAME_WIDTH - 6, GAME_HEIGHT - 6);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);
  ctx.restore();
}

export function drawFullBackground(ctx: CanvasRenderingContext2D, t: number) {
  drawBackdrop(ctx, t);
  drawForeground(ctx, t);
}

function drawSand(ctx: CanvasRenderingContext2D) {
  const topY = GAME_HEIGHT - SAND_HEIGHT;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, GAME_HEIGHT);
  ctx.lineTo(0, topY + 38);
  ctx.bezierCurveTo(
    GAME_WIDTH * 0.15,
    topY + 10,
    GAME_WIDTH * 0.22,
    topY + 70,
    GAME_WIDTH * 0.38,
    topY + 40,
  );
  ctx.bezierCurveTo(
    GAME_WIDTH * 0.55,
    topY + 10,
    GAME_WIDTH * 0.65,
    topY + 78,
    GAME_WIDTH * 0.78,
    topY + 52,
  );
  ctx.bezierCurveTo(
    GAME_WIDTH * 0.9,
    topY + 32,
    GAME_WIDTH * 0.95,
    topY + 70,
    GAME_WIDTH,
    topY + 56,
  );
  ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
  ctx.closePath();

  ctx.fillStyle = COLORS.sand;
  ctx.fill();
  ctx.strokeStyle = COLORS.sandStroke;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function drawSeaweed(ctx: CanvasRenderingContext2D, t: number) {
  const stems = SEAWEED_FRONT;

  const baseY = GAME_HEIGHT - SAND_HEIGHT + 34;
  for (const s of stems) {
    const sway = Math.sin(t * 0.6 + s.phase) * 12;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.moveTo(s.x, baseY);
    ctx.quadraticCurveTo(
      s.x + sway,
      baseY - s.h * 0.45,
      s.x + sway * 0.6,
      baseY - s.h,
    );
    ctx.lineWidth = s.w;
    ctx.lineCap = "round";
    ctx.strokeStyle = COLORS.seaweed;
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, s.w * 0.2);
    ctx.strokeStyle = COLORS.seaweedStroke;
    ctx.stroke();
    ctx.restore();
  }
}

const SEAWEED_BACK = [
  { x: 140, h: 150, w: 7, phase: 0.3, alpha: 0.14 },
  { x: 360, h: 210, w: 9, phase: 1.7, alpha: 0.12 },
  { x: 620, h: 170, w: 8, phase: 2.6, alpha: 0.11 },
  { x: 820, h: 190, w: 9, phase: 3.4, alpha: 0.13 },
] as const;

const SEAWEED_FRONT = [
  { x: 70, h: 190, w: 10, phase: 1.2, alpha: 0.32 },
  { x: 170, h: 150, w: 8, phase: 2.6, alpha: 0.22 },
  { x: 260, h: 235, w: 12, phase: 0.4, alpha: 0.48 },
  { x: 420, h: 170, w: 9, phase: 3.1, alpha: 0.19 },
  { x: 560, h: 210, w: 10, phase: 2.0, alpha: 0.18 },
  { x: 740, h: 180, w: 9, phase: 0.9, alpha: 0.17 },
  { x: 860, h: 240, w: 14, phase: 1.6, alpha: 0.52 },
] as const;

function drawSeaweedBack(ctx: CanvasRenderingContext2D, t: number) {
  drawSeaweedLayer(ctx, t, SEAWEED_BACK, 8);
}

function drawSeaweedFront(ctx: CanvasRenderingContext2D, t: number) {
  drawSeaweedLayer(ctx, t, SEAWEED_FRONT, 12);
}

function drawSeaweedLayer(
  ctx: CanvasRenderingContext2D,
  t: number,
  stems: ReadonlyArray<{
    x: number;
    h: number;
    w: number;
    phase: number;
    alpha: number;
  }>,
  swayAmount: number,
) {
  const baseY = GAME_HEIGHT - SAND_HEIGHT + 34;
  for (const s of stems) {
    const sway = Math.sin(t * 0.6 + s.phase) * swayAmount;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.moveTo(s.x, baseY);
    ctx.quadraticCurveTo(
      s.x + sway,
      baseY - s.h * 0.45,
      s.x + sway * 0.6,
      baseY - s.h,
    );
    ctx.lineWidth = s.w;
    ctx.lineCap = "round";
    ctx.strokeStyle = COLORS.seaweed;
    ctx.stroke();
    ctx.lineWidth = Math.max(1.2, s.w * 0.2);
    ctx.strokeStyle = COLORS.seaweedStroke;
    ctx.stroke();
    ctx.restore();
  }
}

export function drawScore(ctx: CanvasRenderingContext2D, score: number) {
  ctx.save();
  ctx.font = `64px "Comic Sans MS", "Comic Sans", sans-serif`;
  ctx.fillStyle = COLORS.ui;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.15)";
  ctx.shadowBlur = 2;
  ctx.fillText(String(score), GAME_WIDTH / 2, 18);
  ctx.restore();
}

export function drawFishbones(ctx: CanvasRenderingContext2D, eaten: number) {
  const level3 = Math.floor(eaten / 25);
  const rem = eaten - level3 * 25;
  const level2 = Math.floor(rem / 5);
  const level1 = rem - level2 * 5;

  const marginX = 22;
  const topY = 22;
  const rowGap = 46;

  // Level 3 (25s) - unbounded row.
  for (let i = 0; i < level3; i++)
    drawFishbone(
      ctx,
      marginX + i * 62,
      topY,
      1.05,
      -0.35 + (i % 3) * 0.12,
      0.95,
    );

  // Level 2 (5s)
  for (let i = 0; i < level2; i++)
    drawFishbone(
      ctx,
      marginX + i * 48,
      topY + rowGap,
      0.82,
      -0.1 + (i % 2) * 0.12,
      0.85,
    );

  // Level 1 (1s)
  for (let i = 0; i < level1; i++)
    drawFishbone(
      ctx,
      marginX + i * 44,
      topY + rowGap * 2,
      0.74,
      0.02 + (i % 2) * 0.08,
      0.8,
    );
}

function drawFishbone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  rotation: number,
  alpha: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  const spine = 34;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Fill
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(spine, 0);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.moveTo(spine, 0);
  ctx.lineTo(spine + 10, -7);
  ctx.lineTo(spine + 10, 7);
  ctx.closePath();
  ctx.fill();

  // Ribs
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 4;
  for (let i = 1; i <= 4; i++) {
    const px = (spine * i) / 5;
    const r = 10 - i * 1.2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px - 4, -r);
    ctx.moveTo(px, 0);
    ctx.lineTo(px - 4, r);
    ctx.stroke();
  }

  // Outline
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = "rgba(40,40,40,0.6)";
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-10, -12, spine + 26, 24);

  ctx.restore();
}

export function drawRun(
  ctx: CanvasRenderingContext2D,
  run: RunState,
  t: number,
  animatePlayerSwim: boolean,
) {
  for (const b of run.bubbles) drawBubble(ctx, b);
  for (const f of run.fish) drawNPCFish(ctx, f, t);
  drawPlayer(ctx, run.player, t, animatePlayerSwim);
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble) {
  const a = 1 - clamp(b.life / b.maxLife, 0, 1);
  ctx.save();
  ctx.globalAlpha = a * 0.7;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: Player,
  t: number,
  animateSwim: boolean,
) {
  const pulse = p.pulseT <= 0 ? 0 : 1 - clamp(p.pulseT / 0.18, 0, 1);
  const pulseScale = 1 + easeOutCubic(pulse) * 0.08;
  drawFish(ctx, {
    x: p.x,
    y: p.y,
    size: p.size * pulseScale,
    facing: p.facing,
    hue: 22,
    swimPhase: t,
    swimAmount: animateSwim ? 1 : 0,
    eyeBig: true,
  });
}

function drawNPCFish(ctx: CanvasRenderingContext2D, f: NPCFish, t: number) {
  drawFish(ctx, {
    x: f.x,
    y: f.y,
    size: f.size,
    facing: f.vx >= 0 ? 1 : -1,
    hue: f.hue,
    swimPhase: f.swimPhase + t * 0.2,
    swimAmount: 1,
    eyeBig: f.size > 120,
  });
}

type FishDraw = {
  x: number;
  y: number;
  size: number;
  facing: -1 | 1;
  hue: number;
  swimPhase: number;
  swimAmount: number;
  eyeBig: boolean;
};

function drawFish(ctx: CanvasRenderingContext2D, f: FishDraw) {
  const w = f.size;
  const h = f.size * 0.55;
  const tailW = w * 0.26;
  const tailH = h * 0.7;

  const swim = Math.sin(f.swimPhase * 8) * 0.22 * f.swimAmount;

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing, 1);

  // Tail
  ctx.save();
  ctx.translate(-w * 0.5 + tailW * 0.45, 0);
  ctx.rotate(swim);
  ctx.beginPath();
  ctx.moveTo(-tailW, 0);
  ctx.lineTo(0, -tailH * 0.5);
  ctx.lineTo(0, tailH * 0.5);
  ctx.closePath();
  ctx.fillStyle = fishColor(f.hue, 0.55);
  ctx.strokeStyle = fishColor(f.hue, 0.35);
  ctx.lineWidth = Math.max(1.5, w * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Body
  const bodyX = -w * 0.08;
  const bodyR = h * 0.52;
  const grad = ctx.createLinearGradient(
    bodyX - w * 0.2,
    0,
    bodyX + w * 0.55,
    0,
  );
  grad.addColorStop(0, fishColor(f.hue, 0.62));
  grad.addColorStop(0.55, fishColor(f.hue, 0.45));
  grad.addColorStop(1, fishColor(f.hue, 0.2));
  ctx.fillStyle = grad;
  ctx.strokeStyle = fishColor(f.hue, 0.15);
  ctx.lineWidth = Math.max(2, w * 0.025);

  ctx.beginPath();
  ctx.ellipse(bodyX, 0, w * 0.52, bodyR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mouth
  ctx.strokeStyle = "rgba(30,30,30,0.35)";
  ctx.lineWidth = Math.max(1.6, w * 0.02);
  ctx.beginPath();
  ctx.arc(w * 0.46, -h * 0.05, h * 0.2, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // Eye
  const eyeX = w * 0.26;
  const eyeY = -h * 0.18;
  const eyeR = h * (f.eyeBig ? 0.22 : 0.18);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.18, eyeY + eyeR * 0.12, eyeR * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.05, eyeY - eyeR * 0.12, eyeR * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Gills
  const gillX = w * 0.14;
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = Math.max(1, w * 0.015);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(gillX, i * h * 0.12, h * 0.35, Math.PI * 0.05, Math.PI * 0.28);
    ctx.stroke();
  }

  // Fin
  ctx.save();
  ctx.translate(-w * 0.06, h * 0.12);
  ctx.rotate(-0.4 + swim * 0.5);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(w * 0.1, -h * 0.22, w * 0.22, 0);
  ctx.quadraticCurveTo(w * 0.1, h * 0.12, 0, 0);
  ctx.fillStyle = fishColor(f.hue, 0.5);
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

export function drawDemoFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  facing: -1 | 1,
  hue: number,
  swimPhase: number,
) {
  drawFish(ctx, {
    x,
    y,
    size,
    facing,
    hue,
    swimPhase,
    swimAmount: 1,
    eyeBig: size > 80,
  });
}

function fishColor(hue: number, shade: number): string {
  const l = Math.round(lerp(84, 44, shade));
  const s = Math.round(lerp(80, 55, shade));
  return `hsl(${Math.round(hue)} ${s}% ${l}%)`;
}

export function drawMenuTitle(ctx: CanvasRenderingContext2D, t: number) {
  const text = "! FISHY !";
  const fontSize = 128;
  ctx.save();
  ctx.font = `${fontSize}px "Comic Sans MS", "Comic Sans", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.title;
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 2;

  const widths = [...text].map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = (GAME_WIDTH - total) / 2;
  const y = 150;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!c) continue;
    const bounce = Math.sin(t * 4.2 + i * 0.8) * 10;
    ctx.fillText(c, x, y + bounce);
    x += widths[i] ?? 0;
  }
  ctx.restore();
}

export function drawCenteredButtonText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  fontSize: number,
  hover: boolean,
) {
  const scale = hover ? 1.18 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.font = `${fontSize}px "Comic Sans MS", "Comic Sans", sans-serif`;
  ctx.fillStyle = COLORS.ui;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 2;
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

export function measureCenteredText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  fontSize: number,
) {
  ctx.save();
  ctx.font = `${fontSize}px "Comic Sans MS", "Comic Sans", sans-serif`;
  const w = ctx.measureText(label).width;
  ctx.restore();
  return { x: x - w / 2, y: y - fontSize / 2, w, h: fontSize };
}

export function drawGhostFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(2, size * 0.03);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.translate(x, y);
  const w = size;
  const h = size * 0.55;
  const swim = Math.sin(t * 6) * 0.12;
  ctx.save();
  ctx.translate(-w * 0.5 + w * 0.12, 0);
  ctx.rotate(swim);
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, 0);
  ctx.lineTo(0, -h * 0.42);
  ctx.lineTo(0, h * 0.42);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(-w * 0.08, 0, w * 0.52, h * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w * 0.22, -h * 0.15, h * 0.18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
