import { findScrollParentAll } from "./findScrollParent";
import { getBoundingInternalRect } from "./styleHelpers";
import viewportSize from "./viewportSize";

type BasicRect = Pick<DOMRect, "top" | "right" | "bottom" | "left">;

interface IntoViewOptions {
  /** Point parents if it's already defined outside function */
  scrollParents?: HTMLElement[] | null;
  /** Point el.getBoundingClientRect result if it's already defined outside function */
  elRect?: BasicRect;
  /** Virtual margin of target element [top, right, bottom, left] or [top/bottom, right/left] in px */
  offset?: [number, number] | [number, number, number, number];
}

interface IntoViewResult {
  /** Completely hidden by parents x-scroll (hidden within horizontal scroll) */
  hiddenX: false | HTMLElement;
  /** Completely hidden by parents y-scroll (hidden within vertical scroll) */
  hiddenY: false | HTMLElement;
  /** Partially hidden/visible by parents x-scroll */
  partialHiddenX: false | HTMLElement;
  /** Partially hidden/visible by parents y-scroll */
  partialHiddenY: false | HTMLElement;

  /** Completely hidden (when hiddenX || hiddenY) */
  hidden: false | HTMLElement;
  /** Completely visible */
  visible: boolean;
  /** Partial hidden/visible (when partialHiddenX || partialHiddenY) */
  partialVisible: false | HTMLElement;
}

/** Checks if element is visible in scrollable parents and returns detailed result;
 *
 * If need to get scrollable parents too then use the following logic
 * @example
 * ```js
 * const scrollParents = findScrollParentAll(el) || [document.body];
 * const result = isIntoView(el, { scrollParents });
 * ``` */
export default function isIntoView(el: Element, options?: IntoViewOptions): IntoViewResult {
  const scrollParents = options?.scrollParents || findScrollParentAll(el) || [document.body];

  let child: BasicRect = options?.elRect ?? el.getBoundingClientRect();
  if (options?.offset) {
    child = {
      top: child.top - options.offset[0],
      left: child.left - (options.offset[3] ?? options.offset[1]),
      right: child.right + options.offset[1],
      bottom: child.bottom + (options.offset[2] ?? options.offset[0]),
    };
  }
  const vp = viewportSize();
  const r: IntoViewResult = {
    hiddenX: false,
    hiddenY: false,
    partialHiddenX: false,
    partialHiddenY: false,

    visible: true,
    hidden: false,
    partialVisible: false,
  };

  interface ISaved {
    (): Omit<WUP.Popup.Place.Rect, "el">;
    _saved: Omit<WUP.Popup.Place.Rect, "el">;
  }

  for (let i = 0; i < scrollParents.length; ++i) {
    let isVisY = false;
    let isVisX = false;
    const elRect = scrollParents[i].getBoundingClientRect();
    const p: ISaved = <ISaved>(() => {
      if (!p._saved) {
        const s = getComputedStyle(scrollParents[i]);
        isVisY = s.overflowY === "visible";
        isVisX = s.overflowX === "visible";
        p._saved = getBoundingInternalRect(scrollParents[i], { computedStyle: s, elRect });
      }
      return p._saved; // implemented to cache huge getComputedStyle/getBoundingInternalRect
    });

    const isHiddenY = // checking if visible in viewPort also
      ((child.top > vp.vh || child.bottom < 0) && document.documentElement) ||
      ((p().top >= child.bottom || p().bottom <= child.top) && !isVisY && scrollParents[i]);
    const isHiddenX =
      ((child.left > vp.vw || child.right < 0) && document.documentElement) ||
      ((p().left >= child.right || p().right <= child.left) && !isVisX && scrollParents[i]);

    if (isHiddenY) {
      r.hiddenY = isHiddenY;
    } else if (!r.hiddenY) {
      r.partialHiddenY =
        ((child.top < 0 || child.bottom > vp.vh) && document.documentElement) ||
        ((child.top < p().top || child.bottom > p().bottom) && !isVisY && scrollParents[i]);
    }
    if (isHiddenX) {
      r.hiddenX = isHiddenX;
    } else if (!r.hiddenX) {
      r.partialHiddenX =
        ((child.left < 0 || child.right > vp.vw) && document.documentElement) ||
        ((child.left < p().left || child.right > p().right) && !isVisX && scrollParents[i]);
    }

    child = elRect;
  }

  r.hidden = r.hiddenX || r.hiddenY;
  r.visible = !r.hidden && !r.partialHiddenX && !r.partialHiddenY;
  r.partialVisible = !r.hidden && (r.partialHiddenX || r.partialHiddenY);
  return r;
}
