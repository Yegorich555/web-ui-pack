import animate from "./animate";
import { styleTransform } from "./styleHelpers";

/** Animate (show/hide) element as dropdown via scale and counter-scale for children
 * @param ms animation time
 * @returns Promise<isFinished> that resolved by animation end;
 * Rules
 * * To define direction set attribute to element position="top" (or "bottom", "left", "right")
 * * For position="center" element is moved from top to center with opacity (like modal)
 * * Before call it again on the same element don't forget to call stop(false) to cancel prev animation */
export default function animateDropdown(el: HTMLElement, ms: number, isHide = false): WUP.PromiseCancel<boolean> {
  if (!ms) {
    const p = Promise.resolve(false);
    return Object.assign(p, { stop: () => p });
  }
  const moveY = -150; // translateY in % for position="center" (the same as modal does)
  const moved = /translateY\(([^)%]+)%\)/.exec(el.style.transform); // possible if prev animation is stopped; value can be 1e-14
  let isMoved = !!moved;
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
    if (isMoved) {
      styleTransform(el, "translateY", "");
      el.style.opacity = "";
    }
    el.style.transformOrigin = "";
    nested.forEach((e) => {
      e.el.style.transform = e.prev.trimEnd();
      e.el.style.transformOrigin = "";
      !e.el.getAttribute("style") && e.el.removeAttribute("style");
    });
    // refresh layout otherwise blur effect possible if scroll during the animation
    const was = el.style.display;
    el.style.display = "none";
    (reset as any)._cached = el.offsetHeight;
    el.style.display = was;
    !el.getAttribute("style") && el.removeAttribute("style");
  };

  // define from-to ranges
  const to = isHide ? 0 : 1;
  let { from } = parseScale(el);
  if (moved) {
    from = 1 - Number.parseFloat(moved[1]) / moveY;
  }
  ms *= Math.abs(to - from); // re-calc left-animTime (if element is partially opened and need to hide it)

  const p = animate(from, to, ms, (v, _t, isLast) => {
    if (!el.isConnected) {
      p.stop(false);
    }
    if (isLast || !el.isConnected) {
      reset();
      return;
    }
    const pos = el.getAttribute("position");
    if (pos === "center") {
      isMoved = true;
      styleTransform(el, "translateY", `${(1 - v) * moveY}%`);
      el.style.opacity = `${v}`;
      return;
    }
    let tmo = "bottom";
    let tmo2 = "top";
    let scale: "scaleY" | "scaleX" = "scaleY";
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
