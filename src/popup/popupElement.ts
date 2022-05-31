/* eslint-disable no-use-before-define */
import WUPBaseElement, { JSXCustomProps, WUP } from "../baseElement";
import { WUPPopup } from "./popupElement.types";
import { getBoundingInternalRect, PopupPlacements, px2Number, WUPPopupPlace } from "./popupPlacements";
import { findScrollParentAll } from "../helpers/findScrollParent";
import WUPPopupArrowElement from "./popupArrowElement";
import popupListenTarget from "./popupListenTarget";

export import ShowCases = WUPPopup.ShowCases;
import { isIntoView } from "../indexHelpers";
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
    arrowOffset: [0, 0],
    toFitElement: document.body,
    minWidthByTarget: false,
    maxWidthByTarget: false,
    minHeightByTarget: false,
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
    return `
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
        `${tagName.toUpperCase()}. $attach is fired again on the same target. Possible memory leak. Use detach() before new attach`
      );
      savedDetach();
    }

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
            // eslint-disable-next-line no-use-before-define
            const p = document.body.appendChild(document.createElement(opts.tagName ?? tagName) as T);
            popup = p;
            Object.assign(p._opts, opts);
            opts.text && p.append(opts.text);

            p.#attach = () => {
              // extra function to skip useless 1st attach on init
              p.#attach = attach; // this is required to rebind events on re-init
              return refs;
            };

            callback?.call(this, p);
          }

          if (!popup.goShow(v)) {
            if (isCreate) {
              popup!.#onRemoveRef = undefined; // otherwise remove() destroys events
              popup.remove();
            }
            return null;
          }

          return popup;
        },
        async (v) => {
          isHidding = true;
          const ok = await popup!.goHide(v);
          if (ok && isHidding) {
            popup!.#onRemoveRef = undefined; // otherwise remove() destroys events
            popup!.remove();
            popup = undefined;
          }
          return ok;
        }
      );

      return refs;
    };
    const r = attach();

    function detach() {
      if (popup) {
        popup.$isOpen && popup.goHide(WUPPopup.HideCases.onManuallCall);
        (popup as T).remove();
      }
      r.onRemoveRef();
      popup = undefined;
      attachLst.delete(options.target);
    }

    attachLst.set(options.target, detach);

    return detach;
  }

  /** All options for this popup. If you want to change common options @see WUPPopupElement.$defaults */
  $options: WUPPopup.Options = {
    ...this.#ctr.$defaults,
    placement: [...this.#ctr.$defaults.placement],
    offset: [...this.#ctr.$defaults.offset],
  };

  protected override _opts = this.$options;

  /** Hide popup. Promise resolved by animation time */
  $hide() {
    return new Promise<void>((resolve) => {
      const f = async () => {
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
  $show() {
    return new Promise<void>((resolve, reject) => {
      const f = async () => {
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
  $refresh() {
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

  protected override gotReady() {
    super.gotReady();
    this.init();
  }

  #isOpen = false;
  #onRemoveRef?: () => void; // func to remove eventListeners
  #attach?: () => ReturnType<typeof popupListenTarget>; // func to use alternative target
  /** Fired after gotReady() and $show() (to reinit according to options) */
  protected init() {
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
        this.goHide
      );
    }

    this.#onRemoveRef = refs.onRemoveRef;
  }

  #reinit() {
    this.$isOpen && this.goHide(WUPPopup.HideCases.onOptionChange);
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
  // eslint-disable-next-line no-use-before-define
  #arrowElement?: WUPPopupArrowElement;
  #forceHide?: () => void; // fix when popup isHidding and we need to show again

  protected setMaxHeight(v: string) {
    this.style.maxHeight = v;

    if (this.#userStyles?.inherritY) {
      this.#userStyles.inherritY.style.maxHeight = this.style.maxHeight;
    }
  }

  protected setMaxWidth(v: string) {
    this.style.maxWidth = v;
    if (this.#userStyles?.inherritX) {
      this.#userStyles.inherritX.style.maxWidth = this.style.maxWidth;
    }
  }

  /** Shows popup if target defined; returns true if successful */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected goShow(showCase: WUPPopup.ShowCases): boolean | Promise<true> {
    const wasHidden = !this.#isOpen;
    this.#isOpen && this.goHide(WUPPopup.HideCases.onShowAgain);

    this._opts.target = this._opts.target || this.#defineTarget();
    if (!(this._opts.target as HTMLElement).isConnected) {
      throw new Error(`${this.tagName}. Target is not appended to document`);
    }

    if (wasHidden) {
      const e = this.fireEvent("$willShow", { cancelable: true });
      if (e.defaultPrevented) {
        return false;
      }
    }

    const pAttr = this.getAttribute("placement") as keyof typeof WUPPopupElement.$placementAttrs;
    const p = pAttr && WUPPopupElement.$placementAttrs[pAttr];
    this._opts.placement = p ? [p] : this._opts.placement;

    // reset styles to default to avoid bugs and previous state
    // it works only when styles is defined before popup is opened
    this.setMaxWidth("");
    this.setMaxHeight("");
    this.style.transform = "";
    if (wasHidden) {
      this.style.animationName = "";
    }
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

    // checking if animation can affect on positioning
    let animTime = 0;
    if (style.animationDuration && (style.animationName !== "WUP-POPUP-a1" || this._opts.animation)) {
      animTime = Number.parseFloat(style.animationDuration.substring(0, style.animationDuration.length - 1));
      animTime *= 1000;
    } else if (!this._opts.animation) {
      this.style.animationName = ""; // reset to default if previosly animation was added
    }

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
    const goUpdate = () => {
      if (this.#isOpen) {
        this.#prevRect = this.#updatePosition();
        // possible if hidden by target-remove
        this.#frameId = window.requestAnimationFrame(goUpdate);
      }
    };

    goUpdate();

    if (wasHidden) {
      // it requires because #updatePosition resets transform
      // animation for drawer
      if (this._opts.animation === WUPPopup.Animations.drawer) {
        if (!animTime) {
          const isAnimEn = window.matchMedia("not all and (prefers-reduced-motion)").matches;
          if (isAnimEn) {
            console.error(
              `${this.tagName} style.animationDuration is missed but $options.animation is defined. Please point animation duration via styles`
            );
          }
        } else {
          animTime = this.#animateDrawer(animTime);
        }
      }

      if (animTime) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), animTime);
        });
      }

      // run async to dispose internal resources first: possible dev-side-issues
      setTimeout(() => this.fireEvent("$show", { cancelable: false }), animTime);
    }

    return true;
  }

  /** Hide popup. @hideCase as reason of hide() */
  protected goHide(hideCase: WUPPopup.HideCases): boolean | Promise<true> {
    if (this.#forceHide) {
      this.#forceHide();
      return true;
    }

    const wasShow = this.#isOpen;
    if (wasShow) {
      const e = this.fireEvent("$willHide", { cancelable: true });
      if (e.defaultPrevented) {
        return false;
      }
    }

    const finishHide = () => {
      this.#forceHide = undefined;
      this.style.display = "";

      this.#isOpen = false;
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
          // recalc hideTime base on animationLeftTime
          if (this._opts.animation) {
            this.#prevRect = undefined; // force to recalc position because transform translate must be cleared for animation
            animTime = this.#animateDrawer(animTime, true);
          }

          return new Promise((resolve) => {
            const done = () => {
              finishHide();
              resolve(true);
            };
            const t = setTimeout(done, animTime);

            // fix when user scrolls during the hide-animation
            this.#forceHide = () => {
              clearTimeout(t);
              done();
            };
          });
        }
      }
    }

    finishHide();
    return true;
  }

  #frameAnimId?: number;
  /** Run animation and return new animIime (possible when animation re-run and previous must be finished) */
  #animateDrawer = (animTime: number, isRevert?: boolean): number => {
    this.#frameAnimId && window.cancelAnimationFrame(this.#frameAnimId);
    this.style.animationName = "none"; // disable default css-animation

    // get previous scaleY and extract transform without scaleY
    const reg = /scaleY\(([\d.]+)\)/;
    const removeScaleY = (styleTransform: string): string => styleTransform.replace(reg, "").trim().replace("  ", " ");
    const parseScale = (el: HTMLElement): { prev: string; from: number } => {
      let prev = el.style.transform;
      let from = isRevert ? 1 : 0;
      const r = reg.exec(el.style.transform);
      if (r) {
        // remove scale from transform
        prev = el.style.transform.replace(r[0], "");
        from = Number.parseFloat(r[1]);
      }
      if (prev) {
        prev = `${prev.trim().replace("  ", " ")} `; // extra-space to prepary add scaleY without extra logic
      }

      return { prev, from };
    };

    const nested: Array<{ el: HTMLElement; prev: string }> = [];
    const ch = this.children;
    for (let i = 0; i < ch.length; ++i) {
      const el = ch.item(i) as HTMLElement;
      const parsed = parseScale(el);
      nested.push({ el, prev: parsed.prev });
    }

    // reset inline styles
    const reset = () => {
      this.#frameAnimId = undefined;
      setTimeout(() => {
        // timeout is required to prevent blink-effect when popup hasn't been hide yet
        this.style.transform = removeScaleY(this.style.transform);
        this.style.transformOrigin = "";
        nested.forEach((e) => (e.el.style.transform = e.prev.trimEnd()));
      });
    };

    // define from-to ranges
    const to = isRevert ? 0 : 1;
    const { from } = parseScale(this);

    // recalc left-animTime based on current animation (if element is partially opened and need to hide it)
    animTime *= Math.abs(to - from);

    let start = 0;
    const animate = (t: DOMHighResTimeStamp) => {
      if (!this.isConnected) {
        reset(); // possible when item is removed unexpectedly
        return;
      }

      if (!start) {
        start = t;
      }

      const cur = Math.min(t - start, animTime); // to make sure the element stops at exactly pointed value
      const v = cur / animTime;
      const scale = from + (to - from) * v;

      this.style.transformOrigin = this.getAttribute("position") === "top" ? "bottom" : "top";
      this.style.transform = `${removeScaleY(this.style.transform)} scaleY(${scale})`;
      scale !== 0 && nested.forEach((e) => (e.el.style.transform = `${e.prev}scaleY(${1 / scale})`));

      if (cur === animTime) {
        reset();
        return;
      }

      this.#frameAnimId = window.requestAnimationFrame(animate);
    };
    this.#frameAnimId = window.requestAnimationFrame(animate);

    return animTime;
  };

  /** Update position of popup. Call this method in cases when you changed options */
  #updatePosition = (): DOMRect | undefined => {
    const trg = this._opts.target as HTMLElement;
    // possible when target removed via set innerHTML (in this case remove-hook doesn't work)
    if (!trg.isConnected) {
      this.goHide(WUPPopup.HideCases.onTargetRemove);
      this.#attach && this.remove(); // self-removing if $attach()
      return undefined;
    }

    const tdef = trg.getBoundingClientRect();
    if (
      // issue: it's wrong if minWidth, minHeight etc. is changed and doesn't affect on layout sizes directly
      this.#prevRect &&
      this.#prevRect.top === tdef.top &&
      this.#prevRect.left === tdef.left &&
      this.#prevRect.width === tdef.width &&
      this.#prevRect.height === tdef.height
    ) {
      return this.#prevRect;
    }

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
      offset: {
        top: this._opts.offset[0],
        right: this._opts.offset[1],
        bottom: this._opts.offset[2] ?? this._opts.offset[0],
        left: this._opts.offset[3] ?? this._opts.offset[1],
      },
      minH: this.#userStyles.minH,
      minW: this.#userStyles.minW,
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
      const isHiddenByScroll = isIntoView(t.el, { scrollParents: this.#scrollParents, childRect: t }).hidden;
      if (isHiddenByScroll) {
        this.style.display = ""; // hide popup if target hidden by scrollableParent
        if (this.#arrowElement) {
          this.#arrowElement.style.display = "none";
        }
        return tdef;
      }

      // fix cases when target is partiallyHidden by scrollableParent
      // suggestion: if height/width is very small we can use another side
      const scrollRect = getBoundingInternalRect(this.#scrollParents[0]);
      t.top = Math.max(scrollRect.top, t.top);
      t.right = Math.min(scrollRect.right, t.right);
      t.bottom = Math.min(scrollRect.bottom, t.bottom);
      t.left = Math.max(scrollRect.left, t.left);
    }
    t.height = t.bottom - t.top;
    t.width = t.right - t.left;

    let lastRule: WUPPopupPlace.PlaceFunc;

    const process = () => {
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
        const checkSize = (relatedSize: number) => {
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
      // prettier-ignore
      this.style.transform = `${this.style.transform.replace(/translate\(([\d., \w]+)\)/, "")}translate(${pos.left}px, ${pos.top}px)`;
      this.setAttribute("position", pos.attr);
    };

    process();

    /* re-calc is required to avoid case when popup unexpectedly affects on layout:
      layout bug: Yscroll appears/disappears when display:flex; heigth:100vh > position:absolute; right:-10px
      issue: posible with cnt==2 issue will be reproduced
      */
    return t.el.getBoundingClientRect();
  };

  protected override gotRemoved() {
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
          /** @readonly Result position; use this to restyle animation etc. */
          readonly position: "top" | "left" | "bottom" | "right";
          /** @readonly Hide state; use this to hide-animation */
          readonly hide: "";
        }>;
    }
  }
}

// issue: popup overflows scrollbar of fitElement does it correct ?
