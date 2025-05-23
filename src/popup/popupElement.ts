import { PopupOpenCases, PopupCloseCases, PopupAnimations } from "./popupElement.types";
import { AttributeMap, AttributeTypes } from "../baseElement";
import { getOffset, PopupPlacements } from "./popupPlacements";
import { findScrollParentAll } from "../helpers/findScrollParent";
import WUPPopupArrowElement from "./popupArrowElement";
import PopupListener from "./popupListener";
import { getBoundingInternalRect, px2Number, styleTransform } from "../helpers/styleHelpers";
import animateDropdown from "../helpers/animateDropdown";
import animateStack from "../helpers/animateStack";
import isIntoView from "../helpers/isIntoView";
import viewportSize from "../helpers/viewportSize";
import WUPBaseModal from "../baseModal";

const attachLst = new Map<HTMLElement | SVGElement, () => void>();

const tagName = "wup-popup";
declare global {
  interface HTMLElementTagNameMap {
    [tagName]: WUPPopupElement; // add element to document.createElement
  }
}

// details here https://react.dev/blog/2024/04/25/react-19-upgrade-guide#the-jsx-namespace-in-typescript
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /**  Popup element
       *  @see {@link WUPPopupElement} */
      [tagName]: WUP.Base.ReactHTML<WUPPopupElement> & WUP.BaseModal.JSXProps & WUP.Popup.Attributes; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /**  Popup element
       *  @see {@link WUPPopupElement} */
      [tagName]: HTMLAttributes<WUPPopupElement> & WUP.Modal.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Popup element
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/popup}
 * @example
 * JS/TS
 * ```js
 * WUPPopupElement.$defaults.arrowEnable = true;
 *
 * const el = document.createElement('wup-popup');
 * el.$options.openCase = PopupOpenCases.onClick | PopupOpenCases.onFocus;
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
 * // this is the most recommended way because $attach appends popup only by onShow and removes byHide
 * const detach = WUPPopupElement.$attach(
                    { target: btn, text: "Some text content here", openCase: PopupOpenCases.onFocus | PopupOpenCases.onClick },
                    (popup) => { popup.className = "popup-class-here"; }
                  )'
 *```
 * HTML
 * ```html
 * <button id="btn1">Target</button>
 * <!-- You can skip pointing attribute 'target' if popup appended after target -->
 * <wup-popup w-target="#btn1" w-placement="top-start">Some content here</wup-popup>
 * ```
 * @tutorial Troubleshooting:
 * * You can set minWidth, minHeight to prevent squeezing of popup or don't use rule '.$adjust'
 * * Don't override styles: display, transform (possible to override only for animation)
 * * Don't use inline styles: maxWidth, maxHeight, minWidth, minHeight
 * * If target removed (when popup $isOpened) and appended again you need to update $options.target (because $options.target cleared)
 * * Popup has overflow 'auto'; If you change to 'visible' it will apply maxWidth/maxHeight to first children (because popup must be restricted by maxSize to avoid layout issues)
 * * During the closing attr 'hide' is appended only if css-animation-duration is detected
 * * Popup can't be more than 100vw & 100vh (impossible to disable the rule)
 * * known issue: popup can be positioned wrong if parent has transfrom style: https://stackoverflow.com/revisions/15256339/2 this is css-core issue. To fix: place popup outside such parent or remove transform style on parent */
export default class WUPPopupElement<
  TOptions extends WUP.Popup.Options = WUP.Popup.Options,
  Events extends WUP.Popup.EventMap = WUP.Popup.EventMap
