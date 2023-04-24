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
  parent.style.overflow = "visible"; // otherwise items is hidden under target
  let resMe: (isEnd: boolean) => void;

  // calc hideStyle position or use previous saved: when showing>partially show> hidding
  if (arr[0]._hideStyle === undefined) {
    const r0 = target.getBoundingClientRect();
    const zi = ((Number.parseInt(getComputedStyle(target).zIndex, 10) || 1) - 1).toString();
    arr.forEach((a) => {
      const r = a.getBoundingClientRect();
      a.style.zIndex = zi; // setup  zIndex to be hidden under target
      a._hideStyle = isVertical // WARN: possible issue if opening horizontal > stop > hidding vertical
        ? `translateY(${Math.round(r0.top - r.top)}px)`
        : `translateX(${Math.round(r0.left - r.left)}px)`;
      if (!isHide) {
        a.style.transform = a._hideStyle; // setup startPosition under target
      }
    });
  }

  const reset = (): void => {
    // reset styles
    arr.forEach((a) => {
      delete a._hideStyle;
      a.style.zIndex = "";
      a.style.transition = "";
      parent.style.overflow = "";
    });
    setTimeout(() => arr.forEach((a) => (a.style.transform = "")), 1); // timeout to avoid possible blink effect when need to hide
  };

  let tid: ReturnType<typeof setTimeout>;
  window.requestAnimationFrame(() => {
    arr.forEach((a) => {
      // todo need extra option to animate step by step so 3 goes to 1st position, 2 goes to 2nd etc...
      // console.warn("=>", a.outerHTML);
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
