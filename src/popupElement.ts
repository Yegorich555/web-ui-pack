/* eslint-disable no-param-reassign */
/* eslint-disable import/prefer-default-export */
import { IWUPBaseElement, JSXCustomProps } from "./baseElement";
import {
  getBoundingInternalRect,
  IBoundingRect,
  IPlacementAdjust,
  IPlacementAlign,
  IPlaceMeRect,
  popupAdjust,
  PopupPlacements,
  stringPixelsToNumber,
} from "./popupPlacements";

interface IPopupOptions {
  /** Placement rule; example Placements.bottom.start  Placements.bottom.start.adjust */
  placement: IPlacementAlign | IPlacementAdjust;
  /** Alternate when pointed placement doesn't fit the layout */
  placementAlt: Array<IPlacementAlign | IPlacementAdjust>;
  /** Alternative of margin for targetElement related to popup
   *
   *  [top, right, bottom, left] or [top/bottom, right/left] in px
   * */
  placementOffset: [number, number, number, number] | [number, number];
  /** Returns element according to this one need to check overflow; {body} by default */
  placementFitElement: () => HTMLElement & Pick<HTMLElement, "offsetWidth" | "offsetHeight">;
}

export default class WUPPopupElement extends HTMLElement implements IWUPBaseElement {
  static Placements = PopupPlacements;

  options: IPopupOptions = {
    placement: WUPPopupElement.Placements.bottom.start,
    placementAlt: [WUPPopupElement.Placements.bottom.start.adjust],
    placementOffset: [0, 0],
    placementFitElement: () => document.body,
  };

  target?: HTMLElement | null;

  constructor() {
    super();

    const style = document.createElement("style");
    style.textContent = `
      :host {
        position: fixed!important;
        z-index: 99999;
        margin: 0!important;
        box-sizing: border-box;

        overflow: hidden;
        border: 1px solid var(--popup-border-color, var(--border-color, #e1e1e1));
        border-radius: var(--popup-border-radius, var(--border-radius, 9px));
        padding: var(--popup-padding, var(--padding, 6px));
        box-shadow: var(--popup-shadow, 0 1px 4px 0 rgb(0 0 0 0.2));
      }
    `;

    const root = this.attachShadow({ mode: "open" });
    root.appendChild(style);
    root.appendChild(document.createElement("slot"));
  }

  /** Browser calls this method when the element is added to the document */
  connectedCallback() {
    this.target = this.previousElementSibling as HTMLButtonElement;
    if (!this.target) {
      console.error(`${this.tagName}. Target is not defined`);
    } else {
      this.show();
    }
  }

  #reqId?: number;
  disconnectedCallback() {
    this.#reqId && window.cancelAnimationFrame(this.#reqId);
  }

  #userSizes = { maxWidth: Number.MAX_SAFE_INTEGER, maxHeight: Number.MAX_SAFE_INTEGER };
  private show() {
    // it works only when styles is defined before popup is open
    const style = getComputedStyle(this);
    this.#userSizes = {
      maxWidth: stringPixelsToNumber(style.maxWidth) || Number.MAX_SAFE_INTEGER,
      maxHeight: stringPixelsToNumber(style.maxHeight) || Number.MAX_SAFE_INTEGER,
    };

    const goUpdate = () => {
      this.updatePosition(false);
      this.#reqId = window.requestAnimationFrame(goUpdate);
    };
    goUpdate();
  }

  #prev?: DOMRect;
  updatePosition = (force = true) => {
    const t = (this.target as HTMLElement).getBoundingClientRect() as IBoundingRect;
    t.el = this.target as HTMLElement;

    if (
      force ||
      // issue: it's wrong if minWidth, minHeight etc. is changed and doesn't affect on layout sizes directly
      !this.#prev ||
      this.#prev.top !== t.top ||
      this.#prev.left !== t.left ||
      this.#prev.width !== t.width ||
      this.#prev.height !== t.height
    ) {
      const fitEl = this.options.placementFitElement?.call(this) || document.body;
      const fit = getBoundingInternalRect(fitEl) as IBoundingRect;
      fit.el = fitEl;

      const me: IPlaceMeRect = {
        w: this.offsetWidth, // clientWidth doesn't include border-size
        h: this.offsetHeight,
        el: this,
        offset: {
          top: this.options.placementOffset[0],
          right: this.options.placementOffset[1],
          bottom: this.options.placementOffset[2] ?? this.options.placementOffset[0],
          left: this.options.placementOffset[3] ?? this.options.placementOffset[1],
        },
      };
      let pos = this.options.placement(t, me, fit);

      const hasOveflow = (p: { top: number; left: number }): boolean =>
        p.left < fit.left ||
        p.top < fit.top ||
        p.left + this.offsetWidth > fit.right ||
        p.top + this.offsetHeight > fit.bottom;

      // try another positions
      if (hasOveflow(pos)) {
        const isDefined = this.options.placementAlt.some((alt) => {
          const p = alt(t, me, fit);
          if (!hasOveflow(p)) {
            pos = p;
            return true;
          }
          return false;
        });

        // adjust if alternate positions don't fit
        if (!isDefined) {
          pos = popupAdjust(pos, me, fit, true);
        }
      }
      console.warn(pos);
      // todo issue: if target partially overflowed we should select opposite direction => useScrollInto view in this case if scroll exists
      this.style.top = `${pos.top}px`;
      this.style.left = `${pos.left}px`;
      // we can't remove maxWidth, maxHeight because maxWidth can affect on maxHeight and calculations will be wrong
      this.style.maxWidth = `${Math.min(pos.maxWidth || pos.freeWidth, this.#userSizes.maxWidth)}px`;
      this.style.maxHeight = `${Math.min(pos.maxHeight || pos.freeHeight, this.#userSizes.maxHeight)}px`;
    }
    this.#prev = t;
  };
}

const tagName = "wup-popup";
customElements.define(tagName, WUPPopupElement);

// add element to tsx/jsx intellisense
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSXCustomProps<WUPPopupElement>;
    }
  }
}
