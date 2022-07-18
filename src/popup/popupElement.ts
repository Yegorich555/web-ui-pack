import WUPBaseElement, { WUP } from "../baseElement";
import { WUPPopup } from "./popupElement.types";
import { getOffset, PopupPlacements, WUPPopupPlace } from "./popupPlacements";
import { findScrollParentAll } from "../helpers/findScrollParent";
import WUPPopupArrowElement from "./popupArrowElement";
import popupListenTarget from "./popupListenTarget";
import { getBoundingInternalRect, px2Number, styleTransform } from "../helpers/styleHelpers";

export import ShowCases = WUPPopup.ShowCases;
import { WUPcssScrollSmall } from "../styles";
import animateDropdown from "../helpers/animateDropdown";
import isIntoView from "../helpers/isIntoView";
import objectClone from "../helpers/objectClone";

// code coverage doesn't work either: https://stackoverflow.com/questions/62493593/unable-to-ignore-block-within-react-class-components-with-istanbul-ignore-next-t
/* c8 ignore next */
export * from "./popupElement.types";

const attachLst = new Map<HTMLElement, () => void>();

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
 * const btn = document.querySelector('button');
 * // this is the most recomended way because $attach appends popup only by onShow and removes byHide
 * const detach = WUPPopupElement.$attach(
                    { target: btn, text: "Some text content here", showCase: ShowCases.onFocus | ShowCases.onClick },
                    (popup) => { popup.className = "popup-class-here"; }
                  )'
 * // or
 * <button id="btn1">Target</button>
 * // You can skip pointing attribute 'target' if popup appended after target
 * <wup-popup target="#btn1" placement="top-start">Some content here</wup-popup>
 * @tutorial Troubleshooting:
 * * You can set minWidth, minHeight to prevent squizing of popup or don't use rule '.$adjust'
 * * Don't override styles: transform (possible to override only for animation), display
 * * Don't use inline styles" maxWidth, maxHeight
 * * If target removed (when popup $isOpen) and appended again you need to update $options.target (because $options.target cleared)
 * * Popup has overflow 'auto'; If you change to 'visible' it will apply maxWidth/maxHeight to first children (because popup must be restricted by maxSize to avoid layout issues)
 * * During the closing attr 'hide' is appended (only if css-animation-duration is detected)
 */
export default class WUPPopupElement<
  Events extends WUPPopup.EventMap = WUPPopup.EventMap
