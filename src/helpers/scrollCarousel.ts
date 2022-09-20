import onEvent from "./onEvent";

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
  el.style.touchAction = "none";
  const range = [next(-1, []), c, next(1, [])];
  if (!options?.disableRender) {
    el.prepend(...range[0]);
    el.append(...range[2]);
  }

  window.requestAnimationFrame(() => range[1][0]?.scrollIntoView());

  let dt = 0;
  const scroll = (isNext: boolean): void => {
    const now = Date.now();
    console.warn("will scroll", now - dt);
    dt = now;

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

  const r1 = onEvent(
    el,
    "wheel",
    (e) => {
      e.preventDefault();
      const isNext = e.deltaY > 0;
      scroll(isNext);
    },
    { passive: false, capture: true }
  );

  let y = 0;
  let stamp = 0;

  let wasStart = false;
  const r2 = onEvent(
    el,
    "touchstart",
    (e) => {
      y = e.touches[0].clientY;
      wasStart = true;
      el.addEventListener(
        "touchend",
        () => {
          wasStart = false;
        },
        { once: true, passive: true, capture: true }
      );
    },
    { capture: true }
  );

  const dbg = document.querySelector("wup-calendar")!.appendChild(document.createElement("div"));
  dbg.textContent = "Debug";
  const r3 = onEvent(
    el,
    "touchmove",
    (e) => {
      if (!wasStart) {
        return;
      }
      dbg.textContent = `dt: ${Math.round(e.timeStamp - stamp)};  dy: ${
        Math.round((e.touches[0].clientY - y) * 100) / 100
      }`;
      const dy = e.touches[0].clientY - y;
      if (Math.abs(dy) > 10) {
        y = e.touches[0].clientY;
        if (e.timeStamp - stamp > 300) {
          stamp = e.timeStamp;
          scroll(dy < 0);
        }
      }
    },
    { passive: false, capture: true }
  );

  return {
    remove: () => {
      r1();
      r2();
      r3();
    },
  };
}
