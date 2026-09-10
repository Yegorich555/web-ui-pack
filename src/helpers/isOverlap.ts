/** Rect-edges required by {@link isOverlap} - WARN: only the edges are read, so a derived (non-DOMRect) rect fits too */
export type WUPRectEdges = Pick<DOMRect, "top" | "right" | "bottom" | "left">;

/** Return whether to elements overlaps each other or not; use HTMLElement.getBoundingClientRect() */
export default function isOverlap(elRect1: WUPRectEdges, elRect2: WUPRectEdges): boolean {
  return !(
    elRect1.top > elRect2.bottom ||
    elRect1.right < elRect2.left ||
    elRect1.bottom < elRect2.top ||
    elRect1.left > elRect2.right
  );
}
