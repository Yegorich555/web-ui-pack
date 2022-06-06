const frames = new Map<HTMLElement, number>();

interface PromiseCancel {
  /** Call it when you need to stop animation immediately; it doesn't Promise.resolve() by stops animation and reset state
   *  @param isReset reset state (inline styles) that was before animation @defaultValue true
   */
  stop: (isReset?: boolean) => void;
}

/** Animate (open/close) element as dropdown via scale and counter-scale for children
 * @param timeMs Animation time @defaultValue 300ms
 * @returns Promise that resolved by animation end
 * Rules
 * * To define direction set attribute to element position="top" or position="bottom"
 * * If call it again on the same element it wil continue/revert previous animation
 * * If call it again with reverted [isClose] previous promise (for open-end) is never resolved
 */
export default function animateDropdown(el: HTMLElement, timeMs = 300, isClose = false): Promise<void> & PromiseCancel {
  const stored = frames.get(el);
  if (stored) {
    window.cancelAnimationFrame(stored);
    frames.delete(el);
  }
  if (!timeMs) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return Object.assign(Promise.resolve(), { stop: () => {} });
  }

  el.style.animationName = "none"; // disable default css-animation

  // get previous scaleY and extract transform without scaleY
  const reg = / *scaleY\(([%\d \w.-]+)\) */;
  const removeScaleY = (styleTransform: string): string => styleTransform.replace(reg, "");
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

  const reset = () => {
    frames.delete(el);
    el.style.transform = removeScaleY(el.style.transform);
    el.style.transformOrigin = "";
    nested.forEach((e) => (e.el.style.transform = e.prev.trimEnd()));
    return true;
  };

  const p = new Promise((resolve) => {
    // reset inline styles
    const finish = () => {
      resolve();
      reset();
    };

    // define from-to ranges
    const to = isClose ? 0 : 1;
    const { from } = parseScale(el);

    // recalc left-animTime based on current animation (if element is partially opened and need to hide it)
    timeMs *= Math.abs(to - from);

    let start = 0;
    const animate = (t: DOMHighResTimeStamp) => {
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
      el.style.transform = `${removeScaleY(el.style.transform)} scaleY(${scale})`.trimStart();
      scale !== 0 && nested.forEach((e) => (e.el.style.transform = `${e.prev}scaleY(${1 / scale})`));

      if (cur === timeMs) {
        finish();
        return;
      }

      frames.set(el, window.requestAnimationFrame(animate));
    };
    frames.set(el, window.requestAnimationFrame(animate));
  }) as Promise<void> & { stop: () => void };

  p.stop = (isRst = true) => {
    const frameId = frames.get(el);
    if (frameId != null) {
      window.cancelAnimationFrame(frameId);
      isRst ? reset() : frames.delete(el);
    }
  };

  return p;
}
