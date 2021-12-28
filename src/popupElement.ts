import { IWUPBaseElement, JSXCustomProps } from "./baseElement";
import {
  getBoundingInternalRect,
  IBoundingRect,
  IPlacementFunction,
  IPlacementResult,
  IPlaceMeRect,
  popupAdjust,
  PopupPlacements,
  stringPixelsToNumber,
} from "./popupPlacements";

interface IPopupState {
  /** Current state; you can re-define it to override default => showOnInit */
  isOpened?: boolean;
}

interface IPopupOptions {
  /** Anchor realative to that popup is placed.
   * If target not found previousSibling will be attached.
   * Popup defines target onShow
   *
   * attr target="{querySelector}" has hire priority than .options.target
   *  */
  target?: HTMLElement | null;
  /** Placement rule; example Placements.bottom.start  Placements.bottom.start.adjust */
  placement: IPlacementFunction;
  /** Alternate when pointed placement doesn't fit the layout */
  placementAlt: Array<IPlacementFunction>;
  /** Alternative of margin for targetElement related to popup

   *  [top, right, bottom, left] or [top/bottom, right/left] in px
   * */
  offset: [number, number, number, number] | [number, number];
  /** Returns element according to this one need to check overflow; {body} by default */
  toFitElement: HTMLElement;
  /** Sets minWidth 100% of targetWidth */
  minWidthByTarget: boolean;
  /** Sets minHeight 100% of targetWidth */
  minHeightByTarget: boolean;

  // todo overflow behavior when target partially hidden by scrollable parent
  // possible cases: hide, placeOpposite

  // todo check inherritance with overriding options
}

export default class WUPPopupElement extends HTMLElement implements IWUPBaseElement {
  // todo static method show(text, options)
  static Placements = PopupPlacements;
  static PlacementAttrs = {
    "top-start": PopupPlacements.top.start.adjust,
    "top-middle": PopupPlacements.top.middle.adjust,
    "top-end": PopupPlacements.top.end.adjust,
    "bottom-start": PopupPlacements.bottom.start.adjust,
    "bottom-middle": PopupPlacements.bottom.middle.adjust,
    "bottom-end": PopupPlacements.bottom.end.adjust,
    "left-start": PopupPlacements.left.start.adjust,
    "left-middle": PopupPlacements.left.middle.adjust,
    "left-end": PopupPlacements.left.end.adjust,
    "right-start": PopupPlacements.right.start.adjust,
    "right-middle": PopupPlacements.right.middle.adjust,
    "right-end": PopupPlacements.right.end.adjust,
  };

  options: IPopupOptions = {
    target: undefined,
    placement: WUPPopupElement.Placements.top.middle,
    // todo how to setup alt via attrs
    placementAlt: [WUPPopupElement.Placements.top.middle.adjust, WUPPopupElement.Placements.bottom.middle.adjust],
    offset: [0, 0],
    toFitElement: document.body,
    minWidthByTarget: false,
    minHeightByTarget: false,
  };

  state: IPopupState = {
    isOpened: undefined,
  };

