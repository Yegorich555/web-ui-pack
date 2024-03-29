export default function canMove(
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
