import { GAME_HEIGHT, GAME_WIDTH, SAND_HEIGHT } from "./constants";
import { clamp, lerp, randFloat } from "./math";

export type Rect = { x: number; y: number; w: number; h: number };

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  facing: -1 | 1;
  pulseT: number;
  bubblesT: number;
};

export type NPCFish = {
  id: number;
  x: number;
  y: number;
  vx: number;
  size: number;
  hue: number;
  swimPhase: number;
};

export type Bubble = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
};

export type RunState = {
  score: number;
  eaten: number;
  player: Player;
  fish: NPCFish[];
  bubbles: Bubble[];
  spawnCooldown: number;
  nextFishId: number;
  elapsed: number;
};

export function makeRectCenter(
  x: number,
  y: number,
  w: number,
  h: number,
): Rect {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

export function playerHitbox(player: Player): Rect {
  const w = player.size;
  const h = player.size * 0.55;
  return makeRectCenter(player.x, player.y, w, h);
}

export function fishHitbox(fish: NPCFish): Rect {
  const w = fish.size;
  const h = fish.size * 0.55;
  return makeRectCenter(fish.x, fish.y, w, h);
}

export function newRunState(): RunState {
  const baseSize = 42;
  const player: Player = {
    x: GAME_WIDTH / 2,
    y: 30,
    vx: 0,
    vy: 650,
    size: baseSize,
    facing: 1,
    pulseT: 0,
    bubblesT: randFloat(0.15, 0.5),
  };

  return {
    score: 0,
    eaten: 0,
    player,
    fish: [],
    bubbles: [],
    spawnCooldown: 0.4,
    nextFishId: 1,
    elapsed: 0,
  };
}

export type MovementIntent = { x: -1 | 0 | 1; y: -1 | 0 | 1; active: boolean };

export function computeIntent(keys: {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}): MovementIntent {
  const y = keys.up ? -1 : keys.down ? 1 : 0;
  const x = keys.left ? -1 : keys.right ? 1 : 0;
  return { x, y, active: x !== 0 || y !== 0 };
}

export function updateRun(state: RunState, dt: number, intent: MovementIntent) {
  state.elapsed += dt;

  const accel = 1700;
  const maxSpeed = 540;
  const drag = 2.6;

  const ax = intent.x * accel;
  const ay = intent.y * accel;

  state.player.vx += ax * dt;
  state.player.vy += ay * dt;

  const dragFactor = Math.exp(-drag * dt);
  state.player.vx *= dragFactor;
  state.player.vy *= dragFactor;

  const speed = Math.hypot(state.player.vx, state.player.vy);
  if (speed > maxSpeed) {
    const s = maxSpeed / speed;
    state.player.vx *= s;
    state.player.vy *= s;
  }

  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;

  let hb = playerHitbox(state.player);
  const top = 0;
  const bottom = GAME_HEIGHT - 6;
  const left = 0;
  const right = GAME_WIDTH;

  if (hb.y <= top) {
    state.player.y = top + hb.h / 2;
    if (state.player.vy < 0) state.player.vy = 0;
    hb = playerHitbox(state.player);
  }

  if (hb.y + hb.h >= bottom) {
    state.player.y = bottom - hb.h / 2;
    if (state.player.vy > 0) state.player.vy = 0;
    hb = playerHitbox(state.player);
  }

  // Teleport horizontally.
  if (hb.x <= left) state.player.x = right - hb.w / 2;
  else if (hb.x + hb.w >= right) state.player.x = left + hb.w / 2;

  if (intent.x !== 0) state.player.facing = intent.x;

  // Pulse decay.
  state.player.pulseT = Math.max(0, state.player.pulseT - dt);

  // Bubbles (semi-random).
  state.player.bubblesT -= dt;
  if (state.player.bubblesT <= 0) {
    spawnBubbleFromPlayer(state);
    state.player.bubblesT = randFloat(0.18, 0.62);
  }

  // Spawn NPC fish.
  state.spawnCooldown -= dt;
  if (state.spawnCooldown <= 0) {
    spawnFish(state);
    state.spawnCooldown = randFloat(0.35, 1.05);
  }

  // Update NPC fish + cull.
  const spawnMargin = 260;
  const spawnLeft = -spawnMargin;
  const spawnRight = GAME_WIDTH + spawnMargin;

  for (const f of state.fish) {
    f.x += f.vx * dt;
    f.swimPhase += dt;
  }
  state.fish = state.fish.filter((f) => {
    const hbFish = fishHitbox(f);
    if (f.vx > 0) return hbFish.x <= spawnRight;
    return hbFish.x + hbFish.w >= spawnLeft;
  });

  // Update bubbles.
  for (const b of state.bubbles) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life += dt;
  }
  state.bubbles = state.bubbles.filter(
    (b) => b.life < b.maxLife && b.y + b.r >= -20,
  );
}

export function handleCollisions(state: RunState): "none" | "died" {
  const pRect = playerHitbox(state.player);
  for (let i = 0; i < state.fish.length; i++) {
    const f = state.fish[i];
    if (!f) continue;
    const fRect = fishHitbox(f);
    if (!rectsOverlap(pRect, fRect)) continue;

    if (state.player.size >= f.size) {
      // Eat fish.
      state.fish.splice(i, 1);
      i--;
      state.eaten += 1;

      // Growth: barely perceptible, independent of fish size.
      state.player.size += 0.55;
      state.player.pulseT = 0.18;

      // Points: larger fish are worth more.
      const rel = clamp(f.size / Math.max(1, state.player.size), 0.2, 1.2);
      const points = Math.round(lerp(6, 80, rel));
      state.score += points;
    } else {
      return "died";
    }
  }
  return "none";
}

function spawnBubbleFromPlayer(state: RunState) {
  const p = state.player;
  const hb = playerHitbox(p);
  const mouthX = p.facing === 1 ? hb.x + hb.w : hb.x;
  const x = mouthX + p.facing * randFloat(4, 10);
  const y = p.y - hb.h * randFloat(0.05, 0.25);
  state.bubbles.push({
    x,
    y,
    r: randFloat(2.5, 5.5),
    vy: -randFloat(65, 120),
    vx: randFloat(-10, 10),
    life: 0,
    maxLife: randFloat(1.1, 2.3),
  });
}

function spawnFish(state: RunState) {
  const spawnMargin = 260;
  const spawnLeft = -spawnMargin;
  const spawnRight = GAME_WIDTH + spawnMargin;

  const side: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
  const playerSize = state.player.size;

  const logSpread = randFloat(-0.75, 0.75);
  const factor = clamp(Math.exp(logSpread), 0.28, 2.9);
  const size = clamp(playerSize * factor, 18, 210);

  const w = size;
  const h = size * 0.55;
  const waterBottom = GAME_HEIGHT - SAND_HEIGHT + 10;
  const y = randFloat(26 + h / 2, waterBottom - h / 2);

  const t = clamp((size - 18) / (210 - 18), 0, 1);
  const speed = lerp(280, 95, t) * randFloat(0.75, 1.2);
  const vx = side === -1 ? speed : -speed;

  const x = side === -1 ? spawnLeft - w / 2 : spawnRight + w / 2;

  state.fish.push({
    id: state.nextFishId++,
    x,
    y,
    vx,
    size,
    hue: randFloat(15, 230),
    swimPhase: randFloat(0, Math.PI * 2),
  });
}
