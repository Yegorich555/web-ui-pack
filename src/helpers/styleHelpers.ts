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
 * styleTransform(el, 'translate', '0,0' )
 */
export function styleTransform(el: HTMLElement, prop: TransformFunctions, value: string | number): void {
  const reg = new RegExp(` *${prop}\\(([%d \\w.,-]+)\\) *`);
  const cleared = el.style.transform.replace(reg, "");
  el.style.transform = value !== "" ? `${cleared}${cleared ? " " : ""}${prop}(${value})` : cleared;
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
  el: HTMLElement,
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
  top += px2Number(borderTopWidth);
  left += px2Number(borderLeftWidth);
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
