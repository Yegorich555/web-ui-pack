declare global {
  namespace WUP.Popup.Place {
    interface XResult {
      attr: "left" | "right" | "top" | "bottom";
      left: number;
      /** Size restriction that must be applied to element; calculated in .adjust() and based on userDefined minSize */
      maxW?: number | null;
      /** Available space including alignment start/left/middle */
      freeW: number;
      arrowLeft: number;
      arrowAngle: number;
    }
    interface YResult {
      attr: "left" | "right" | "top" | "bottom";
      top: number;
      /** Size restriction that must be applied to element; calculated in .adjust() and based on userDefined minSize */
      maxH?: number | null;
      /** Available space including alignment start/left/middle */
      freeH: number;
      arrowTop: number;
      arrowAngle: number;
    }
    interface Result extends XResult, YResult {}

    interface PositionRect {
      top: number;
      right: number;
      bottom: number;
      left: number;
    }
    interface Rect extends PositionRect {
      el: HTMLElement;
      width: number;
      height: number;
    }

    interface MeRect {
      w: number;
      h: number;
      el: HTMLElement;
      /** target offset; attention: it's already applied before call of placements */
      offset: PositionRect;
      minW: number;
      minH: number;
      arrow: {
        h: number;
        w: number;
        offset: PositionRect;
      };
    }

    /** Ordinary placement rule */
    interface PlaceFunc {
      (target: Rect, me: MeRect, fit: Rect): Result;
    }
    /** Ordinary placement rule with nested $resize rule */
    interface AdjustFunc extends PlaceFunc {
      /** Allow changing maxHeight to fit layout; setup style minHeight to avoid extra-squizing */
      $resizeHeight: PlaceFunc;
      /** Allow changing maxWidth; setup style minWidth to avoid extra-squizing */
      $resizeWidth: PlaceFunc;
    }
    /** Ordinary placement rule with nested $adjust rule */
    interface AlignFunc extends PlaceFunc {
      /** Allow to break align-rules (start,middle,end) and adjust position to fit layout */
      $adjust: AdjustFunc;
      /** Allow changing maxHeight to fit layout; setup style minHeight to avoid extra-squizing */
      $resizeHeight: PlaceFunc;
      /** Allow changing maxWidth to fit layout; setup style minWidth to avoid extra-squizing */
      $resizeWidth: PlaceFunc;
    }

    /** Set of rules related to specific edge of targetElement; use bottom.start to place bottomStart */
    interface EdgeFunc {
      (target: Rect, me: MeRect, fit: Rect): XResult | YResult;
      /** align by start of edge of target */
      $start: AlignFunc;
      /** align by middle of target */
      $middle: AlignFunc;
      /** align by end of edge of target */
      $end: AlignFunc;
    }
  }
}

const yAdjust = <WUP.Popup.Place.AdjustFunc>function yAdjust(this: WUP.Popup.Place.Result, _t, me, fit) {
  const arrowFree = this.arrowAngle === 0 || this.arrowAngle === 180 ? me.arrow.h : 0;
  this.top = Math.max(fit.top - arrowFree, Math.min(this.top, fit.bottom - me.h + arrowFree));
  return this;
};

export const xAdjust = <WUP.Popup.Place.AdjustFunc>function xAdjust(this: WUP.Popup.Place.Result, _t, me, fit) {
  const arrowFree = this.arrowAngle === 90 || this.arrowAngle === -90 ? me.arrow.h : 0;
  this.left = Math.max(fit.left - arrowFree, Math.min(this.left, fit.right - me.w + arrowFree));
  return this;
};

