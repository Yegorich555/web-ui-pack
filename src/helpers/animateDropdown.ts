import animate, { isAnimEnabled } from "./animate";
import { styleTransform } from "./styleHelpers";

/** Animate (show/hide) element as dropdown via scale and counter-scale for children
 * @param ms animation time
 * @returns Promise<isFinished> that resolved by animation end;
 * Rules
 * * To define direction set attribute to element position="top" (or "bottom", "left", "right")
 * * Before call it again on the same element don't forget to call stop(false) to cancel prev animation */
export default function animateDropdown(el: HTMLElement, ms: number, isHide = false): WUP.PromiseCancel<boolean> {
  if (!ms) {
    const p = Promise.resolve(false);
    return Object.assign(p, { stop: () => p });
  }
  // get previous scaleY and extract transform without scaleY
  const reg = / *scale[YX]\(([%\d \w.-]+)\) */;
  const parseScale = (e: HTMLElement): { prev: string; from: number } => {
    let prev = e.style.transform;
    let from = isHide ? 1 : 0;
    const r = reg.exec(prev);
    if (r) {
      // remove scale from transform
      prev = prev.replace(r[0], ""); // remove scale from transform
      from = Number.parseFloat(r[1]); // warn % isn't supported
    }
    prev = prev.replace("translateZ(0px)", ""); // remove prev translateZ(0) from transform
    if (prev) {
      prev = `${prev.trim().replace("  ", " ")} `; // extra-space to prepare add scaleY without extra logic
    }
    return { prev, from };
  };

  const nested: Array<{ el: HTMLElement; prev: string }> = [];
  const ch = el.children;
  for (let i = 0; i < ch.length; ++i) {
    const c = ch.item(i) as HTMLElement;
    const parsed = parseScale(c);
    nested.push({ el: c, prev: parsed.prev });
  }

  const reset = (): void => {
    styleTransform(el, "scaleY", "");
    styleTransform(el, "scaleX", "");
    el.style.transformOrigin = "";
    nested.forEach((e) => {
      e.el.style.transform = e.prev.trimEnd();
      e.el.style.transformOrigin = "";
    });
    // refresh layout otherwise blur effect possible if scroll during the animation
    const was = el.style.display;
    el.style.display = "none";
    (reset as any)._cached = el.offsetHeight;
    el.style.display = was;
  };

  // define from-to ranges
  const to = isHide ? 0 : 1;
  const { from } = parseScale(el);
  ms *= Math.abs(to - from); // recalc left-animTime (if element is partially opened and need to hide it)

  const p = animate(from, to, ms, (v, _t, isLast) => {
    if (!el.isConnected) {
      p.stop(false);
    }
    if (isLast || !el.isConnected) {
      reset();
      return;
    }
    const pos = el.getAttribute("position");
    let tmo = "bottom";
    let tmo2 = "top";
    let scale = "scaleY" as "scaleY" | "scaleX";
    /* prettier-ignore */
    switch (pos) {
      case "bottom": tmo="top"; tmo2="bottom"; break;
      case "left": tmo="right"; scale="scaleX"; tmo2 = "left"; break;
      case "right": tmo="left"; scale = "scaleX"; tmo2 = "right"; break;
      default: break; // case "top": break;
    }
    el.style.transformOrigin = tmo;
    styleTransform(el, scale, v);
    v !== 0 &&
      nested.forEach((e) => {
        e.el.style.transform = `${e.prev + scale}(${1 / v}) translateZ(0px)`; // it improves text-render during the scrolling & animation
        e.el.style.transformOrigin = tmo2;
      });
  });

  return p;
}

/** Animate (show/hide) element as dropdown via moving items to position (animation per each item via inline styles)
 * @param target element from that items must appear
 * @param items collection that need to animate
 * @param ms animation time
 * @returns Promise<isFinished> that resolved by animation end;
 * Rules
 * * To define direction set attribute to element position="top" (or "bottom", "left", "right")
 * * Before call it again on the same element don't forget to call stop(false) to cancel prev animation
 * * Check if every parent up to target has oveflow: visible (otherwise it doesn't work) */
export function animateStack(
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
