/* eslint-disable no-use-before-define */

export interface IPlaceMeRect {
  w: number;
  h: number;
  el: HTMLElement;
  offset: { top: number; right: number; bottom: number; left: number };
}

export interface IPlacementXResult {
  left: number;
  maxW?: number | null;

  freeW: number;
  maxFreeW: number;
  maxFreeH: number;
}

export interface IPlacementYResult {
  top: number;
  maxH?: number | null;

  freeH: number;
  maxFreeW: number;
  maxFreeH: number;
}

export interface IPlacementResult extends IPlacementXResult, IPlacementYResult {}

export function stringPixelsToNumber(styleValue: string): number {
  return +(/([0-9]+)/.exec(styleValue)?.[0] || 0);
}

/* Returns bounding rectangular without borders and scroll */
export function getBoundingInternalRect(el: HTMLElement): DOMRect {
  const { borderTopWidth, borderLeftWidth } = getComputedStyle(el);
  let { left, top } = el.getBoundingClientRect();
  top += stringPixelsToNumber(borderTopWidth);
  left += stringPixelsToNumber(borderLeftWidth);
  const r: DOMRect = {
    top,
    left,
    right: left + el.clientWidth,
    bottom: top + el.clientHeight,
    width: el.clientWidth,
    height: el.clientHeight,
    x: left,
    y: top,
    toJSON: () => JSON.stringify(r),
  };
  return r;
}

/* Adjust position/size to fit layout */
function popupAdjustInternal(
  this: IPlacementResult,
  me: IPlaceMeRect,
  fit: IBoundingRect,
  ignoreAlign = false
): IPlacementResult {
  const { freeW: freeWidth, freeH: freeHeight } = this;
  // decline calc if we have minSize > than available field; in this case we must select opossite or something that fit better
  const { minWidth: minW, minHeight: minH } = getComputedStyle(me.el);
  const minWidth = stringPixelsToNumber(minW);
  const minHeight = stringPixelsToNumber(minH);
  // reject calc since minSize > availableSize
  if (minWidth > freeWidth || minHeight > freeHeight) {
    if (ignoreAlign) {
      // todo we can look position through Placements
      const n = { ...this, freeHeight: this.maxFreeH, freeWidth: this.maxFreeW };
      // issue: it doesn't work if both minH&minW > freeH&freeW
      return popupAdjustInternal.call(n, me, fit, false);
    }
    return this;
  }

  // decline calc if availableField is very small; in this case we must select opossite or something that fit better
  if ((freeWidth <= 5 && minWidth > 0) || (freeHeight <= 5 && minHeight > 0)) {
    return this;
  }

  const maxWidth = me.w > freeWidth ? Math.max(minWidth, freeWidth) : null;
  const maxHeight = me.h > freeHeight ? Math.max(minHeight, freeHeight) : null;

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
    freeH: freeHeight,
    freeW: freeWidth,
    maxFreeW: this.maxFreeW,
    maxFreeH: this.maxFreeH,
  };
}
export function popupAdjust(
  this: IPlacementResult,
  me: IPlaceMeRect,
  fit: IBoundingRect,
  ignoreAlign = false
): IPlacementResult {
  return popupAdjustInternal.call(this, me, fit, ignoreAlign);
}
export interface IBoundingRect extends DOMRect {
  el: HTMLElement;
}
/** Ordinary placement rule */
export interface IPlacementFunction {
  (target: IBoundingRect, me: IPlaceMeRect, fit: IBoundingRect): IPlacementResult;
}
/** Ordinary placement rule with nested [adjust] rule */
export interface IPlacementAlign extends IPlacementFunction {
  /** Extra rule to fit layout via set maxWdith, maxHeight and shifting position */
  adjust: IPlacementFunction;
}

/** Set of rules related to specific edge of targetElement; use bottom.start to place bottomStart */
export interface IPlacementEdge {
  (target: IBoundingRect, me: IPlaceMeRect, fit: IBoundingRect): IPlacementXResult | IPlacementYResult;
  start: IPlacementAlign;
  middle: IPlacementAlign;
  end: IPlacementAlign;
}

