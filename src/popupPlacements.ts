/* eslint-disable no-use-before-define */
/* eslint-disable import/prefer-default-export */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */

export type IPlaceMeRect = {
  w: number;
  h: number;
  el: HTMLElement;
  offset: { top: number; right: number; bottom: number; left: number };
};

export interface IPlacementResult {
  top: number;
  left: number;
  freeWidth: number;
  freeHeight: number;
  maxWidth?: number | null;
  maxHeight?: number | null;
}

export function stringPixelsToNumber(styleValue: string): number {
  return +(/([0-9]+)/.exec(styleValue)?.[0] || 0);
}

/* returns rectangular without borders and scroll */
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

// fire when we have an overflow and we need to adjust position/size to fit layout
export function popupAdjust(
  prev: IPlacementResult,
  me: IPlaceMeRect,
  fit: IBoundingRect,
  ignoreFreeWidth = false
): IPlacementResult {
  const { freeWidth, freeHeight } = prev;
  // decline calc if we have minSize > than available field; in this case we must select opossite or something that fit better
  const { minWidth: minW, minHeight: minH } = getComputedStyle(me.el);
  const minWidth = stringPixelsToNumber(minW);
  const minHeight = stringPixelsToNumber(minH);
  // reject calc since minSize > availableSize
  if (minWidth > freeWidth || minHeight > freeHeight) {
    if (!ignoreFreeWidth) {
      return prev;
    }
    console.warn("WUP.Popup. Don't enough space for positioning because minWidth and/or minHeight affects on");
  }

  // decline calc if availableField is very small; in this case we must select opossite or something that fit better
  if ((freeWidth <= 5 && minWidth > 0) || (freeHeight <= 5 && minHeight > 0)) {
    return prev;
  }

  const maxWidth = me.w > freeWidth ? Math.max(minWidth, freeWidth) : null;
  const maxHeight = me.h > freeHeight ? Math.max(minHeight, freeHeight) : null;

  let { left, top } = prev;
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

  return { top, left, maxWidth, maxHeight, freeHeight, freeWidth };
}

export type IBoundingRect = DOMRect & { el: HTMLElement };

/** Extra rule to place to fit layout via set maxWdith, maxHeight and shifting position */
export interface IPlacementAdjust {
  (target: IBoundingRect, me: IPlaceMeRect, fit: IBoundingRect): IPlacementResult;
}

/** Ordinary placement rule */
export interface IPlacementAlign {
  (target: IBoundingRect, me: IPlaceMeRect, fit: IBoundingRect): IPlacementResult;
  /** Extra rule to place to fit layout via set maxWdith, maxHeight and shifting position */
  adjust: IPlacementAdjust;
}

/** Set of rules related to specific edge of targetElement; use bottom.start to place bottomStart */
export interface IPlacementEdge {
  (target: IBoundingRect, me: IPlaceMeRect, fit: IBoundingRect):
    | { top: number; freeHeight?: number }
    | { left: number; freeWidth?: number };
  start: IPlacementAlign;
}

// todo make bottom == bottomStart to avoid issues
const bottom = <IPlacementEdge>function bottom(el, me, fit) {
  return {
    top: el.bottom + me.offset.bottom,
    freeHeight: fit.bottom - (el.bottom + me.offset.bottom),
  };
};

bottom.start = <IPlacementAlign>function bottomStart(el, me, fit) {
  const prev = bottom(el, me, fit) as IPlacementResult;
  prev.left = el.left;
  prev.freeWidth = fit.right - el.left;
  return prev;
};

bottom.start.adjust = (el, me, fit) => popupAdjust(bottom.start(el, me, fit), me, fit);

export const PopupPlacements = {
  bottom,
};

// static PlacementsOld: {
//   [key in
//     | "bottomStart"
//     | "bottomMiddle"
//     | "bottomEnd"
//     | "topStart"
//     | "topMiddle"
//     | "topEnd"
//     | "leftStart"
//     | "leftMiddle"
//     | "leftEnd"
//     | "rightStart"
//     | "rightMiddle"
//     | "rightEnd"]: IPlacement;
// } = {
//   bottomStart: (el) => ({
//     top: el.bottom,
//     left: el.left,
//     alt: [
//       WUPPopupElement.Placements.bottomEnd,
//       WUPPopupElement.Placements.topStart,
//       WUPPopupElement.Placements.topEnd,
//     ],
//   }),
//   bottomMiddle: (el, me) => ({ top: el.bottom, left: el.left + (el.width - me.w) / 2 }),
//   // we can't assign r.right directly because rectangular doesn't include scrollWidth
//   bottomEnd: (el, me) => ({ top: el.bottom, left: el.left + el.width - me.w }),

//   topStart: (el, me) => ({ top: el.top - me.h, left: el.left }),
//   topMiddle: (el, me) => ({ top: el.top - me.h, left: el.left + (el.width - me.w) / 2 }),
//   topEnd: (el, me) => ({ top: el.top - me.h, left: el.left + el.width - me.w }),

//   leftStart: (el, me) => ({ top: el.top, left: el.left - me.w }),
//   leftMiddle: (el, me) => ({ top: el.top + Math.ceil((el.height - me.h) / 2), left: el.left - me.w }),
//   leftEnd: (el, me) => ({ top: el.bottom - me.h, left: el.left - me.w }),

//   rightStart: (el) => ({ top: el.top, left: el.right }),
//   // rightMiddle: (el, me) => ({ top: el.top + (el.height - me.h) / 2, left: el.right }),
//   rightMiddle: (el, me) => ({
//     top: el.top + Math.ceil((el.height - me.h) / 2),
//     left: el.right,
//     alt: [
//       WUPPopupElement.Placements.rightStart.adjust,
//       WUPPopupElement.Placements.rightEnd,
//       WUPPopupElement.Placements.adjust,
//       // WUPPopupElement.Placements.right,
//       // (el, me) => {
//       //   const pos = WUPPopupElement.Placements.rightMiddle(el, me);
//       //   if (pos.left+me.w > document.body)
//       // },

//       // WUPPopupElement.Placements.leftMiddle,
//       // WUPPopupElement.Placements.leftStart,
//       // WUPPopupElement.Placements.leftEnd,
//       // // WUPPopupElement.Placements.left,

//       // WUPPopupElement.Placements.topMiddle,
//       // WUPPopupElement.Placements.topStart,
//       // WUPPopupElement.Placements.topEnd,
//       // // WUPPopupElement.Placements.top,

//       // WUPPopupElement.Placements.bottomMiddle,
//       // WUPPopupElement.Placements.bottomStart,
//       // WUPPopupElement.Placements.bottomEnd,
//       // WUPPopupElement.Placements.bottom,

//       // (el, me) => {
//       //   if (el.left > document.body.offsetWidth - el.right) {
//       //     const pos = WUPPopupElement.Placements.leftMiddle;
//       //   }
//       // },
//     ],
//   }),
//   rightEnd: (el, me) => ({ top: el.bottom - me.h, left: el.right }),
// };
