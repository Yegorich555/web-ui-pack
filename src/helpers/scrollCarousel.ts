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
  if (el.offsetHeight) el.style.maxHeight = `${el.offsetHeight}px`;
  el.style.overflow = "hidden";
  el.style.touchAction = "none";

  const c = Array.prototype.slice.call(el.children) as HTMLElement[];
  const range = [next(-1, []), c, next(1, [])];
  if (!options?.disableRender) {
    el.prepend(...range[0]);
    el.append(...range[2]);
  }

  /** Scroll to center of range */
  const scrollToRange = (isSmooth: boolean): void => {
    const y1 = range[1][0].offsetTop - el.offsetTop;
    const x1 = range[1][0].offsetLeft - el.offsetLeft;
    const $2 = range[1][range[1].length - 1];
    const y2 = $2.offsetTop + $2.offsetHeight - el.offsetTop;
    const x2 = $2.offsetLeft + $2.offsetWidth - el.offsetLeft;
    const top = y1 + (y2 - y1 - el.offsetHeight) / 2;
    const left = x1 + (x2 - x1 - el.offsetWidth) / 2;
    el.scroll({ top, left, behavior: isSmooth ? "smooth" : "auto" });
  };

  window.requestAnimationFrame(() => scrollToRange(false));

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

    scrollToRange(true);
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
      const isYScroll = el.scrollHeight - el.offsetHeight > el.scrollWidth - el.offsetWidth;
      let xy = isYScroll ? ev.touches[0].clientY : ev.touches[0].clientX;
      let stamp = 0;
      const rOnTouchMove = onEvent(
        el,
        "touchmove",
        (e) => {
          const xyNew = isYScroll ? e.touches[0].clientY : e.touches[0].clientX;
          const diff = xyNew - xy;
          if (Math.abs(diff) > (options?.swipeDebounceDelta ?? 10)) {
            xy = xyNew;
            if (e.timeStamp - stamp > (options?.swipeDebounceMs ?? 300)) {
              stamp = e.timeStamp;
              scroll(diff < 0);
            }
          }
        },
        { passive: false } // WARN don't set capture: true; otherwise it's not removed
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
