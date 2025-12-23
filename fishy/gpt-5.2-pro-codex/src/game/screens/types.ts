export type ScreenKind =
  | "menu"
  | "instructions"
  | "play"
  | "gameOver"
  | "playAgain";

export type PersistentStats = {
  fishEaten: number;
  score: number;
};

export type ScreenBase = {
  kind: ScreenKind;
};
