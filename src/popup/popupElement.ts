import { ShowCases, HideCases, Animations } from "./popupElement.types";
import { WUPcssScrollSmall } from "../styles";
import WUPBaseElement from "../baseElement";
import { getOffset, PopupPlacements } from "./popupPlacements";
import { findScrollParentAll } from "../helpers/findScrollParent";
import WUPPopupArrowElement from "./popupArrowElement";
import popupListen from "./popupListen";
import { getBoundingInternalRect, px2Number, styleTransform } from "../helpers/styleHelpers";
import { animateDropdown } from "../helpers/animate";
import isIntoView from "../helpers/isIntoView";
import objectClone from "../helpers/objectClone";

// import {
//   ShowCases as PopupShowCases,
//   HideCases as PopupHideCases,
//   Animations as PopupAnimations,
// } from "./popupElement.types";
// export import ShowCases = PopupShowCases;
// export import HideCases = PopupHideCases;
// export import Animations = PopupAnimations;

const attachLst = new Map<HTMLElement, () => void>();

/** PopupElement
 * @example
 * JS/TS
 * ```js
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
 * const btn = document.querySelector('button');
 * // this is the most recomended way because $attach appends popup only by onShow and removes byHide
 * const detach = WUPPopupElement.$attach(
                    { target: btn, text: "Some text content here", showCase: ShowCases.onFocus | ShowCases.onClick },
                    (popup) => { popup.className = "popup-class-here"; }
                  )'
 *```
 * HTML
 * ```html
 * <button id="btn1">Target</button>
 * <!-- You can skip pointing attribute 'target' if popup appended after target -->
 * <wup-popup target="#btn1" placement="top-start">Some content here</wup-popup>
 * ```
 * @tutorial Troubleshooting:
 * * You can set minWidth, minHeight to prevent squizing of popup or don't use rule '.$adjust'
 * * Don't override styles: display, transform (possible to override only for animation)
 * * Don't use inline styles: maxWidth, maxHeight, minWidth, minHeight
 * * If target removed (when popup $isOpen) and appended again you need to update $options.target (because $options.target cleared)
 * * Popup has overflow 'auto'; If you change to 'visible' it will apply maxWidth/maxHeight to first children (because popup must be restricted by maxSize to avoid layout issues)
 * * During the closing attr 'hide' is appended only if css-animation-duration is detected
 */
export default class WUPPopupElement<
  Events extends WUP.Popup.EventMap = WUP.Popup.EventMap
