import { focusFirst } from ".";
import WUPBaseElement, { JSXCustomProps } from "./baseElement";
import onFocusGot from "./helpers/onFocusGot";
import onFocusLost from "./helpers/onFocusLost";
import { WUPPopup } from "./popupElement.types";
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

export default class WUPPopupElement extends WUPBaseElement implements WUPPopup.Element {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  protected get ctr(): typeof WUPPopupElement {
    return this.constructor as typeof WUPPopupElement;
  }

  static $placements = PopupPlacements;
  static $placementAttrs = {
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
  static $defaults: Omit<WUPPopup.Options, "target"> = {
    placement: WUPPopupElement.$placements.top.middle,
    placementAlt: [
      WUPPopupElement.$placements.top.middle.adjust, //
      WUPPopupElement.$placements.bottom.middle.adjust,
    ],
    offset: [0, 0],
    toFitElement: document.body,
    minWidthByTarget: false,
    minHeightByTarget: false,
    showCase: WUPPopup.ShowCases.onClick | WUPPopup.ShowCases.onFocus,
    hoverShowTimeout: 200,
    hoverHideTimeout: 500,
  };

  // todo placement-issue: rightMiddle doesn't work if right side will reduce ???
  $options: WUPPopup.Options = {
    ...this.ctr.$defaults,
    placementAlt: [...this.ctr.$defaults.placementAlt],
    offset: [...this.ctr.$defaults.offset],
  };

  $hide() {
    const f = () => this.#isOpened && this.hide(this.#showCase, WUPPopup.HideCases.onFireHide);
    // timeout - possible when el is created but not attached to document yet
    // eslint-disable-next-line no-unused-expressions
    this.$isReady ? f() : setTimeout(f);
  }

  $show() {
    if (this.$isReady) {
      this.init(true); // required to reinit assuming options are changed
      this.show(WUPPopup.ShowCases.always);
    } else {
      // possible when el is created but not attached to document yet
      setTimeout(() => this.show(WUPPopup.ShowCases.always));
    }
  }

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
        display: none;

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

  protected override gotReady() {
    super.gotReady();
    this.init();
  }

  #onShowCallbacks: Array<() => () => void> = [];
  #onHideCallbacks: Array<() => void> = [];
  #isOpened = false;
  /** Fired after gotReady() and $show() (to reinit according to options) */
  protected init(preventShow = false) {
    this.dispose(); // remove previously added events

    const { showCase } = this.$options;
    if (!showCase) {
      !preventShow && this.show(WUPPopup.ShowCases.always);
      return;
    }

    const { appendEvent } = this as WUPPopup.Element;
    // add event by popup.onShow and remove by onHide
    const onShowEvent = (...args: Parameters<WUPPopup.Element["appendEvent"]>) =>
      this.#onShowCallbacks.push(() => appendEvent(...args));

    const applyShowCase = (isAgain: boolean) => {
      const t = this.#defineTarget(!isAgain);
      this.$options.target = t;
      if (!t) {
        !isAgain && setTimeout(() => applyShowCase(true), 200); // try again because target can be undefined in time
        return;
      }

      // todo it doesn't work if new clickEvent fired programmatically
      let preventClickAfterFocus = false;
      let openedByHover = false;
      // onClick
      if (showCase & WUPPopup.ShowCases.onClick) {
        // fix when labelOnClick > inputOnClick
        let wasOutsideClick = false;
        let lastActive: HTMLElement | null = null;
        onShowEvent(document, "focusin", ({ target }) => {
          const isMe = this === target || this.includes(target);
          if (!isMe) {
            lastActive = target as HTMLElement;
          }
        });

        onShowEvent(document, "touchstart", () => (preventClickAfterFocus = false));
        onShowEvent(document, "mousedown", () => (preventClickAfterFocus = false));
        onShowEvent(document, "click", ({ target }) => {
          // filter click from target because we have target event for this
          if (t !== target && !(target instanceof Node && t.contains(target))) {
            const isMeClick = this === target || this.includes(target);
            if (isMeClick) {
              focusFirst(lastActive || t);
              this.hide(this.#showCase, WUPPopup.HideCases.onPopupClick);
            } else {
              this.hide(this.#showCase, WUPPopup.HideCases.onOutsideClick);
              wasOutsideClick = true;
              setTimeout(() => (wasOutsideClick = false), 50);
            }
          }
        });

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        appendEvent(t, "click", () => {
          if (timeoutId || wasOutsideClick || openedByHover) {
            return;
          }
          if (!this.#isOpened) {
            this.show(WUPPopup.ShowCases.onClick);
            lastActive = document.activeElement as HTMLElement;
          } else if (!preventClickAfterFocus) {
            this.hide(this.#showCase, WUPPopup.HideCases.onTargetClick);
          }
          // fix when labelOnClick > inputOnClick
          timeoutId = setTimeout(() => (timeoutId = undefined), 50);
        });
      }

      // onHover
      if (showCase & WUPPopup.ShowCases.onHover) {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const ev = (ms: number, isMouseIn: boolean) => {
          timeoutId && clearTimeout(timeoutId);
          openedByHover = isMouseIn;
          preventClickAfterFocus = false; // fixes case when click fired without mousedown
          if ((isMouseIn && !this.#isOpened) || (!isMouseIn && this.#isOpened))
            timeoutId = setTimeout(
              () =>
                isMouseIn
                  ? this.show(WUPPopup.ShowCases.onHover)
                  : this.hide(this.#showCase, WUPPopup.HideCases.onMouseLeave),
              ms
            );
          else timeoutId = undefined;
        };
        appendEvent(t, "mouseenter", () => ev(this.$options.hoverShowTimeout, true));
        // with onShowEvent it doesn't work properly (because filtered by timeout)
        appendEvent(t, "mouseleave", () => ev(this.$options.hoverHideTimeout, false));
      }

      // onFocus
      if (showCase & WUPPopup.ShowCases.onFocus) {
        const focus = () => {
          if (!this.#isOpened && this.show(WUPPopup.ShowCases.onFocus)) {
            preventClickAfterFocus = true;
          }
        };
        this.disposeLst.push(onFocusGot(t, focus, { debounceMs: this.$options.focusDebounceMs }));

        const blur = ({ relatedTarget }: FocusEvent) => {
          if (this.#isOpened) {
            const isToMe = this === document.activeElement || this === relatedTarget;
            const isToMeInside = !isToMe && this.includes(document.activeElement || relatedTarget);
            !isToMe && !isToMeInside && this.hide(this.#showCase, WUPPopup.HideCases.onFocusOut);
            if (!this.$isOpened) {
              openedByHover = false;
            }
          }
        };

        this.#onShowCallbacks.push(() => onFocusLost(t, blur, { debounceMs: this.$options.focusDebounceMs }));
      }
    };

    applyShowCase(false);
  }

  /* Array of attribute names to monitor for changes */
  static get observedAttributes() {
    return ["target", "placement"];
  }

  override gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    super.gotAttributeChanged(name, oldValue, newValue);
    if (name === "target") this.init();
    else if (name === "placement") this.#isOpened && this.show(this.#showCase || 0);
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
  #showCase?: WUPPopup.ShowCases;

  /** Override this method to prevent showing; this method fires beofre willShow event;
   * @param showCase as reason of show()
   * @return true if successful */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected canShow(showCase: WUPPopup.ShowCases): boolean {
    if (!this.$options.target) {
      return false;
    }
    return true;
  }

  /** Shows popup if target defined; returns true if successful */
  protected show(showCase: WUPPopup.ShowCases): boolean {
    if (!this.$isReady) {
      console.error(`${this.tagName}. Impossible to show. Element is not appended to document`);
      return false;
    }
    const wasHidden = !this.#isOpened;
    this.#isOpened && this.hide(this.#showCase, WUPPopup.HideCases.onShowAgain);

    this.$options.target = this.$options.target || this.#defineTarget();
    if (!this.canShow(showCase)) {
      return false;
    }

    if (wasHidden) {
      const e = (this as WUPPopup.Element).fireEvent("$willShow", { cancelable: true });
      if (e.defaultPrevented) {
        return false;
      }
    }

    this.#showCase = showCase;

    const pAttr = this.getAttribute("placement") as keyof typeof WUPPopupElement.$placementAttrs;
    this.$options.placement = (pAttr && WUPPopupElement.$placementAttrs[pAttr]) || this.$options.placement;

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
      // todo develop animation
      this.#frameId = window.requestAnimationFrame(goUpdate);
    };

    this.style.display = "block";
    goUpdate();
    this.style.opacity = "1";
    this.#isOpened = true;

    if (wasHidden) {
      this.#onHideCallbacks = this.#onShowCallbacks.map((f) => f());
      // run async to dispose internal resources first: possible dev-side-issues
      setTimeout(() => (this as WUPPopup.Element).fireEvent("$show", { cancelable: false }));
    }

    return true;
  }

  /** Override this method to prevent hiding; method calls before $willHide event
   * @param showCase as previous reason of show();
   * @param hideCase as reason of hide()
   * @return true if successful */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected canHide(showCase: WUPPopup.ShowCases | undefined, hideCase: WUPPopup.HideCases): boolean {
    return true;
  }

  /** Hide popup. @showCase as previous reason of show(); @hideCase as reason of hide() */
  protected hide(showCase: WUPPopup.ShowCases | undefined, hideCase: WUPPopup.HideCases): boolean {
    if (!this.canHide(showCase, hideCase)) return false;

    const wasShown = this.#isOpened;
    if (wasShown) {
      const e = (this as WUPPopup.Element).fireEvent("$willHide", { cancelable: true });
      if (e.defaultPrevented) {
        return false;
      }
    }

    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.style.opacity = "0";
    this.style.display = "none";

    this.#isOpened = false;
    this.#showCase = undefined;
    this.#prevRect = undefined;

    if (wasShown) {
      this.#onHideCallbacks.forEach((f) => f());
      this.#onHideCallbacks = [];
      // run async to dispose internal resources first: possible dev-side-issues
      setTimeout(() => (this as WUPPopup.Element).fireEvent("$hide", { cancelable: false }));
    }

    return true;
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

    // console.warn(pos);
    // transform has performance benefits in comparison with positioning
    this.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    // we can't remove maxWidth, maxHeight because maxWidth can affect on maxHeight and calculations will be wrong
    this.style.maxWidth = `${Math.min(pos.maxW || pos.freeW, this.#userSizes.maxWidth)}px`;
    this.style.maxHeight = `${Math.min(pos.maxH || pos.freeH, this.#userSizes.maxHeight)}px`;

    /* re-calc is required to avoid case when popup unexpectedly affects on layout:
      layout bug: Yscroll appears/disappears when display:flex; heigth:100vh > position:absolute; right:-10px */
    this.#prevRect = t.el.getBoundingClientRect();
  };

  protected override gotRemoved() {
    super.gotRemoved();
    this.#isOpened = false;
  }

  protected override dispose(): void {
    super.dispose();
    this.#onHideCallbacks.forEach((f) => f());
    this.#onHideCallbacks = [];
    this.#onShowCallbacks = [];
  }
}

// todo check inherritance with overriding options & re-assign to custom-tag
// todo extend document.createElement("wup-popup")
const tagName = "wup-popup";
customElements.define(tagName, WUPPopupElement);

// add element to tsx/jsx intellisense
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSXCustomProps<WUPPopup.Element> &
        Partial<{
          /** QuerySelector to find target - anchor that popup uses for placement.
           * If target not found previousSibling will be attached.
           * Popup defines target when onShow
           *
           * attr `target` has hire priority than ref.options.target
           *  */
          target: string;
          /** Placement rule (relative to target); applied on show(). Call show() again to apply changed options */
          placement: keyof typeof WUPPopupElement.$placementAttrs;
          /** SyntheticEvent is not supported. Use ref.addEventListener('$show') instead */
          onShow: never;
          /** SyntheticEvent is not supported. Use ref.addEventListener('$hide') instead */
          onHide: never;
          /** SyntheticEvent is not supported. Use ref.addEventListener('$willHide') instead */
          onWillHide: never;
          /** SyntheticEvent is not supported. Use ref.addEventListener('$willShow') instead */
          onWillShow: never;
        }>;
    }
  }
}
