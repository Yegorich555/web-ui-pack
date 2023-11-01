import { isAnimEnabled } from "./animate";

/** Animate (show/hide) element as dropdown via moving items to position (animation per each item via inline styles)
 * @param target element from that items must appear
 * @param items collection that need to animate
 * @param ms animation time
 * @returns Promise<isFinished> that resolved by animation end;
 * Rules
 * * To define direction set attribute to element position="top" (or "bottom", "left", "right")
 * * Before call it again on the same element don't forget to call stop(false) to cancel prev animation
 * * Check if every parent up to target has oveflow: visible (otherwise it doesn't work) */
export default function animateStack(
  target: Element,
  items: (HTMLElement | SVGElement)[] | HTMLCollection,
  ms: number,
  isHide = false,
  isVertical = true
): WUP.PromiseCancel<boolean> {
  const isFinished = ms < 10 || /*! force && */ !isAnimEnabled();
  if (isFinished) {
    const p = Promise.resolve(isFinished);
    return Object.assign(p, { stop: () => p });
  }

  const arr = Array.prototype.slice.call(items) as ((HTMLElement | SVGElement) & { _hideStyle?: string })[];
  const parent = arr[0].parentElement!;
  let resMe: (isEnd: boolean) => void;

  // calc hideStyle position or use previous saved: when showing>partially show> hiding
  if (arr[0]._hideStyle === undefined) {
    parent.style.overflow = "visible"; // otherwise items is hidden under target
    parent.style.zIndex = ((Number.parseInt(getComputedStyle(target).zIndex, 10) || 1) - 1).toString(); // setup  zIndex to be hidden under target
    const r0 = target.getBoundingClientRect();
    arr.forEach((a) => {
      const r = a.getBoundingClientRect();
      a._hideStyle = isVertical // WARN: possible issue if opening horizontal > stop > hiding vertical
        ? `translateY(${Math.round(r0.top - r.top)}px)`
        : `translateX(${Math.round(r0.left - r.left)}px)`;
      if (!isHide) {
        a.style.transform = a._hideStyle; // setup startPosition under target
      }
    });
  }

  const reset = (): void => {
    // reset styles
    parent.style.overflow = "";
    parent.style.zIndex = "";
    !parent.getAttribute("style") && parent.removeAttribute("style");
    arr.forEach((a) => {
      delete a._hideStyle;
      a.style.transition = "";
    });
    setTimeout(
      () =>
        arr.forEach((a) => {
          a.style.transform = "";
          !a.getAttribute("style") && a.removeAttribute("style");
        }),
      1
    ); // timeout to avoid possible blink effect when need to hide
  };

  let tid: ReturnType<typeof setTimeout>;
  window.requestAnimationFrame(() => {
    arr.forEach((a) => {
      a.style.transition = `transform ${ms}ms ease-out`;
      a.style.transform = isHide ? a._hideStyle! : "";
    });
    tid = setTimeout(() => {
      resMe(true);
      reset();
    }, ms); // wait end of animation
  });

  const p = new Promise<boolean>((res) => {
    resMe = res;
  }) as WUP.PromiseCancel<boolean>;
  p.stop = (isFinish = true) => {
    isFinish && reset();
    resMe(isFinish);
    tid && clearTimeout(tid);
    return p;
  };

  return p;
}
