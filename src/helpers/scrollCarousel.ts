import onEvent from "./onEvent";
import onScroll, { IScrollOptions } from "./onScroll";
import onScrollStop from "./onScrollStop";

/* eslint-disable prefer-destructuring */
interface ScrollResult {
  /** Call this to remove listener */
  remove: () => void;
  /** Call this to fire scrolling manually */
  scroll: (isNext: boolean) => Promise<void>;
}

interface ScrollCarouselOptions extends IScrollOptions {
  /** Point 'true' when you need to skip built-in render-functions (for React app, Vue etc.) */
  disableRender?: boolean;
}

// WARN: this helper is very specific and works only for calendar

/**
 * Function makes pointed element scrollable and implements carousel-scroll behavior (appends new items during the scrolling).
 * Supports swipe/pageUp/pageDown/mouseWheel events.
 * usage-details you can find in CalendarControl implementation
 * @param el HTMLElement that need to make scrollable
 * @param next Callback when need to append new items on layout
 */
export default function scrollCarousel(
  el: HTMLElement,
  next: (direction: -1 | 1) => HTMLElement[] | null,
  options?: ScrollCarouselOptions
): ScrollResult {
  el.style.maxHeight = "";
  el.style.maxWidth = "";
  const { maxHeight, maxWidth } = getComputedStyle(el);
  const isYScroll = !options?.isXScroll;

  // WARN: it affects on flexible container when user rotates mobile and size must be changed ?
  const restrict = (): void => {
    /* istanbul ignore else */
    if (isYScroll && !maxHeight?.endsWith("px") && el.offsetHeight) el.style.maxHeight = `${el.offsetHeight}px`;
    /* istanbul ignore else */
    if (!isYScroll && !maxWidth?.endsWith("px") && el.offsetWidth) el.style.maxWidth = `${el.offsetWidth}px`;
  };
  !el.offsetHeight || !el.offsetWidth ? setTimeout(restrict) : restrict();

  el.style.overflow = "hidden";
  el.style.touchAction = "none";

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
    if (!itemsNext?.length) {
      items.forEach((a) => delete (a as any).__scrollRemove);
      return Promise.resolve(); // if no new items
    }
    /* istanbul ignore else */
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

  const rOnScroll = onScroll(el, (d) => scroll(d > 0), options);
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

  return {
    remove: () => {
      rOnScroll();
      rOnKeydown();
    },
    scroll,
  };
}