> extends WUPBaseModal<TOptions, Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  // #ctr = this.constructor as typeof WUPPopupElement;

  static get observedOptions(): Array<keyof WUP.Popup.Options> {
    return ["openCase", "target", "placement"];
  }

  static get observedAttributes(): Array<string> {
    return ["w-target", "w-placement", "w-animation"];
  }

  static get mappedAttributes(): Record<string, AttributeMap> {
    return {
      target: {
        type: AttributeTypes.string,
      },
      placement: {
        type: AttributeTypes.parseCustom,
        parse: (attrValue) =>
          this.$placementAttrs(attrValue as WUP.Popup.Attributes["w-placement"]) ?? [...this.$defaults.placement],
      },
      animation: {
        type: AttributeTypes.parseCustom,
        parse: (attrValue) => {
          switch (attrValue) {
            case "drawer":
              return PopupAnimations.drawer;
            case "stack":
              return PopupAnimations.stack;
            default:
              return PopupAnimations.default;
          }
        },
      },
    }; // completely custom mapping used instead
  }

  static $placements = PopupPlacements;

  /** Returns placement */
  static $placementAttrs = (
    attr: WUP.Popup.Attributes["w-placement"]
  ): Array<WUP.Popup.Place.PlaceFunc> | undefined => {
    switch (attr) {
      case "top-start":
        return [PopupPlacements.$top.$start.$adjust, PopupPlacements.$bottom.$start.$adjust];
      case "top-middle":
        return [PopupPlacements.$top.$middle.$adjust, PopupPlacements.$bottom.$middle.$adjust];
      case "top-end":
        return [PopupPlacements.$top.$end.$adjust, PopupPlacements.$bottom.$end.$adjust];
      case "bottom-start":
        return [PopupPlacements.$bottom.$start.$adjust, PopupPlacements.$top.$start.$adjust];
      case "bottom-middle":
        return [PopupPlacements.$bottom.$middle.$adjust, PopupPlacements.$top.$middle.$adjust];
      case "bottom-end":
        return [PopupPlacements.$bottom.$end.$adjust, PopupPlacements.$top.$end.$adjust];
      case "left-start":
        return [PopupPlacements.$left.$start.$adjust, PopupPlacements.$right.$start.$adjust];
      case "left-middle":
        return [PopupPlacements.$left.$middle.$adjust, PopupPlacements.$right.$middle.$adjust];
      case "left-end":
        return [PopupPlacements.$left.$end.$adjust, PopupPlacements.$right.$end.$adjust];
      case "right-start":
        return [PopupPlacements.$right.$start.$adjust, PopupPlacements.$left.$start.$adjust];
      case "right-middle":
        return [PopupPlacements.$right.$middle.$adjust, PopupPlacements.$left.$middle.$adjust];
      case "right-end":
        return [PopupPlacements.$right.$end.$adjust, PopupPlacements.$left.$end.$adjust];
      default:
        return undefined;
    }
  };

  static get $styleRoot(): string {
    return `
      :root {
        --popup-anim-t: 300ms;
        --popup-text: inherit;
        --popup-bg: #fff;
        --popup-shadow: #0003;
        --tooltip-text: inherit;
        --tooltip-bg: rgba(255,255,255,0.9);
        --tooltip-shadow: #0003;
      }
      [wupdark] {
        --popup-text: #d8d8d8;
        --popup-bg: #2b3645;
        --popup-shadow: #0006;
        --tooltip-text: #d8d8d8;
        --tooltip-bg: rgba(16,70,82,0.9);
        --tooltip-shadow: #0006;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host,
      :host-arrow {
        --popup-anim: var(--popup-anim-t) cubic-bezier(0, 0, 0.2, 1) 0ms;
        opacity: 0;
      }
      :host {
        top:0;left:0;
        padding: 4px; margin: 0;
        box-shadow: 0 1px 4px 0 var(--popup-shadow);
        color: var(--popup-text);
        background: var(--popup-bg);
        text-overflow: ellipsis;
      }
      :host[tooltip],
      :host[tooltip]+:host-arrow {
        --popup: var(--tooltip-text);
        --popup-bg: var(--tooltip-bg);
        --popup-shadow: var(--tooltip-shadow);
      }
      :host[show]+:host-arrow { opacity: 1; }
      @media not all and (prefers-reduced-motion) {
        :host,
        :host+:host-arrow {
          transition: opacity var(--popup-anim);
        }
      }
      :host[w-animation] {
        transition-property: none;
        opacity: 1;
      }
      :host[w-animation=stack] {
        overflow: visible;
      }`;
  }

  /** Default options. Change it to configure default behavior */
  static $defaults: WUP.Popup.Options = {
    animation: PopupAnimations.default,
    placement: [
      WUPPopupElement.$placements.$top.$middle.$adjust, //
      WUPPopupElement.$placements.$bottom.$middle.$adjust,
    ],
    toFitElement: document.body,
    openCase: PopupOpenCases.onClick,
    hoverOpenTimeout: 200,
    hoverCloseTimeout: 500,
  };

  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.Popup.Options;
    d.placement = [...d.placement];
    return d as unknown as T;
  }

  /** Listen for target according to openCase and create/remove popup when it's required (by open/close).
   *  This helps to avoid tons of hidden popups on HTML;
   *  Firing detach doesn't required if target removed by target.remove() or target.parent.removeChild(target);
   *  If target is removed via changing innerHTML you should fire detach() to avoid memoryLeak
   *  @returns detach-function (hide,remove popup and remove eventListeners)
   *  @example
   *  const detach = WUPPopupElement.$attach(
   *     {
   *       target: document.querySelector("button") as HTMLElement,
   *       text: "Some text here",
   *       openCase: PopupOpenCases.onClick,
   *     },
   *     // (el) => el.class = "popup-attached"
   *   );
   * @tutorial Troubleshooting:
   * * $attach doesn't work with openCase.always it doesn't make sense
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
      const opts = popup ? { ...options, ...popup.$options, target: popup.$options.target! } : options;
      let isHiding = false;

      const lstn = new PopupListener(
        opts,
        (v, e) => {
          isHiding = false;
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
              return lstn;
            };

            callback?.call(this, p);
          }

          if (!popup.goOpen.call(popup, v, e)) {
            /* istanbul ignore else */
            if (isCreate) {
              popup!._refListener = undefined; // otherwise remove() destroys events
              popup.remove.call(popup);
            }
            return null;
          }

          return popup;
        },
        async (v, e) => {
          isHiding = true;
          const ok = await popup!.goClose.call(popup, v, e);
          /* istanbul ignore else */
          if (ok && isHiding) {
            popup!._refListener = undefined; // otherwise remove() destroys events
            popup!.remove.call(popup);
            popup = undefined;
          }
          return ok;
        }
      );

      return lstn;
    };
    const r = attach();

    function detach(): void {
      if (popup) {
        popup.$isOpened && popup.goClose.call(popup, PopupCloseCases.onTargetRemove, null);
        (popup as T).remove.call(popup);
      }
      r.stopListen();
      popup = undefined;
      attachLst.delete(options.target);
    }

    attachLst.set(options.target, detach);

    return detach;
  }

  /** Returns arrowElement if $options.arrowEnable=true and after popup $isOpened */
  $refArrow?: WUPPopupArrowElement;

  /** Force to update position. Call this if related styles are changed & need to re-calc position */
  $refresh(): void {
    this.#state && this.buildState();
  }

  protected override gotReady(): void {
    super.gotReady();
    this.init();
  }

  protected override gotRender(): void {
    // empty because the logic is different
  }

  _refListener?: PopupListener;
  #attach?: () => PopupListener; // func to use alternative target
  /** Called after gotReady() and $open() (to re-init according to options) */
  protected init(): void {
    this.disposeListener(); // remove previously added events

    if (this.#attach) {
      this._refListener = this.#attach();
    } else {
      if (this._opts.openCase === PopupOpenCases.onInit) {
        this.goOpen(PopupOpenCases.onInit, null);
        return;
      }
      if (this._opts.openCase !== PopupOpenCases.onManualCall) {
        this._opts.target = this.defineTarget();
        this._refListener = new PopupListener(
          this._opts as typeof this._opts & { target: HTMLElement },
          (v, e) => {
            this.goOpen(v, e);
            return this.$isOpened ? this : null;
          },
          (v, e) => {
            this.goClose(v, e);
            const ok = this.$isClosing || !this.$isOpened;
            return ok;
          }
        );
      }
    }
  }

  protected override gotChanges(propsChanged: Array<string> | null): void {
    super.gotChanges(propsChanged);
    if (propsChanged) {
      // re-init
      this.$isOpened && this.goClose(PopupCloseCases.onOptionChange, null);
      this.init(); // only if popup is hidden
    }
  }

  /** Defines target on show; @returns Element | Error */
  defineTarget(): HTMLElement | SVGElement {
    let el: Element | null;
    const attrTrg = this.getAttribute("w-target"); // NiceToHave: re-use automated parseAttr()
    if (attrTrg) {
      el = document.querySelector(attrTrg);
    } else if (this._opts.target) {
      return this._opts.target;
    } else {
      el = this.previousElementSibling;
    }
    if (el instanceof HTMLElement || el instanceof SVGElement) {
      return el;
    }

    throw new Error(
      `${this.tagName}. Target as HTMLElement|SVGElement is not defined'${attrTrg ? ` for ${attrTrg}` : ""}'`
    );
  }

  protected setMaxHeight(px: number | null): void {
    this.style.maxHeight = px ? `${px}px` : "";
    if (this.#state?.userStyles?.inheritY) {
      this.#state.userStyles.inheritY.style.maxHeight = this.style.maxHeight;
    }
  }

  protected setMaxWidth(px: number | null): void {
    this.style.maxWidth = px ? `${px}px` : "";
    if (this.#state?.userStyles?.inheritX) {
      this.#state.userStyles.inheritX.style.maxWidth = this.style.maxWidth;
    }
  }

  #state?: {
    scrollParents?: HTMLElement[];
    prevRect?: DOMRect;
    prevSize?: { w: number; h: number };
    prevScreenSize?: { w: number; h: number };
    frameId: number;
    userStyles: {
      maxW: number;
      maxH: number;
      minH: number;
      minW: number;
      borderRadius: number;
      inheritY: HTMLElement | SVGElement | null;
      inheritX: HTMLElement | SVGElement | null;
      animTime: number;
    };
    placements: Array<WUP.Popup.Place.PlaceFunc>;
  };

  /** Collect/calc all required values into #state (when menu shows) */
  protected buildState(): void {
    this.#state = {} as any;
    this.setMaxWidth(null); // reset styles to default to avoid bugs and previous state
    this.setMaxHeight(null); // it works only when styles is defined before popup is opened
    this.style.minWidth = ""; // reset styles to default to avoid bugs and previous state
    this.style.minHeight = ""; // reset styles to default to avoid bugs and previous state

    const target = this._opts.target as HTMLElement;
    if (!target!.isConnected) {
      throw new Error(`${this.tagName}. Target is not appended to document`);
    }

    if (!this._opts.animation) {
      this.style.transform = ""; // otherwise animation will broken if we reset
    }
    const style = getComputedStyle(this);

    let child = this.children.item(0);
    if (!(child instanceof HTMLElement) && !(child instanceof SVGElement)) {
      child = null;
    }
    this.#state!.userStyles = {
      maxW: px2Number(style.maxWidth),
      minW: Math.max(5, px2Number(style.paddingRight) + px2Number(style.paddingLeft), px2Number(style.minWidth)),

      maxH: px2Number(style.maxHeight),
      minH: Math.max(5, px2Number(style.paddingTop) + px2Number(style.paddingBottom), px2Number(style.minHeight)),

      borderRadius: 0,
      // fix `maxSize inheritance doesn't work for customElements`
      inheritY: child && style.overflowY === "visible" ? child : null,
      inheritX: child && style.overflowX === "visible" ? child : null,
      animTime: Number.parseFloat(style.animationDuration.substring(0, style.animationDuration.length - 1)) * 1000,
    };

    this.#state!.scrollParents = findScrollParentAll(target) ?? undefined;
    // get arrowSize
    if (this._opts.arrowEnable) {
      const el = this.$refArrow || document.createElement(WUPPopupArrowElement.tagName);
      this.$refArrow = el;
      // insert arrow after popup
      const nextEl = this.nextSibling;
      if (nextEl) {
        this.parentElement!.insertBefore(el, nextEl);
      } else {
        this.parentElement!.appendChild(el);
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
  protected goAnimate(animTime: number, isHide: boolean): Promise<boolean> {
    if (!isHide && animTime) {
      this.style.opacity = "0";
      setTimeout(() => (this.style.opacity = ""), 2); // such logic allows to calc layout & scroll to element & then animate properly
    }
    this._isStopChanges = true;
    if (this._opts.animation === PopupAnimations.drawer) {
      this.setAttribute("w-animation", "drawer");
      this._isStopChanges = false;

      const pa = animateDropdown(this, animTime, isHide);
      this._stopAnimation = () => {
        delete this._stopAnimation;
        pa.stop(this._opts.animation !== PopupAnimations.drawer); // rst animation state only if animation changed
      };
      return pa;
    }

    if (this._opts.animation === PopupAnimations.stack) {
      this.setAttribute("w-animation", "stack");
      this._isStopChanges = false;

      const items =
        this.querySelector("[items]") || // <div items><button>item 1</button>...</div>
        this.querySelector("li")?.parentElement!.children || // <ul><li>item 1</li>...</ul>
        (this.children.length > 1 && this.children) || // <button>item 1</button>...
        (this.children[0]?.children.length && this.children[0]!.children) || // <div><button>item 1</button>...</div>
        this.children; // <button>item 1</button>
      const pos = this.getAttribute("position");
      const isVertical = pos === "bottom" || pos === "top";
      const pa = animateStack(this.$options.target!, items as HTMLCollection, animTime, isHide, isVertical);
      this._stopAnimation = () => {
        delete this._stopAnimation;
        pa.stop(this._opts.animation !== PopupAnimations.stack); // rst animation state only if animation changed
      };
      return pa;
    }

    this.removeAttribute("w-animation");
    this._isStopChanges = false;

    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(true), animTime);
      this._stopAnimation = () => {
        delete this._stopAnimation;
        clearTimeout(t);
        resolve(false);
      };
    });
  }

  override goOpen(openCase: PopupOpenCases, ev: MouseEvent | FocusEvent | null): Promise<boolean> {
    this._opts.target = this.defineTarget(); // WARN: it can throw error if target isn't defined
    if (openCase === PopupOpenCases.onManualCall && this._refListener) {
      this._refListener.open(null as any, ev); // if listener exists need to call it from listener side to apply events
      return this._whenOpen as Promise<boolean>;
    }
    return super.goOpen(openCase ?? PopupOpenCases.onManualCall, ev);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override gotOpen(openCase: PopupOpenCases, ev: MouseEvent | FocusEvent | null): void {
    this._stopAnimation?.call(this);
    this.#state && window.cancelAnimationFrame(this.#state.frameId);

    this.buildState();

    const goUpdatePos = (): void => {
      // possible if hidden by target-remove
      if (this.$isOpened) {
        this.#state!.prevRect = this.updatePosition();
        const id = window.requestAnimationFrame(goUpdatePos);
        if (this.#state) {
          this.#state.frameId = id;
          this.#state!.prevSize = { w: this.offsetWidth, h: this.offsetHeight };
        }
      }
    };
    goUpdatePos();
    this.goAnimate(this.animTime, false);
  }

  override goClose(closeCase: PopupCloseCases, ev: MouseEvent | FocusEvent | KeyboardEvent | null): Promise<boolean> {
    if (closeCase === PopupCloseCases.onManualCall && this._refListener) {
      this._refListener.close(null as any, ev); // if listener exists need to call it from listener side to apply events
      return this._whenClose as Promise<boolean>;
    }
    const skipWait = closeCase === PopupCloseCases.onOptionChange || closeCase === PopupCloseCases.onTargetRemove;
    return super.goClose(closeCase ?? PopupCloseCases.onManualCall, ev, skipWait);
  }

  /** Hide popup. @closeCase as reason of hide(). Calling 2nd time at once will stop previous hide-animation */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override gotClose(
    closeCase: PopupCloseCases,
    ev: MouseEvent | FocusEvent | KeyboardEvent | null,
    immediately?: boolean
  ): void {
    this._stopAnimation?.call(this);
    !immediately &&
      this.goAnimate(this.animTime, true).then((isEnd) => {
        if (isEnd) {
          const fix = this._whenClose;
          this.resetState(); // custom animation can finish faster so need to reset state immediately
          this._whenClose = fix; // WARN: event $close fired after strict this.animTime
        }
      });
  }

  /** Returns `target.getBoundingClientRect()` Use function to change placement logic based on target-rect
   * @WARN it's called with screen-frequency (per frame) */
  getTargetRect(target: Element): DOMRect {
    return target.getBoundingClientRect();
  }

  /** Update position of popup. Call this method in cases when you changed options */
  protected updatePosition(): DOMRect | undefined {
    const trg = this._opts.target!;
    // possible when target removed via set innerHTML (in this case remove-hook doesn't work)
    if (!trg.isConnected) {
      this.goClose(PopupCloseCases.onTargetRemove, null);
      this.#attach && this.remove(); // self-removing if $attach()
      return undefined;
    }

    const tRect = this.getTargetRect(trg);
    if (!tRect.width || !tRect.height) {
      this.style.display = "none"; // hide if target is not displayed
      return this.#state!.prevRect;
    }
    const screenSize = viewportSize();
    const isScreenChanged =
      this.#state!.prevScreenSize &&
      (this.#state!.prevScreenSize.w !== screenSize.vw || this.#state!.prevScreenSize.h !== screenSize.vh);

    if (
      !isScreenChanged &&
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
    isScreenChanged && this.buildState(); // rebuild state because possible difference on mediaquery
    this.#state!.prevScreenSize = { w: screenSize.vw, h: screenSize.vh };

    const fitEl = this._opts.toFitElement; /* || document.body */
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

    // reduce fitElement sizes so don't allow to render out of viewport (see demo:example-3)
    let ds = fit.bottom - screenSize.vh;
    if (ds > 0) {
      fit.bottom -= ds;
      fit.height -= ds;
    }
    ds = fit.right - screenSize.vw;
    if (ds > 0) {
      fit.right -= ds;
      fit.width -= ds;
    }

    const tdef: Omit<DOMRect, "toJSON" | "x" | "y"> = {
      height: Math.round(tRect.height),
      width: Math.round(tRect.width),
      top: Math.round(tRect.top),
      left: Math.round(tRect.left),
      bottom: Math.round(tRect.bottom),
      right: Math.round(tRect.right),
    };

    // popupSize must be <= viewportSize
    // WARN is fitEl positioned in container with *vw then on Safari possible +- extra margin it's ok and must be fixed by developer on parent side
    const maxW = Math.min(
      this.#state!.userStyles.maxW || Number.MAX_SAFE_INTEGER,
      screenSize.vw - (a ? a[2] ?? a[0] : 0) * 2
    );
    const maxH = Math.min(
      this.#state!.userStyles.maxH || Number.MAX_SAFE_INTEGER,
      screenSize.vh - (a ? a[3] ?? a[1] : 0) * 2
    );
    if (this._opts.minWidthByTarget) {
      this.style.minWidth = `${Math.min(tdef.width, maxW)}px`;
    } else if (this.style.minWidth) {
      this.style.minWidth = "";
    }

    if (this._opts.minHeightByTarget) {
      this.style.minHeight = `${Math.min(tdef.height, maxH)}px`;
    } else if (this.style.minHeight) {
      this.style.minHeight = "";
    }

    this.style.display = ""; // reset prev possible hidden style

    // detect whether need to apply maxWidth inline style
    this.setMaxHeight(0); // reset before maxWidth because it influent on maxWidth
    let _defMaxW = 0; // zero means: don't apply inline style
    if (this._opts.maxWidthByTarget) {
      _defMaxW = Math.min(tdef.width, maxW);
    } else {
      this.setMaxWidth(0); // reset to get the real offsetWidth
      if (this.offsetWidth > screenSize.vw) {
        _defMaxW = screenSize.vw; // maxWidth can't be > 100vw or userStyles.maxW
      }
    }
    _defMaxW !== 0 && this.setMaxWidth(_defMaxW); // resetting is required to get default size

    // detect whether need to apply maxHeight inline style
    let _defMaxH = 0; // zero means: don't apply inline style
    if (this.offsetHeight > screenSize.vh) {
      _defMaxH = screenSize.vh;
    }
    _defMaxH !== 0 && this.setMaxHeight(_defMaxH); // resetting is required to get default size

    if (this.$refArrow) {
      this.$refArrow.style.display = "";
      this.$refArrow.style.width = "";
      this.$refArrow.style.height = "";
    }

    const { offset } = this._opts;
    const me: WUP.Popup.Place.MeRect = {
      // WARN: offsetSize is rounded so 105.2 >>> 105
      w: this.offsetWidth, // clientWidth doesn't include border-size
      h: this.offsetHeight,
      el: this,
      offset: getOffset(typeof offset === "function" ? offset.call(this, tRect) : offset),
      minH: this.#state!.userStyles!.minH,
      minW: this.#state!.userStyles!.minW,
      arrow: this.$refArrow
        ? {
            h: this.$refArrow.offsetHeight,
            w: this.$refArrow.offsetWidth,
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
        this.style.display = "none"; // hide popup if target hidden by scrollableParent
        if (this.$refArrow) {
          this.$refArrow.style.display = "none";
        }
        return tRect;
      }

      // fix cases when target is partiallyHidden by scrollableParent
      // suggestion: if height/width is very small we can use another side
      let sp = this.#state!.scrollParents[0];
      /* istanbul ignore next */
      sp = sp === document.documentElement ? document.body : sp; // when scrollParent is html element then rect.top can be negative: to test place target at bottom body+margin target+html vert.scroll
      const scrollRect = getBoundingInternalRect(sp); // warn: it's important to fit only first parent
      t.top = Math.max(scrollRect.top, t.top);
      t.bottom = Math.min(scrollRect.bottom, t.bottom);
      t.left = Math.max(scrollRect.left, t.left);
      t.right = Math.min(scrollRect.right, t.right);
    }
    t.height = t.bottom - t.top;
    t.width = t.right - t.left;

    let lastRule: WUP.Popup.Place.PlaceFunc;

    const process = (): WUP.Popup.Place.Result => {
      const hasOverflow = (p: WUP.Popup.Place.Result, meSize: { w: number; h: number }): boolean =>
        p.left < fit.left ||
        p.top < fit.top ||
        p.freeW < this.#state!.userStyles!.minW ||
        p.freeH < this.#state!.userStyles!.minH ||
        p.left + Math.min(meSize.w, p.maxW || Number.MAX_SAFE_INTEGER, maxW) > fit.right ||
        p.top + Math.min(meSize.h, p.maxH || Number.MAX_SAFE_INTEGER, maxH) > fit.bottom;

      let pos: WUP.Popup.Place.Result = <WUP.Popup.Place.Result>{};
      const isOk = this.#state!.placements!.some((pfn) => {
        lastRule = pfn;
        pos = pfn(t, me, fit);
        let ok = !hasOverflow(pos, me);
        if (ok) {
          // maxW/H can be null if resize is not required
          if (pos.maxW != null && !_defMaxW /* || _defMaxW > pos.maxW */) {
            this.setMaxWidth(pos.maxW);
          }
          if (pos.maxH != null && !_defMaxH /* || _defMaxH > pos.maxH */) {
            this.setMaxHeight(pos.maxH);
          }
          // re-check because maxWidth can affect on height
          if (this.offsetHeight !== me.h || this.offsetWidth !== me.w) {
            const meUpdated = { ...me, w: this.offsetWidth, h: this.offsetHeight };
            pos = pfn(t, meUpdated, fit);
            ok = !hasOverflow(pos, meUpdated);
            /* istanbul ignore else */
            if (!ok) {
              // reset styles if need to look for another position
              this.setMaxWidth(_defMaxW); // resetting is required to get default size
              this.setMaxHeight(_defMaxH);
            }
          }
        }
        return ok;
      });
      !isOk && console.error(`${this.tagName}. Impossible to place without overflow`, this);

      if (this.$refArrow) {
        // change arrowSize if it's bigger than popup
        const checkSize = (relatedSize: number): void => {
          // if we have border-radius of popup we need to include in offset to prevent overflow between arrow and popup
          const maxArrowSize = Math.max(relatedSize - this.#state!.userStyles.borderRadius * 2, 0);
          if (me.arrow.w > maxArrowSize) {
            me.arrow.w = maxArrowSize;
            me.arrow.h = maxArrowSize / 2;
            this.$refArrow!.style.width = `${me.arrow.w}px`;
            this.$refArrow!.style.height = `${me.arrow.h}px`;
            pos = lastRule(t, me, fit); // re-calc position because size of arrow is changed
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
        this.$refArrow.style.transform = `translate(${pos.arrowLeft}px, ${pos.arrowTop}px) rotate(${pos.arrowAngle}.1deg)`; // WARN Firefox bug: css filter dropshadow works wrong with angle 180.0
      }

      // transform has performance benefits in comparison with positioning
      this.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
      this.setAttribute("position", pos.attr);
      return pos;
    };
    const was = styleTransform(this, "translate", ""); // remove prev transformation and save scale transformation
    const pos = process(); // WARN: important to get always transform without float values otherwise Chrome render blurred text (event after animation end but if during the animation was float transformations)

    // fix: when parent.transform.translate affects on popup
    const meRect = this.getBoundingClientRect();
    const dx = Math.round(meRect.left - pos.left);
    const dy = Math.round(meRect.top - pos.top);
    if (dx || dy) {
      styleTransform(this, "translate", `${pos.left - dx}px, ${pos.top - dy}px`);
      this.$refArrow && styleTransform(this.$refArrow, "translate", `${pos.arrowLeft - dx}px, ${pos.arrowTop - dy}px`);
    }
    if (was) {
      // otherwise getBoundingClientRect returns element position according to scale applied from dropdownAnimation
      this.style.transform += ` ${was}`; // rollback scale transformation
    }
    /* re-calc is required to avoid case when popup unexpectedly affects on layout:
      layout bug: Y-scroll appears/disappears when display:flex; height:100vh > position:absolute; right:-10px
      with cnt==2 it's reprodusable */
    return t.el.getBoundingClientRect();
  }

  protected override resetState(): void {
    super.resetState();
    delete this._stopAnimation;
    this.style.display = "";
    this.#state && window.cancelAnimationFrame(this.#state.frameId);
    this.#state = undefined;

    if (this.$refArrow) {
      this.$refArrow.remove();
      this.$refArrow = undefined;
    }
  }

  protected override gotRemoved(): void {
    this.#state?.frameId && window.cancelAnimationFrame(this.#state.frameId);
    this.#state = undefined;
    this.$refArrow?.remove();
    this.$refArrow = undefined;
    super.gotRemoved();
  }

  /** Call when need to re-init */
  protected disposeListener(): void {
    // possible on re-init when need to rebound events
    this._refListener?.stopListen();
    this._refListener = undefined;
  }

  protected override dispose(): void {
    super.dispose();
    this.disposeListener();
  }
}

customElements.define(tagName, WUPPopupElement);
// manual testcase: show as dropdown & scroll parent - blur effect can appear

// NiceToHave add 'position: centerScreen' to place as modal when content is big and no spaces anymore
// NiceToHave 2 popups can overflow each other: need option to try place several popups at once without overflow. Example on wup-pwd page: issue with 2 errors
// NiceToHave animation.default animates to opacity: 1 but need to animate to opacityFromCss
