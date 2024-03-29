type TransformFunctions =
  | "matrix"
  | "matrix3d"
  | "perspective"
  | "rotate"
  | "rotate3d"
  | "rotateX"
  | "rotateY"
  | "rotateZ"
  | "translate"
  | "translate3d"
  | "translateX"
  | "translateY"
  | "translateZ"
  | "scale"
  | "scale3d"
  | "scaleX"
  | "scaleY"
  | "scaleZ"
  | "skew"
  | "skewX"
  | "skewY";

/** Replaces [translate] in el.style.transform
 * @example
 * el.style.transform('translate(-10px, 20%)');
 * styleTransform(el, 'translate', '-10px, 20%' )
 * @returns el.style.transform */
export function styleTransform(el: HTMLElement, prop: TransformFunctions, value: string | number): string {
  const reg = new RegExp(`( )*${prop}\\(([%d \\w.,-]+)\\)( )*`);
  const setValue = value || value === 0;
  let isDone = !setValue;
  const s = setValue
    ? el.style.transform.replace(reg, (_t, p1, _p2, p3) => {
        isDone = true;
        return `${p1 || ""}${prop}(${value})${p3 || ""}`;
      })
    : el.style.transform.replace(reg, " ").trim();
  el.style.transform = isDone ? s : `${el.style.transform} ${prop}(${value})`.trimStart();
  return el.style.transform;
}

/** Converts '23px' to number 23 */
export function px2Number(styleValue: string): number {
  return +(/([0-9]+)/.exec(styleValue)?.[0] || 0);
}

interface CustomRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

/* Returns bounding rectangular without borders and scroll (simulate box-sizing: border-box) */
export function getBoundingInternalRect(
  el: Element,
  options?: {
    computedStyle?: CSSStyleDeclaration;
    ignoreCache?: boolean;
    elRect?: DOMRect;
  }
): CustomRect {
  if ((el as any)._savedBoundingRect && !options?.ignoreCache) {
    return { ...(el as any)._savedBoundingRect };
  }
  // we don't need other borders (right/bottom) because of clientSize without borders
  const { borderTopWidth, borderLeftWidth } = options?.computedStyle ?? getComputedStyle(el);
  let { left, top } = options?.elRect ?? el.getBoundingClientRect();
  top = Math.round(top + px2Number(borderTopWidth));
  left = Math.round(left + px2Number(borderLeftWidth));
  const r: CustomRect = {
    top,
    left,
    right: left + el.clientWidth,
    bottom: top + el.clientHeight,
    width: el.clientWidth,
    height: el.clientHeight,
  };

  (el as any)._savedBoundingRect = { ...r };
  setTimeout(() => delete (el as any)._savedBoundingRect);

  return r;
}

/** Parse '0.2s' to 200, '200ms' to '200'
 * If parsing is wrong returns 0 */
export function parseMsTime(v: string): number {
  let t = Number.parseFloat(v);
  if (!v.endsWith("ms")) {
    t *= 1000;
  }
  if (Number.isNaN(t)) {
    return 0;
  }
  return t;
}
