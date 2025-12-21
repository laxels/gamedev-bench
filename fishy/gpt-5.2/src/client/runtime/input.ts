export type KeyState = Readonly<{
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}>;

export type Input = Readonly<{
  keys: KeyState;
  anyMovementKey: boolean;
}>;

const MOVEMENT_KEYS: Record<string, keyof KeyState> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

export function createKeyboardInput(): {
  get(): Input;
  attach(target: Window): () => void;
} {
  const keys: KeyState = { up: false, down: false, left: false, right: false };
  const mutable = { ...keys };

  function setKey(code: string, pressed: boolean) {
    const mapped = MOVEMENT_KEYS[code];
    if (!mapped) return;
    mutable[mapped] = pressed;
  }

  return {
    get() {
      const snapshot: KeyState = { ...mutable };
      return {
        keys: snapshot,
        anyMovementKey:
          snapshot.up || snapshot.down || snapshot.left || snapshot.right,
      };
    },
    attach(target: Window) {
      const onKeyDown = (e: KeyboardEvent) => {
        setKey(e.code, true);
        if (MOVEMENT_KEYS[e.code]) e.preventDefault();
      };
      const onKeyUp = (e: KeyboardEvent) => {
        setKey(e.code, false);
        if (MOVEMENT_KEYS[e.code]) e.preventDefault();
      };
      const onBlur = () => {
        mutable.up = false;
        mutable.down = false;
        mutable.left = false;
        mutable.right = false;
      };

      target.addEventListener("keydown", onKeyDown, { passive: false });
      target.addEventListener("keyup", onKeyUp, { passive: false });
      target.addEventListener("blur", onBlur);

      return () => {
        target.removeEventListener("keydown", onKeyDown);
        target.removeEventListener("keyup", onKeyUp);
        target.removeEventListener("blur", onBlur);
      };
    },
  };
}
