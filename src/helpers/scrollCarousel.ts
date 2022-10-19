import onEvent from "./onEvent";
import onScrollStop from "./onScrollStop";

/* eslint-disable prefer-destructuring */
interface ScrollResult {
  /** Call this to remove listener */
  remove: () => void;
  /** Call this to fire scrolling manually */
  scroll: (isNext: boolean) => Promise<void>;
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
  next: (direction: -1 | 1) => HTMLElement[] | null,
  options?: ScrollOptions
): ScrollResult {
  el.style.maxHeight = "";
  if (el.offsetHeight) el.style.maxHeight = `${el.offsetHeight}px`;
  el.style.overflow = "hidden";
  el.style.touchAction = "none";

  // todo leave details: if need render images it will produce not-loaded images during the scrolling

  /** Scroll to center of range */
  const scrollToRange = (isSmooth: boolean, items: HTMLElement[]): void => {
    const y1 = items[0].offsetTop - el.offsetTop;
    const x1 = items[0].offsetLeft - el.offsetLeft;
    const $2 = items[items.length - 1];
    const y2 = $2.offsetTop + $2.offsetHeight - el.offsetTop;
    const x2 = $2.offsetLeft + $2.offsetWidth - el.offsetLeft;
    const top = y1 + (y2 - y1 - el.offsetHeight) / 2;
    const left = x1 + (x2 - x1 - el.offsetWidth) / 2;
    el.scroll({ top, left, behavior: isSmooth ? "smooth" : "auto" });
  };

  let items = Array.prototype.slice.call(el.children) as HTMLElement[];
  window.requestAnimationFrame(() => scrollToRange(false, items));

  const saveScroll = (): (() => void) => {
    const savedItems = [items[0], items[items.length - 1]];
    return () => scrollToRange(false, savedItems);
  };

  const scroll = (isNext: boolean): Promise<void> => {
    const s = saveScroll();
    items.forEach((a) => ((a as any).__scrollRemove = true));
    const itemsNext = next(isNext ? 1 : -1);
    if (!itemsNext) {
      items.forEach((a) => delete (a as any).__scrollRemove);
      return Promise.resolve(); // if no new items
    }
    if (!options?.disableRender) {
      isNext ? el.append(...itemsNext) : el.prepend(...itemsNext);
    }
    s();
    scrollToRange(true, itemsNext);
    const prevItems = items;
    items = itemsNext.map((a) => {
      delete (a as any).__scrollRemove;
      return a;
    });

    return new Promise<void>((resolve) => {
      onScrollStop(
        el,
        () => {
          // const s2 = saveScroll(); // looks like save scroll not required
          !options?.disableRender && prevItems.forEach((a) => (a as any).__scrollRemove && a.remove());
          resolve();
          // s2();
        },
        { onceNotStarted: true }
      );
    });
  };

  const rOnWheel = onEvent(
    el,
    "wheel",
    (e) => {
      e.preventDefault(); // prevent body scroll
      scroll(e.deltaY > 0);
    },
    { passive: false }
  );

  const rOnKeydown = onEvent(
    el,
    "keydown",
    (e) => {
      if (!e.altKey && !e.shiftKey && !e.ctrlKey && !e.defaultPrevented && e.key.startsWith("Page")) {
        e.preventDefault();
        scroll(!e.key.endsWith("Up"));
      }
    },
    { passive: false }
  );

  const rOnTouch = onEvent(el, "touchstart", (ev) => {
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

    el.addEventListener("touchend", rOnTouchMove, { once: true, passive: true });
  });

  return {
    remove: () => {
      rOnWheel();
      rOnKeydown();
      rOnTouch();
    },
    scroll,
  };
}
