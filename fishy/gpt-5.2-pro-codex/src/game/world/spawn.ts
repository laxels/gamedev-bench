import { lerp } from "../geom";
import { chance, randInt, randRange } from "../random";
import type { NpcFish } from "./entities";

export type SpawnArea = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

let nextId = 1;

export function spawnFish(params: {
  spawn: SpawnArea;
  playerW: number;
  playerH: number;
}): NpcFish {
  const { spawn, playerW, playerH } = params;
  const side: "left" | "right" = chance(0.5) ? "left" : "right";

  // A loose distribution: many smaller than the player, but always some threats.
  const threat = chance(0.38);
  const factor = threat ? randRange(1.05, 2.2) : randRange(0.35, 0.98);

  const base = Math.max(playerW, 42);
  const w = base * factor;
  const h = Math.max(14, playerH * factor * 0.75);

  const y = randRange(spawn.top + h / 2, spawn.bottom - h / 2);

  const facing: -1 | 1 = side === "left" ? 1 : -1;
  const speed = lerp(180, 55, Math.min(1, (w - 40) / 260)) + randRange(-20, 20);
  const vx = speed * facing;

  const x = side === "left" ? spawn.left - w / 2 : spawn.right + w / 2;

  return {
    id: nextId++,
    x,
    y,
    vx,
    w,
    h,
    facing,
    hue: randInt(190, 260),
  };
}
