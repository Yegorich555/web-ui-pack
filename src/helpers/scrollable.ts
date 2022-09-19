/* eslint-disable prefer-destructuring */
interface Scrollable {
  /** Call this to remove listener */
  remove: () => void;
}

const enum ScrollModes {
  /** When user scrolls it's alligned scroll so current element is rendered at the center of screen;
   *  Expected only 1 visible block at once */
  carousel = 0,
}
interface ScrollableOptions {
  /** Point 'true' when you need to skip built-in render-functions (for React app, Vue etc.) */
  disableRender?: boolean;
  /** Scroll mode of current function
   *  @default ScrollModes.carousel */
  mode?: ScrollModes;
}

/**
 * Function makes pointed element scrollable and implements unordinary scroll-behavior according to pointed mode: Carousel/VirtualScroll etc.
 *
 * @param el HTMLElement that need to make scrollable
 * @param next Callback when need to append new items on layout
 */
export default function scrollable(
  el: HTMLElement,
  next: (direction: -1 | 1, prevItems: HTMLElement[]) => HTMLElement[],
  options?: ScrollableOptions
): Scrollable {
  let lock = false;
  const c = Array.prototype.slice.call(el.children) as HTMLElement[];
  el.style.maxHeight = `${el.offsetHeight}px`;
  const range = [next(-1, []), c, next(1, [])];
  if (!options?.disableRender) {
    el.prepend(...range[0]);
    el.append(...range[2]);
  }
  window.requestAnimationFrame(() => {
    range[1][0]?.scrollIntoView();
    window.requestAnimationFrame(() => el.addEventListener("scroll", onScroll));
  });
  let prevScrollTop = -1;

  const onScroll = (): void => {
    if (lock) {
      return;
    }
    const sv = el.scrollTop;
    const isNext = sv > prevScrollTop;
    lock = true;

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

    // todo if user scroll fast it doesn't work
    range[1][0]?.scrollIntoView(); // { behavior: "smooth" });

    setTimeout(() => {
      lock = false;
      prevScrollTop = el.scrollTop;
    }, 100); // todo does it enough when behavior 'smooth' ???
  };

  return {
    remove: () => el.removeEventListener("scroll", onScroll),
  };
}
