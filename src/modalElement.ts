import { AttributeMap, AttributeTypes } from "./baseElement";
import WUPBaseModal from "./baseModal";
import focusFirst from "./helpers/focusFirst";
import { WUPcssButton } from "./styles";

export const enum ModalOpenCases {
  /** When $open() is called programmatically */
  onManuallCall = 0,
  /** On init (when appended to layout) */
  onInit = 1,
  /** When click on target @see {@link WUP.Modal.Options.target} */
  onTargetClick,
}

export const enum ModalCloseCases {
  /** When $close() is called programmatically */
  onManuallCall = 0,
  /** When was click on button[close] */
  onCloseClick = 1,
  /** When was click outside modal */
  onOutsideClick,
  /** When user pressed Escape button */
  onPressEsc,
  /* When on successful wup-form.$onSubmitEnd: @see {@link WUP.Form.EventMap.$submitEnd} */
  onSubmitEnd,
}

const tagName = "wup-modal";
declare global {
  namespace WUP.Modal {
    interface Options {
      /** Element that modal need to listen for click. If `target` missed modal will be opened on init
       * @defaultValue null */
      target?: Element | null;
      /** Position on the screen
       * @defaultValue 'center' */
      placement: "center" | "top" | "left" | "right";
      /** Auto focus first possible content with skipping focus on button[close] if there is another focusable content
       * Point `false` to autofocus on button[close].
       * If you don't need any visual focus by default override method focus() and call `HTMLElement.prototype.focus.call(this)` to focus modal-box itself
       * @defaultValue true */
      autoFocus: boolean;
      /** Auto close on successful wup-form.$onSubmitEnd: @see {@link WUP.Form.EventMap.$submitEnd}
       * @defaultValue true */
      autoClose: boolean;
      /** Remove itself after closing
       * @defaultValue false */
      selfRemove: boolean;
      // todo modalInModal: replace OR overflow
    }
    interface EventMap extends WUP.BaseModal.EventMap<ModalOpenCases, ModalCloseCases> {}
    interface JSXProps<T = WUPModalElement> extends WUP.BaseModal.JSXProps<T>, WUP.Base.OnlyNames<Options> {
      /** QuerySelector to find target - element that modal need to listen for click. If `target` missed modal will be opened on init
       * @tutorial rules
       * * point 'prev' to select previousSibling */
      "w-target"?: string;
      "w-placement"?: Options["placement"];
      "w-autoFocus"?: boolean | "";
      "w-autoClose"?: boolean | "";
      "w-selfRemove"?: boolean | "";
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPModalElement; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /**  Modal element
       *  @see {@link WUPModalElement} */
      [tagName]: WUP.Modal.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Modal element
 * @example
 * JS/TS
 * ```js
 * WUPModalElement.$defaults.placement = ...;
 *
 * const el = document.createElement('wup-modal');
 * el.textContent = ...;
 * document.body.append(el);
 * el.$onClose = () => el.remove(); // self-remove after close
 *```
 * HTML
 * ```html
 * <wup-modal>Some content here</wup-modal>
 * ```
 * @tutorial Troubleshooting known issues:
 * * for very long content with 1st focusable item at the bottom it won't be visible because user must see top of the modal at first
 * To fix the issue set `<h2 tabindex="-1">...</h2>` and hide focus frame via styles OR disable `$options.autoFocus`
 * * accessibility: NVDA reads modal content twice. To fix follow the recomendations: https://github.com/nvaccess/nvda/issues/8971 */
export default class WUPModalElement<
  TOptions extends WUP.Modal.Options = WUP.Modal.Options,
  Events extends WUP.Modal.EventMap = WUP.Modal.EventMap
> extends WUPBaseModal<TOptions, Events> {
  #ctr = this.constructor as typeof WUPModalElement;

  // static get observedOptions(): Array<keyof WUP.Modal.Options> { return []; }
  // static get observedAttributes(): Array<string> { return []; }

  /** Default class used for fade -blur background for main content
   * @defaultValue "wup-modal-fade" */
  static $classFade = "wup-modal-fade";
  /** Default class that appended to body when modal opend (required to hide body scroll)
   * @defaultValue "wup-modal-open" */
  static $classOpened = "wup-modal-open";

  // WARN: modal-anim shouldn't affect on animation of nested
  static get $styleRoot(): string {
    return `:root {
        --modal-anim-t: 400ms;
        --modal-text: inherit;
        --modal-bg: #fff;
        --modal-fade: #0007;
        --modal-margin: 2em;
      }
      [wupdark] {
        --modal-bg: #222a36;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        z-index: 9002;
        width: 100%;
        max-width: 600px;
        min-height: 150px;
        color: var(--modal-text);
        background: var(--modal-bg);
        border: 1px solid #0002;
        user-select: none;
        pointer-events: none;
        touch-action: none;
        outline: none;
      }
      :host[open] {
        user-select: initial;
        pointer-events: initial;
        touch-action: initial;
       }
      :host[w-placement="top"] {
        top:0;left:0;right:0;
        margin: var(--modal-margin);
        margin-left: auto;
        margin-right: auto;
        max-height: calc(100% - var(--modal-margin) * 2);
        transform: translateY(-50%);
      }
      :host[w-placement="center"] {
        top:0;left:0;right:0;bottom:0;
        margin: auto;
        height: fit-content${
          /* This is tricky rule. If it will buggy need to rewrite centering logic via js-core like it works with popup  */ ""
        };
        max-height: calc(100% - var(--modal-margin) * 2);
        transform: translateY(-150%);
      }
      :host[w-placement="right"] {
        right:0;top:0;bottom:0;
        border-radius: 0;
        transform: translateX(100%);
      }
      :host[w-placement="left"] {
        left:0;top:0;bottom:0;
        border-radius: 0;
        transform: translateX(-100%);
      }
      :host[show] {
        transform: none;
      }
      @media (max-width: 600px) {
        :host {
          --modal-margin: 0px;
          border-radius: 0;
        }
      }
      .${this.$classFade} {
         --modal-anim: var(--modal-anim-t) cubic-bezier(0, 0, 0.2, 1) 0ms;
        z-index: 9000;
        display: block;
        position: fixed;
        top:0;left:0;right:0;bottom:0;
        background: var(--modal-fade);
        opacity: 0;
        pointer-events: none;
        touch-action: none;
      }
      .${this.$classFade}[show] {
         pointer-events: initial;
         touch-action: initial;
         opacity: 1;
      }
      @media not all and (prefers-reduced-motion) {
       .${this.$classFade} {
          transition: opacity var(--modal-anim), transform var(--modal-anim);
        }
      }
      :host > button[close] {
        --icon-img: var(--wup-icon-cross);
        position: absolute;
        right: 0;
        margin: 0 1em;
      }
      :host h2 {
        margin: 0 0 1em;
        padding-right: 1.8em;
      }
      :host wup-form {
        max-width: initial;
      }
      :host wup-form button[type=submit] {
        margin-bottom: 0;
        margin-left: auto;
      }
      :host footer {
        display: flex;
        gap: calc(var(--base-margin) / 2);
        margin-top: var(--base-margin);
        justify-content: flex-end;
      }
      ${WUPcssButton(":host footer>button")}
      :host footer>button[type] {
         margin: 0;
         min-width: 7em;
      }
      :host footer>button[data-close=modal] {
         background: var(--base-btn2-bg);
         color: var(--base-btn2-text);
      }`;
  }

  static $defaults: WUP.Modal.Options = {
    target: null,
    placement: "center",
    autoFocus: true,
    autoClose: true,
    selfRemove: false,
  };

  static get mappedAttributes(): Record<string, AttributeMap> {
    const m = super.mappedAttributes;
    m.target = { type: AttributeTypes.selector };
    return m;
  }

  /** Reference to fade element */
  $refFade?: HTMLElement;
  /** Reference to button[close] */
  $refClose?: HTMLButtonElement;

  protected override gotRender(): void {
    /** empty because component is hidden by default and need to focus on speed of init-phase */
  }

  _prevTarget?: Element | null;
  _prevTargetClick?: (e: MouseEvent) => void;

  protected override gotChanges(propsChanged: string[] | null): void {
    super.gotChanges(propsChanged);

    const trg = this._opts.target;
    const isTrgChange = this._prevTarget !== trg;
    if (isTrgChange) {
      (this._prevTarget as HTMLElement)?.removeEventListener("click", this._prevTargetClick!);
      this._prevTarget = trg;
    }

    if (!trg) {
      !propsChanged && this.goOpen(ModalOpenCases.onInit, null); // call here to wait for options before opening
    } else if (isTrgChange) {
      this._prevTargetClick = (e) => {
        setTimeout(() => {
          !e.defaultPrevented && this.goOpen(ModalOpenCases.onTargetClick, e);
        }); // timeout required to prevent openinig from bubbled-events
      };
      (trg as HTMLElement).addEventListener("click", this._prevTargetClick, { passive: true });
    }
  }

  /** Id of last focused item on item itself */
  _lastFocused?: Element | string | null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotOpen(openCase: ModalOpenCases, e: MouseEvent | null): void {
    // store id of focused element
    const ael = document.activeElement;
    this._lastFocused = ael?.id || ael;

    // setup Accesibility attrs
    this.tabIndex = -1; // WA: to allow scroll modal - possible that tabindex: -1 doesn't allow tabbing inside
    this.role = "dialog"; // possible alertdialog for Confirm modal
    this.setAttribute("aria-modal", true); // WARN for old readers it doesn't work and need set aria-hidden to all content around modal
    const header = this.querySelector("h1,h2,h3,h4,h5,h6,[role=heading]");
    if (!header) {
      console.warn("WA: header missed. Add <h2>..<h6> or role='heading' to modal content");
    } else {
      header.id ||= this.#ctr.$uniqueId;
      this.setAttribute("aria-labelledby", header.id); // issue: NVDA reads content twice if modal has aria-labelledby: https://github.com/nvaccess/nvda/issues/8971
    }
    // init button[close]
    this.$refClose ??= document.createElement("button");
    this.$refClose.type = "button";
    this.$refClose.setAttribute("aria-label", __wupln("close", "aria"));
    this.$refClose.setAttribute(this.#ctr.classNameBtnIcon, "");
    this.$refClose.setAttribute("close", "");
    this.$refClose.setAttribute("data-close", "modal"); // todo use w-close instead
    this.prepend(this.$refClose);
    // init fade - // todo need to prevent it if prev modal still here
    this.$refFade ??= document.body.appendChild(document.createElement("div"));
    this.$refFade.className = this.#ctr.$classFade;
    setTimeout(() => this.$refFade?.setAttribute("show", "")); // timeout to allow animation works
    // apply open styles
    this.setAttribute("w-placement", this._opts.placement);
    document.body.classList.add(this.#ctr.$classOpened); // to maybe hide scroll-bars
    // listen for close-events
    this.$refFade.onclick = (ev) => this.goClose(ModalCloseCases.onOutsideClick, ev);
    this.appendEvent(this, "click", (ev) => this.gotClick(ev));
    this.appendEvent(this, "keydown", (ev) => this.gotKeyDown(ev), { passive: false });
    // @ts-expect-error - TS isn't good enought for looking for types
    this.appendEvent(this, "$submitEnd", (sev: WUP.Form.EventMap["$submitEnd"]) => {
      sev.detail.success && this.goClose(ModalCloseCases.onSubmitEnd, sev);
    });
    // this.appendEvent(this, "focusout", (ev) => this.gotFocusOut(ev), { passive: false });

    this._opts.autoFocus ? this.focusAny() : this.focus(); // bug: FF doesn't adjust suggest-popup according to animation
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotClose(closeCase: ModalCloseCases, ev: MouseEvent | KeyboardEvent | WUP.Form.EventMap["$submitEnd"] | null): void {
    // remove events
    this.$refClose!.onclick = null;
    this.$refFade!.onclick = null;
    this.disposeEvents(); // remove only events WARN: don't call this.dispose()!
    // apply animation
    this.$refFade!.removeAttribute("show"); // todo only if last
    const bd = document.body;
    bd.classList.remove(this.#ctr.$classOpened); // testCase: on modal.remove everythin must returned to prev state
    !bd.className && bd.removeAttribute("class");

    this.focusBack();
  }

  /** Called when modal handles click to check if was close-click */
  gotClick(e: MouseEvent): void {
    const t = e.target;
    if (e.defaultPrevented || t === this) {
      return;
    }
    // if (this.itsMe.call(this.$refClose, t)) {
    //   this.goClose(ModalCloseCases.onCloseClick, e);
    //   return;
    // }
    // todo will be issue with modal in modal
    const all = this.querySelectorAll("[data-close=modal]").values(); // allow to use any button with attr to close modal
    // eslint-disable-next-line no-restricted-syntax
    for (const el of all) {
      if (this.itsMe.call(el, t)) {
        this.goClose(ModalCloseCases.onCloseClick, e);
        break;
      }
    }
  }

  // WARN: the focus block work better because not handles keyboard but looks for focus behavior but it's buggy in FF and maybe other browsers since focusOut can be outside the modal
  // /** Required for tab-cycle behavior */
  // _willFocusPrev?: boolean;
  // /** Called on focusout event */
  // gotFocusOut(e: FocusEvent): void {
  //   const t = e.relatedTarget;
  //   const isOut = !t || !this.includes(t); // a-todo includes can be wrong for absolute items ???
  //   const isFocusLast = this._willFocusPrev;
  //   isOut && isFocusLast != null && focusFirst(this, { isFocusLast }); // bug: FF doesn't remove focus-style on btn[close] when focus goes outside
  //   delete this._willFocusPrev;
  //   console.warn("blur", { isFocusLast, relatedTarget: t, hasFocus: document.hasFocus() });
  //   // WARN: browser can ignore focus action and move focus to the tab panel - it's ok and even better than whole cycling
  // }

  /** Called on keydown event */
  gotKeyDown(e: KeyboardEvent): void {
    if (e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }
    switch (e.key) {
      case "Escape":
        if (!e.shiftKey && !e.defaultPrevented) {
          e.preventDefault();
          this.goClose(ModalCloseCases.onPressEsc, e);
        }
        break;
      case "Tab": {
        let isFocusLast: boolean | undefined;
        if (e.shiftKey) {
          const isFirst = document.activeElement === this.querySelector(focusFirst.$selector);
          if (isFirst) {
            isFocusLast = true; // to cycle focus-behavior
          }
        } else {
          const all = this.querySelectorAll(focusFirst.$selector);
          const isLast = document.activeElement === all.item(all.length - 1);
          if (isLast) {
            isFocusLast = false; // to cycle focus-behavior
          }
        }
        if (isFocusLast != null) {
          e.preventDefault(); // prevent default focus behavior
          focusFirst(this, { isFocusLast });
        }
        break;
      }
      default:
        break;
    }
  }

  /** Called on close to return focus to previously focused item */
  focusBack(): void {
    let el: Element | null | undefined;
    if (typeof this._lastFocused === "string") {
      el = document.getElementById(this._lastFocused);
    } else {
      el = this._lastFocused;
    }
    if (el && (el as HTMLElement).focus && el.isConnected) {
      (el as HTMLElement).focus();
    } else {
      this.throwError(
        "Impossible to return focus back: element is missed. Before opening modal set 'id' to focused element"
      );
      /* istanbul ignore next */
      (document.activeElement as HTMLElement)?.blur?.();
    }
  }

  /** Focus any content excluding button[close] if possible */
  focusAny(): void {
    if (this.$isOpened) {
      this.$refClose!.disabled = true;
      const isOk = this.focus();
      this.$refClose!.disabled = false;
      !isOk && this.$refClose!.focus();
      // if (document.activeElement !== this.$refClose) {
      //   this.tabIndex = 0;
      //   HTMLElement.prototype.focus.call(this);
      // }
    }
  }

  protected override resetState(): void {
    super.resetState();
    this.$refFade?.remove(); // todo only if last
    this.$refFade = undefined;
    this.isConnected && this._opts.selfRemove && this.remove();
  }

  protected override dispose(): void {
    const bd = document.body;
    bd.classList.remove(this.#ctr.$classOpened); // testCase: on modal.remove > everything must returned to prev state
    !bd.className && bd.removeAttribute("class");
    (this._prevTarget as HTMLElement)?.removeEventListener("click", this._prevTargetClick!);
    super.dispose();
  }
}

customElements.define(tagName, WUPModalElement);

// NiceToHave: handle Ctrl+S, Meta+S for submit & close ???
