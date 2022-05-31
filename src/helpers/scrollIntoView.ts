import findScrollParent from "./findScrollParent";
import isIntoView from "./isIntoView";

export interface WUPScrollOptions {
  /** Scroll animation time; Set 0 or null to disable
   * @defaultValue 400 */
  smoothMs?: number;
  /** Offset that must be applied to scrollTop;
   * @defaultValue -30 */
  offsetTop?: number;
  /** Offset that must be applied to scrollLeft;
   * @defaultValue -30 */
  offsetLeft?: number;
  /** Scroll only if element out of view;
   * @defaultValue true */
  onlyIfNeeded?: boolean;
}

/** Scroll the HTMLElement's parent container such that the element is visible to the user and return promise by animation end */
export default function scrollIntoView(el: HTMLElement, options?: WUPScrollOptions): Promise<void> {
  const opts: WUPScrollOptions = { smoothMs: 400, offsetTop: -30, offsetLeft: -30, onlyIfNeeded: true, ...options };
  const p = findScrollParent(el);
  if (!p) {
    return Promise.resolve();
  }
  const fromTop = p.scrollTop;
  const fromLeft = p.scrollLeft;
  const elRect = el.getBoundingClientRect();
  const pRect = p.getBoundingClientRect();

  const diffTop = elRect.top - pRect.top + (opts.offsetTop ?? 0);
  const diffLeft = elRect.left - pRect.left + (opts.offsetLeft ?? 0);

  if (!opts.smoothMs) {
    p.scrollBy({ top: diffTop, left: diffLeft, behavior: "auto" });
    return Promise.resolve();
  }

  if (opts.onlyIfNeeded && isIntoView(el, [p])) {
    return Promise.resolve();
  }

  const scrollTopEnd = p.scrollHeight - p.offsetHeight;
  const toTop = Math.min(scrollTopEnd, Math.max(0, fromTop + diffTop));

  const scrollLeftEnd = p.scrollWidth - p.offsetWidth;
  const toLeft = Math.min(scrollLeftEnd, Math.max(0, fromLeft + diffLeft));

  const animTime = opts.smoothMs;
  return new Promise((resolve) => {
    let start = 0;
    const animate = (t: DOMHighResTimeStamp) => {
      if (!start) {
        start = t;
      }

      const cur = Math.min(t - start, animTime); // to make sure the element stops at exactly pointed value
      const v = cur / animTime;
      const resTop = fromTop + (toTop - fromTop) * v;
      const resLeft = fromLeft + (toLeft - fromLeft) * v;
      // todo we don't need scrollLeft if onlyIfNeeded true and left scroll is ok
      p.scrollTo({ top: resTop, left: resLeft });

      if (cur === animTime) {
        resolve();
        return;
      }
      window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
  });
}
