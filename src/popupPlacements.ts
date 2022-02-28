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
    minW: number;
    minH: number;
  }

  /** Ordinary placement rule */
  export interface PlaceFunc {
    (target: Rect, me: MeRect, fit: Rect): Result;
  }
  /** Ordinary placement rule with nested $resize rule */
  export interface AdjustFunc extends PlaceFunc {
    /** Allow changing maxHeight to fit layout; setup style minHeight to avoid extra-squizing */
    $resizeHeight: PlaceFunc;
    /** Allow changing maxWidth; setup style minWidth to avoid extra-squizing */
    $resizeWidth: PlaceFunc;
  }
  /** Ordinary placement rule with nested $adjust rule */
  export interface AlignFunc extends PlaceFunc {
    /** Allow to break align-rules (start,middle,end) and adjust position to fit layout */
    $adjust: AdjustFunc;
    /** Allow changing maxHeight to fit layout; setup style minHeight to avoid extra-squizing */
    $resizeHeight: PlaceFunc;
    /** Allow changing maxWidth to fit layout; setup style minWidth to avoid extra-squizing */
    $resizeWidth: PlaceFunc;
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

export function px2Number(styleValue: string): number {
  return +(/([0-9]+)/.exec(styleValue)?.[0] || 0);
}

/* Returns bounding rectangular without borders and scroll (simulate box-sizing: border-box) */
export function getBoundingInternalRect(el: HTMLElement): Omit<DOMRect, "toJSON"> {
  const { borderTopWidth, borderLeftWidth } = getComputedStyle(el);
  let { left, top } = el.getBoundingClientRect();
  top += px2Number(borderTopWidth);
  left += px2Number(borderLeftWidth);
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

const yAdjust = <WUPPopupPlace.AdjustFunc>function yAdjust(this: WUPPopupPlace.Result, _t, me, fit) {
  this.top = this.top < fit.top ? fit.top : Math.min(this.top, fit.bottom - me.h);
  return this;
};

const xAdjust = <WUPPopupPlace.AdjustFunc>function xAdjust(this: WUPPopupPlace.Result, _t, me, fit) {
  this.left = this.left < fit.left ? fit.left : Math.min(this.left, fit.right - me.w);
  return this;
};

const resizeHeight = <WUPPopupPlace.PlaceFunc>function resizeHeight(this: WUPPopupPlace.Result, t, me, fit) {
  // reject calc since minSize > availableSize; in this case we must select opossite or something that fit better
  if (me.minH > this.freeH) {
    // todo what about maxFreeH ???
    return this;
  }

  const { h } = me;
  this.maxH = me.h > this.freeH ? this.freeH : null; // set null if maxSize doesn't affect on
  // define newHeight that will be
  me.h = Math.min(me.h, this.freeH); // override value to use with adjust
  yAdjust.call(this, t, me, fit);
  me.h = h; // rollback previous value
  return this;
};

const resizeWidth = <WUPPopupPlace.PlaceFunc>function resizeWidth(this: WUPPopupPlace.Result, t, me, fit) {
  // reject calc since minSize > availableSize; in this case we must select opossite or something that fit better
  if (me.minW > this.freeW) {
    // todo what about maxFreeW ???
    return this;
  }

  const { w } = me;
  this.maxW = me.w > this.freeW ? this.freeW : null; // set null if maxSize doesn't affect on
  // define newWidth that will be
  me.w = Math.min(me.w, this.freeW); // override value to use with adjust
  xAdjust.call(this, t, me, fit);
  me.w = w; // rollback previous value
  return this;
};

const $top = <WUPPopupPlace.EdgeFunc>(
  function top(this: WUPPopupPlace.Result, t, me, fit): ReturnType<WUPPopupPlace.EdgeFunc> {
    const freeH = t.top - me.offset.top - fit.top;
    return {
      top: t.top - me.offset.top - me.h,
      freeH,
      maxFreeH: freeH,
      maxFreeW: fit.width,
    };
  }
);
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
$top.$start.$adjust = xAdjust;
$top.$middle.$adjust = xAdjust;
$top.$end.$adjust = xAdjust;

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
$left.$start.$adjust = yAdjust;
$left.$middle.$adjust = yAdjust;
$left.$end.$adjust = yAdjust;

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

  // setup context as call-result of parent-fn for each function
  const p = PopupPlacements[kp];
  Object.keys(def).forEach((key) => {
    const prevFn = def[key];
    const fnName = kp + key; // setup name for function
    const o = {
      [fnName]: <WUPPopupPlace.AlignFunc>((t, me, fit) => prevFn.call(def(t, me, fit), t, me, fit)),
    };

    p[key] = <WUPPopupPlace.AlignFunc>o[fnName];
    const v = p[key];
    // adding .adjust to each WUPPopupPlace.AlignFunc
    v.$adjust = <WUPPopupPlace.AdjustFunc>function adjust(t, me, fit) {
      return prevFn.$adjust.call(v(t, me, fit), t, me, fit);
    };
    v.$adjust.$resizeHeight = function resizeH(t, me, fit) {
      return resizeHeight.call(v.$adjust(t, me, fit), t, me, fit);
    };
    v.$adjust.$resizeWidth = function resizeW(t, me, fit) {
      return resizeWidth.call(v.$adjust(t, me, fit), t, me, fit);
    };
    v.$resizeHeight = function resizeH(t, me, fit) {
      return resizeHeight.call(v(t, me, fit), t, me, fit);
    };
    v.$resizeWidth = function resizeW(t, me, fit) {
      return resizeWidth.call(v(t, me, fit), t, me, fit);
    };
  });
});
