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
      stop: (isFinish?: boolean) => Promise<void>;
    }
  }
}

/** Animate (open/close) element as dropdown via scale and counter-scale for children
 * @param ms animation time
 * @returns Promise that resolved by animation end
 * Rules
 * * To define direction set attribute to element position="top" or position="bottom"
 * * Before call it again on the same element don't forget to call stop(false) to cancel prev animation
 * * Don't forget to handle promise.catch for cases when animation is cancelled */
export function animateDropdown(el: HTMLElement, ms: number, isClose = false): WUP.PromiseCancel<void> {
  if (!ms) {
    const p = Promise.resolve();
    return Object.assign(p, { stop: () => p });
  }
  el.style.animationName = "none"; // disable default css-animation

  // get previous scaleY and extract transform without scaleY
  const reg = / *scaleY\(([%\d \w.-]+)\) */;
  const parseScale = (e: HTMLElement): { prev: string; from: number } => {
    let prev = e.style.transform;
    let from = isClose ? 1 : 0;
    const r = reg.exec(e.style.transform);
    if (r) {
      // remove scale from transform
      prev = e.style.transform.replace(r[0], "");
      from = Number.parseFloat(r[1]); // warn % isn't supported
    }
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
    el.style.transformOrigin = "";
    nested.forEach((e) => {
      e.el.style.transform = e.prev.trimEnd();
      e.el.style.transformOrigin = "";
    });
  };

  // define from-to ranges
  const to = isClose ? 0 : 1;
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
    el.style.transformOrigin = el.getAttribute("position") === "top" ? "bottom" : "top";
    styleTransform(el, "scaleY", v);
    v !== 0 &&
      nested.forEach((e) => {
        e.el.style.transform = `${e.prev}scaleY(${1 / v})`;
        e.el.style.transformOrigin = "bottom";
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
 * @returns promise with extra functions; resolves when animation is finished & rejectes when animation is canceled */
export function animate(
  from: number,
  to: number,
  ms: number,
  callback: (v: number, ms: number, isLast: boolean, timeStamp: number) => void,
  force?: boolean
): WUP.PromiseCancel<void> {
  let isFinished = ms < 10 || (!force && window.matchMedia("(prefers-reduced-motion)").matches);

  let frameId: number | undefined;
  let rejMe: (err: any) => void;
  const p = new Promise<void>((res, rej) => {
    rejMe = rej;
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
      isLast && res();
    };

    frameId = window.requestAnimationFrame(step);
  }) as WUP.PromiseCancel<void>;

  p.stop = (isFinish = true) => {
    if (!isFinish) {
      frameId && window.cancelAnimationFrame(frameId);
      rejMe(new Error("Animation cancelled by stop(isFinish:false)"));
      return Promise.resolve();
    }
    isFinished = true;
    return p;
  };

  // NiceToHave: develop p.rollback
  // p.rollback = ()=>{ ... }
  return p;
}
