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

  const oTop = opts.offsetTop ?? 0;
  const oLeft = opts.offsetLeft ?? 0;

  const viewResult = isIntoView(el, { scrollParents: [p], offset: [-oTop, -oLeft] });
  if (opts.onlyIfNeeded && viewResult.visible) {
    return Promise.resolve();
  }

  const elRect = el.getBoundingClientRect();
  const pRect = p.getBoundingClientRect();

  const diffTop = elRect.top - pRect.top + oTop;
  const diffLeft = elRect.left - pRect.left + oLeft;

  if (!opts.smoothMs) {
    p.scrollBy({ top: diffTop, left: diffLeft, behavior: "auto" });
    return Promise.resolve();
  }

  const fromTop = p.scrollTop;
  const fromLeft = p.scrollLeft;

  const needY = viewResult.hiddenY || viewResult.partialHiddenY;
  const needX = viewResult.hiddenX || viewResult.partialHiddenX;

  const scrollTopEnd = p.scrollHeight - p.offsetHeight;
  const toTop = Math.min(scrollTopEnd, Math.max(0, fromTop + diffTop));

  const scrollLeftEnd = p.scrollWidth - p.offsetWidth;
  const toLeft = Math.min(scrollLeftEnd, Math.max(0, fromLeft + diffLeft));

  const animTime = opts.smoothMs;
  return new Promise((resolve) => {
    let start = 0;
    const animate = (t: DOMHighResTimeStamp): void => {
      if (!start) {
        start = t;
      }

      const cur = Math.min(t - start, animTime); // to make sure the element stops at exactly pointed value
      const v = cur / animTime;
      const resTop = fromTop + (toTop - fromTop) * v;
      const resLeft = fromLeft + (toLeft - fromLeft) * v;
      p.scrollTo({ top: needY ? resTop : undefined, left: needX ? resLeft : undefined });

      if (cur === animTime) {
        resolve();
        return;
      }
      window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
  });
}
