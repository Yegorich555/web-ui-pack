import WUPBaseElement, { JSXCustomProps, WUP } from "../baseElement";
import { WUPPopup } from "./popupElement.types";
import { getBoundingInternalRect, PopupPlacements, px2Number, WUPPopupPlace } from "./popupPlacements";
import findScrollParent from "../helpers/findScrollParent";
import WUPPopupArrowElement from "./popupArrowElement";
import popupListenTarget from "./popupListenTarget";

export import ShowCases = WUPPopup.ShowCases;

/** PopupElement
 * @example
 * WUPPopupElement.$defaults.arrowEnable = true;
 *
 * const el = document.createElement('wup-popup');
 * el.$options.showCase = ShowCases.onClick | ShowCases.onFocus;
 * el.$options.target = document.querySelector('button');
 * // if placement impossible according to rules rest of possible rules will be applied
 * el.$options.placement = [
 *  WUPPopupElement.$placements.$top.$middle,
 *  WUPPopupElement.$placements.$bottom.$middle,
 *  WUPPopupElement.$placements.$bottom.$middle.$adjust, // adjust means 'ignore align to fit layout`
 *  WUPPopupElement.$placements.$bottom.$middle.$adjust.$resizeHeight, // resize means 'allow to resize to fit layout'
 * ];
 * document.body.append(el);
 * // or
 * <button id="btn1">Target</button>
 * // You can skip pointing attribute 'target' if popup appended after target
 * <wup-popup target="#btn1" placement="top-start">Some content here</wup-popup>
 * @tutorial Troubleshooting:
 * * You can set minWidth, minHeight to prevent squizing of popup or don't use rule '.$adjust'
 * * Don't override styles: transform, display
 * * Don't use inline styles" maxWidth, maxHeight
 */
export default class WUPPopupElement<
  Events extends WUPPopup.EventMap = WUPPopup.EventMap
