/* eslint-disable no-use-before-define */
export namespace WUPPopupPlace {
  export interface XResult {
    left: number;
    /** Size restriction that must be applied to element; calculated in .adjust() and based on userDefined minSize */
    maxW?: number | null;
    /** Available space including alignment start/left/middle */
    freeW: number;
    /** The whole available space (excluding alignment start/left/middle) */
    maxFreeW: number;
    /** The whole available space (excluding alignment start/left/middle) */
    maxFreeH: number;
  }
  export interface YResult {
    top: number;
    /** Size restriction that must be applied to element; calculated in .adjust() and based on userDefined minSize */
    maxH?: number | null;
    /** Available space including alignment start/left/middle */
    freeH: number;
    /** The whole available space (excluding alignment start/left/middle) */
    maxFreeW: number;
    /** The whole available space (excluding alignment start/left/middle) */
    maxFreeH: number;
  }
  export interface Result extends XResult, YResult {}

  export interface Rect extends DOMRect {
    el: HTMLElement;
  }
  export interface MeRect {
    w: number;
    h: number;
    el: HTMLElement;
    offset: { top: number; right: number; bottom: number; left: number };
  }

  /** Ordinary placement rule */
  export interface PlaceFunc {
    (target: Rect, me: MeRect, fit: Rect): Result;
  }
  /** Ordinary placement rule with nested [adjust] rule */
  export interface AlignFunc extends PlaceFunc {
    /** Extra rule to fit layout via set maxWdith, maxHeight and shifting position */
    $adjust: PlaceFunc;
  }
  /** Set of rules related to specific edge of targetElement; use bottom.start to place bottomStart */
  export interface EdgeFunc {
    (target: Rect, me: MeRect, fit: Rect): XResult | YResult;
    /** align by start of edge of target */
    $start: AlignFunc;
    /** align by middle of target */
    $middle: AlignFunc;
    /** align by end of edge of target */
    $end: AlignFunc;
  }
}

export function stringPixelsToNumber(styleValue: string): number {
  return +(/([0-9]+)/.exec(styleValue)?.[0] || 0);
}

/* Returns bounding rectangular without borders and scroll */
export function getBoundingInternalRect(el: HTMLElement): Omit<DOMRect, "toJSON"> {
  const { borderTopWidth, borderLeftWidth } = getComputedStyle(el);
  let { left, top } = el.getBoundingClientRect();
  top += stringPixelsToNumber(borderTopWidth);
  left += stringPixelsToNumber(borderLeftWidth);
  const r: Omit<DOMRect, "toJSON"> = {
    top,
    left,
    right: left + el.clientWidth,
    bottom: top + el.clientHeight,
    width: el.clientWidth,
    height: el.clientHeight,
    x: left,
    y: top,
  };
  return r;
}

/** memoized function to get minSize from computedStyle */
function computeMinSize(me: WUPPopupPlace.MeRect & { minSize?: { minWidth: number; minHeight: number } }) {
  if (!me.minSize) {
    const { minWidth: minW, minHeight: minH } = getComputedStyle(me.el);
    me.minSize = { minWidth: stringPixelsToNumber(minW), minHeight: stringPixelsToNumber(minH) };
  }
  return me.minSize;
}

/* Adjust position/size to fit layout */
function popupAdjustInternal(
  this: WUPPopupPlace.Result,
  me: WUPPopupPlace.MeRect,
  fit: WUPPopupPlace.Rect,
  ignoreAlign = false
): WUPPopupPlace.Result {
  const { freeW, freeH } = this;
  const { minWidth, minHeight } = computeMinSize(me);

  // reject calc since minSize > availableSize; in this case we must select opossite or something that fit better
  if (minWidth > freeW || minHeight > freeH) {
    if (ignoreAlign) {
      const n = { ...this, freeHeight: this.maxFreeH, freeWidth: this.maxFreeW };
      // issue: it doesn't work if both minH&minW > freeH&freeW
      return popupAdjustInternal.call(n, me, fit, false);
    }
    return this;
  }

  const maxWidth = me.w > freeW ? Math.max(minWidth, freeW) : null;
  const maxHeight = me.h > freeH ? Math.max(minHeight, freeH) : null;

  let { left, top } = this;
  // to fit by X
  if (left < fit.left) {
    left = fit.left;
  } else {
    // expected that width can't be > maxWidth
    left = Math.min(left, fit.right - (maxWidth || me.w));
  }

  // to fit by Y
  if (top < fit.top) {
    top = fit.top;
  } else {
    top = Math.min(top, fit.bottom - (maxHeight || me.h));
  }

  return {
    top,
    left,
    maxW: maxWidth,
    maxH: maxHeight,
    freeH,
    freeW,
    maxFreeW: this.maxFreeW,
    maxFreeH: this.maxFreeH,
  };
}
export function popupAdjust(
  this: WUPPopupPlace.Result,
  me: WUPPopupPlace.MeRect,
  fit: WUPPopupPlace.Rect,
  ignoreAlign = false
): WUPPopupPlace.Result {
  return popupAdjustInternal.call(this, me, fit, ignoreAlign);
}

