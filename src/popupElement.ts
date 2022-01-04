import WUPBaseElement, { JSXCustomProps } from "./baseElement";
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

export const enum PopupShowCases {
  /** Show when it's added to document; to hide just remove popup from document (outsideClick event can be helpful) */
  always = 0,
  /** On mouseHover event of target; hide by onMouseLeave */
  onHover = 1,
  // todo implement
  /** On focus event of target or focus of target.children; hide by onBlur (and onClick if PopupShowCases.onClick included) */
  onFocus = 1 << 1,
  /** On click event of target; hide by click anywhere */
  onClick = 1 << 2,
}

// todo test: PopupHideCase more than PopupShowCase
export const enum PopupHideCases {
  onOutsideClick = 1 << 3,
  /** When another event is fired onShow() or it's called programatically */
  onShowAgain = 1 << 4,
}

export interface IPopupOptions {
  /** Anchor that popup uses for placement. If target not found previousSibling will be attached.
   *
   * attr target="{querySelector}" has hire priority than .options.target */
  target?: HTMLElement | null;
  /** Placement rule relative to target; example Placements.bottom.start or Placements.bottom.start.adjust */
  placement: IPlacementFunction;
  /** Alternate when pointed placement doesn't fit the layout */
  placementAlt: Array<IPlacementFunction>;
  /** Alternative of margin for targetElement related to popup

   *  [top, right, bottom, left] or [top/bottom, right/left] in px */
  offset: [number, number, number, number] | [number, number];
  /** Inside edges of fitElement popup is positioned and can't overflow fitElement; {body} by default */
  toFitElement: HTMLElement;
  /** Sets minWidth 100% of targetWidth */
  minWidthByTarget: boolean;
  /** Sets minHeight 100% of targetWidth */
  minHeightByTarget: boolean;

  // todo overflow behavior when target partially hidden by scrollable parent
  // possible cases: hide, placeOpposite

  /** Case when popup need to show; You can use `showCase=PopupShowCases.onFocus | PopupShowCases.onClick` to join cases
   *
   * Default is PopupShowCases.always */
  showCase: PopupShowCases;
  /** Timeout in ms before popup shows on hover of target; Default is 200ms */
  hoverShowTimeout: number;
  /** Timeout in ms before popup hides on mouse-leave of target; Default is 500ms  */
  hoverHideTimeout: number;

  // todo check inherritance with overriding options & re-assign to custom-tag
}

export default class WUPPopupElement extends WUPBaseElement {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  // eslint-disable-next-line no-use-before-define
  // ["constructor"]: typeof WUPPopupElement;