> extends WUPBaseElement<Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  // @ts-ignore
  protected get ctr(): typeof WUPPopupElement {
    return this.constructor as typeof WUPPopupElement;
  }

  static $placements = PopupPlacements;
  static $placementAttrs = {
    "top-start": PopupPlacements.$top.$start.$adjust,
    "top-middle": PopupPlacements.$top.$middle.$adjust,
    "top-end": PopupPlacements.$top.$end.$adjust,
    "bottom-start": PopupPlacements.$bottom.$start.$adjust,
    "bottom-middle": PopupPlacements.$bottom.$middle.$adjust,
    "bottom-end": PopupPlacements.$bottom.$end.$adjust,
    "left-start": PopupPlacements.$left.$start.$adjust,
    "left-middle": PopupPlacements.$left.$middle.$adjust,
    "left-end": PopupPlacements.$left.$end.$adjust,
    "right-start": PopupPlacements.$right.$start.$adjust,
    "right-middle": PopupPlacements.$right.$middle.$adjust,
    "right-end": PopupPlacements.$right.$end.$adjust,
  };

  /** Default options. Change it to configure default behavior */
  static $defaults: Omit<WUPPopup.Options, "target"> = {
    placement: [
      WUPPopupElement.$placements.$top.$middle.$adjust, //
      WUPPopupElement.$placements.$bottom.$middle.$adjust,
    ],
    offset: [0, 0],
    arrowEnable: false,
    arrowOffset: [0.5, 0.5],
    toFitElement: document.body,
    minWidthByTarget: false,
    minHeightByTarget: false,
    showCase: ShowCases.onClick,
    hoverShowTimeout: 200,
    hoverHideTimeout: 500,
  };

  static get style(): string {
    return `
      :host {
        z-index: 99998;
        display: none;
        position: fixed!important;
        top: 0; left: 0;
        padding: 4px;
        margin: 0!important;
        box-sizing: border-box;
        border-radius: var(--border-radius, 6px);
        box-shadow: 0 1px 4px 0 #00000033;
        background: white;
        text-overflow: ellipsis;
        overflow: auto;
      }
     `;
  }

  /** Listen for target according to showCase and create/remove popup when it's required (by show/hide).
   *  This helps to avoid tons of hidden popups on HTML
   *  @example
   *   WUPPopupElement.$attach(
   *     {
   *       target: document.querySelector("button") as HTMLElement,
   *       text: "Some text here",
   *       showCase: WUPPopup.ShowCases.onClick,
   *     },
   *     // (el) => el.append("Some content can be here")
   *   );
   * @tutorial Troubleshooting:
   * * $attach doesn't work with showCase.always it doesn't make sense
   */
  static $attach<T extends WUPPopupElement>(
    options: Partial<Omit<WUPPopup.Options, "target">> & { target: HTMLElement; text: string; tagName?: string },
    /** Fires when popup is added to document */
    callback?: (el: T) => void
  ): void {
    let popup: T | undefined;

    const attach = () => {
      const refs = popupListenTarget(
        options,
        (v) => {
          const isCreate = !popup;
          if (!popup) {
            // eslint-disable-next-line no-use-before-define
            popup = document.body.appendChild(document.createElement(options.tagName ?? tagName) as T);
            const p = popup;

            popup.#attach = () => {
              // extra function to skip useless 1st attach on init
              p.#attach = attach;
              return refs;
            };

            Object.assign(popup._opts, options);
            options.text && popup.append(options.text);
            callback?.call(this, popup);
          }

          if (!popup.goShow(v)) {
            isCreate && popup.remove();
            return null;
          }

          return popup;
        },
        (v) => {
          const ok = (popup as T).goHide(v);
          if (ok) {
            (popup as T).#onRemoveRef = undefined;
            (popup as T).remove();
            popup = undefined;
          }
          return ok;
        }
      );
      return refs;
    };
    attach();
  }

  $options: WUPPopup.Options = {
    ...this.ctr.$defaults,
    placement: [...this.ctr.$defaults.placement],
    offset: [...this.ctr.$defaults.offset],
  };

  protected override _opts = this.$options;

  $hide() {
    const f = () => {
      // isReady possible false when you fire $hide on disposed element
      if (this.$isReady && this.#isOpened && this.goHide(WUPPopup.HideCases.onFireHide)) {
        this._opts.showCase !== WUPPopup.ShowCases.always && this.init(); // re-init to applyShowCase
      }
    };
    // timeout - possible when el is created but not attached to document yet
    // eslint-disable-next-line no-unused-expressions
    this.$isReady ? f() : setTimeout(f, 1); // 1ms need to wait forReady
  }

  $show() {
    const f = () => {
      if (!this.$isReady) {
        throw new Error(`${this.tagName}. Impossible to show: not appended to document`);
      } else {
        this.dispose(); // remove events
        this.goShow(WUPPopup.ShowCases.always);
      }
    };

    // eslint-disable-next-line no-unused-expressions
    this.$isReady ? f() : setTimeout(f, 1); // 1ms need to wait forReady
  }

  get $isOpened(): boolean {
    return this.#isOpened;
  }

  get $arrowElement(): HTMLElement | null {
    return this.#arrowElement || null;
  }

  /** assign this method */
  onTargetRemoved?: () => void;

  protected override gotReady() {
    super.gotReady();
    this.init();
  }

  #isOpened = false;
  #initTimer?: ReturnType<typeof setTimeout>;
  #onShowRef?: () => void; // func to add eventListeners onShow
  #onHideRef?: () => void; // func to remove eventListeners that added on onShow
  #onRemoveRef?: () => void; // func to remove eventListeners
  #attach?: () => ReturnType<typeof popupListenTarget>; // func to use alternative target
  /** Fired after gotReady() and $show() (to reinit according to options) */
  protected init(isTryAgain = false) {
    this.dispose(); // remove previously added events

    let refs: ReturnType<typeof popupListenTarget>;
    if (this.#attach) {
      refs = this.#attach();
    } else {
      const { el: t, err } = this.#defineTarget();
      if (!t) {
        this._opts.target = null;
        if (isTryAgain) {
          throw new Error(err);
        }

        this.#initTimer = setTimeout(() => this.init(true), 200); // timeout because of target can be undefined in time
        return;
      }
      this._opts.target = t;

      if (!this._opts.showCase /* always */) {
        this.goShow(WUPPopup.ShowCases.always);
        return;
      }

      refs = popupListenTarget(
        this._opts as typeof this._opts & { target: HTMLElement },
        (v) => {
          if (!this.goShow(v)) {
            return null;
          }
          return this as typeof this & { dispose: () => void };
        },
        this.goHide
      );
    }

    this.#onShowRef = refs.onShowRef;
    this.#onHideRef = refs.onHideRef;
    this.#onRemoveRef = refs.onRemoveRef;
  }

  #reinit() {
    this.$isOpened && this.goHide(WUPPopup.HideCases.onOptionChange);
    this.init(); // possible only if popup is hidden
  }

  static observedOptions = new Set<keyof WUPPopup.Options>(["showCase", "target", "placement"]);
  protected override gotOptionsChanged(e: WUP.OptionEvent) {
    super.gotOptionsChanged(e);
    this.#reinit();
  }

  /* Array of attribute names to monitor for changes */
  static get observedAttributes() {
    return ["target", "placement"];
  }

  #attrTimer?: number;
  protected override gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    super.gotAttributeChanged(name, oldValue, newValue);
    // debounce filter
    this.#attrTimer && clearTimeout(this.#attrTimer);
    this.#attrTimer = window.setTimeout(() => this.#reinit());
  }

  /** Defines target on show; Returns HtmlElement | Error */
  #defineTarget(): { el: HTMLElement; err?: undefined } | { err: string; el?: undefined } {
    const attrTrg = this.getAttribute("target");
    if (attrTrg) {
      const el = document.querySelector(attrTrg);
      if (el instanceof HTMLElement) {
        return { el };
      }
      return { err: `${this.tagName}. Target as HTMLElement not found for '${attrTrg}'` };
    }

    if (this._opts.target) {
      return { el: this._opts.target };
    }

    const el = this.previousElementSibling;
    if (el instanceof HTMLElement) {
      return { el };
    }
    return { err: `${this.tagName}. Target is not defined` };
  }

  #frameId?: number;
  #userSizes: {
    maxW: number;
    maxH: number;
    minH: number;
    minW: number;
  } = undefined as any;

  #placements: Array<WUPPopupPlace.PlaceFunc> = [];
  #prevRect?: DOMRect;
  #showCase?: WUPPopup.ShowCases;
  #scrollParents?: HTMLElement[];
  // eslint-disable-next-line no-use-before-define
  #arrowElement?: WUPPopupArrowElement;
  #borderRadius = 0;

  /** Override this method to prevent show; this method fires beofre willShow event;
   * @param showCase as reason of show()
   * @return true if successful */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected canShow(showCase: WUPPopup.ShowCases): boolean {
    return true;
  }

  /** Shows popup if target defined; returns true if successful */
  protected goShow(showCase: WUPPopup.ShowCases): boolean {
    const wasHidden = !this.#isOpened;
    this.#isOpened && this.goHide(WUPPopup.HideCases.onShowAgain);

    if (!this._opts.target) {
      const { el, err } = this.#defineTarget();
      this._opts.target = el || null;
      if (err) {
        throw new Error(err);
      }
    }

    if (!(this._opts.target as HTMLElement).isConnected) {
      throw new Error(`${this.tagName}. Target is not appended to document`);
    }

    if (!this.canShow(showCase)) return false;

    if (wasHidden) {
      const e = this.fireEvent("$willShow", { cancelable: true });
      if (e.defaultPrevented) {
        return false;
      }
    }

    this.#showCase = showCase;

    const pAttr = this.getAttribute("placement") as keyof typeof WUPPopupElement.$placementAttrs;
    const p = pAttr && WUPPopupElement.$placementAttrs[pAttr];
    this._opts.placement = p ? [p] : this._opts.placement;

    // it works only when styles is defined before popup is opened
    this.style.maxWidth = "";
    this.style.maxHeight = "";
    const style = getComputedStyle(this);
    this.#userSizes = {
      maxW: px2Number(style.maxWidth) || Number.MAX_SAFE_INTEGER,
      minW: Math.max(5, px2Number(style.paddingRight) + px2Number(style.paddingLeft), px2Number(style.minWidth)),

      maxH: px2Number(style.maxHeight) || Number.MAX_SAFE_INTEGER,
      minH: Math.max(5, px2Number(style.paddingTop) + px2Number(style.paddingBottom), px2Number(style.minHeight)),
    };

    this.#scrollParents = [];
    // eslint-disable-next-line no-constant-condition
    let l = this._opts.target;
    while (l && l !== document.body.parentElement) {
      const s = findScrollParent(l);
      s && this.#scrollParents.push(s);
      l = l.parentElement;
    }
    this.#scrollParents = this.#scrollParents.length ? this.#scrollParents : undefined;

    // get arrowSize
    if (this._opts.arrowEnable) {
      const el = document.body.appendChild(document.createElement(WUPPopupArrowElement.tagName));
      if (this._opts.arrowClass) {
        el.className = this._opts.arrowClass;
      }
      el.setupStyle(`
        background-color:${style.backgroundColor};
        boder:${style.border};
      `);

      this.#arrowElement = el;
      this.#borderRadius = Math.max.apply(
        this,
        style.borderRadius.split(" ").map((s) => px2Number(s))
      );
    }

    if (!this._opts.placement.length) {
      this._opts.placement.push(PopupPlacements.$top.$middle.$adjust);
    }
    const adjustRules = this._opts.placement
      .filter((v) => (v as WUPPopupPlace.AlignFunc).$adjust)
      .map((v) => (v as WUPPopupPlace.AlignFunc).$adjust);

    const otherRules = Object.keys(PopupPlacements)
      .filter(
        (k) =>
          !this._opts.placement.includes(PopupPlacements[k].$middle) &&
          !adjustRules.includes(PopupPlacements[k].$middle.$adjust)
      )
      .map((k) => PopupPlacements[k].$middle.$adjust);

    // init array of possible solutions to position + align popup
    this.#placements = [
      ...this._opts.placement,
      // try to use .$adjust from user defined rules
      ...adjustRules,
      ...adjustRules.map((v) => v.$resizeWidth),
      ...adjustRules.map((v) => v.$resizeHeight),
      // try to use other possible rules
      ...otherRules,
      ...otherRules.map((v) => v.$resizeWidth),
      ...otherRules.map((v) => v.$resizeHeight),
    ];

    const goUpdate = () => {
      this.#updatePosition();
      this.#frameId = window.requestAnimationFrame(goUpdate);
    };

    goUpdate();
    this.#isOpened = true;

    if (wasHidden) {
      this.#onShowRef?.call(this);
      // run async to dispose internal resources first: possible dev-side-issues
      setTimeout(() => this.fireEvent("$show", { cancelable: false }));
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
  protected goHide(hideCase: WUPPopup.HideCases): boolean {
    if (!this.canHide(this.#showCase, hideCase)) return false;

    const wasShown = this.#isOpened;
    if (wasShown) {
      const e = this.fireEvent("$willHide", { cancelable: true });
      if (e.defaultPrevented) {
        return false;
      }
    }

    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.style.display = "";

    this.#isOpened = false;
    this.#showCase = undefined;
    this.#prevRect = undefined;
    this.#scrollParents = undefined;

    if (this.#arrowElement) {
      this.#arrowElement.remove();
      this.#arrowElement = undefined;
    }

    if (wasShown) {
      this.#onHideRef?.call(this);
      // run async to dispose internal resources first: possible dev-side-issues
      setTimeout(() => this.fireEvent("$hide", { cancelable: false }));
    }

    return true;
  }

  /** Update position of popup. Call this method in cases when you changed options */
  #updatePosition = () => {
    const trg = this._opts.target as HTMLElement;
    if (!trg.isConnected) {
      setTimeout(() => {
        // possible false if popup removed with target
        this.isConnected && this.goHide(WUPPopup.HideCases.onTargetRemove);
        this.#onRemoveRef?.call(this);
      });
      return;
    }

    const t = trg.getBoundingClientRect() as WUPPopupPlace.Rect;
    if (
      // issue: it's wrong if minWidth, minHeight etc. is changed and doesn't affect on layout sizes directly
      this.#prevRect &&
      this.#prevRect.top === t.top &&
      this.#prevRect.left === t.left &&
      this.#prevRect.width === t.width &&
      this.#prevRect.height === t.height
    ) {
      return;
    }
    t.el = trg;

    if (this._opts.minWidthByTarget) {
      this.style.minWidth = `${t.width}px`;
    } else if (this.style.minWidth) {
      this.style.minWidth = "";
    }

    if (this._opts.minHeightByTarget) {
      this.style.minHeight = `${t.height}px`;
    } else if (this.style.minHeight) {
      this.style.minHeight = "";
    }

    const fitEl = this._opts.toFitElement || document.body;
    const fit = getBoundingInternalRect(fitEl) as WUPPopupPlace.Rect;
    fit.el = fitEl;

    this.style.display = "block";
    this.style.maxHeight = ""; // resetting is required to get default size
    this.style.maxWidth = ""; // resetting is required to get default size
    if (this.#arrowElement) {
      this.#arrowElement.style.display = "";
      this.#arrowElement.style.width = "";
      this.#arrowElement.style.height = "";
    }

    const me: WUPPopupPlace.MeRect = {
      // WARN: offsetSize is rounded so 105.2 >>> 105
      w: this.offsetWidth, // clientWidth doesn't include border-size
      h: this.offsetHeight,
      el: this,
      offset: {
        top: this._opts.offset[0],
        right: this._opts.offset[1],
        bottom: this._opts.offset[2] ?? this._opts.offset[0],
        left: this._opts.offset[3] ?? this._opts.offset[1],
      },
      minH: this.#userSizes.minH,
      minW: this.#userSizes.minW,
      arrow: this.#arrowElement
        ? {
            h: this.#arrowElement.offsetHeight,
            w: this.#arrowElement.offsetWidth,
            offset: {
              top: this._opts.arrowOffset[0],
              right: this._opts.arrowOffset[1],
              bottom: this._opts.arrowOffset[2] ?? this._opts.arrowOffset[0],
              left: this._opts.arrowOffset[3] ?? this._opts.arrowOffset[1],
            },
          }
        : { h: 0, w: 0, offset: { bottom: 0, left: 0, right: 0, top: 0 } },
    };

    // check if target hidden by scrollParent
    if (this.#scrollParents) {
      let isHiddenByScroll = false;

      let child: DOMRect = t;
      for (let i = 0; i < this.#scrollParents.length; ++i) {
        const p = getBoundingInternalRect(this.#scrollParents[i]);
        isHiddenByScroll =
          p.top >= child.bottom || //
          p.bottom <= child.top ||
          p.left >= child.right ||
          p.right <= child.left;

        if (isHiddenByScroll) break;
        child = p as DOMRect;
      }

      if (isHiddenByScroll) {
        this.style.display = ""; // hide popup if target hidden by scrollableParent
        if (this.#arrowElement) {
          this.#arrowElement.style.display = "none";
        }
        this.#prevRect = t.el.getBoundingClientRect();
        return;
      }
      const scrollRect = getBoundingInternalRect(this.#scrollParents[0]);

      // fix cases when target is partiallyHidden by scrollableParent
      // suggestion: if height/width is very small we can use another side
      if (scrollRect.top > t.top) {
        Object.defineProperty(t, "top", { get: () => scrollRect.top });
        Object.defineProperty(t, "height", { get: () => t.bottom - scrollRect.top });
      }
      if (scrollRect.bottom < t.bottom) {
        Object.defineProperty(t, "bottom", { get: () => scrollRect.bottom });
        Object.defineProperty(t, "height", { get: () => scrollRect.bottom - t.top });
      }
      if (scrollRect.left > t.left) {
        Object.defineProperty(t, "left", { get: () => scrollRect.left });
        Object.defineProperty(t, "width", { get: () => t.right - scrollRect.left });
      }
      if (scrollRect.right < t.right) {
        Object.defineProperty(t, "right", { get: () => scrollRect.right });
        Object.defineProperty(t, "width", { get: () => scrollRect.right - t.left });
      }
    }

    let lastRule: WUPPopupPlace.PlaceFunc;

    const process = () => {
      const hasOveflow = (p: WUPPopupPlace.Result, meSize: { w: number; h: number }): boolean =>
        p.left < fit.left ||
        p.top < fit.top ||
        p.freeW < this.#userSizes.minW ||
        p.freeH < this.#userSizes.minH ||
        p.left + Math.min(meSize.w, p.maxW || Number.MAX_SAFE_INTEGER, this.#userSizes.maxW) > fit.right ||
        p.top + Math.min(meSize.h, p.maxH || Number.MAX_SAFE_INTEGER, this.#userSizes.maxH) > fit.bottom;

      let pos: WUPPopupPlace.Result = <WUPPopupPlace.Result>{};
      const isOk = this.#placements.some((pfn) => {
        lastRule = pfn;
        pos = pfn(t, me, fit);
        let ok = !hasOveflow(pos, me);
        if (ok) {
          // maxW/H can be null if resize is not required
          if (pos.maxW != null && this.#userSizes.maxW > pos.maxW) {
            this.style.maxWidth = `${pos.maxW}px`;
          }
          if (pos.maxH != null && this.#userSizes.maxH > pos.maxH) {
            this.style.maxHeight = `${pos.maxH}px`;
          }
          // re-check because maxWidth can affect on height
          if (this.style.maxWidth) {
            const meSize = { w: this.offsetWidth, h: this.offsetHeight };
            ok = !hasOveflow(pos, meSize);
            if (!ok) {
              // reset styles if need to look for another position
              this.style.maxWidth = "";
              this.style.maxHeight = "";
            }
          }
        }
        return ok;
      });
      !isOk && console.error(`${this.tagName}. Impossible to place without overflow`, this);

      if (this.#arrowElement) {
        // change arrowSize if it's bigger than popup
        const checkSize = (relatedSize: number) => {
          // if we have border-radius of popup we need to include in offset to prevent overflow between arrow and popup
          const maxArrowSize = Math.max(relatedSize - this.#borderRadius * 2, 0);
          if (me.arrow.w > maxArrowSize) {
            me.arrow.w = maxArrowSize;
            me.arrow.h = maxArrowSize / 2;
            (this.#arrowElement as WUPPopupArrowElement).style.width = `${me.arrow.w}px`;
            (this.#arrowElement as WUPPopupArrowElement).style.height = `${me.arrow.h}px`;
            pos = lastRule(t, me, fit); // recalc position because size of arrow is changed
          }
        };

        if (pos.arrowLeft == null) {
          checkSize(this.offsetWidth);
          pos.arrowLeft = t.left + t.width / 2 - me.arrow.w / 2; // attach to middle of target
          pos.arrowLeft = Math.min(
            Math.max(pos.arrowLeft, pos.left + this.#borderRadius), // align to popup
            pos.left + this.offsetWidth - me.arrow.w - this.#borderRadius // align to popup
          );
        } else if (pos.arrowTop == null) {
          checkSize(this.offsetHeight);
          pos.arrowTop = t.top + t.height / 2 - me.arrow.h / 2; // attach to middle of target
          pos.arrowTop = Math.min(
            Math.max(pos.arrowTop, pos.top + this.#borderRadius + me.arrow.h / 2), // align to popup
            pos.top + this.offsetHeight - this.#borderRadius - me.arrow.w / 2 - me.arrow.h / 2 // align to popup
          );
        }
        this.#arrowElement.style.transform = `translate(${pos.arrowLeft}px, ${pos.arrowTop}px) rotate(${pos.arrowAngle}deg)`;
      }

      // transform has performance benefits in comparison with positioning
      this.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    };

    process();

    /* re-calc is required to avoid case when popup unexpectedly affects on layout:
      layout bug: Yscroll appears/disappears when display:flex; heigth:100vh > position:absolute; right:-10px
      issue: posible with cnt==2 issue will be reproduced
      */
    this.#prevRect = t.el.getBoundingClientRect();
  };

  protected override gotRemoved() {
    super.gotRemoved();
    this.#isOpened = false;
    this.#arrowElement?.remove();
    this.#arrowElement = undefined;
  }

  protected override dispose(): void {
    super.dispose();
    this.#initTimer && clearTimeout(this.#initTimer);
    this.#initTimer = undefined;
    this.#onRemoveRef?.call(this);
    this.#onRemoveRef = undefined;
  }
}

const tagName = "wup-popup";
customElements.define(tagName, WUPPopupElement);

declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPPopupElement;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSXCustomProps<WUPPopupElement> &
        Partial<{
          /** QuerySelector to find target - anchor that popup uses for placement.
           * If attr.target and $options.target are empty previousSibling will be attached.
           * Popup defines target on show()
           *
           * attr `target` has hire priority than ref.options.target
           *  */
          target: string;
          /** Placement rule (relative to target); applied on show(). Call show() again to apply changed options */
          placement: keyof typeof WUPPopupElement.$placementAttrs;
          /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$show') instead */
          onShow: never;
          /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$hide') instead */
          onHide: never;
          /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willHide') instead */
          onWillHide: never;
          /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willShow') instead */
          onWillShow: never;
        }>;
    }
  }
}

// todo describe issue in readme.md: in react nearest target can be changed but popup can't detect it -- for this case we need to add method $refresh()
// todo develop animation
// todo use attrs `top left bottom right` to show direction ???
