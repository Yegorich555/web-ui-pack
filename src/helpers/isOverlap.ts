/** Return whether to elements overlaps each other or not; use HTMLElement.getBoundingClientRect() */
export default function isOverlap(
  elRect1: Pick<DOMRect, "top" | "right" | "bottom" | "left">,
  elRect2: Pick<DOMRect, "top" | "right" | "bottom" | "left">
): boolean {
  return !(
    elRect1.top > elRect2.bottom ||
    elRect1.right < elRect2.left ||
    elRect1.bottom < elRect2.top ||
    elRect1.left > elRect2.right
  );
}
