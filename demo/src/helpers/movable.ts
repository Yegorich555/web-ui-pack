function canMove(
  el: HTMLElement & { posX: number; posY: number },
  dx?: number,
  dy?: number,
  isMoveTo?: boolean
): { dx: number; dy: number } | false {
  let x = isMoveTo && dx != null ? dx : el.posX + (dx || 0);
  let y = isMoveTo && dy != null ? dy : el.posY + (dy || 0);
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (el.parentElement) {
    const r = el.getBoundingClientRect();
    const right = el.parentElement.clientWidth - r.width;
    const bottom = el.parentElement.clientHeight - r.height;
    if (x > right) x = right;
    if (y > bottom) y = bottom;
  }

  if (el.posX === x && el.posY === y) {
    return false;
  }
  return { dx: x - el.posX, dy: y - el.posY };
}

export default function movable(refEl: HTMLElement) {
  let isDown = false;
  const el = refEl as unknown as HTMLElement & { posX: number; posY: number };
  el.posX = 0;
  el.posY = 0;
  el.style.outline = "none";
  el.style.background = "red";
  el.style.cursor = "grab";
  el.addEventListener("mousedown", () => {
    isDown = true;
    el.style.cursor = "grabbing";
    document.body.style.cursor = "grabbing";
  });
  document.addEventListener("mouseup", () => {
    isDown = false;
    el.style.cursor = "grab";
    document.body.style.cursor = "";
  });
  // eslint-disable-next-line no-inner-declarations
  function move(x: number, y: number) {
    const can = canMove(el, x, y);
    if (can) {
      el.posX += can.dx;
      el.posY += can.dy;
      el.style.transform = `translate(${el.posX}px, ${el.posY}px)`;
    }
  }
  document.addEventListener("mousemove", (e) => isDown && move(e.movementX, e.movementY));

  return move;
}