> extends WUPBaseElement<Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPPopupElement;

  static get observedOptions(): Array<keyof WUP.Popup.Options> {
    return ["showCase", "target", "placement"];
  }

  /* Array of attribute names to monitor for changes */
  static get observedAttributes(): Array<LowerKeys<WUP.Popup.Options>> {
    return ["target", "placement"];
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
  static $defaults: Omit<WUP.Popup.Options, "target"> = {
    placement: [
      WUPPopupElement.$placements.$top.$middle.$adjust, //
      WUPPopupElement.$placements.$bottom.$middle.$adjust,
    ],
    toFitElement: document.body,
    showCase: ShowCases.onClick,
    hoverShowTimeout: 200,
    hoverHideTimeout: 500,
  };

  static get $styleRoot(): string {
    return `
      :root {
        --popup-shadow-size: 4px;
        --popup-anim: 300ms;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        z-index: 90000;
        display: none;
        position: fixed!important;
        top: 0; left: 0;
        padding: 4px; margin: 0;
        max-width: calc(100vw - 2px);
        max-height: calc(100vh - 2px);
        overflow: auto;
        box-sizing: border-box;
        border-radius: var(--border-radius, 6px);
        box-shadow: 0 1px var(--popup-shadow-size) 0 #00000033;
        background: white;
        text-overflow: ellipsis;
      }
      @media not all and (prefers-reduced-motion) {
        :host,
        :host+:host-arrow {
          animation: WUP-POPUP-a1 var(--popup-anim) ease-in-out forwards;
        }
        @keyframes WUP-POPUP-a1 {
          from {opacity: 0;}
          to {opacity: 1;}
        }
        :host[hide],
        :host[hide]+:host-arrow {
          animation: WUP-POPUP-a2 var(--popup-anim) ease-in-out forwards;
        }
        @keyframes WUP-POPUP-a2 {
          to {opacity: 0;}
        }
       }
      ${WUPcssScrollSmall(":host")}`;
  }

  /** Listen for target according to showCase and create/remove popup when it's required (by show/hide).
   *  This helps to avoid tons of hidden popups on HTML;
   *  Firing detach doesn't required if target removed by target.remove() or target.parent.removeChild(target);
   *  If target is removed via changing innerHTML you should fire detach() to avoid memoryLeak
   *  @returns detach-function (hide,remove popup and remove eventListeners)
   *  @example
   *  const detach = WUPPopupElement.$attach(
   *     {
   *       target: document.querySelector("button") as HTMLElement,
   *       text: "Some text here",
   *       showCase: ShowCases.onClick,
   *     },
   *     // (el) => el.class = "popup-attached"
   *   );
   * @tutorial Troubleshooting:
   * * $attach doesn't work with showCase.always it doesn't make sense
   * * every new attach on the same target > re-init previous (1 attach per target is possible)
   * * Firing detach() doesn't required if target removed by `target.remove()` or `target.parent.removeChild(target)`;
   * * If popup is hidden and target is removed via `target.parent.innerHTML="another content"` you should fire detach() to avoid memoryLeak
   */
  static $attach<T extends WUPPopupElement>(
    options: WUP.Popup.AttachOptions,
    /** Fires when popup is added to document */
    callback?: (el: T) => void
  ): () => void {
    let popup: T | undefined;

    const savedDetach = attachLst.get(options.target);
    if (savedDetach) {
      console.warn(
        `${tagName.toUpperCase()}. $attach is called again on the same target. Possible memory leak. Use detach() before new attach`
      );
      savedDetach();
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const attach = () => {
      if (popup && !popup.$options.target) {
        popup.$options.target = options.target;
      }
      const opts = popup ? { ...options, ...popup.$options, target: popup.$options.target as HTMLElement } : options;
      let isHidding = false;

      const refs = popupListen(
        opts,
        (v) => {
          isHidding = false;
          const isCreate = !popup;
          if (!popup) {
            const p = document.body.appendChild(document.createElement(opts.tagName ?? tagName) as T);
            popup = p;
            Object.assign(p._opts, opts);
            opts.text && p.append(opts.text);

            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            p.#attach = () => {
              // extra function to skip useless 1st attach on init
              p.#attach = attach; // this is required to rebind events on re-init
              return refs;
            };

            callback?.call(this, p);
          }

          if (!popup.goShow.call(popup, v)) {
            /* istanbul ignore else */
            if (isCreate) {
              popup!.#listenRefs = undefined; // otherwise remove() destroys events
              popup.remove.call(popup);
            }
            return null;
          }

          return popup;
        },
        async (v) => {
          isHidding = true;
          const ok = await popup!.goHide.call(popup, v);
          /* istanbul ignore else */
          if (ok && isHidding) {
            popup!.#listenRefs = undefined; // otherwise remove() destroys events
            popup!.remove.call(popup);
            popup = undefined;
          }
          return ok;
        }
      );

      return refs;
    };
    const r = attach();

    function detach(): void {
      if (popup) {
        popup.$isOpen && popup.goHide.call(popup, HideCases.onManuallCall);
        (popup as T).remove.call(popup);
      }
      r.stopListen();
      popup = undefined;
      attachLst.delete(options.target);
    }

    attachLst.set(options.target, detach);

    return detach;
  }

  /** All options for this popup. If you want to change common options @see WUPPopupElement.$defaults */
  $options: WUP.Popup.Options = objectClone(this.#ctr.$defaults);
  protected override _opts = this.$options;

  /** Hide popup
   * @returns Promise resolved by animation time */
  $hide(): Promise<void> {
    return new Promise<void>((resolve) => {
      const f = async (): Promise<void> => {
        // isReady possible false when you fire $hide on disposed element
        if (this.$isReady && this.#isOpen && (await this.goHide(HideCases.onManuallCall))) {
          this._opts.showCase !== ShowCases.always && this.init(); // re-init to applyShowCase
        }
        resolve();
      };
      // timeout - possible when el is created but not attached to document yet
      this.$isReady ? f() : setTimeout(f, 1); // 1ms need to wait forReady
    });
  }

  /** Show popup; it disables $options.showCase and rollbacks by $hide().
   * @returns Promise resolved by animation time */
  $show(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const f = async (): Promise<void> => {
        if (!this.$isReady) {
          reject(new Error(`${this.tagName}. Impossible to show: not appended to document`));
        } else {
          this.disposeListener(); // remove events
          try {
            await this.goShow(ShowCases.always);
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      };

      this.$isReady ? f() : setTimeout(f, 1); // 1ms need to wait forReady
    });
  }

  /** Force to update position when popup $isOpen. Call this if popup content is changed */
  $refresh(): void {
    /* istanbul ignore else */
    if (this.#state) this.#state.prevRect = undefined;
  }

  /** Returns if popup is opened */
  get $isOpen(): boolean {
    return this.#isOpen;
  }

  /** Returns arrowElement if $options.arrowEnable=true and after popup $isOpen */
  get $refArrow(): WUPPopupArrowElement | null {
    return this.#refArrow || null;
  }

  protected override gotReady(): void {
    super.gotReady();
    this.init();
  }

  #isOpen = false;
  #listenRefs?: ReturnType<typeof popupListen>;
  #attach?: () => ReturnType<typeof popupListen>; // func to use alternative target
  /** Called after gotReady() and $show() (to reinit according to options) */
  protected init(): void {
    this.disposeListener(); // remove previously added events

    if (this.#attach) {
      this.#listenRefs = this.#attach();
    } else {
      this._opts.target = this.#defineTarget();

      if (!this._opts.showCase /* always */) {
        this.goShow(ShowCases.always);
        return;
      }

      this.#listenRefs = popupListen(
        this._opts as typeof this._opts & { target: HTMLElement },
        (v) => (this.goShow(v) ? this : null),
        (v) => this.goHide(v)
      );
    }
  }

  protected override gotChanges(propsChanged: Array<string> | null): void {
    super.gotChanges(propsChanged);

    if (propsChanged) {
      this.$isOpen && this.goHide(HideCases.onOptionChange);
      this.init(); // possible only if popup is hidden
    }
  }

  protected override connectedCallback(): void {
    this.style.opacity = "0"; // to prevent render at the left-top corner before first updateState is happend
    super.connectedCallback();
  }

  /** Defines target on show; @returns HTMLElement | Error */
  #defineTarget(): HTMLElement {
    const attrTrg = this.getAttribute("target");
    if (attrTrg) {
      const el = document.querySelector(attrTrg);
      if (el instanceof HTMLElement) {
        return el;
      }
      throw new Error(`${this.tagName}. Target as HTMLElement not found for '${attrTrg}'`);
    }

    if (this._opts.target) {
      return this._opts.target;
    }

    const el = this.previousElementSibling;
    if (el instanceof HTMLElement) {
      return el;
    }

    throw new Error(`${this.tagName}. Target is not defined`);
  }

  #refArrow?: WUPPopupArrowElement;
  protected setMaxHeight(v: string): void {
    this.style.maxHeight = v;

    if (this.#state?.userStyles?.inherritY) {
      this.#state.userStyles.inherritY.style.maxHeight = this.style.maxHeight;
    }
  }

  protected setMaxWidth(v: string): void {
    this.style.maxWidth = v;
    if (this.#state?.userStyles?.inherritX) {
      this.#state.userStyles.inherritX.style.maxWidth = this.style.maxWidth;
    }
  }

  #state?: {
    scrollParents?: HTMLElement[];
    prevRect?: DOMRect;
    prevSize?: { w: number; h: number };
    frameId: number;
    userStyles: {
      maxW: number;
      maxH: number;
      minH: number;
      minW: number;
      borderRadius: number;
      inherritY: HTMLElement | null;
      inherritX: HTMLElement | null;
      animTime: number;
    };
    placements: Array<WUP.Popup.Place.PlaceFunc>;
  };

  /** Collect/calc all required values into #state (when menu shows) */
  protected buildState(): void {
    this.#state = {} as any;
    this.#state!.prevRect = undefined;
    this.setMaxWidth(""); // reset styles to default to avoid bugs and previous state
    this.setMaxHeight(""); // it works only when styles is defined before popup is opened
    this.style.minWidth = ""; // reset styles to default to avoid bugs and previous state
    this.style.minHeight = ""; // reset styles to default to avoid bugs and previous state

    this._opts.target = this._opts.target || this.#defineTarget();
    if (!(this._opts.target as HTMLElement).isConnected) {
      throw new Error(`${this.tagName}. Target is not appended to document`);
    }

    const pAttr = this.getAttribute("placement") as keyof typeof WUPPopupElement.$placementAttrs;
    const p = pAttr && WUPPopupElement.$placementAttrs[pAttr];
    this._opts.placement = p ? [p] : this._opts.placement;

    if (!this._opts.animation) {
      this.style.transform = ""; // otherwise animation will broken if we reset
    }
    this.style.animationName = "";
    const style = getComputedStyle(this);

    let child = this.children.item(0);
    if (!(child instanceof HTMLElement)) {
      child = null;
    }

    this.#state!.userStyles = {
      maxW: px2Number(style.maxWidth) || Number.MAX_SAFE_INTEGER,
      minW: Math.max(5, px2Number(style.paddingRight) + px2Number(style.paddingLeft), px2Number(style.minWidth)),

      maxH: px2Number(style.maxHeight) || Number.MAX_SAFE_INTEGER,
      minH: Math.max(5, px2Number(style.paddingTop) + px2Number(style.paddingBottom), px2Number(style.minHeight)),

      borderRadius: 0,
      // fix `maxSize inherritance doesn't work for customElements`
      inherritY: child && style.overflowY === "visible" ? child : null,
      inherritX: child && style.overflowX === "visible" ? child : null,
      animTime: Number.parseFloat(style.animationDuration.substring(0, style.animationDuration.length - 1)) * 1000,
    };

    this.#state!.scrollParents = findScrollParentAll(this._opts.target) ?? undefined;
    // get arrowSize
    if (this._opts.arrowEnable) {
      const el = this.#refArrow || document.createElement(WUPPopupArrowElement.tagName);
      this.#refArrow = el;
      // insert arrow after popup
      const nextEl = this.nextSibling;
      if (nextEl) {
        (this.parentNode as HTMLElement).insertBefore(el, nextEl);
      } else {
        (this.parentNode as HTMLElement).appendChild(el);
      }

      if (this._opts.arrowClass) {
        el.className = this._opts.arrowClass;
      }

      this.#state!.userStyles.borderRadius = Math.max.apply(
        this,
        style.borderRadius.split(" ").map((s) => px2Number(s))
      );
    }

    if (!this._opts.placement.length) {
      this._opts.placement.push(PopupPlacements.$top.$middle.$adjust);
    }
    const adjustRules = this._opts.placement
      .filter((v) => (v as WUP.Popup.Place.AlignFunc).$adjust)
      .map((v) => (v as WUP.Popup.Place.AlignFunc).$adjust);

    const otherRules = Object.keys(PopupPlacements)
      .filter(
        (k) =>
          !this._opts.placement.includes(PopupPlacements[k].$middle) &&
          !adjustRules.includes(PopupPlacements[k].$middle.$adjust)
      )
      .map((k) => PopupPlacements[k].$middle.$adjust);

    // init array of possible solutions to position + align popup
    this.#state!.placements = [
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
  }

  /** Required to stop previous animations/timeouts (for case when option animation is changed) */
  _stopAnimation?: () => void;
  protected goAnimate(animTime: number, isClose: boolean): Promise<boolean> {
    if (this._opts.animation === Animations.drawer) {
      const pa = animateDropdown(this, animTime, isClose);
      this._stopAnimation = () => {
        delete this._stopAnimation;
        pa.stop(this._opts.animation !== Animations.drawer); // rst animation state only if animation changed
      };
      return pa;
    }
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(true), animTime);
      this._stopAnimation = () => {
        delete this._stopAnimation;
        clearTimeout(t);
        resolve(false);
      };
    });
  }

  /** Shows popup if target defined; returns true if successful */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected goShow(showCase: ShowCases): boolean | Promise<boolean> {
    this._stopAnimation?.call(this);

    const e = this.fireEvent("$willShow", { cancelable: true });
    if (e.defaultPrevented) {
      return false;
    }

    this.#state && window.cancelAnimationFrame(this.#state.frameId);
    this.buildState();
    const wasClosed = !this.#isOpen;
    this.#isOpen = true;

    // possible when show fired againg with new values
    const goUpdate = (): void => {
      // possible if hidden by target-remove
      if (this.#isOpen) {
        this.#state!.prevRect = this.updatePosition();
        const id = window.requestAnimationFrame(goUpdate);
        if (this.#state) {
          this.#state.frameId = id;
          this.#state!.prevSize = { w: this.offsetWidth, h: this.offsetHeight };
        }
      }
    };

    goUpdate();
    this.style.opacity = "";

    const { animTime } = this.#state!.userStyles;
    if (!animTime && window.matchMedia("not all and (prefers-reduced-motion)").matches && this._opts.animation) {
      /* istanbul ignore else */
      if (this._opts.animation === Animations.drawer) {
        console.warn(
          `${this.tagName} style.animationDuration is missed but $options.animation is defined. Please point animation duration via styles`
        );
      }
    }
    if (!animTime) {
      wasClosed && setTimeout(() => this.fireEvent("$show", { cancelable: false }));
      return true;
    }

    return this.goAnimate(animTime, false).then((isOk) => {
      if (!isOk) {
        return false;
      }
      wasClosed && this.fireEvent("$show", { cancelable: false });
      return true;
    });
  }

  _isClosing?: true;
  /** Hide popup. @hideCase as reason of hide(). Calling 2nd time at once will stop previous hide-animation */
  protected goHide(hideCase: HideCases): boolean | Promise<boolean> {
    if (!this.#isOpen || this._isClosing) {
      return true;
    }
    this._stopAnimation?.call(this);

    const e = this.fireEvent("$willHide", { cancelable: true });
    if (e.defaultPrevented) {
      return false;
    }

    this._isClosing = true;
    const finishHide = (): void => {
      delete this._isClosing;
      delete this._stopAnimation;
      this.style.display = "";
      this.removeAttribute("hide");
      this.#isOpen = false;
      this.#state && window.cancelAnimationFrame(this.#state.frameId);
      this.#state = undefined;

      if (this.#refArrow) {
        this.#refArrow.remove();
        this.#refArrow = undefined;
      }
      setTimeout(() => this.fireEvent("$hide", { cancelable: false })); // run async to dispose internal resources first: possible dev-side-issues
    };

    // waitFor only if was ordinary user-action
    if (hideCase >= HideCases.onManuallCall && hideCase <= HideCases.onTargetClick) {
      this.setAttribute("hide", "");
      const { animationDuration: aD } = getComputedStyle(this);
      const animTime = Number.parseFloat(aD.substring(0, aD.length - 1)) * 1000 || 0;
      if (animTime) {
        return this.goAnimate(animTime, true).then((isOk) => {
          delete this._isClosing;
          this.removeAttribute("hide");
          if (!isOk) {
            return false;
          }
          finishHide();
          return true;
        });
      }
    }

    finishHide();
    return true;
  }

  /** Update position of popup. Call this method in cases when you changed options */
  protected updatePosition(): DOMRect | undefined {
    const trg = this._opts.target as HTMLElement;
    // possible when target removed via set innerHTML (in this case remove-hook doesn't work)
    if (!trg.isConnected) {
      this.goHide(HideCases.onTargetRemove);
      this.#attach && this.remove(); // self-removing if $attach()
      return undefined;
    }

    const tRect = trg.getBoundingClientRect();
    if (!tRect.width || !tRect.height) {
      this.style.display = "none"; // hide if target is not displayed
      return this.#state!.prevRect;
    }

    if (
      this.#state!.prevRect &&
      this.#state!.prevRect.top === tRect.top &&
      this.#state!.prevRect.left === tRect.left &&
      this.#state!.prevRect.width === tRect.width &&
      this.#state!.prevRect.height === tRect.height &&
      this.#state!.prevSize &&
      this.#state!.prevSize.h === this.offsetHeight &&
      this.#state!.prevSize.w === this.offsetWidth
    ) {
      return this.#state!.prevRect;
    }

    const fitEl = this._opts.toFitElement || document.body;
    const fit = getBoundingInternalRect(fitEl) as WUP.Popup.Place.Rect;
    fit.el = fitEl;
    const a = this._opts.offsetFitElement;
    if (a) {
      fit.top += a[0];
      fit.right -= a[1];
      fit.bottom -= a[2] ?? a[0];
      fit.left += a[3] ?? a[1];
      fit.width = fit.right - fit.left;
      fit.height = fit.bottom - fit.top;
    }

    const tdef: Omit<DOMRect, "toJSON" | "x" | "y"> = {
      height: Math.round(tRect.height),
      width: Math.round(tRect.width),
      top: Math.round(tRect.top),
      left: Math.round(tRect.left),
      bottom: Math.round(tRect.bottom),
      right: Math.round(tRect.right),
    };

    if (this._opts.minWidthByTarget) {
      this.style.minWidth = `${Math.min(tdef.width, this.#state!.userStyles.maxW)}px`;
    } else if (this.style.minWidth) {
      this.style.minWidth = "";
    }

    if (this._opts.minHeightByTarget) {
      this.style.minHeight = `${Math.min(tdef.height, this.#state!.userStyles.maxH)}px`;
    } else if (this.style.minHeight) {
      this.style.minHeight = "";
    }

    this.style.display = "block";
    const _defMaxWidth = this._opts.maxWidthByTarget ? `${Math.min(tdef.width, this.#state!.userStyles.maxW)}px` : "";
    this.setMaxWidth(_defMaxWidth); // resetting is required to get default size
    this.setMaxHeight(""); // resetting is required to get default size

    if (this.#refArrow) {
      this.#refArrow.style.display = "";
      this.#refArrow.style.width = "";
      this.#refArrow.style.height = "";
    }

    const me: WUP.Popup.Place.MeRect = {
      // WARN: offsetSize is rounded so 105.2 >>> 105
      w: this.offsetWidth, // clientWidth doesn't include border-size
      h: this.offsetHeight,
      el: this,
      offset: getOffset(this._opts.offset),
      minH: this.#state!.userStyles!.minH,
      minW: this.#state!.userStyles!.minW,
      arrow: this.#refArrow
        ? {
            h: this.#refArrow.offsetHeight,
            w: this.#refArrow.offsetWidth,
            offset: getOffset(this._opts.arrowOffset),
          }
        : { h: 0, w: 0, offset: { bottom: 0, left: 0, right: 0, top: 0 } },
    };

    const t: WUP.Popup.Place.Rect = {
      el: trg,
      top: tdef.top - me.offset.top,
      left: tdef.left - me.offset.left,
      right: tdef.right + me.offset.right,
      bottom: tdef.bottom + me.offset.bottom,
      height: 0,
      width: 0,
    };

    // check if target hidden by scrollParent
    if (this.#state!.scrollParents) {
      const viewResult = isIntoView(t.el, { scrollParents: this.#state!.scrollParents, elRect: t });
      const isHiddenByScroll = viewResult.hidden;
      if (isHiddenByScroll) {
        this.style.display = ""; // hide popup if target hidden by scrollableParent
        if (this.#refArrow) {
          this.#refArrow.style.display = "none";
        }
        return tRect;
      }

      // fix cases when target is partiallyHidden by scrollableParent
      // suggestion: if height/width is very small we can use another side
      const scrollRect = getBoundingInternalRect(this.#state!.scrollParents[0]); // warn: it's important to fit only first parent
      t.top = Math.max(scrollRect.top, t.top);
      t.bottom = Math.min(scrollRect.bottom, t.bottom);
      t.left = Math.max(scrollRect.left, t.left);
      t.right = Math.min(scrollRect.right, t.right);
    }
    t.height = t.bottom - t.top;
    t.width = t.right - t.left;

    let lastRule: WUP.Popup.Place.PlaceFunc;

    const process = (): WUP.Popup.Place.Result => {
      const hasOveflow = (p: WUP.Popup.Place.Result, meSize: { w: number; h: number }): boolean =>
        p.left < fit.left ||
        p.top < fit.top ||
        p.freeW < this.#state!.userStyles!.minW ||
        p.freeH < this.#state!.userStyles!.minH ||
        p.left + Math.min(meSize.w, p.maxW || Number.MAX_SAFE_INTEGER, this.#state!.userStyles!.maxW) > fit.right ||
        p.top + Math.min(meSize.h, p.maxH || Number.MAX_SAFE_INTEGER, this.#state!.userStyles!.maxH) > fit.bottom;

      let pos: WUP.Popup.Place.Result = <WUP.Popup.Place.Result>{};
      const isOk = this.#state!.placements!.some((pfn) => {
        lastRule = pfn;
        pos = pfn(t, me, fit);
        let ok = !hasOveflow(pos, me);
        if (ok) {
          // maxW/H can be null if resize is not required
          if (pos.maxW != null && this.#state!.userStyles.maxW > pos.maxW) {
            this.setMaxWidth(`${pos.maxW}px`);
          }
          if (pos.maxH != null && this.#state!.userStyles.maxH > pos.maxH) {
            this.setMaxHeight(`${pos.maxH}px`);
          }
          // re-check because maxWidth can affect on height
          if (this.offsetHeight !== me.h || this.offsetWidth !== me.w) {
            const meUpdated = { ...me, w: this.offsetWidth, h: this.offsetHeight };
            pos = pfn(t, meUpdated, fit);
            ok = !hasOveflow(pos, meUpdated);
            /* istanbul ignore else */
            if (!ok) {
              // reset styles if need to look for another position
              this.setMaxWidth(_defMaxWidth); // resetting is required to get default size
              this.setMaxHeight("");
            }
          }
        }
        return ok;
      });
      !isOk && console.error(`${this.tagName}. Impossible to place without overflow`, this);

      if (this.#refArrow) {
        // change arrowSize if it's bigger than popup
        const checkSize = (relatedSize: number): void => {
          // if we have border-radius of popup we need to include in offset to prevent overflow between arrow and popup
          const maxArrowSize = Math.max(relatedSize - this.#state!.userStyles.borderRadius * 2, 0);
          if (me.arrow.w > maxArrowSize) {
            me.arrow.w = maxArrowSize;
            me.arrow.h = maxArrowSize / 2;
            (this.#refArrow as WUPPopupArrowElement).style.width = `${me.arrow.w}px`;
            (this.#refArrow as WUPPopupArrowElement).style.height = `${me.arrow.h}px`;
            pos = lastRule(t, me, fit); // recalc position because size of arrow is changed
          }
        };

        /* istanbul ignore else */
        if (pos.arrowLeft == null) {
          checkSize(this.offsetWidth);
          pos.arrowLeft = t.left + t.width / 2 - me.arrow.w / 2; // attach to middle of target
          pos.arrowLeft = Math.round(
            Math.min(
              Math.max(pos.arrowLeft, pos.left + this.#state!.userStyles.borderRadius), // align to popup
              pos.left + this.offsetWidth - me.arrow.w - this.#state!.userStyles.borderRadius // align to popup
            )
          );
        } else if (pos.arrowTop == null) {
          checkSize(this.offsetHeight);
          pos.arrowTop = t.top + t.height / 2 - me.arrow.h / 2; // attach to middle of target
          pos.arrowTop = Math.round(
            Math.min(
              Math.max(pos.arrowTop, pos.top + this.#state!.userStyles.borderRadius + me.arrow.h / 2), // align to popup
              pos.top + this.offsetHeight - this.#state!.userStyles.borderRadius - me.arrow.w / 2 - me.arrow.h / 2 // align to popup
            )
          );
        }
        this.#refArrow.style.transform = `translate(${pos.arrowLeft}px, ${pos.arrowTop}px) rotate(${pos.arrowAngle}.1deg)`; // WARN Firefox bug: css filter dropshadow works wrong with angle 180.0
      }

      // transform has performance benefits in comparison with positioning
      this.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
      this.setAttribute("position", pos.attr);
      return pos;
    };
    const was = styleTransform(this, "translate", ""); // remove prev transformation and save scale transformation
    const pos = process();

    // fix: when parent.transform.translate affects on popup
    const meRect = this.getBoundingClientRect();
    const dx = meRect.left - pos.left;
    const dy = meRect.top - pos.top;
    if (dx || dy) {
      styleTransform(this, "translate", `${pos.left - dx}px, ${pos.top - dy}px`);
      this.#refArrow && styleTransform(this.#refArrow, "translate", `${pos.arrowLeft - dx}px, ${pos.arrowTop - dy}px`);
    }
    if (was) {
      // otherwise getBoundingClientRect returns element position according to scale applied from dropdownAnimation
      this.style.transform += ` ${was}`; // rollback scale transformation
    }

    /* re-calc is required to avoid case when popup unexpectedly affects on layout:
      layout bug: Yscroll appears/disappears when display:flex; heigth:100vh > position:absolute; right:-10px
      with cnt==2 it's reprodusable */
    return t.el.getBoundingClientRect();
  }

  protected override gotRemoved(): void {
    this.#isOpen = false;
    this.#state?.frameId && window.cancelAnimationFrame(this.#state.frameId);
    this.#state = undefined;
    this.#refArrow?.remove();
    this.#refArrow = undefined;
    super.gotRemoved();
  }

  /** Call when need to reinit */
  protected disposeListener(): void {
    // possible on reinit when need to rebound events
    this.#listenRefs?.stopListen();
    this.#listenRefs = undefined;
  }

  protected override dispose(): void {
    super.dispose();
    this.disposeListener();
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
      [tagName]: WUP.Base.JSXProps<WUPPopupElement> &
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
          /** @readonly Result position; use this to restyle animation etc. */
          readonly position: "top" | "left" | "bottom" | "right";
          /** @readonly Hide state; use this to hide-animation */
          readonly hide: "";
        }>;
    }
  }
}

// todo: popup overflows scrollbar of fitElement does it correct ?
// todo 2 popups can oveflow each other
/* we need option to try place several popups at once without oveflow. Example on wup-pwd page: issue with 2 errors */

// todo refactor show & hide so user can call show several times and get the same promise

// manual testcase: show as dropdown & scroll parent - blur effect can appear
