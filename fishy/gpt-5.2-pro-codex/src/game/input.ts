export type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export function createInput(): {
  state: InputState;
  dispose: () => void;
} {
  const state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  const onKey = (ev: KeyboardEvent, isDown: boolean) => {
    const k = ev.key.toLowerCase();
    const handled =
      k === "arrowup" ||
      k === "w" ||
      k === "arrowdown" ||
      k === "s" ||
      k === "arrowleft" ||
      k === "a" ||
      k === "arrowright" ||
      k === "d";
    if (!handled) return;

    ev.preventDefault();

    if (k === "arrowup" || k === "w") state.up = isDown;
    if (k === "arrowdown" || k === "s") state.down = isDown;
    if (k === "arrowleft" || k === "a") state.left = isDown;
    if (k === "arrowright" || k === "d") state.right = isDown;
  };

  const onKeyDown = (ev: KeyboardEvent) => onKey(ev, true);
  const onKeyUp = (ev: KeyboardEvent) => onKey(ev, false);

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    state,
    dispose: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}

export function inputAxis(state: InputState): { ax: number; ay: number } {
  // Opposing key rule from spec:
  // Up overrides down, left overrides right.
  const ay = state.up ? -1 : state.down ? 1 : 0;
  const ax = state.left ? -1 : state.right ? 1 : 0;
  return { ax, ay };
}

export function anyMovementKey(state: InputState): boolean {
  return state.up || state.down || state.left || state.right;
}
