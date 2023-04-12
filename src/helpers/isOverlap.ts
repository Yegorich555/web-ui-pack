/** Return whether to elements overlaps each other or not; user htmlElement.getBoundingClientRect() */
export default function isOverlap(elRect1: DOMRect, elRect2: DOMRect): boolean {
  return !(
    elRect1.top > elRect2.bottom ||
    elRect1.right < elRect2.left ||
    elRect1.bottom < elRect2.top ||
    elRect1.left > elRect2.right
  );
}
