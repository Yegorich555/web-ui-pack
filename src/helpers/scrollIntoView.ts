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
  // todo offsetLeft?: number;

  /** Scroll only if element out of view;
   * @defaultValue true */
  onlyIfNeeded?: boolean;
}

/** Scroll the HTMLElement element's parent container such that the element is visible to the user;
 * Returns promise that resolved when scroll-animation is finished */
export default function scrollIntoView(el: HTMLElement, options?: WUPScrollOptions): Promise<void> {
  const opts: WUPScrollOptions = { smoothMs: 400, offsetTop: 30, onlyIfNeeded: true, ...options };
  const p = findScrollParent(el);
  if (!p) {
    return Promise.resolve();
  }
  const from = p.scrollTop;
  const diff = el.getBoundingClientRect().top - p.getBoundingClientRect().top + (opts.offsetTop ?? 0);

  if (!opts.smoothMs) {
    p.scrollBy({ top: diff, behavior: "auto" });
    return Promise.resolve();
  }

  if (opts.onlyIfNeeded && isIntoView(el, [p])) {
    return Promise.resolve();
  }

  const scrollEnd = p.scrollHeight - p.offsetHeight;
  const to = Math.min(scrollEnd, Math.max(0, from + diff));
  const animTime = opts.smoothMs;
  return new Promise((resolve) => {
    let i = from;
    let start = 0;
    const animate = (t: DOMHighResTimeStamp) => {
      from < to ? ++i : --i;

      if (!start) {
        start = t;
      }

      const cur = Math.min(t - start, animTime); // to make sure the element stops at exactly pointed value
      const v = cur / animTime;
      const result = from + (to - from) * v;
      p.scrollTo({ top: result });

      if (cur === animTime) {
        resolve();
        return;
      }
      window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
  });
}
