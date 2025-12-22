type Screen = "menu" | "instructions" | "playing" | "gameOver" | "playAgain";
type Dir = -1 | 1;

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ClickRegion = {
  id: string;
  kind: "world" | "screen";
  rect: Rect;
};

type Bubble = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
};

type NpcFish = {
  id: number;
  x: number; // center
  y: number; // center (current, includes swim offset)
  baseY: number;
  dir: Dir;
  size: number; // hitbox width, also used as "size" for comparisons
  speed: number;
  swimPhase: number;
  swimSpeed: number;
  swimAmp: number;
  color: string;
};

type Player = {
  x: number; // center
  y: number; // center
  vx: number;
  vy: number;
  dir: Dir;
  size: number; // hitbox width
  swimPhase: number;
  pulse: number; // 0..1
  bubbleTimer: number;
};

const FONT_FAMILY = '"Comic Sans MS", "Comic Sans", cursive';
const UI_BLUE = "#2f5f8f";
const UI_SHADOW = "rgba(0, 0, 0, 0.25)";
const BORDER_MAGENTA = "#8b2a7a";

const PLAY_W = 1024;
const PLAY_H = 768;

// Spawn area is wider than play area
const SPAWN_MARGIN = 260;
const SPAWN_LEFT = -SPAWN_MARGIN;
const SPAWN_RIGHT = PLAY_W + SPAWN_MARGIN;

// Movement feel
const ACCEL = 900; // px/s^2
const DRAG = 2.25; // per-second exponential damping
const MAX_SPEED = 520; // px/s
const INITIAL_DOWN_SPEED = 520;

// Player growth: barely perceptible per fish
const GROWTH_PER_FISH_MULT = 1.0035;

// Fish population
const MAX_FISH = 14;