  constructor() {
    super();

    const style = document.createElement("style");
    style.textContent = `
      :host {
        position: fixed!important;
        z-index: 99999;
        margin: 0!important;
        box-sizing: border-box;
        top: 0;
        left: 0;
        opacity: 0;

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
    const a = this.getAttribute("show");
    if (a) {
      this.state.isOpened = a === "true";
    }
    if (this.state.isOpened !== false) {
      this.show();
    }
  }

  disconnectedCallback() {
    this.hide();
  }

  /* array of attribute names to monitor for changes */
  static get observedAttributes() {
    return ["target", "placement", "show"];
  }

  // (name: string, oldValue: string, newValue: string)
  /* called when one of attributes listed above is modified */
  attributeChangedCallback() {
    this.connectedCallback();
  }

  /** Defining target when onShow */
  defineTarget(): HTMLElement | null {
    const attrTrg = this.getAttribute("target");
    if (attrTrg) {
      const t = document.querySelector(attrTrg);
      if (t instanceof HTMLElement) {
        return t;
      }
      console.error(`${this.tagName}. Target not found for '${attrTrg}'`);
    }

    if (this.options.target) {
      return this.options.target;
    }

    const t = this.previousElementSibling;
    if (t instanceof HTMLElement) {
      return t;
    }
    console.error(`${this.tagName}. Target is not defined`);
    return this.options.target || null;
  }

  #reqId?: number;
  #userSizes = { maxWidth: Number.MAX_SAFE_INTEGER, maxHeight: Number.MAX_SAFE_INTEGER };
  #placements: Array<IPlacementFunction> = [];
  #prev?: DOMRect;
  /** Show popup if target defined */
  show() {
    this.options.target = this.defineTarget();
    if (!this.options.target) {
      return;
    }
    this.hide();

    const pAttr = this.getAttribute("placement") as keyof typeof WUPPopupElement.PlacementAttrs;
    this.options.placement = (pAttr && WUPPopupElement.PlacementAttrs[pAttr]) || this.options.placement;

    // it works only when styles is defined before popup is open
    const style = getComputedStyle(this);
    this.#userSizes = {
      maxWidth: stringPixelsToNumber(style.maxWidth) || Number.MAX_SAFE_INTEGER,
      maxHeight: stringPixelsToNumber(style.maxHeight) || Number.MAX_SAFE_INTEGER,
    };

    // init array of possible solutions to position + align popup
    this.#placements = [
      this.options.placement,
      ...this.options.placementAlt,
      (t, me, fit) => popupAdjust.call(this.options.placement(t, me, fit), me, fit, true),
      ...Object.keys(PopupPlacements)
        .filter((k) => PopupPlacements[k].middle !== this.options.placement)
        .map(
          (k) =>
            <IPlacementFunction>((t, me, fit) => popupAdjust.call(PopupPlacements[k].middle(t, me, fit), me, fit, true))
        ),
    ];

    const goUpdate = () => {
      this.#updatePosition();
      this.state.isOpened = true;
      // todo develop animation
      // todo possible blink effect on show close show again
      this.style.opacity = "1";
      this.#reqId = window.requestAnimationFrame(goUpdate);
    };

    goUpdate();
  }

  /** Hide popup */
  hide() {
    this.#reqId && window.cancelAnimationFrame(this.#reqId);
    this.style.opacity = "0";
    this.state.isOpened = false;
    this.#prev = undefined;
  }

  /** Update position of popup. Call this method in cases when you changed options */
  #updatePosition = () => {
    const t = (this.options.target as HTMLElement).getBoundingClientRect() as IBoundingRect;
    t.el = this.options.target as HTMLElement;
    if (
      // issue: it's wrong if minWidth, minHeight etc. is changed and doesn't affect on layout sizes directly
      !(
        !this.#prev ||
        this.#prev.top !== t.top ||
        this.#prev.left !== t.left ||
        this.#prev.width !== t.width ||
        this.#prev.height !== t.height
      )
    ) {
      return;
    }

    if (this.options.minWidthByTarget) {
      this.style.minWidth = `${t.width}px`;
    } else if (this.style.minWidth) {
      this.style.minWidth = "";
    }

    if (this.options.minHeightByTarget) {
      this.style.minHeight = `${t.height}px`;
    } else if (this.style.minHeight) {
      this.style.minHeight = "";
    }

    const fitEl = this.options.toFitElement || document.body;
    const fit = getBoundingInternalRect(fitEl) as IBoundingRect;
    fit.el = fitEl;

    const me: IPlaceMeRect = {
      w: this.offsetWidth, // clientWidth doesn't include border-size
      h: this.offsetHeight,
      el: this,
      offset: {
        top: this.options.offset[0],
        right: this.options.offset[1],
        bottom: this.options.offset[2] ?? this.options.offset[0],
        left: this.options.offset[3] ?? this.options.offset[1],
      },
    };

    const hasOveflow = (p: IPlacementResult): boolean =>
      p.left < fit.left ||
      p.top < fit.top ||
      p.left + Math.min(me.w, p.maxW || Number.MAX_SAFE_INTEGER) > fit.right ||
      p.top + Math.min(me.h, p.maxH || Number.MAX_SAFE_INTEGER) > fit.bottom;

    let pos: IPlacementResult = <IPlacementResult>{};
    const isOk = this.#placements.some((pfn) => {
      pos = pfn(t, me, fit);
      pos.maxFreeW = Math.min(pos.maxW || pos.freeW, this.#userSizes.maxWidth);
      pos.maxFreeH = Math.min(pos.maxW || pos.freeW, this.#userSizes.maxWidth);
      return !hasOveflow(pos);
    });
    !isOk && console.error(`${this.tagName}. Impossible to place popup without overflow`);

    console.warn(pos);
    // transform has performance benefits in comparison with positioning
    this.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    // we can't remove maxWidth, maxHeight because maxWidth can affect on maxHeight and calculations will be wrong
    this.style.maxWidth = `${Math.min(pos.maxW || pos.freeW, this.#userSizes.maxWidth)}px`;
    this.style.maxHeight = `${Math.min(pos.maxH || pos.freeH, this.#userSizes.maxHeight)}px`;

    /* re-calc requires to avoid case when popup unexpectedly affects on layout:
      layout bug: Yscroll appears/disappears when display:flex; heigth:100vh > position:absolute; right:-10px */
    this.#prev = t.el.getBoundingClientRect();
  };
}

const tagName = "wup-popup";
customElements.define(tagName, WUPPopupElement);

// add element to tsx/jsx intellisense
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSXCustomProps<WUPPopupElement> & {
        /** QuerySelector to find target - anchor that popup uses for placement.
         * If target not found previousSibling will be attached.
         * Popup defines target when onShow
         *
         * attr target="" has hire priority than .options.target
         *  */
        target?: string;
        /** Placement rule (relative to target); applied on show method. Fire show again if placement is changed */
        placement?: keyof typeof WUPPopupElement.PlacementAttrs;
        /** Behavior onInit; Default is true */
        show?: "true" | "false";
      };
    }
  }
}
