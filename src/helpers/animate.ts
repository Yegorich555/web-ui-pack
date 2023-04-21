import { mathScaleValue } from "./math";

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

/** Animation function based on window.requestAnimationFrame
 * @param from animate from value
 * @param to animate to value
 * @param ms time of animation
 * @param callback fired on every window.requestAnimationFrame() is fired
 * @param force set `true` to ignore window.matchMedia("(prefers-reduced-motion)")
 * @returns promise with extra functions; resolves `true` when animation is finished or resolves `false` when animation is canceled */
export default function animate(
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
