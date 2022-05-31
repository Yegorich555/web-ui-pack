import { getBoundingInternalRect } from "../popup/popupPlacements";
import { findScrollParentAll } from "./findScrollParent";

type BasicRect = Pick<DOMRect, "top" | "right" | "bottom" | "left">;

/**
 * Check if element is visible in scrollable parents
 * @param scrollParents point parents if it's already defined outside function
 * @param childRect point el.getBoundingClientRect result if it's already defined outside function
 */
export default function isIntoView(
  el: HTMLElement,
  scrollParents?: HTMLElement[] | null,
  childRect?: BasicRect
): boolean {
  scrollParents = scrollParents || findScrollParentAll(el);

  let child: BasicRect = childRect ?? el.getBoundingClientRect();
  const vH = Math.max(document.documentElement.clientHeight, window.innerHeight);
  const vW = Math.max(document.documentElement.clientWidth, window.innerWidth);
  // todo check if partial hidden and retun complex object {isPartialHidden: bool}
  let isHiddenByScroll = false;

  // checking if visible in viewPort
  const isHiddenInViewport = (item: BasicRect) => item.top > vH || item.left > vW || item.bottom < 0 || item.right < 0;

  if (scrollParents) {
    for (let i = 0; i < scrollParents.length; ++i) {
      const p = getBoundingInternalRect(scrollParents[i]);
      isHiddenByScroll =
        p.top >= child.bottom || //
        p.bottom <= child.top ||
        p.left >= child.right ||
        p.right <= child.left ||
        isHiddenInViewport(child);

      if (isHiddenByScroll) break;
      child = p as DOMRect;
    }
    return !isHiddenByScroll;
  }

  return !isHiddenInViewport(child);
}
