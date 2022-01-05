import WUPBaseElement, { JSXCustomProps } from "./baseElement";
import onEvent from "./helpers/onEvent";
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
  /** On focusIn event of target; hide by focusOut (also on click if PopupShowCases.onClick included) */
  onFocus = 1 << 1,
  /** On click event of target; hide by click anywhere */
  onClick = 1 << 2,
}

// todo test: PopupHideCase more than PopupShowCase
export const enum PopupHideCases {
  onOutsideClick = 1 << 3,
  onPopupClick,
  /** When another event is fired onShow() or it's called programatically */
  onShowAgain,
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
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  protected get ctr(): typeof WUPPopupElement {
    return this.constructor as typeof WUPPopupElement;
  }

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
    showCase: PopupShowCases.onClick, // | PopupShowCases.onFocus,
    hoverShowTimeout: 200,
    hoverHideTimeout: 500,
  };

  get $options(): IPopupOptions {
    return this.ctr.defaults;
  }

  /** Hide popup */
  $hide = () => this.hide(this.#showCase, PopupShowCases.always);
  /** Show popup */
  $show = () => this.show(PopupShowCases.always);
  /** Current state */
  get $isOpened(): boolean {
    return this.#isOpened;
  }

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
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
  }

  protected gotReady() {
    super.gotReady();
    this.init();
  }

  #isOpened = false;
  #targetEvents: Array<() => void> = [];
  protected init() {
    this.setAttribute("tabindex", "-1"); // required to handle onClick onFocus behavior
    this.#targetEvents.forEach((f) => f()); // remove possible previous event listeners
    this.#targetEvents.length = 0;

    const { showCase } = this.$options;
    if (!showCase) {
      this.show(PopupShowCases.always);
      return;
    }

    const applyShowCase = (isAgain: boolean) => {
      const t = this.#defineTarget(!isAgain);
      this.$options.target = t;
      if (!t) {
        !isAgain && setTimeout(() => applyShowCase(true), 200); // try again because target can be undefined in time
        return;
      }

      let preventClickAfterFocus = false;
      // onClick
      if (showCase & PopupShowCases.onClick) {
        const onTargetClick = (e: MouseEvent) => {
          if (!this.#isOpened) {
            this.show(PopupShowCases.onClick);
            if (!this.#isOpened) {
              return;
            }

            const removeEv = onEvent(document.body, "click", (eBody) => {
              if (e === eBody) return; // preventsPropagation from target

              // case possible when hide() overrided and clickOnTarget doesn't affect on hide()
              if (this.#isOpened && t !== eBody.target && !t.contains(eBody.target)) {
                const isMeClick = this === eBody.target || this.contains(eBody.target);
                this.hide(this.#showCase, isMeClick ? PopupHideCases.onPopupClick : PopupHideCases.onOutsideClick);
              }

              if (!this.#isOpened) {
                const i = this.#targetEvents.findIndex(removeEv);
                this.#targetEvents.splice(i, 1);
                removeEv();
              }
            });

            this.#targetEvents.push(removeEv);
          } else if (!preventClickAfterFocus) {
            this.hide(this.#showCase, PopupShowCases.onClick);
          }
        };
        this.#targetEvents.push(onEvent(t, "click", onTargetClick));
      }

      // onHover
      if (showCase & PopupShowCases.onHover) {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const ev = (ms: number, isMouseIn: boolean) => {
          timeoutId && clearTimeout(timeoutId);
          if ((isMouseIn && !this.#isOpened) || (!isMouseIn && this.#isOpened))
            timeoutId = setTimeout(
              () => (isMouseIn ? this.show(PopupShowCases.onHover) : this.hide(this.#showCase, PopupShowCases.onHover)),
              ms
            );
          else timeoutId = undefined;
        };

        this.#targetEvents.push(onEvent(t, "mouseenter", () => ev(this.$options.hoverShowTimeout, true)));
        this.#targetEvents.push(onEvent(t, "mouseleave", () => ev(this.$options.hoverHideTimeout, false)));
      }

      // onFocus
      if (showCase & PopupShowCases.onFocus) {
        // todo check behavior
        // for cases when you click on Label that tied with Input you get the following behavior: inputOnBlur > labelOnFocus > inputOnFocus
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let prev = (document.activeElement as HTMLElement) || document.body;
        const onMeFocus = () => prev.focus();
        const onFocusOut = (e: FocusEvent) => (prev = (e.target as HTMLElement) || prev);

        const focus = () => {
          timeoutId && clearTimeout(timeoutId);
          timeoutId = undefined;
          !this.#isOpened && this.show(PopupShowCases.onFocus);
          preventClickAfterFocus = true;
          setTimeout(() => (preventClickAfterFocus = false), 200);
          console.warn("focus", document.activeElement);

          if (this.#isOpened) {
            this.#targetEvents.push(onEvent(this, "focus", () => prev.focus()));
            this.#targetEvents.push(onEvent(document.body, "focusout", onFocusOut));
          }
        };
        // todo check it properly via tests
        const blur = () => {
          if (this.#isOpened) {
            timeoutId && clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              if (!this.#isOpened) {
                return;
              }
              // checking where is focus should be because focus can be moved into console etc.
              const a = document.activeElement;
              const isStillFocused = a === t || a === this || !t.contains(a) || !this.contains(a);
              !isStillFocused && this.hide(this.#showCase, PopupShowCases.onFocus);
              this.removeEventListener("focus", onMeFocus);
              document.body.removeEventListener("focusout", onFocusOut);
            }, 100);
          }
        };

        this.#targetEvents.push(onEvent(t, "focusin", focus));
        this.#targetEvents.push(onEvent(t, "focusout", blur));
      }
      // todo custom events onClosing, onClose, onShowing, onShow
    };

    applyShowCase(false);
  }

  protected disconnectedCallback() {
    this.#showCase && this.hide(this.#showCase, PopupShowCases.always);
  }

  /* Array of attribute names to monitor for changes */
  static get observedAttributes() {
    return ["target", "placement"];
  }

  protected gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    super.gotAttributeChanged(name, oldValue, newValue);
    switch (name) {
      case "target":
        return this.init();
      case "placement":
        return (this.#isOpened && this.show(this.#showCase || 0)) || undefined;
      default:
        return undefined;
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
  protected show(showCase: PopupShowCases) {
    this.$options.target = this.#defineTarget();
    if (!this.$options.target) {
      return;
    }
    this.hide(this.#showCase, PopupHideCases.onShowAgain);
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
      this.#isOpened = true;
      // todo develop animation
      this.style.opacity = "1";
      this.#frameId = window.requestAnimationFrame(goUpdate);
    };

    goUpdate();
  }

  /** Override this method to prevent hiding; @showCase as previous reason of show(); @hideCase as reason of hide() */
  protected canHide(showCase: PopupShowCases | undefined, hideCase: PopupShowCases | PopupHideCases): boolean {
    // prevent if showOnFocus and hideByClick
    if (showCase === PopupShowCases.onFocus && hideCase === PopupShowCases.onClick) return false;

    return true;
  }

  /** Hide popup. @showCase as previous reason of show(); @hideCase as reason of hide() */
  protected hide(showCase: PopupShowCases | undefined, hideCase: PopupShowCases | PopupHideCases): void {
    if (!this.canHide(showCase, hideCase)) return;

    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.style.opacity = "0";
    this.#isOpened = false;
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
