/* eslint-disable prefer-destructuring */
interface ScrollResult {
  /** Call this to remove listener */
  remove: () => void;
}

interface ScrollOptions {
  /** Point 'true' when you need to skip built-in render-functions (for React app, Vue etc.) */
  disableRender?: boolean;
}

/**
 * Function makes pointed element scrollable and implements carousel scroll behavior when during the scroll need to append new items
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
  const range = [next(-1, []), c, next(1, [])];
  if (!options?.disableRender) {
    el.prepend(...range[0]);
    el.append(...range[2]);
  }

  window.requestAnimationFrame(() => range[1][0]?.scrollIntoView());

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const isNext = e.deltaY > 0;
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

  el.addEventListener("wheel", onWheel);
  // todo add swipe-scroll
  return {
    remove: () => el.removeEventListener("wheel", onWheel),
  };
}
