import type { Rect } from "../geom";

export type Bubble = {
  x: number;
  y: number;
  r: number;
  vy: number;
  life: number;
};

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: -1 | 1;
  eatPulse: number;
  bubbleTimer: number;
};

export type NpcFish = {
  id: number;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  facing: -1 | 1;
  hue: number;
};

export function playerRect(p: Player): Rect {
  return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
}

export function npcRect(f: NpcFish): Rect {
  return { x: f.x - f.w / 2, y: f.y - f.h / 2, w: f.w, h: f.h };
}