const PLAYER_COLOR = "#f1a33b";
const NPC_COLORS = ["#f1a33b", "#b58ad7", "#2c9df3", "#73b96b", "#e6a2aa", "#9fd0f0"] as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  if (normalized.length !== 6) return { r: 255, g: 255, b: 255 };
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(clamp(r, 0, 255))}${toHex(clamp(g, 0, 255))}${toHex(clamp(bl, 0, 255))}`;
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: "normal" | "bold" = "bold"): void {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

function getMovement(keys: Set<string>): { dx: -1 | 0 | 1; dy: -1 | 0 | 1; any: boolean } {
  const up = keys.has("arrowup") || keys.has("w");
  const down = keys.has("arrowdown") || keys.has("s");
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");

  const dy: -1 | 0 | 1 = up ? -1 : down ? 1 : 0;
  const dx: -1 | 0 | 1 = left ? -1 : right ? 1 : 0;

  return { dx, dy, any: up || down || left || right };
}

function fishHitbox(x: number, y: number, size: number): Rect {
  const w = size;
  const h = size * 0.5;
  return { x: x - w / 2, y: y - h / 2, w, h };
}

function drawShadowedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  align: CanvasTextAlign = "center",
  shadowOffset = 6,
): void {
  setFont(ctx, size, "bold");
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  ctx.fillStyle = UI_SHADOW;
  ctx.fillText(text, x + shadowOffset, y + shadowOffset);

  ctx.fillStyle = UI_BLUE;
  ctx.fillText(text, x, y);
}

function drawFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Dir,
  size: number,
  baseColor: string,
  swimPhase: number,
  animate: boolean,
  extraScale = 1,
  ghost = false,
): void {
  const totalLen = size;
  const bodyLen = totalLen * 0.7;
  const tailLen = totalLen - bodyLen;
  const h = totalLen * 0.5;

  const wag = animate ? Math.sin(swimPhase) : 0;
  const wagOffset = wag * h * 0.18;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  const s = extraScale;
  ctx.scale(s, s);

  const bodyGradient = ctx.createLinearGradient(-bodyLen / 2, -h / 2, bodyLen / 2, h / 2);
  const light = mixHex(baseColor, "#ffffff", 0.55);
  const dark = mixHex(baseColor, "#000000", 0.15);
  bodyGradient.addColorStop(0, light);
  bodyGradient.addColorStop(0.55, baseColor);
  bodyGradient.addColorStop(1, dark);

  // Tail
  const tailBaseX = -bodyLen / 2;
  const tailTipX = tailBaseX - tailLen;

  ctx.beginPath();
  ctx.moveTo(tailBaseX, 0);
  ctx.lineTo(tailTipX, -h * 0.45 + wagOffset);
  ctx.lineTo(tailTipX, h * 0.45 + wagOffset);
  ctx.closePath();

  if (ghost) {
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = mixHex(baseColor, "#ffffff", 0.2);
    ctx.fill();
  }

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyLen / 2, h / 2, 0, 0, Math.PI * 2);
  if (ghost) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = bodyGradient;
    ctx.fill();
  }

  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(-bodyLen * 0.05, -h * 0.35);
  ctx.lineTo(bodyLen * 0.12, -h * 0.55);
  ctx.lineTo(bodyLen * 0.28, -h * 0.33);
  ctx.closePath();
  if (ghost) {
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = mixHex(baseColor, "#ffffff", 0.25);
    ctx.fill();
  }

  // Mouth (simple notch)
  ctx.beginPath();
  ctx.moveTo(bodyLen / 2, 0);
  ctx.lineTo(bodyLen / 2 - bodyLen * 0.08, -h * 0.08);
  ctx.lineTo(bodyLen / 2 - bodyLen * 0.08, h * 0.08);
  ctx.closePath();
  if (ghost) {
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = mixHex(baseColor, "#000000", 0.15);
    ctx.fill();
  }

  // Eye
  const eyeX = bodyLen * 0.2;
  const eyeY = -h * 0.12;
  const eyeR = h * 0.13;

  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
  if (ghost) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.25;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = ghost ? "rgba(255,255,255,0.75)" : "#111111";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.18, eyeY - eyeR * 0.18, eyeR * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = ghost ? "rgba(255,255,255,0.9)" : "#ffffff";
  ctx.fill();

  // Gills
  ctx.strokeStyle = ghost ? "rgba(255,255,255,0.55)" : mixHex(baseColor, "#000000", 0.35);
  ctx.lineWidth = ghost ? 1.25 : 2;
  for (let i = 0; i < 3; i += 1) {
    const gx = bodyLen * (0.05 + i * 0.06);
    ctx.beginPath();
    ctx.arc(gx, h * 0.02, h * 0.13, -Math.PI * 0.15, Math.PI * 0.45);
    ctx.stroke();
  }

  // Simple pectoral fin
  ctx.beginPath();
  ctx.moveTo(bodyLen * 0.05, h * 0.1);
  ctx.lineTo(bodyLen * 0.18, h * 0.26);
  ctx.lineTo(bodyLen * 0.24, h * 0.08);
  ctx.closePath();
  if (ghost) {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.25;
    ctx.stroke();
  } else {
    ctx.fillStyle = mixHex(baseColor, "#ffffff", 0.32);
    ctx.fill();
  }

  ctx.restore();
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble): void {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFishbone(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number, rot = 0): void {
  const h = len * 0.25;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  const spineY = 0;

  // base stroke
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#cfcfcf";
  ctx.lineWidth = Math.max(2, len * 0.06);

  // spine
  ctx.beginPath();
  ctx.moveTo(-len * 0.42, spineY);
  ctx.lineTo(len * 0.42, spineY);
  ctx.stroke();

  // head (simple oval)
  ctx.fillStyle = "#d9d9d9";
  ctx.beginPath();
  ctx.ellipse(-len * 0.46, 0, len * 0.08, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // ribs
  const ribXs = [-0.28, -0.12, 0.04, 0.2].map((t) => t * len);
  for (const rx of ribXs) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + len * 0.06, -h * 0.7);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + len * 0.06, h * 0.7);
    ctx.stroke();
  }

  // tail fork
  ctx.beginPath();
  ctx.moveTo(len * 0.42, 0);
  ctx.lineTo(len * 0.5, -h * 0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(len * 0.42, 0);
  ctx.lineTo(len * 0.5, h * 0.55);
  ctx.stroke();

  // highlight
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = Math.max(1, len * 0.03);
  ctx.beginPath();
  ctx.moveTo(-len * 0.4, -h * 0.08);
  ctx.lineTo(len * 0.36, -h * 0.08);
  ctx.stroke();

  ctx.restore();
}

function drawFullscreenIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hovered: boolean,
): Rect {
  const s = hovered ? size * 1.2 : size;
  const half = s / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // two "corner" arrows
  ctx.beginPath();
  // top-right corner
  ctx.moveTo(half * 0.2, -half * 0.2);
  ctx.lineTo(half * 0.2, -half * 0.55);
  ctx.lineTo(half * 0.55, -half * 0.55);

  // bottom-left corner
  ctx.moveTo(-half * 0.2, half * 0.2);
  ctx.lineTo(-half * 0.2, half * 0.55);
  ctx.lineTo(-half * 0.55, half * 0.55);

  // top-left corner
  ctx.moveTo(-half * 0.2, -half * 0.2);
  ctx.lineTo(-half * 0.55, -half * 0.2);
  ctx.lineTo(-half * 0.55, -half * 0.55);

  // bottom-right corner
  ctx.moveTo(half * 0.2, half * 0.2);
  ctx.lineTo(half * 0.55, half * 0.2);
  ctx.lineTo(half * 0.55, half * 0.55);

  ctx.stroke();
  ctx.restore();

  return { x: x - half, y: y - half, w: s, h: s };
}

function drawArrowKeys(ctx: CanvasRenderingContext2D, cx: number, cy: number, keySize: number): void {
  const s = keySize;
  const gap = s * 0.08;

  const drawKey = (x: number, y: number, dir: "up" | "down" | "left" | "right") => {
    ctx.save();
    ctx.translate(x, y);

    // keycap
    ctx.fillStyle = "#d9d9d9";
    ctx.strokeStyle = "#9a9a9a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.12);
    ctx.fill();
    ctx.stroke();

    // inner bevel
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-s / 2 + 3, -s / 2 + 3, s - 6, s - 6, s * 0.1);
    ctx.stroke();

    // arrow
    ctx.fillStyle = "#5e5e5e";
    ctx.beginPath();
    if (dir === "up") {
      ctx.moveTo(0, -s * 0.22);
      ctx.lineTo(-s * 0.18, s * 0.08);
      ctx.lineTo(s * 0.18, s * 0.08);
    } else if (dir === "down") {
      ctx.moveTo(0, s * 0.22);
      ctx.lineTo(-s * 0.18, -s * 0.08);
      ctx.lineTo(s * 0.18, -s * 0.08);
    } else if (dir === "left") {
      ctx.moveTo(-s * 0.22, 0);
      ctx.lineTo(s * 0.08, -s * 0.18);
      ctx.lineTo(s * 0.08, s * 0.18);
    } else {
      ctx.moveTo(s * 0.22, 0);
      ctx.lineTo(-s * 0.08, -s * 0.18);
      ctx.lineTo(-s * 0.08, s * 0.18);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Layout like the screenshot: up above, left/down/right row
  drawKey(cx, cy - (s + gap), "up");
  drawKey(cx - (s + gap), cy, "left");
  drawKey(cx, cy, "down");
  drawKey(cx + (s + gap), cy, "right");
}

type SeaweedBlade = {
  x: number;
  baseY: number;
  height: number;
  thickness: number;
  alpha: number;
  phase: number;
  sway: number;
  color: string;
  foreground: boolean;
};

function drawSeaweed(ctx: CanvasRenderingContext2D, blades: SeaweedBlade[], t: number, foreground: boolean): void {
  for (const b of blades) {
    if (b.foreground !== foreground) continue;

    const sway = Math.sin(t * 0.9 + b.phase) * b.sway;
    const tipX = b.x + sway;
    const tipY = b.baseY - b.height;

    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.thickness;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(b.x, b.baseY);

    const c1x = b.x + sway * 0.35;
    const c1y = b.baseY - b.height * 0.33;
    const c2x = b.x + sway * 0.85;
    const c2y = b.baseY - b.height * 0.66;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, tipX, tipY);

    ctx.stroke();
    ctx.restore();
  }
}

function drawSand(ctx: CanvasRenderingContext2D): void {
  // Sand ridge similar to the provided screenshots.
  const y0 = PLAY_H - 92;
  const pts = [
    { x: 0, y: y0 + 10 },
    { x: PLAY_W * 0.18, y: y0 - 8 },
    { x: PLAY_W * 0.36, y: y0 + 14 },
    { x: PLAY_W * 0.58, y: y0 - 4 },
    { x: PLAY_W * 0.78, y: y0 + 18 },
    { x: PLAY_W, y: y0 - 14 },
  ];

  const grad = ctx.createLinearGradient(0, y0 - 40, 0, PLAY_H);
  grad.addColorStop(0, "#8d7346");
  grad.addColorStop(1, "#6f5836");

  ctx.save();
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#6b5433";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, PLAY_H);
  ctx.lineTo(pts[0].x, pts[0].y);

  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
  }

  const last = pts[pts.length - 1];
  ctx.quadraticCurveTo(last.x, last.y, last.x, last.y);

  ctx.lineTo(PLAY_W, PLAY_H);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWater(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, PLAY_H);
  g.addColorStop(0, "#b2d2f7");
  g.addColorStop(0.55, "#7bb4e7");
  g.addColorStop(1, "#5478b0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PLAY_W, PLAY_H);
}

function drawBorder(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = BORDER_MAGENTA;
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, PLAY_W, PLAY_H);
  ctx.restore();
}

class FishyApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private cssW = 1;
  private cssH = 1;
  private dpr = 1;

  private playRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  private scale = 1;

  private pointerX = 0;
  private pointerY = 0;
  private pointerWorldX: number | null = null;
  private pointerWorldY: number | null = null;

  private keys = new Set<string>();

  private regions: ClickRegion[] = [];
  private hoveringAny = false;

  private screen: Screen = "menu";
  private t = 0;

  // Title bounce phases for "!FISHy!"
  private readonly titleText = "!FISHy!";
  private readonly titlePhases: number[] = [];

  // Game state
  private player: Player = {
    x: PLAY_W / 2,
    y: 60,
    vx: 0,
    vy: INITIAL_DOWN_SPEED,
    dir: 1,
    size: 44,
    swimPhase: 0,
    pulse: 0,
    bubbleTimer: 0.25,
  };

  private fishes: NpcFish[] = [];
  private bubbles: Bubble[] = [];
  private fishSpawnTimer = 0;
  private fishId = 1;

  private totalEaten = 0;
  private score = 0;

  // Game over ghost
  private ghostY = 0;
  private ghostTargetY = 0;
  private ghostX = PLAY_W / 2;

  // Background deco
  private readonly seaweed: SeaweedBlade[] = [
    { x: 90, baseY: PLAY_H - 70, height: 260, thickness: 7, alpha: 0.2, phase: 0.2, sway: 10, color: "#2f7d3a", foreground: false },
    { x: 210, baseY: PLAY_H - 65, height: 210, thickness: 5, alpha: 0.15, phase: 1.4, sway: 12, color: "#2f7d3a", foreground: false },
    { x: 420, baseY: PLAY_H - 72, height: 360, thickness: 8, alpha: 0.28, phase: 2.6, sway: 14, color: "#2b8a37", foreground: true },
    { x: 540, baseY: PLAY_H - 68, height: 220, thickness: 4, alpha: 0.15, phase: 0.9, sway: 10, color: "#2f7d3a", foreground: false },
    { x: 690, baseY: PLAY_H - 66, height: 260, thickness: 5, alpha: 0.18, phase: 2.1, sway: 10, color: "#2f7d3a", foreground: false },
    { x: 860, baseY: PLAY_H - 70, height: 180, thickness: 4, alpha: 0.15, phase: 3.4, sway: 9, color: "#2f7d3a", foreground: false },
    { x: 950, baseY: PLAY_H - 74, height: 320, thickness: 10, alpha: 0.55, phase: 1.8, sway: 16, color: "#159a2d", foreground: true },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create 2D canvas context");
    }
    this.ctx = ctx;

    for (let i = 0; i < this.titleText.length; i += 1) {
      this.titlePhases.push(randRange(0, Math.PI * 2));
    }

    this.bindEvents();
    this.resize();

    // Start loop
    let last = performance.now();
    const frame = (now: number) => {
      const dt = clamp((now - last) / 1000, 0, 0.04);
      last = now;
      this.t += dt;

      this.update(dt);
      this.draw();

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  private bindEvents(): void {
    window.addEventListener("resize", () => this.resize());

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      this.keys.add(key);

      if (key.startsWith("arrow") || key === "w" || key === "a" || key === "s" || key === "d") {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
    });

    this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
    this.canvas.addEventListener("pointerleave", () => {
      this.pointerWorldX = null;
      this.pointerWorldY = null;
    });
  }

  private resize(): void {
    this.cssW = Math.max(1, window.innerWidth);
    this.cssH = Math.max(1, window.innerHeight);
    this.dpr = Math.max(1, window.devicePixelRatio || 1);

    this.canvas.width = Math.floor(this.cssW * this.dpr);
    this.canvas.height = Math.floor(this.cssH * this.dpr);

    // Draw in CSS pixels
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const scale = Math.min(this.cssW / PLAY_W, this.cssH / PLAY_H);
    const w = PLAY_W * scale;
    const h = PLAY_H * scale;
    const x = (this.cssW - w) / 2;
    const y = (this.cssH - h) / 2;

    this.playRect = { x, y, w, h };
    this.scale = scale;

    // Recompute world pointer in case we resized mid-hover
    this.updatePointerWorld();
  }

  private onPointerMove(e: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect();
    this.pointerX = e.clientX - r.left;
    this.pointerY = e.clientY - r.top;
    this.updatePointerWorld();
  }

  private onPointerDown(e: PointerEvent): void {
    // keep pointer positions fresh
    this.onPointerMove(e);
  }

  private onPointerUp(e: PointerEvent): void {
    this.onPointerMove(e);
    this.handleClick();
  }

  private updatePointerWorld(): void {
    if (pointInRect(this.pointerX, this.pointerY, this.playRect)) {
      this.pointerWorldX = (this.pointerX - this.playRect.x) / this.scale;
      this.pointerWorldY = (this.pointerY - this.playRect.y) / this.scale;
    } else {
      this.pointerWorldX = null;
      this.pointerWorldY = null;
    }
  }

  private update(dt: number): void {
    if (this.screen === "playing") {
      this.updatePlaying(dt);
    } else if (this.screen === "gameOver") {
      // Ghost travels upward until it stops above "GULP!!!"
      const speed = 110;
      if (this.ghostY > this.ghostTargetY) {
        this.ghostY = Math.max(this.ghostTargetY, this.ghostY - speed * dt);
      }
    }
  }

  private resetGame(): void {
    this.totalEaten = 0;
    this.score = 0;
    this.fishes = [];
    this.bubbles = [];
    this.fishSpawnTimer = 0.05;
    this.fishId = 1;

    this.player = {
      x: PLAY_W / 2,
      y: 60,
      vx: 0,
      vy: INITIAL_DOWN_SPEED,
      dir: 1,
      size: 44,
      swimPhase: 0,
      pulse: 0,
      bubbleTimer: randRange(0.18, 0.55),
    };

    // Prime the world with a few fish
    for (let i = 0; i < 7; i += 1) {
      this.spawnFish(true);
    }
  }

  private enterGameOver(): void {
    this.screen = "gameOver";
    this.fishes = [];
    this.bubbles = [];

    // Layout approximates screenshot: ghost starts below OK and rises to above GULP.
    const okY = 500;
    const gulpY = 300;

    this.ghostX = PLAY_W / 2;
    this.ghostY = okY + 90;
    this.ghostTargetY = gulpY - 130;
  }

  private updatePlaying(dt: number): void {
    const { dx, dy, any } = getMovement(this.keys);

    // Momentum + acceleration
    this.player.vx += dx * ACCEL * dt;
    this.player.vy += dy * ACCEL * dt;

    // Exponential drag
    const drag = Math.exp(-DRAG * dt);
    this.player.vx *= drag;
    this.player.vy *= drag;

    // Clamp speed
    const sp = Math.hypot(this.player.vx, this.player.vy);
    if (sp > MAX_SPEED) {
      const k = MAX_SPEED / sp;
      this.player.vx *= k;
      this.player.vy *= k;
    }

    // Integrate
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Facing direction updates only when horizontal movement key is pressed
    if (dx !== 0) this.player.dir = dx;

    // Swim animation only when movement keys are pressed
    if (any) this.player.swimPhase += dt * 8;

    // Pulse decays
    this.player.pulse = Math.max(0, this.player.pulse - dt * 3);

    // Vertical bounds: clamp + instantly stop momentum in that direction
    const pbox = fishHitbox(this.player.x, this.player.y, this.player.size);
    if (pbox.y < 0) {
      this.player.y = this.player.size * 0.25;
      if (this.player.vy < 0) this.player.vy = 0;
    }
    if (pbox.y + pbox.h > PLAY_H) {
      this.player.y = PLAY_H - this.player.size * 0.25;
      if (this.player.vy > 0) this.player.vy = 0;
    }

    // Horizontal wrap: teleport to other side preserving momentum
    const halfW = this.player.size / 2;
    if (this.player.x + halfW < 0) {
      this.player.x = PLAY_W + halfW;
    } else if (this.player.x - halfW > PLAY_W) {
      this.player.x = -halfW;
    }

    // Bubbles at semi-random intervals
    this.player.bubbleTimer -= dt;
    if (this.player.bubbleTimer <= 0) {
      const mouthX = this.player.x + this.player.dir * (this.player.size * 0.33);
      const mouthY = this.player.y - this.player.size * 0.06;

      this.bubbles.push({
        x: mouthX + randRange(-2, 2),
        y: mouthY + randRange(-2, 2),
        r: randRange(3, 6),
        vx: randRange(-12, 12),
        vy: -randRange(45, 110),
      });

      this.player.bubbleTimer = randRange(0.25, 0.9);
    }

    for (let i = this.bubbles.length - 1; i >= 0; i -= 1) {
      const b = this.bubbles[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y + b.r < 0) {
        this.bubbles.splice(i, 1);
      }
    }

    // Spawn fish
    this.fishSpawnTimer -= dt;
    if (this.fishSpawnTimer <= 0 && this.fishes.length < MAX_FISH) {
      this.spawnFish(false);
      this.fishSpawnTimer = randRange(0.32, 0.85);
    }

    // Update fish
    for (let i = this.fishes.length - 1; i >= 0; i -= 1) {
      const f = this.fishes[i];
      f.swimPhase += dt * f.swimSpeed;
      f.x += f.dir * f.speed * dt;
      f.y = f.baseY + Math.sin(f.swimPhase) * f.swimAmp;

      // Remove when leaving spawn rectangle opposite side
      if (f.dir === 1) {
        // moving right: remove once left edge passes spawn right edge
        if (f.x - f.size / 2 > SPAWN_RIGHT) {
          this.fishes.splice(i, 1);
          continue;
        }
      } else {
        // moving left: remove once right edge passes spawn left edge
        if (f.x + f.size / 2 < SPAWN_LEFT) {
          this.fishes.splice(i, 1);
          continue;
        }
      }
    }

    // Collisions: AABB
    const playerBox = fishHitbox(this.player.x, this.player.y, this.player.size);

    for (let i = this.fishes.length - 1; i >= 0; i -= 1) {
      const f = this.fishes[i];
      const fBox = fishHitbox(f.x, f.y, f.size);

      if (!rectsOverlap(playerBox, fBox)) continue;

      // Player equal size or larger -> eat
      if (this.player.size >= f.size) {
        this.fishes.splice(i, 1);

        this.totalEaten += 1;
        this.player.size *= GROWTH_PER_FISH_MULT;
        this.player.pulse = 1;

        // Points scale with eaten fish size
        this.score += Math.max(1, Math.round(f.size));

        // Lightly bias next spawns as player grows
        continue;
      }

      // Player smaller -> game over
      this.enterGameOver();
      return;
    }
  }

  private spawnFish(initial: boolean): void {
    const dir: Dir = Math.random() < 0.5 ? 1 : -1;

    // Size distribution around the player: plenty edible, some risky
    const base = this.player.size;
    const r = Math.random();

    let factor = 1;
    if (r < 0.58) factor = randRange(0.35, 0.95);
    else if (r < 0.9) factor = randRange(0.95, 1.35);
    else factor = randRange(1.35, 2.25);

    let size = clamp(base * factor, 20, 260);

    // During initial prime, avoid too many lethal fish immediately
    if (initial && factor > 1.35) size = clamp(base * randRange(0.85, 1.2), 20, 260);

    // Hitbox edges must spawn flush with spawn rectangle edges (as far from center as possible).
    // If spawning from left (dir=1), right edge of hitbox at SPAWN_LEFT:
    // centerX + w/2 = SPAWN_LEFT => centerX = SPAWN_LEFT - w/2
    // If spawning from right (dir=-1), left edge at SPAWN_RIGHT:
    // centerX - w/2 = SPAWN_RIGHT => centerX = SPAWN_RIGHT + w/2
    const x = dir === 1 ? SPAWN_LEFT - size / 2 : SPAWN_RIGHT + size / 2;

    const halfH = (size * 0.5) / 2;
    const baseY = randRange(halfH + 12, PLAY_H - halfH - 12);

    const speedBase = randRange(70, 170);
    const speed = speedBase * Math.pow(44 / size, 0.35);

    const fish: NpcFish = {
      id: this.fishId++,
      x,
      y: baseY,
      baseY,
      dir,
      size,
      speed,
      swimPhase: randRange(0, Math.PI * 2),
      swimSpeed: randRange(2.2, 4.5),
      swimAmp: randRange(4, 14),
      color: NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)] ?? "#9fd0f0",
    };

    this.fishes.push(fish);
  }

  private handleClick(): void {
    const px = this.pointerX;
    const py = this.pointerY;

    // Find the top-most matching region (last drawn wins)
    for (let i = this.regions.length - 1; i >= 0; i -= 1) {
      const r = this.regions[i];
      if (r.kind === "screen") {
        if (!pointInRect(px, py, r.rect)) continue;
      } else {
        if (this.pointerWorldX === null || this.pointerWorldY === null) continue;
        if (!pointInRect(this.pointerWorldX, this.pointerWorldY, r.rect)) continue;
      }

      this.onRegionClick(r.id);
      break;
    }
  }

  private onRegionClick(id: string): void {
    if (id === "fullscreen") {
      void this.toggleFullscreen();
      return;
    }

    if (this.screen === "menu") {
      if (id === "play") {
        this.resetGame();
        this.screen = "playing";
      } else if (id === "instructions") {
        this.screen = "instructions";
      }
      return;
    }

    if (this.screen === "instructions") {
      if (id === "back") this.screen = "menu";
      return;
    }

    if (this.screen === "gameOver") {
      if (id === "ok") this.screen = "playAgain";
      return;
    }

    if (this.screen === "playAgain") {
      if (id === "playAgain") {
        this.resetGame();
        this.screen = "playing";
      }
    }
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore fullscreen failures
    }
  }

  private draw(): void {
    // Reset interaction regions each frame
    this.regions = [];
    this.hoveringAny = false;

    const ctx = this.ctx;

    // Whole-screen black background (letterboxing)
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    ctx.restore();

    // Draw play area with fixed aspect ratio
    ctx.save();
    ctx.translate(this.playRect.x, this.playRect.y);
    ctx.scale(this.scale, this.scale);

    drawWater(ctx);

    // Seaweed behind everything
    drawSeaweed(ctx, this.seaweed, this.t, false);

    if (this.screen === "menu") {
      this.drawMenu(ctx);
    } else if (this.screen === "instructions") {
      this.drawInstructions(ctx);
    } else if (this.screen === "playing") {
      this.drawPlaying(ctx);
    } else if (this.screen === "gameOver") {
      this.drawGameOver(ctx);
    } else if (this.screen === "playAgain") {
      this.drawPlayAgain(ctx);
    }

    // Seaweed in front for depth
    drawSeaweed(ctx, this.seaweed, this.t, true);

    // Sand sits in front (covers fish near bottom like screenshot)
    drawSand(ctx);

    drawBorder(ctx);
    ctx.restore();

    // Fullscreen icon at top-right edge (screen space, white)
    this.drawFullscreen(ctx);

    // Cursor feedback
    this.canvas.style.cursor = this.hoveringAny ? "pointer" : "default";
  }

  private drawFullscreen(ctx: CanvasRenderingContext2D): void {
    const size = 22;
    const margin = 18;
    const x = this.cssW - margin;
    const y = margin;

    const r: Rect = { x: x - size / 2, y: y - size / 2, w: size, h: size };
    const hovered = pointInRect(this.pointerX, this.pointerY, r);

    const rect = drawFullscreenIcon(ctx, x, y, size, hovered);
    this.regions.push({ id: "fullscreen", kind: "screen", rect });

    if (hovered) this.hoveringAny = true;
  }

  private drawMenu(ctx: CanvasRenderingContext2D): void {
    // Title with independent character bounce
    const fontSize = 160;
    setFont(ctx, fontSize, "bold");
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const letterWidths: number[] = [];
    let totalW = 0;
    for (let i = 0; i < this.titleText.length; i += 1) {
      const ch = this.titleText[i] ?? "";
      const w = ctx.measureText(ch).width;
      letterWidths.push(w);
      totalW += w;
    }

    const baseX = (PLAY_W - totalW) / 2;
    const baseY = 160;

    let x = baseX;
    for (let i = 0; i < this.titleText.length; i += 1) {
      const ch = this.titleText[i] ?? "";
      const phase = this.titlePhases[i] ?? 0;
      const y = baseY + Math.sin(this.t * 2.2 + phase) * 14;

      // Slightly translucent title like the screenshot
      ctx.fillStyle = "rgba(0,0,0,0.20)";
      ctx.fillText(ch, x + 10, y + 10);

      ctx.fillStyle = "rgba(47,95,143,0.65)";
      ctx.fillText(ch, x, y);

      x += letterWidths[i] ?? 0;
    }

    // Buttons
    const playY = 380;
    const instructionsY = 470;

    this.drawTextButtonWorld(ctx, "PLAY", PLAY_W / 2, playY, 54, "play");
    this.drawTextButtonWorld(ctx, "INSTRUCTIONS", PLAY_W / 2, instructionsY, 54, "instructions");
  }

  private drawInstructions(ctx: CanvasRenderingContext2D): void {
    drawShadowedText(ctx, "Eat smaller fish to grow bigger!", PLAY_W / 2, 90, 44, "center", 5);

    // Small fish examples
    drawFish(ctx, PLAY_W / 2 - 40, 145, 1, 64, "#f1a33b", 0, false);
    drawFish(ctx, PLAY_W / 2 + 90, 150, 1, 38, "#a9c7d9", 0, false);

    drawShadowedText(ctx, "Don't get eaten by bigger fish!", PLAY_W / 2, 250, 44, "center", 5);

    drawFish(ctx, PLAY_W / 2 - 60, 315, 1, 120, "#73b96b", 0, false);
    drawFish(ctx, PLAY_W / 2 + 120, 325, 1, 58, "#f1a33b", 0, false);

    drawShadowedText(ctx, "Use the arrow keys to control movement", PLAY_W / 2, 430, 44, "center", 5);

    drawArrowKeys(ctx, PLAY_W / 2, 520, 62);

    // Bottom paragraph (keep original misspelling from screenshot)
    drawShadowedText(ctx, "The bigger the fish, the more you will grow,", PLAY_W / 2, 640, 54, "center", 6);
    drawShadowedText(ctx, "and the more points you will recieve!", PLAY_W / 2, 700, 54, "center", 6);

    // Back button on sand
    this.drawTextButtonWorld(ctx, "BACK", PLAY_W / 2, 740, 58, "back");
  }

  private drawPlaying(ctx: CanvasRenderingContext2D): void {
    // NPC fish swim constantly
    for (const f of this.fishes) {
      drawFish(ctx, f.x, f.y, f.dir, f.size, f.color, f.swimPhase, true);
    }

    // Player pulse on eat
    const pulseScale = 1 + this.player.pulse * 0.08;
    drawFish(
      ctx,
      this.player.x,
      this.player.y,
      this.player.dir,
      this.player.size,
      PLAYER_COLOR,
      this.player.swimPhase,
      getMovement(this.keys).any,
      pulseScale,
    );

    // Bubbles on top
    for (const b of this.bubbles) drawBubble(ctx, b);

    // UI overlays
    this.drawScoreAndBones(ctx);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    // UI persists
    this.drawScoreAndBones(ctx);

    // Ghost fish
    drawFish(ctx, this.ghostX, this.ghostY, 1, 78, "#ffffff", 0, false, 1, true);

    // GULP!!!
    drawShadowedText(ctx, "GULP!!!", PLAY_W / 2, 300, 120, "center", 12);

    // OK button
    this.drawTextButtonWorld(ctx, "OK", PLAY_W / 2, 500, 48, "ok");
  }

  private drawPlayAgain(ctx: CanvasRenderingContext2D): void {
    // UI persists
    this.drawScoreAndBones(ctx);

    // Button
    this.drawTextButtonWorld(ctx, "PLAY AGAIN", PLAY_W / 2, 360, 62, "playAgain");
  }

  private drawScoreAndBones(ctx: CanvasRenderingContext2D): void {
    // Score at top center
    setFont(ctx, 56, "bold");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = UI_SHADOW;
    ctx.fillText(String(this.score), PLAY_W / 2 + 6, 62 + 6);

    ctx.fillStyle = UI_BLUE;
    ctx.fillText(String(this.score), PLAY_W / 2, 62);

    // Fishbone counters at top-left, 3 levels (1, 5, 25)
    const total = this.totalEaten;
    const lvl1 = total % 5;
    const lvl2 = Math.floor(total / 5) % 5;
    const lvl3 = Math.floor(total / 25);

    const padX = 70;
    const row1Y = 38;
    const row2Y = 74;
    const row3Y = 110;

    const lenLarge = 84;
    const lenMed = 58;
    const lenSmall = 40;

    // Level 3: unlimited, extend right
    for (let i = 0; i < lvl3; i += 1) {
      const cx = padX + i * (lenLarge + 18);
      drawFishbone(ctx, cx, row1Y, lenLarge, -0.18);
    }

    // Level 2: up to 4
    for (let i = 0; i < lvl2; i += 1) {
      const cx = padX + i * (lenMed + 16);
      drawFishbone(ctx, cx, row2Y, lenMed, 0);
    }

    // Level 1: up to 4
    for (let i = 0; i < lvl1; i += 1) {
      const cx = padX + i * (lenSmall + 16);
      drawFishbone(ctx, cx, row3Y, lenSmall, 0);
    }
  }

  private drawTextButtonWorld(
    ctx: CanvasRenderingContext2D,
    label: string,
    cx: number,
    cy: number,
    fontSize: number,
    id: string,
  ): void {
    setFont(ctx, fontSize, "bold");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const w = ctx.measureText(label).width;
    const h = fontSize * 0.9;

    // Hover based on unscaled bounds (instant enlarge when hovered)
    const baseRect: Rect = { x: cx - w / 2, y: cy - h / 2, w, h };
    const hovered = this.pointerWorldX !== null && this.pointerWorldY !== null && pointInRect(this.pointerWorldX, this.pointerWorldY, baseRect);

    const scale = hovered ? 1.2 : 1;

    // Draw
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    // shadow + fill
    ctx.fillStyle = UI_SHADOW;
    ctx.fillText(label, 6, 6);
    ctx.fillStyle = UI_BLUE;
    ctx.fillText(label, 0, 0);
    ctx.restore();

    const scaledRect: Rect = { x: cx - (w * scale) / 2, y: cy - (h * scale) / 2, w: w * scale, h: h * scale };
    this.regions.push({ id, kind: "world", rect: scaledRect });

    if (hovered) this.hoveringAny = true;
  }
}

function main(): void {
  const canvas = document.getElementById("game");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Missing <canvas id='game'>");
  }
  // eslint-disable-next-line no-new
  new FishyApp(canvas);
}

main();