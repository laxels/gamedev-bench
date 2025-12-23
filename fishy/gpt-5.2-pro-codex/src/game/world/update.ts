import { clamp, rectsOverlap } from "../geom";
import { anyMovementKey, type InputState, inputAxis } from "../input";
import { randRange } from "../random";
import type { PersistentStats } from "../screens/types";
import type { Pointer } from "../ui";
import type { Bubble, NpcFish, Player } from "./entities";
import { npcRect, playerRect } from "./entities";
import type { SpawnArea } from "./spawn";
import { spawnFish } from "./spawn";

export type PlayBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type World = {
  bounds: PlayBounds;
  spawn: SpawnArea;
  player: Player;
  npcs: NpcFish[];
  bubbles: Bubble[];
  stats: PersistentStats;
  spawnTimer: number;
  ended: boolean;
};

export function createWorld(bounds: PlayBounds, spawn: SpawnArea): World {
  const playerW = 62;
  const playerH = 26;
  return {
    bounds,
    spawn,
    player: {
      x: (bounds.left + bounds.right) / 2,
      y: bounds.top + playerH / 2 + 4,
      vx: 0,
      vy: 460, // starts going downwards fast
      w: playerW,
      h: playerH,
      facing: 1,
      eatPulse: 0,
      bubbleTimer: randRange(0.15, 0.55),
    },
    npcs: [],
    bubbles: [],
    stats: { fishEaten: 0, score: 0 },
    spawnTimer: 0.0,
    ended: false,
  };
}

export function updateWorld(params: {
  world: World;
  dt: number;
  input: InputState;
  pointer: Pointer;
}): void {
  const { world, dt, input } = params;
  if (world.ended) return;

  const player = world.player;
  const { ax, ay } = inputAxis(input);

  const ACCEL = 1200;
  const MAX_SPEED = 340;
  const DRAG = 5.0;

  player.vx += ax * ACCEL * dt;
  player.vy += ay * ACCEL * dt;

  // Momentum decay.
  const dragFactor = Math.exp(-DRAG * dt);
  player.vx *= dragFactor;
  player.vy *= dragFactor;

  // Speed cap.
  player.vx = clamp(player.vx, -MAX_SPEED, MAX_SPEED);
  player.vy = clamp(player.vy, -MAX_SPEED, MAX_SPEED);

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  if (player.vx !== 0) player.facing = player.vx < 0 ? -1 : 1;

  // Boundaries: top/bottom stop momentum; left/right wrap.
  const halfW = player.w / 2;
  const halfH = player.h / 2;

  if (player.y - halfH < world.bounds.top) {
    player.y = world.bounds.top + halfH;
    if (player.vy < 0) player.vy = 0;
  }
  if (player.y + halfH > world.bounds.bottom) {
    player.y = world.bounds.bottom - halfH;
    if (player.vy > 0) player.vy = 0;
  }

  if (player.x - halfW < world.bounds.left) {
    player.x = world.bounds.right - halfW;
  } else if (player.x + halfW > world.bounds.right) {
    player.x = world.bounds.left + halfW;
  }

  // Spawn NPC fish.
  const baseSpawnRate = 0.85; // fish / second
  const rate = baseSpawnRate + world.stats.fishEaten * 0.01;
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    world.spawnTimer += 1 / clamp(rate, 0.25, 3.0);
    world.npcs.push(
      spawnFish({
        spawn: world.spawn,
        playerW: player.w,
        playerH: player.h,
      }),
    );
  }

  for (const f of world.npcs) {
    f.x += f.vx * dt;
  }

  // Remove out-of-range NPC fish.
  world.npcs = world.npcs.filter(
    (f) =>
      f.x + f.w / 2 > world.spawn.left - 220 &&
      f.x - f.w / 2 < world.spawn.right + 220,
  );

  // Bubbles (semi-random intervals).
  player.bubbleTimer -= dt;
  if (player.bubbleTimer <= 0) {
    player.bubbleTimer = randRange(0.18, 0.65);
    const mouthX = player.x + player.facing * (player.w * 0.35);
    const mouthY = player.y - player.h * 0.08;
    world.bubbles.push({
      x: mouthX + randRange(-3, 3),
      y: mouthY + randRange(-2, 2),
      r: randRange(2.5, 6.0),
      vy: randRange(40, 80),
      life: randRange(1.4, 2.4),
    });
  }

  for (const b of world.bubbles) {
    b.y -= b.vy * dt;
    b.life -= dt;
  }
  world.bubbles = world.bubbles.filter((b) => b.life > 0);

  // Eat pulse decay.
  if (player.eatPulse > 0)
    player.eatPulse = Math.max(0, player.eatPulse - dt * 3.2);

  // Collisions.
  const pr = playerRect(player);
  for (let i = world.npcs.length - 1; i >= 0; i--) {
    const f = world.npcs[i];
    if (!f) continue;
    if (!rectsOverlap(pr, npcRect(f))) continue;

    if (player.w >= f.w) {
      world.npcs.splice(i, 1);

      world.stats.fishEaten += 1;
      world.stats.score += Math.max(1, Math.round((f.w / 10) ** 2));

      // Growth is barely perceptible and scales with fish eaten count, not eaten fish size.
      const grow = 0.62;
      player.w += grow;
      player.h += grow * 0.42;
      player.eatPulse = 1;
    } else {
      world.ended = true;
      return;
    }
  }
}

export function isPlayerSwimming(input: InputState): boolean {
  return anyMovementKey(input);
}