const resizeHeight = <WUP.Popup.Place.PlaceFunc>function resizeHeight(this: WUP.Popup.Place.Result, t, me, fit) {
  // reject calc since minSize > availableSize; in this case we must select opossite or something that fit better
  if (me.minH > this.freeH) {
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

const resizeWidth = <WUP.Popup.Place.PlaceFunc>function resizeWidth(this: WUP.Popup.Place.Result, t, me, fit) {
  // reject calc since minSize > availableSize; in this case we must select opossite or something that fit better
  if (me.minW > this.freeW) {
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

const $top = <WUP.Popup.Place.EdgeFunc>(
  function top(this: WUP.Popup.Place.Result, t, me, fit): ReturnType<WUP.Popup.Place.EdgeFunc> {
    return {
      attr: "top",
      top: t.top - me.h - me.arrow.h,
      freeH: t.top - fit.top,
      arrowTop: t.top - me.arrow.h - me.arrow.offset.top,
      arrowAngle: 0,
    };
  }
);
$top.$start = <WUP.Popup.Place.AlignFunc>function yStart(this: WUP.Popup.Place.Result, t, me, fit) {
  this.left = t.left;
  this.freeW = fit.right - t.left;
  return this;
};
$top.$middle = <WUP.Popup.Place.AlignFunc>function yMiddle(this: WUP.Popup.Place.Result, t, me, fit) {
  this.left = t.left + Math.round((t.width - me.w) / 2);
  this.freeW = fit.width;
  return this;
};
$top.$end = <WUP.Popup.Place.AlignFunc>function yEnd(this: WUP.Popup.Place.Result, t, me, fit) {
  // we can't assign r.right directly because rectangular doesn't include scrollWidth
  this.left = t.right - me.w;
  this.freeW = t.right - fit.left;
  return this;
};
$top.$start.$adjust = xAdjust;
$top.$middle.$adjust = xAdjust;
$top.$end.$adjust = xAdjust;

const $bottom = <WUP.Popup.Place.EdgeFunc>function bottom(t, me, fit): ReturnType<WUP.Popup.Place.EdgeFunc> {
  return {
    attr: "bottom",
    top: t.bottom + me.arrow.h,
    freeH: fit.bottom - t.bottom,
    arrowTop: t.bottom + me.arrow.offset.bottom,
    arrowAngle: 180,
  };
};
$bottom.$start = $top.$start;
$bottom.$middle = $top.$middle;
$bottom.$end = $top.$end;

const $left = <WUP.Popup.Place.EdgeFunc>function left(t, me, fit): ReturnType<WUP.Popup.Place.EdgeFunc> {
  const freeW = t.left - fit.left;
  return {
    attr: "left",
    left: t.left - me.w - me.arrow.h,
    freeW,
    arrowAngle: -90,
    arrowLeft: t.left - me.arrow.h - Math.round((me.arrow.w - me.arrow.h) / 2) - me.arrow.offset.left,
  };
};
$left.$start = <WUP.Popup.Place.AlignFunc>function xStart(this: WUP.Popup.Place.Result, t, _me, fit) {
  this.top = t.top;
  this.freeH = fit.bottom - t.top;
  return this;
};
$left.$middle = <WUP.Popup.Place.AlignFunc>function xMiddle(this: WUP.Popup.Place.Result, t, me, fit) {
  this.top = t.top + Math.round((t.height - me.h) / 2);
  this.freeH = fit.height;
  return this;
};
$left.$end = <WUP.Popup.Place.AlignFunc>function xEnd(this: WUP.Popup.Place.Result, t, me, fit) {
  this.top = t.bottom - me.h;
  this.freeH = t.bottom - fit.top;
  return this;
};
$left.$start.$adjust = yAdjust;
$left.$middle.$adjust = yAdjust;
$left.$end.$adjust = yAdjust;

const $right = <WUP.Popup.Place.EdgeFunc>function right(t, me, fit): ReturnType<WUP.Popup.Place.EdgeFunc> {
  return {
    attr: "right",
    left: t.right + me.arrow.h,
    freeW: fit.right - t.right,
    arrowAngle: 90,
    arrowLeft: t.right - Math.round((me.arrow.w - me.arrow.h) / 2) + me.arrow.offset.right,
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
  PopupPlacements[kp] = (<WUP.Popup.Place.AlignFunc>function (t, me, fit) {
    return def.$middle.call(def(t, me, fit), t, me, fit);
  }) as unknown as WUP.Popup.Place.EdgeFunc;

  // setup context as call-result of parent-fn for each function
  const p = PopupPlacements[kp];
  Object.keys(def).forEach((key) => {
    const prevFn = def[key];
    const fnName = kp + key; // setup name for function
    const o = {
      [fnName]: <WUP.Popup.Place.AlignFunc>((t, me, fit) => prevFn.call(def(t, me, fit), t, me, fit)),
    };

    p[key] = <WUP.Popup.Place.AlignFunc>o[fnName];
    const v = p[key];
    // adding .adjust to each WUP.Popup.Place.AlignFunc
    v.$adjust = <WUP.Popup.Place.AdjustFunc>function adjust(t, me, fit) {
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

/** Returns normalized offset */
export function getOffset(
  offset: [number, number, number, number] | [number, number] | undefined
): WUP.Popup.Place.PositionRect {
  if (!offset) {
    return { top: 0, left: 0, bottom: 0, right: 0 };
  }
  return {
    top: offset[0],
    right: offset[1],
    bottom: offset[2] ?? offset[0],
    left: offset[3] ?? offset[1],
  };
}
