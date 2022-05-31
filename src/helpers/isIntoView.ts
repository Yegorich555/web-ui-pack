import { getBoundingInternalRect } from "../popup/popupPlacements";
import { findScrollParentAll } from "./findScrollParent";

type BasicRect = Pick<DOMRect, "top" | "right" | "bottom" | "left">;

interface IntoViewOptions {
  /** Point parents if it's already defined outside function */
  scrollParents?: HTMLElement[] | null;
  /** Point el.getBoundingClientRect result if it's already defined outside function */
  childRect?: BasicRect;
  /** Virtual margin of target element [top, right, bottom, left] or [top/bottom, right/left] in px */
  offset?: [number, number] | [number, number, number, number];
}

interface IntoViewResult {
  /** Completely hidden by parents x-scroll (hidden within horizontal scroll) */
  hiddenX: boolean;
  /** Completely hidden by parents y-scroll (hidden within vertical scroll) */
  hiddenY: boolean;
  /** Partially hidden/visible by parents x-scroll */
  partialHiddenX: boolean;
  /** Partially hidden/visible by parents y-scroll */
  partialHiddenY: boolean;

  /** Completely hidden (when hiddenX || hiddenY) */
  hidden: boolean;
  /** Completely visible */
  visible: boolean;
  /** Partial hidden/visible (when partialHiddenX || partialHiddenY) */
  partialVisible: boolean;
}

/** Check if element is visible in scrollable parents */
export default function isIntoView(el: HTMLElement, options?: IntoViewOptions): IntoViewResult {
  const scrollParents = options?.scrollParents || findScrollParentAll(el) || [document.body];

  let child: BasicRect = options?.childRect ?? el.getBoundingClientRect();
  if (options?.offset) {
    child = {
      top: child.top - options.offset[0],
      left: child.left - (options.offset[3] ?? options.offset[1]),
      right: child.right + options.offset[1],
      bottom: child.bottom + (options.offset[2] ?? options.offset[0]),
    };
  }
  const vH = Math.max(document.documentElement.clientHeight, window.innerHeight);
  const vW = Math.max(document.documentElement.clientWidth, window.innerWidth);
  const r: IntoViewResult = {
    hiddenX: false,
    hiddenY: false,
    partialHiddenX: false,
    partialHiddenY: false,

    visible: true,
    hidden: false,
    partialVisible: false,
  };

  // checking if visible in viewPort
  // const isHiddenInViewport = (item: BasicRect) => item.top > vH || item.left > vW || item.bottom < 0 || item.right < 0;

  for (let i = 0; i < scrollParents.length; ++i) {
    const p = getBoundingInternalRect(scrollParents[i]);
    const isHiddenY = child.top > vH || child.bottom < 0 || p.top >= child.bottom || p.bottom <= child.top;
    const isHiddenX = child.left > vW || child.right < 0 || p.left >= child.right || p.right <= child.left;
    if (isHiddenY) {
      r.hiddenY = true;
    } else if (!r.hiddenY) {
      r.partialHiddenY = child.top < 0 || child.bottom > vH || child.top < p.top || child.bottom > p.bottom;
    }
    if (isHiddenX) {
      r.hiddenX = true;
    } else if (!r.hiddenX) {
      r.partialHiddenX = child.left < 0 || child.right > vW || child.left < p.left || child.right > p.right;
    }

    child = p as DOMRect;
  }

  r.hidden = r.hiddenX || r.hiddenY;
  r.visible = !r.hidden && !r.partialHiddenX && !r.partialHiddenY;
  r.partialVisible = !r.hidden && (r.partialHiddenX || r.partialHiddenY);
  return r;
}