> extends WUPBaseElement<Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPPopupElement;
  static observedOptions = new Set<keyof WUPPopup.Options>(["showCase", "target", "placement"]);

  /* Array of attribute names to monitor for changes */
  static get observedAttributes(): Array<keyof WUPPopup.Options> {
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
  static $defaults: Omit<WUPPopup.Options, "target"> = {
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
        padding: 4px;
        margin: 0;
        box-sizing: border-box;
        border-radius: var(--border-radius, 6px);
        box-shadow: 0 1px var(--popup-shadow-size) 0 #00000033;
        background: white;
        text-overflow: ellipsis;
        overflow: auto;
      }
      @media not all and (prefers-reduced-motion) {
        :host,
        :host+:host-arrow {
          animation: WUP-POPUP-a1 var(--popup-anim) ease-in-out forwards;
        }
        @keyframes WUP-POPUP-a1 {
          from {opacity: 0;}
        }
        :host[hide],
        :host[hide]+:host-arrow {
          animation: WUP-POPUP-a2 var(--popup-anim) ease-in-out forwards;
        }
        @keyframes WUP-POPUP-a2 {
          to {opacity: 0;}
        }
       }
      ${WUPcssScrollSmall(":host")}
     `;
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
   *       showCase: WUPPopup.ShowCases.onClick,
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
    options: WUPPopup.AttachOptions,
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

      const refs = popupListenTarget(
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
            if (isCreate) {
              popup!.#onRemoveRef = undefined; // otherwise remove() destroys events
              popup.remove.call(popup);
            }
            return null;
          }

          return popup;
        },
        async (v) => {
          isHidding = true;
          const ok = await popup!.goHide.call(popup, v);
          if (ok && isHidding) {
            popup!.#onRemoveRef = undefined; // otherwise remove() destroys events
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
        popup.$isOpen && popup.goHide.call(popup, WUPPopup.HideCases.onManuallCall);
        (popup as T).remove.call(popup);
      }
      r.onRemoveRef();
      popup = undefined;
      attachLst.delete(options.target);
    }

    attachLst.set(options.target, detach);

    return detach;
  }

  /** All options for this popup. If you want to change common options @see WUPPopupElement.$defaults */
  $options: WUPPopup.Options = objectClone(this.#ctr.$defaults);
  protected override _opts = this.$options;

  /** Hide popup. Promise resolved by animation time */
  $hide(): Promise<void> {
    return new Promise<void>((resolve) => {
      const f = async (): Promise<void> => {
        // isReady possible false when you fire $hide on disposed element
        if (this.$isReady && this.#isOpen && (await this.goHide(WUPPopup.HideCases.onManuallCall))) {
          this._opts.showCase !== WUPPopup.ShowCases.always && this.init(); // re-init to applyShowCase
        }
        resolve();
      };
      // timeout - possible when el is created but not attached to document yet
      this.$isReady ? f() : setTimeout(f, 1); // 1ms need to wait forReady
    });
  }

  /** Show popup; it disables $options.showCase and rollbacks by $hide(). Promise resolved by animation time */
  $show(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const f = async (): Promise<void> => {
        if (!this.$isReady) {
          reject(new Error(`${this.tagName}. Impossible to show: not appended to document`));
        } else {
          this.dispose(); // remove events
          try {
            await this.goShow(WUPPopup.ShowCases.always);
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
    this.#prevRect = undefined;
  }

  /** Returns if popup is opened */
  get $isOpen(): boolean {
    return this.#isOpen;
  }

  /** Returns arrowElement if $options.arrowEnable=true and after popup $isOpen */
  get $arrowElement(): WUPPopupArrowElement | null {
    return this.#arrowElement || null;
  }

  protected override gotReady(): void {
    super.gotReady();
    this.init();
  }

  #isOpen = false;
  #onRemoveRef?: () => void; // func to remove eventListeners
  #attach?: () => ReturnType<typeof popupListenTarget>; // func to use alternative target
  /** Called after gotReady() and $show() (to reinit according to options) */
  protected init(): void {
    this.dispose(); // remove previously added events

    let refs: ReturnType<typeof popupListenTarget>;
    if (this.#attach) {
      refs = this.#attach();
    } else {
      this._opts.target = this.#defineTarget();

      if (!this._opts.showCase /* always */) {
        this.goShow(WUPPopup.ShowCases.always);
        return;
      }

      refs = popupListenTarget(
        this._opts as typeof this._opts & { target: HTMLElement },
        (v) => (this.goShow(v) ? this : null),
        (v) => this.goHide(v)
      );
    }

    this.#onRemoveRef = refs.onRemoveRef;
  }

  #reinit(): void {
    this.$isOpen && this.goHide(WUPPopup.HideCases.onOptionChange);
    this.init(); // possible only if popup is hidden
  }

  protected override gotOptionsChanged(e: WUP.OptionEvent): void {
    super.gotOptionsChanged(e);
    this.#reinit();
  }

  #attrTimer?: number;
  protected override gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    super.gotAttributeChanged(name, oldValue, newValue);
    // debounce filter
    if (this.#attrTimer) {
      return;
    }
    this.#attrTimer = window.setTimeout(() => {
      this.#attrTimer = undefined;
      this.#reinit();
    });
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

  #frameId?: number;
  #userStyles: {
    maxW: number;
    maxH: number;
    minH: number;
    minW: number;
    borderRadius: number;
    inherritY: HTMLElement | null;
    inherritX: HTMLElement | null;
  } = undefined as any;

  #placements: Array<WUPPopupPlace.PlaceFunc> = [];
  #prevRect?: DOMRect;
  #scrollParents?: HTMLElement[];
  #arrowElement?: WUPPopupArrowElement;

  protected setMaxHeight(v: string): void {
    this.style.maxHeight = v;

    if (this.#userStyles?.inherritY) {
      this.#userStyles.inherritY.style.maxHeight = this.style.maxHeight;
    }
  }

  protected setMaxWidth(v: string): void {
    this.style.maxWidth = v;
    if (this.#userStyles?.inherritX) {
      this.#userStyles.inherritX.style.maxWidth = this.style.maxWidth;
    }
  }

  /** Required to stop previous animations/timeouts */
  _stopShowing?: () => void;
  /** Shows popup if target defined; returns true if successful. Calling 2nd time at once will stop previous hide-animation */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected goShow(showCase: WUPPopup.ShowCases): boolean | Promise<true> {
    this._stopShowing?.call(this);
    this._stopShowing = undefined;

    !this.#isOpen || this.goHide(WUPPopup.HideCases.onShowAgain);

    this._opts.target = this._opts.target || this.#defineTarget();
    if (!(this._opts.target as HTMLElement).isConnected) {
      throw new Error(`${this.tagName}. Target is not appended to document`);
    }

    const e = this.fireEvent("$willShow", { cancelable: true });
    if (e.defaultPrevented) {
      return false;
    }

    const pAttr = this.getAttribute("placement") as keyof typeof WUPPopupElement.$placementAttrs;
    const p = pAttr && WUPPopupElement.$placementAttrs[pAttr];
    this._opts.placement = p ? [p] : this._opts.placement;

    // reset styles to default to avoid bugs and previous state
    // it works only when styles is defined before popup is opened
    this.setMaxWidth("");
    this.setMaxHeight("");
    if (!this._opts.animation) {
      this.style.transform = ""; // otherwise animation will broken if we reset
    }
    this.style.animationName = "";
    const style = getComputedStyle(this);

    let child = this.children.item(0);
    if (!(child instanceof HTMLElement)) {
      child = null;
    }

    this.#userStyles = {
      maxW: px2Number(style.maxWidth) || Number.MAX_SAFE_INTEGER,
      minW: Math.max(5, px2Number(style.paddingRight) + px2Number(style.paddingLeft), px2Number(style.minWidth)),

      maxH: px2Number(style.maxHeight) || Number.MAX_SAFE_INTEGER,
      minH: Math.max(5, px2Number(style.paddingTop) + px2Number(style.paddingBottom), px2Number(style.minHeight)),

      borderRadius: 0,
      // fix `maxSize inherritance doesn't work for customElements`
      inherritY: child && style.overflowY === "visible" ? child : null,
      inherritX: child && style.overflowX === "visible" ? child : null,
    };

    this.#scrollParents = findScrollParentAll(this._opts.target) ?? undefined;
    // get arrowSize
    if (this._opts.arrowEnable) {
      const el = document.createElement(WUPPopupArrowElement.tagName);
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

      this.#userStyles.borderRadius = Math.max.apply(
        this,
        style.borderRadius.split(" ").map((s) => px2Number(s))
      );
      this.#arrowElement = el;
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

    this.#isOpen = true;
    const goUpdate = (): void => {
      if (this.#isOpen) {
        this.#prevRect = this.#updatePosition();
        // possible if hidden by target-remove
        this.#frameId = window.requestAnimationFrame(goUpdate);
      }
    };

    goUpdate();

    const animTime = Number.parseFloat(style.animationDuration.substring(0, style.animationDuration.length - 1)) * 1000;

    if (!animTime && window.matchMedia("not all and (prefers-reduced-motion)").matches && this._opts.animation) {
      if (this._opts.animation === WUPPopup.Animations.drawer) {
        console.warn(
          `${this.tagName} style.animationDuration is missed but $options.animation is defined. Please point animation duration via styles`
        );
      }
    }

    let pr: Promise<void>;
    if (this._opts.animation === WUPPopup.Animations.drawer) {
      const pa = animateDropdown(this, animTime, false);
      this._stopShowing = () => pa.stop(this._opts.animation !== WUPPopup.Animations.drawer); // rst animation state only if animation changed
      pr = pa;
    } else {
      pr = new Promise((resolve) => {
        const t = setTimeout(resolve, animTime);
        this._stopShowing = () => clearTimeout(t);
      });
    }
    return pr.then(() => {
      this.fireEvent("$show", { cancelable: false });
      return true;
    });
  }

  /** Required to stop previous animations/timeouts */
  _stopHidding?: () => void;
  /** Hide popup. @hideCase as reason of hide(). Calling 2nd time at once will stop previous hide-animation */
  protected goHide(hideCase: WUPPopup.HideCases): boolean | Promise<true> {
    if (this._stopHidding) {
      this._stopHidding();
      this._stopHidding = undefined;
      return Promise.resolve(true);
    }

    const wasShow = this.#isOpen;
    if (wasShow) {
      const e = this.fireEvent("$willHide", { cancelable: true });
      if (e.defaultPrevented) {
        return false;
      }
    }

    const finishHide = (): void => {
      this.style.display = "";
      this.#isOpen = false;
      this._stopHidding = undefined;
      this.removeAttribute("hide");
      this.#frameId && window.cancelAnimationFrame(this.#frameId);
      this.#frameId = undefined;

      this.#prevRect = undefined;
      this.#scrollParents = undefined;
      this.#userStyles = undefined as any;

      if (this.#arrowElement) {
        this.#arrowElement.remove();
        this.#arrowElement = undefined;
      }

      wasShow &&
        setTimeout(() => {
          this.fireEvent("$hide", { cancelable: false }); // run async to dispose internal resources first: possible dev-side-issues
        });
    };

    if (wasShow) {
      if (hideCase !== WUPPopup.HideCases.onShowAgain) {
        let animTime = 0;

        // waitFor only if was ordinary user-action
        if (hideCase >= WUPPopup.HideCases.onManuallCall && hideCase <= WUPPopup.HideCases.onTargetClick) {
          this.setAttribute("hide", "");
          const { animationDuration: aD } = getComputedStyle(this);
          animTime = Number.parseFloat(aD.substring(0, aD.length - 1)) * 1000 || 0;
          !animTime && this.removeAttribute("hide");
        }

        if (animTime) {
          let p: Promise<void>;
          if (this._opts.animation) {
            const pa = animateDropdown(this, animTime, true);
            this._stopHidding = () => {
              pa.stop(false);
              finishHide();
            };
            p = pa;
          } else {
            p = new Promise((resolve) => {
              const t = setTimeout(resolve, animTime);
              this._stopHidding = () => {
                clearTimeout(t);
                finishHide();
              };
            });
          }

          return p.then(() => {
            finishHide();
            return true;
          });
        }
      }
    }

    finishHide();
    return true;
  }

  /** Update position of popup. Call this method in cases when you changed options */
  #updatePosition = (): DOMRect | undefined => {
    const trg = this._opts.target as HTMLElement;
    // possible when target removed via set innerHTML (in this case remove-hook doesn't work)
    if (!trg.isConnected) {
      this.goHide(WUPPopup.HideCases.onTargetRemove);
      this.#attach && this.remove(); // self-removing if $attach()
      return undefined;
    }

    const tRect = trg.getBoundingClientRect();
    if (!tRect.width || !tRect.height) {
      this.style.display = "none"; // hide if target is not displayed
      return this.#prevRect;
    }

    if (
      // issue: it's wrong if minWidth, minHeight etc. is changed and doesn't affect on layout sizes directly
      this.#prevRect &&
      this.#prevRect.top === tRect.top &&
      this.#prevRect.left === tRect.left &&
      this.#prevRect.width === tRect.width &&
      this.#prevRect.height === tRect.height
    ) {
      return this.#prevRect;
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
      this.style.minWidth = `${tdef.width}px`;
    } else if (this.style.minWidth) {
      this.style.minWidth = "";
    }

    if (this._opts.minHeightByTarget) {
      this.style.minHeight = `${tdef.height}px`;
    } else if (this.style.minHeight) {
      this.style.minHeight = "";
    }

    const fitEl = this._opts.toFitElement || document.body;
    const fit = getBoundingInternalRect(fitEl) as WUPPopupPlace.Rect;
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

    this.style.display = "block";
    const _defMaxWidth = this._opts.maxWidthByTarget ? `${tdef.width}px` : "";
    this.setMaxWidth(_defMaxWidth); // resetting is required to get default size
    this.setMaxHeight(""); // resetting is required to get default size

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
      offset: getOffset(this._opts.offset),
      minH: this.#userStyles.minH,
      minW: this.#userStyles.minW,
      arrow: this.#arrowElement
        ? {
            h: this.#arrowElement.offsetHeight,
            w: this.#arrowElement.offsetWidth,
            offset: getOffset(this._opts.arrowOffset),
          }
        : { h: 0, w: 0, offset: { bottom: 0, left: 0, right: 0, top: 0 } },
    };

    const t: WUPPopupPlace.Rect = {
      el: trg,
      top: tdef.top - me.offset.top,
      left: tdef.left - me.offset.left,
      right: tdef.right + me.offset.right,
      bottom: tdef.bottom + me.offset.bottom,
      height: 0,
      width: 0,
    };

    // check if target hidden by scrollParent
    if (this.#scrollParents) {
      const viewResult = isIntoView(t.el, { scrollParents: this.#scrollParents, elRect: t });
      const isHiddenByScroll = viewResult.hidden;
      if (isHiddenByScroll) {
        this.style.display = ""; // hide popup if target hidden by scrollableParent
        if (this.#arrowElement) {
          this.#arrowElement.style.display = "none";
        }
        return tRect;
      }

      // fix cases when target is partiallyHidden by scrollableParent
      // suggestion: if height/width is very small we can use another side
      const scrollRect = getBoundingInternalRect(this.#scrollParents[0]); // warn: it's important to fit only first parent
      t.top = Math.max(scrollRect.top, t.top);
      t.bottom = Math.min(scrollRect.bottom, t.bottom);
      t.left = Math.max(scrollRect.left, t.left);
      t.right = Math.min(scrollRect.right, t.right);
    }
    t.height = t.bottom - t.top;
    t.width = t.right - t.left;

    let lastRule: WUPPopupPlace.PlaceFunc;

    const process = (): void => {
      const hasOveflow = (p: WUPPopupPlace.Result, meSize: { w: number; h: number }): boolean =>
        p.left < fit.left ||
        p.top < fit.top ||
        p.freeW < this.#userStyles.minW ||
        p.freeH < this.#userStyles.minH ||
        p.left + Math.min(meSize.w, p.maxW || Number.MAX_SAFE_INTEGER, this.#userStyles.maxW) > fit.right ||
        p.top + Math.min(meSize.h, p.maxH || Number.MAX_SAFE_INTEGER, this.#userStyles.maxH) > fit.bottom;

      let pos: WUPPopupPlace.Result = <WUPPopupPlace.Result>{};
      const isOk = this.#placements.some((pfn) => {
        lastRule = pfn;
        pos = pfn(t, me, fit);
        let ok = !hasOveflow(pos, me);
        if (ok) {
          // maxW/H can be null if resize is not required
          if (pos.maxW != null && this.#userStyles.maxW > pos.maxW) {
            this.setMaxWidth(`${pos.maxW}px`);
          }
          if (pos.maxH != null && this.#userStyles.maxH > pos.maxH) {
            this.setMaxHeight(`${pos.maxH}px`);
          }
          // re-check because maxWidth can affect on height
          if (this.offsetHeight !== me.h || this.offsetWidth !== me.w) {
            const meUpdated = { ...me, w: this.offsetWidth, h: this.offsetHeight };
            pos = pfn(t, meUpdated, fit);
            ok = !hasOveflow(pos, meUpdated);
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

      if (this.#arrowElement) {
        // change arrowSize if it's bigger than popup
        const checkSize = (relatedSize: number): void => {
          // if we have border-radius of popup we need to include in offset to prevent overflow between arrow and popup
          const maxArrowSize = Math.max(relatedSize - this.#userStyles.borderRadius * 2, 0);
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
            Math.max(pos.arrowLeft, pos.left + this.#userStyles.borderRadius), // align to popup
            pos.left + this.offsetWidth - me.arrow.w - this.#userStyles.borderRadius // align to popup
          );
        } else if (pos.arrowTop == null) {
          checkSize(this.offsetHeight);
          pos.arrowTop = t.top + t.height / 2 - me.arrow.h / 2; // attach to middle of target
          pos.arrowTop = Math.min(
            Math.max(pos.arrowTop, pos.top + this.#userStyles.borderRadius + me.arrow.h / 2), // align to popup
            pos.top + this.offsetHeight - this.#userStyles.borderRadius - me.arrow.w / 2 - me.arrow.h / 2 // align to popup
          );
        }
        this.#arrowElement.style.transform = `translate(${pos.arrowLeft}px, ${pos.arrowTop}px) rotate(${pos.arrowAngle}deg)`;
      }

      // transform has performance benefits in comparison with positioning
      styleTransform(this, "translate", `${pos.left}px, ${pos.top}px`);
      this.setAttribute("position", pos.attr);
    };

    process();

    /* re-calc is required to avoid case when popup unexpectedly affects on layout:
      layout bug: Yscroll appears/disappears when display:flex; heigth:100vh > position:absolute; right:-10px
      issue: posible with cnt==2 issue will be reproduced
      */
    return t.el.getBoundingClientRect();
  };

  protected override gotRemoved(): void {
    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.#frameId = undefined;
    super.gotRemoved();
    this.#isOpen = false;
    this.#arrowElement?.remove();
    this.#arrowElement = undefined;
  }

  protected override dispose(): void {
    super.dispose();
    // possible on reinit when need to rebound events
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
      [tagName]: WUP.JSXProps<WUPPopupElement> &
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

// issue: popup overflows scrollbar of fitElement does it correct ?
