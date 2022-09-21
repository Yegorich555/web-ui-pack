import onEvent from "./onEvent";

/* eslint-disable prefer-destructuring */
interface ScrollResult {
  /** Call this to remove listener */
  remove: () => void;
  /** Call this to fire scrolling manually */
  scroll: (isNext: boolean) => void;
}

interface ScrollOptions {
  /** Point 'true' when you need to skip built-in render-functions (for React app, Vue etc.) */
  disableRender?: boolean;
  /** Time between scrolls during the user-swipe on touchpads
   * @defaultValue 300 */
  swipeDebounceMs?: number;
  /** Min swipe-movement in pixels when need to scroll
   * @defaultValue 10 */
  swipeDebounceDelta?: number;
}

/**
 * Function makes pointed element scrollable and implements carousel-scroll behavior (during the scroll appends new items)
 *
 * @param el HTMLElement that need to make scrollable
 * @param next Callback when need to append new items on layout
 */
export default function scrollCarousel(
  el: HTMLElement,
  next: (direction: -1 | 1, prevItems: HTMLElement[]) => HTMLElement[],
  options?: ScrollOptions
): ScrollResult {
  const c = Array.prototype.slice.call(el.children) as HTMLElement[];
  el.style.maxHeight = `${el.offsetHeight}px`;
  el.style.overflow = "hidden";
  el.style.touchAction = "none";
  const range = [next(-1, []), c, next(1, [])];
  if (!options?.disableRender) {
    el.prepend(...range[0]);
    el.append(...range[2]);
  }

  window.requestAnimationFrame(() => range[1][0]?.scrollIntoView());

  const scroll = (isNext: boolean): void => {
    if (isNext) {
      const toUpdate = range[0];
      range[0] = range[1];
      range[1] = range[2];
      range[2] = next(1, toUpdate);
      if (!options?.disableRender) {
        for (let i = toUpdate.length - 1; i >= range[2].length; --i) {
          toUpdate[i].remove(); // remove other if added less than was before
        }
        el.append(...range[2]); // move previous to the end
      }
    } else {
      const toUpdate = range[2];
      range[2] = range[1];
      range[1] = range[0];
      range[0] = next(-1, toUpdate);
      if (!options?.disableRender) {
        for (let i = toUpdate.length - 1; i >= range[0].length; --i) {
          toUpdate[i].remove(); // remove other if added less than was before
        }
        el.prepend(...range[0]); // move previous to the end
      }
    }

    range[1][0]?.scrollIntoView({ behavior: "smooth" });
  };

  const rOnWheel = onEvent(
    el,
    "wheel",
    (e) => {
      e.preventDefault(); // prevent body scroll
      scroll(e.deltaY > 0);
    },
    { passive: false, capture: true }
  );

  const rOnTouch = onEvent(
    el,
    "touchstart",
    (ev) => {
      let y = ev.touches[0].clientY;
      let stamp = 0;
      const rOnTouchMove = onEvent(
        el,
        "touchmove",
        (e) => {
          // todo also detect scrollX
          const dy = e.touches[0].clientY - y;
          if (Math.abs(dy) > (options?.swipeDebounceDelta ?? 10)) {
            y = e.touches[0].clientY;
            if (e.timeStamp - stamp > (options?.swipeDebounceMs ?? 300)) {
              stamp = e.timeStamp;
              scroll(dy < 0);
            }
          }
        },
        { passive: false, capture: true }
      );

      el.addEventListener("touchend", rOnTouchMove, { once: true, passive: true, capture: true });
    },
    { capture: true }
  );

  return {
    remove: () => {
      rOnWheel();
      rOnTouch();
    },
    scroll,
  };
}
