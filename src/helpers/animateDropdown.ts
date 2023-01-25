import { mathScaleValue } from "./math";
import { styleTransform } from "./styleHelpers";

const frames = new Map<HTMLElement, number>();

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

// todo rewrite animteDropdown to use with tryAnimate

/** Animate (open/close) element as dropdown via scale and counter-scale for children
 * @param timeMs Animation time @defaultValue 300ms
 * @returns Promise that resolved by animation end
 * Rules
 * * To define direction set attribute to element position="top" or position="bottom"
 * * If call it again on the same element it wil continue/revert previous animation
 * * If call it again with reverted [isClose] previous promise (for open-end) is never resolved */
export default function animateDropdown(
  el: HTMLElement,
  /* istanbul ignore next */
  timeMs = 300,
  isClose = false
): WUP.PromiseCancel<void> {
  const stored = frames.get(el);
  if (stored) {
    window.cancelAnimationFrame(stored);
    frames.delete(el);
  }
  if (!timeMs) {
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
    frames.delete(el);
    styleTransform(el, "scaleY", "");
    el.style.transformOrigin = "";
    nested.forEach((e) => {
      e.el.style.transform = e.prev.trimEnd();
      e.el.style.transformOrigin = "";
    });
  };

  const p = new Promise((resolve) => {
    // reset inline styles
    const finish = (): void => {
      resolve();
      reset();
    };

    // define from-to ranges
    const to = isClose ? 0 : 1;
    const { from } = parseScale(el);

    // recalc left-animTime based on current animation (if element is partially opened and need to hide it)
    timeMs *= Math.abs(to - from);

    let start = 0;
    const animate = (t: DOMHighResTimeStamp): void => {
      if (!el.isConnected) {
        finish(); // possible when item is removed unexpectedly
        return;
      }

      if (!start) {
        start = t;
      }

      const cur = Math.min(t - start, timeMs); // to make sure the element stops at exactly pointed value
      const v = cur / timeMs;
      const scale = from + (to - from) * v;

      el.style.transformOrigin = el.getAttribute("position") === "top" ? "bottom" : "top";
      styleTransform(el, "scaleY", scale);
      scale !== 0 &&
        nested.forEach((e) => {
          e.el.style.transform = `${e.prev}scaleY(${1 / scale})`;
          e.el.style.transformOrigin = "bottom";
        });

      if (cur === timeMs) {
        finish();
        return;
      }

      frames.set(el, window.requestAnimationFrame(animate));
    };
    frames.set(el, window.requestAnimationFrame(animate));
  }) as WUP.PromiseCancel<void>;

  p.stop = (isRst = true) => {
    const frameId = frames.get(el);
    if (frameId != null) {
      window.cancelAnimationFrame(frameId);
      isRst ? reset() : frames.delete(el);
    }
    return Promise.resolve();
  };

  return p;
}

/** Animation function based on window.requestAnimationFrame
 * @param from animate from value
 * @param to animate to value
 * @param ms time of animation
 * @param callback fired on every window.requestAnimationFrame() is fired
 * @param force set `true` to ignore window.matchMedia("(prefers-reduced-motion)")
 * @returns promise with extra functions; resolves when animation is finished & rejectes when animation is canceled */
export function animateTry(
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

  // todo testcase: call animate().stop() in NODEJS it throws err but in Chrome not
  p.stop = (isFinish = true) => {
    if (!isFinish) {
      frameId && window.cancelAnimationFrame(frameId);
      rejMe(new Error("Animation cancelled by stop(isFinish:false)"));
      return Promise.resolve();
    }
    isFinished = true;
    return p;
  };

  // todo develop p.rollback ???
  // p.rollback = ()=>{

  // }

  return p;
}
