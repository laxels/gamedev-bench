export type Pointer = {
  x: number;
  y: number;
  inside: boolean;
  clicked: boolean;
};

export function createPointer(
  canvas: HTMLCanvasElement,
  logicalSize: { w: number; h: number },
) {
  const pointer: Pointer = { x: 0, y: 0, inside: false, clicked: false };

  function toLogical(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (logicalSize.w / rect.width);
    const y = (clientY - rect.top) * (logicalSize.h / rect.height);
    return { x, y };
  }

  const onMove = (e: MouseEvent) => {
    const { x, y } = toLogical(e.clientX, e.clientY);
    pointer.x = x;
    pointer.y = y;
    pointer.inside =
      x >= 0 && x <= logicalSize.w && y >= 0 && y <= logicalSize.h;
  };

  const onLeave = () => {
    pointer.inside = false;
  };

  const onClick = (e: MouseEvent) => {
    const { x, y } = toLogical(e.clientX, e.clientY);
    pointer.x = x;
    pointer.y = y;
    pointer.clicked = true;
  };

  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", onLeave);
  canvas.addEventListener("click", onClick);

  return {
    pointer,
    consumeClick() {
      const clicked = pointer.clicked;
      pointer.clicked = false;
      return clicked;
    },
    detach() {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("click", onClick);
    },
  };
}
