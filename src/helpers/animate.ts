import { mathScaleValue } from "./math";
import { styleTransform } from "./styleHelpers";

declare global {
  namespace WUP {
    interface PromiseCancel<T> extends Promise<T> {
      /** Call it when you need to stop promise immediately;
       *  @param isFinish finish promise immediately @defaultValue true
       *  @tutorial
       * * isFinish:true - Promise is resolved
       * * isFinish:false - Promise is rejected
       * @returns promise resolved when animation stop process is done */
      stop: (isFinish?: boolean) => Promise<T>;
    }
  }
}

/** Animate (show/hide) element as dropdown via scale and counter-scale for children
 * @param ms animation time
 * @returns Promise<isFinished> that resolved by animation end;
 * Rules
 * * To define direction set attribute to element position="top" or position="bottom"
 * * Before call it again on the same element don't forget to call stop(false) to cancel prev animation */
export function animateDropdown(el: HTMLElement, ms: number, isHidden = false): WUP.PromiseCancel<boolean> {
  if (!ms) {
    const p = Promise.resolve(false);
    return Object.assign(p, { stop: () => p });
  }
  el.style.animationName = "none"; // disable default css-animation

  // get previous scaleY and extract transform without scaleY
  const reg = / *scale[YX]\(([%\d \w.-]+)\) */;
  const parseScale = (e: HTMLElement): { prev: string; from: number } => {
    let prev = e.style.transform;
    let from = isHidden ? 1 : 0;
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
  const to = isHidden ? 0 : 1;
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

/** Animation function based on window.requestAnimationFrame
 * @param from animate from value
 * @param to animate to value
 * @param ms time of animation
 * @param callback fired on every window.requestAnimationFrame() is fired
 * @param force set `true` to ignore window.matchMedia("(prefers-reduced-motion)")
 * @returns promise with extra functions; resolves `true` when animation is finished or resolves `false` when animation is canceled */
export function animate(
  from: number,
  to: number,
  ms: number,
  callback: (v: number, ms: number, isLast: boolean, timeStamp: number) => void,
  force?: boolean
): WUP.PromiseCancel<boolean> {
  let isFinished = ms < 10 || (!force && !isAnimEnabled());

  let frameId: number | undefined;
  let resMe: (isEnd: boolean) => void;
  const p = new Promise<boolean>((res) => {
    resMe = res;
    let start = 0;
    const step = (t: number): void => {
      if (start === 0) {
        start = t;
      }
      const elapsed = Math.min(t - start, ms);
      const isLast = isFinished || elapsed === ms;
      const v = isLast ? to : mathScaleValue(elapsed, 0, ms, from, to); // scaling can provide precision issue so better to compare with ms
      if (!isLast) {
        frameId = window.requestAnimationFrame(step); // call next animation before callback is happened (for cases when exception is thrown)
      }

      callback(v, elapsed, isLast, t);
      isLast && res(true);
    };

    frameId = window.requestAnimationFrame(step);
  }) as WUP.PromiseCancel<boolean>;

  p.stop = (isFinish = true) => {
    if (!isFinish) {
      frameId && window.cancelAnimationFrame(frameId);
      resMe(false);
    } else {
      isFinished = true;
    }
    return p;
  };

  // NiceToHave: develop p.rollback
  // p.rollback = ()=>{ ... }
  return p;
}

/** Returns whether user don't 'prefers-reduced-motion' or do based on css-media `@media (prefers-reduced-motion)` */
export function isAnimEnabled(): boolean {
  return !window.matchMedia("(prefers-reduced-motion)").matches;
}