  // todo static method show(text, options)
  static placements = PopupPlacements;
  static placementAttrs = {
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

  /** Default options. Change it to configure default behavior */
  static defaults: IPopupOptions = {
    target: undefined,
    placement: WUPPopupElement.placements.top.middle,
    placementAlt: [
      WUPPopupElement.placements.top.middle.adjust, //
      WUPPopupElement.placements.bottom.middle.adjust,
    ],
    offset: [0, 0],
    toFitElement: document.body,
    minWidthByTarget: false,
    minHeightByTarget: false,
    showCase: PopupShowCases.onFocus, // | PopupShowCases.onFocus,
    hoverShowTimeout: 200,
    hoverHideTimeout: 500,
  };

  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  protected get ctr(): typeof WUPPopupElement {
    return this.constructor as typeof WUPPopupElement;
  }

  get $options(): IPopupOptions {
    return this.ctr.defaults;
  }

  /** Current state; re-define it to override showOnInit behavior */
  $isOpened?: boolean;

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
      :host:focus { outline: 0; }
    `;

    // todo remove outline 0 if onFocusBehavior: none
    const root = this.attachShadow({ mode: "open" });
    root.appendChild(style);
    root.appendChild(document.createElement("slot"));

    // todo all methods should be bind
    this.$show = this.$show.bind(this);
    this.$hide = this.$hide.bind(this);
  }

  gotReady() {
    super.gotReady();
    this.$init();
  }

  #disposeTargetEvents: Array<() => void> = [];
  $init() {
    this.setAttribute("tabindex", "-1");
    // remove possible previous event listeners
    this.#disposeTargetEvents.forEach((f) => f());
    this.#disposeTargetEvents.length = 0;

    const { showCase } = this.$options;
    (this.$isOpened || !showCase) && this.$show(PopupShowCases.always);

    let disableErrors = false;
    const applyShowCase = () => {
      const t = this.#defineTarget(disableErrors);
      this.$options.target = t;
      if (!t) {
        disableErrors = !disableErrors; // suppress errors again
        setTimeout(applyShowCase, 200); // try again because target can be undefined in time
        return;
      }

      let preventClickAfterFocus = false;
      // onClick
      if (showCase & PopupShowCases.onClick) {
        const ev = () => {
          if (!this.$isOpened) {
            this.$show(PopupShowCases.onClick);
            const bodyClick = (e: MouseEvent) => {
              const et = e.target as HTMLElement;
              const isClickInside = et === t || t.contains(et) || e.target === this || this.contains(et);
              this.$hide(this.#showCase || 0, isClickInside ? PopupShowCases.onClick : PopupHideCases.onOutsideClick);
              !this.$isOpened && document.body.removeEventListener("click", bodyClick);
            };
            setTimeout(() => this.$isOpened && document.body.addEventListener("click", bodyClick), 200);
            this.#disposeTargetEvents.push(() => document.body.removeEventListener("click", bodyClick));
          } else if (!preventClickAfterFocus) {
            this.$hide(this.#showCase || 0, PopupShowCases.onClick);
          }
        };

        t.addEventListener("click", ev);
        this.#disposeTargetEvents.push(() => t.removeEventListener("click", ev));
      }

      // onHover
      if (showCase & PopupShowCases.onHover) {
        let isMouseIn = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const ev = (ms: number) => {
          timeoutId && clearTimeout(timeoutId);
          if ((isMouseIn && !this.$isOpened) || (!isMouseIn && this.$isOpened))
            timeoutId = setTimeout(
              () =>
                isMouseIn
                  ? this.$show(PopupShowCases.onHover)
                  : this.$hide(this.#showCase || 0, PopupShowCases.onHover),
              ms
            );
          else timeoutId = undefined;
        };

        const show = () => {
          isMouseIn = true;
          ev(this.$options.hoverShowTimeout);
        };

        const hide = () => {
          isMouseIn = false;
          ev(this.$options.hoverHideTimeout);
        };

        t.addEventListener("mouseenter", show);
        t.addEventListener("mouseleave", hide);
        this.#disposeTargetEvents.push(() => t.removeEventListener("mouseenter", show));
        this.#disposeTargetEvents.push(() => t.removeEventListener("mouseleave", hide));
      }

      // onFocus
      if (showCase & PopupShowCases.onFocus) {
        // for cases when you click on Label that tied with Input you get the following behavior: inputOnBlur > labelOnFocus > inputOnFocus
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const focus = () => {
          timeoutId && clearTimeout(timeoutId);
          timeoutId = undefined;
          !this.$isOpened && this.$show(PopupShowCases.onFocus);
          preventClickAfterFocus = true;
          setTimeout(() => (preventClickAfterFocus = false), 200);
        };
        // todo check it properly via tests
        const blur = () => {
          if (this.$isOpened) {
            timeoutId = setTimeout(() => {
              // checking where is focus should be because focus can be moved into console etc.
              const a = document.activeElement;
              // todo add $options.onFocusBehavior: moveBack, none
              const isStillFocused = a === t || a === this || !t.contains(a) || !this.contains(a);
              this.$isOpened && !isStillFocused && this.$hide(this.#showCase || 0, PopupShowCases.onFocus);
            }, 100);
          }
        };
        t.addEventListener("focusin", focus);
        t.addEventListener("focusout", blur);
        this.#disposeTargetEvents.push(() => t.removeEventListener("focusin", focus));
        this.#disposeTargetEvents.push(() => t.removeEventListener("focusout", blur));
      }
      // todo custom events onClosing, onClose, onShowing, onShow
    };
    showCase && applyShowCase();
  }

  disconnectedCallback() {
    this.#showCase && this.$hide(this.#showCase, PopupShowCases.always);
  }

  /* Array of attribute names to monitor for changes */
  static get observedAttributes() {
    return ["target", "placement"];
  }

  // eslint-disable-next-line consistent-return
  gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    super.gotAttributeChanged(name, oldValue, newValue);
    // eslint-disable-next-line default-case
    switch (name) {
      case "target":
        return this.$init();
      case "placement":
        return this.$show();
    }
  }

  /** Defining target when onShow */
  #defineTarget(disableErrors = false): HTMLElement | null {
    const attrTrg = this.getAttribute("target");
    if (attrTrg) {
      const t = document.querySelector(attrTrg);
      if (t instanceof HTMLElement) {
        return t;
      }
      !disableErrors && console.error(`${this.tagName}. Target not found for '${attrTrg}'`);
    }

    if (this.$options.target) {
      return this.$options.target;
    }

    const t = this.previousElementSibling;
    if (t instanceof HTMLElement) {
      return t;
    }
    !disableErrors && !attrTrg && console.error(`${this.tagName}. Target is not defined`);
    return null;
  }

  #frameId?: number;
  #userSizes = { maxWidth: Number.MAX_SAFE_INTEGER, maxHeight: Number.MAX_SAFE_INTEGER };
  #placements: Array<IPlacementFunction> = [];
  #prevRect?: DOMRect;
  #showCase?: PopupShowCases;

  /** Shows popup if target defined */
  $show(showCase?: PopupShowCases) {
    this.$options.target = this.#defineTarget();
    if (!this.$options.target) {
      return;
    }
    this.#showCase && this.$hide(this.#showCase, PopupHideCases.onShowAgain);
    this.#showCase = showCase;

    const pAttr = this.getAttribute("placement") as keyof typeof WUPPopupElement.placementAttrs;
    this.$options.placement = (pAttr && WUPPopupElement.placementAttrs[pAttr]) || this.$options.placement;

    // it works only when styles is defined before popup is open
    const style = getComputedStyle(this);
    this.#userSizes = {
      maxWidth: stringPixelsToNumber(style.maxWidth) || Number.MAX_SAFE_INTEGER,
      maxHeight: stringPixelsToNumber(style.maxHeight) || Number.MAX_SAFE_INTEGER,
    };

    // init array of possible solutions to position + align popup
    this.#placements = [
      this.$options.placement,
      ...this.$options.placementAlt,
      // try to adjust with ignore alignment options
      (t, me, fit) => popupAdjust.call(this.$options.placement(t, me, fit), me, fit, true),
      // try to adjust with other placements and ignoring alignment options
      ...Object.keys(PopupPlacements)
        .filter((k) => PopupPlacements[k].middle !== this.$options.placement)
        .map(
          (k) =>
            <IPlacementFunction>((t, me, fit) => popupAdjust.call(PopupPlacements[k].middle(t, me, fit), me, fit, true))
        ),
    ];

    const goUpdate = () => {
      this.#updatePosition();
      this.$isOpened = true;
      // todo develop animation
      this.style.opacity = "1";
      this.#frameId = window.requestAnimationFrame(goUpdate);
    };

    goUpdate();
  }

  /** Hide popup */
  $hide(): void;
  /** Hide popup. @showCase as previous reason of show(); @hideCase as reason of hide() */
  $hide(showCase: PopupShowCases, hideCase: PopupShowCases | PopupHideCases | null): void;
  /** Override this method to use custom behavior */
  $hide(showCase?: PopupShowCases, hideCase?: PopupShowCases | PopupHideCases | null): void {
    if (
      // eslint-disable-next-line eqeqeq
      showCase != hideCase &&
      showCase &&
      hideCase &&
      hideCase !== PopupHideCases.onOutsideClick &&
      !(showCase === PopupShowCases.onFocus && hideCase === PopupShowCases.onClick)
    ) {
      // prevent closing if another event; only showOnHover >> hideOnLeave etc.
      return;
    }

    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.style.opacity = "0";
    this.$isOpened = false;
    this.#showCase = undefined;
    this.#prevRect = undefined;
  }

  /** Update position of popup. Call this method in cases when you changed options */
  #updatePosition = () => {
    const t = (this.$options.target as HTMLElement).getBoundingClientRect() as IBoundingRect;
    t.el = this.$options.target as HTMLElement;
    if (
      // issue: it's wrong if minWidth, minHeight etc. is changed and doesn't affect on layout sizes directly
      !(
        !this.#prevRect ||
        this.#prevRect.top !== t.top ||
        this.#prevRect.left !== t.left ||
        this.#prevRect.width !== t.width ||
        this.#prevRect.height !== t.height
      )
    ) {
      return;
    }

    if (this.$options.minWidthByTarget) {
      this.style.minWidth = `${t.width}px`;
    } else if (this.style.minWidth) {
      this.style.minWidth = "";
    }

    if (this.$options.minHeightByTarget) {
      this.style.minHeight = `${t.height}px`;
    } else if (this.style.minHeight) {
      this.style.minHeight = "";
    }

    const fitEl = this.$options.toFitElement || document.body;
    const fit = getBoundingInternalRect(fitEl) as IBoundingRect;
    fit.el = fitEl;

    const me: IPlaceMeRect = {
      w: this.offsetWidth, // clientWidth doesn't include border-size
      h: this.offsetHeight,
      el: this,
      offset: {
        top: this.$options.offset[0],
        right: this.$options.offset[1],
        bottom: this.$options.offset[2] ?? this.$options.offset[0],
        left: this.$options.offset[3] ?? this.$options.offset[1],
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

    /* re-calc is required to avoid case when popup unexpectedly affects on layout:
      layout bug: Yscroll appears/disappears when display:flex; heigth:100vh > position:absolute; right:-10px */
    this.#prevRect = t.el.getBoundingClientRect();
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
        /** Placement rule (relative to target); applied on show(). Call show() again to apply changed options */
        placement?: keyof typeof WUPPopupElement.placementAttrs;
      };
    }
  }
}