const $top = <WUPPopupPlace.EdgeFunc>function top(t, me, fit): ReturnType<WUPPopupPlace.EdgeFunc> {
  const freeH = t.top - me.offset.top - fit.top;
  return {
    top: t.top - me.offset.top - me.h,
    freeH,
    maxFreeH: freeH,
    maxFreeW: fit.width,
  };
};
$top.$start = <WUPPopupPlace.AlignFunc>function yStart(this: WUPPopupPlace.Result, t, _me, fit) {
  this.left = t.left;
  this.freeW = fit.right - t.left;
  return this;
};
$top.$middle = <WUPPopupPlace.AlignFunc>function yMiddle(this: WUPPopupPlace.Result, t, me, fit) {
  this.left = t.left + (t.width - me.w) / 2;
  this.freeW = fit.width;
  return this;
};
$top.$end = <WUPPopupPlace.AlignFunc>function yEnd(this: WUPPopupPlace.Result, t, me, fit) {
  // we can't assign r.right directly because rectangular doesn't include scrollWidth
  this.left = t.right - me.w;
  this.freeW = t.right - fit.left;
  return this;
};

const $bottom = <WUPPopupPlace.EdgeFunc>function bottom(t, me, fit): ReturnType<WUPPopupPlace.EdgeFunc> {
  const freeH = fit.bottom - me.offset.bottom - t.bottom;
  return {
    top: t.bottom + me.offset.bottom,
    freeH,
    maxFreeH: freeH,
    maxFreeW: fit.width,
  };
};
$bottom.$start = $top.$start;
$bottom.$middle = $top.$middle;
$bottom.$end = $top.$end;

const $left = <WUPPopupPlace.EdgeFunc>function left(t, me, fit): ReturnType<WUPPopupPlace.EdgeFunc> {
  const freeW = t.left - me.offset.left - fit.left;
  return {
    left: t.left - me.offset.left - me.w,
    freeW,
    maxFreeH: fit.height,
    maxFreeW: freeW,
  };
};
$left.$start = <WUPPopupPlace.AlignFunc>function xStart(this: WUPPopupPlace.Result, t, _me, fit) {
  this.top = t.top;
  this.freeH = fit.bottom - t.top;
  return this;
};
$left.$middle = <WUPPopupPlace.AlignFunc>function xMiddle(this: WUPPopupPlace.Result, t, me, fit) {
  this.top = t.top + (t.height - me.h) / 2;
  this.freeH = fit.height;
  return this;
};
$left.$end = <WUPPopupPlace.AlignFunc>function xEnd(this: WUPPopupPlace.Result, t, me, fit) {
  this.top = t.bottom - me.h;
  this.freeH = t.bottom - fit.top;
  return this;
};

const $right = <WUPPopupPlace.EdgeFunc>function right(t, me, fit): ReturnType<WUPPopupPlace.EdgeFunc> {
  const freeW = fit.right - t.right - me.offset.right;
  return {
    left: t.right + me.offset.right,
    freeW,
    maxFreeH: fit.height,
    maxFreeW: freeW,
  };
};
$right.$start = $left.$start;
$right.$middle = $left.$middle;
$right.$end = $left.$end;

export const PopupPlacements = {
  /** place above of target */
  $top,
  /** place bellow of target */
  $bottom,
  /** place at left side of target */
  $left,
  /** place at right side of target */
  $right,
};

Object.keys(PopupPlacements).forEach((kp) => {
  // changing bottom = bottom.middle to avoid user mistakes
  const def = PopupPlacements[kp];
  // eslint-disable-next-line func-names
  PopupPlacements[kp] = (<WUPPopupPlace.AlignFunc>function (t, me, fit) {
    return def.$middle.call(def(t, me, fit), t, me, fit);
  }) as unknown as WUPPopupPlace.EdgeFunc;
  const p = PopupPlacements[kp];

  Object.keys(def).forEach((key) => {
    const prevFn = def[key];
    // setting context for each function
    const fnName = kp + key; // setup name for function
    const o = {
      [fnName]: <WUPPopupPlace.AlignFunc>((t, me, fit) => prevFn.call(def(t, me, fit), t, me, fit)),
    };

    p[key] = <WUPPopupPlace.AlignFunc>o[fnName];
    const v = p[key];
    // adding .adjust to each WUPPopupPlace.AlignFunc
    v.$adjust = function adjust(t, me, fit) {
      return popupAdjust.call(v(t, me, fit), me, fit);
    };
  });
});