const top = <IPlacementEdge>function top(el, me, fit): ReturnType<IPlacementEdge> {
  const freeH = el.top - me.offset.top - fit.top;
  return {
    top: el.top - me.offset.top - me.h,
    freeH,
    maxFreeH: freeH,
    maxFreeW: fit.width,
  };
};
top.start = <IPlacementAlign>function yStart(this: IPlacementResult, el, _me, fit) {
  this.left = el.left;
  this.freeW = fit.right - el.left;
  return this;
};
top.middle = <IPlacementAlign>function yMiddle(this: IPlacementResult, el, me, fit) {
  this.left = el.left + (el.width - me.w) / 2;
  this.freeW = fit.width;
  return this;
};
top.end = <IPlacementAlign>function yEnd(this: IPlacementResult, el, me, fit) {
  // we can't assign r.right directly because rectangular doesn't include scrollWidth
  this.left = el.right - me.w;
  this.freeW = fit.left - el.right;
  return this;
};

const bottom = <IPlacementEdge>function bottom(el, me, fit): ReturnType<IPlacementEdge> {
  const freeH = fit.bottom + me.offset.bottom - el.bottom;
  return {
    top: el.bottom + me.offset.bottom,
    freeH,
    maxFreeH: freeH,
    maxFreeW: fit.width,
  };
};
bottom.start = top.start;
bottom.middle = top.middle;
bottom.end = top.end;

const left = <IPlacementEdge>function left(el, me, fit): ReturnType<IPlacementEdge> {
  const freeW = el.left - me.offset.left - fit.left;
  return {
    left: el.left - me.offset.left - me.w,
    freeW,
    maxFreeH: fit.height,
    maxFreeW: freeW,
  };
};
left.start = <IPlacementAlign>function xStart(this: IPlacementResult, el, _me, fit) {
  this.top = el.top;
  this.freeH = fit.bottom - el.top;
  return this;
};
left.middle = <IPlacementAlign>function xMiddle(this: IPlacementResult, el, me, fit) {
  this.top = el.top + (el.height - me.h) / 2;
  this.freeH = fit.height;
  return this;
};
left.end = <IPlacementAlign>function xEnd(this: IPlacementResult, el, me, fit) {
  this.top = el.bottom - me.h;
  this.freeH = fit.top - el.bottom;
  return this;
};

export const PopupPlacements = {
  top,
  bottom,
  left,
};

Object.keys(PopupPlacements).forEach((kp) => {
  // change bottom = bottom.middle to avoid user mistakes
  const def = PopupPlacements[kp];
  // eslint-disable-next-line func-names
  PopupPlacements[kp] = (<IPlacementAlign>function (el, me, fit) {
    return def.middle.call(def(el, me, fit), el, me, fit);
  }) as unknown as IPlacementEdge;
  const p = PopupPlacements[kp];

  Object.keys(def).forEach((key) => {
    const prevFn = def[key];
    // set context for each function
    // eslint-disable-next-line func-names
    p[key] = <IPlacementAlign>function (el, me, fit) {
      return prevFn.call(def(el, me, fit), el, me, fit);
    };
    const v = p[key];
    // add .adjust to each IPlacementAlign
    v.adjust = (el, me, fit) => popupAdjust.call(v(el, me, fit), me, fit);
  });
});

console.warn(PopupPlacements);

// static PlacementsOld: {
//   [key in
//     | "leftStart"
//     | "leftMiddle"
//     | "leftEnd"
//     | "rightStart"
//     | "rightMiddle"
//     | "rightEnd"]: IPlacement;
// } = {
//   leftStart: (el, me) => ({ top: el.top, left: el.left - me.w }),
//   leftMiddle: (el, me) => ({ top: el.top + Math.ceil((el.height - me.h) / 2), left: el.left - me.w }),
//   leftEnd: (el, me) => ({ top: el.bottom - me.h, left: el.left - me.w }),

//   rightStart: (el) => ({ top: el.top, left: el.right }),
//   rightMiddle: (el, me) => ({ top: el.top + (el.height - me.h) / 2, left: el.right }),
//   rightEnd: (el, me) => ({ top: el.bottom - me.h, left: el.right }),
// };
