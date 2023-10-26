import WUPBaseElement, { AttributeMap, AttributeTypes } from "./baseElement";
import focusFirst from "./helpers/focusFirst";
import { parseMsTime } from "./helpers/styleHelpers";
import { WUPcssScrollSmall } from "./styles";

export const enum OpenCases {
  /** When $open() is called programmatically */
  onManuallCall,
  /** On init (when appended to layout) */
  onInit,
  /** When click on target @see {@link WUP.Modal.Options.target} */
  onTargetClick,
}

export const enum CloseCases {
  /** When $close() is called programmatically */
  onManuallCall,
  /** When was click outside modal */
  onOutsideClick,
  /** When was click on button[close] */
  onCloseClick,
  /** When user pressed Escape button */
  onPressEsc,
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
      /** Autofocus first possible content with skipping focus on button[close] if there is another focusable content
       * Point `false` to autofocus on button[close].
       * If you don't need any visual focus by default override method focus() and call `HTMLElement.prototype.focus.call(this)` to focus modal-box itself
       * @defaultValue true */
      autoFocus: boolean;
      // todo modalInModal: replace OR overflow
    }
    interface EventMap extends WUP.Base.EventMap {
      /** Fires before show is happened;
       * @tutorial rules
       * * can be prevented via `e.preventDefault()` */
      $willOpen: CustomEvent<OpenCases>;
      /** Fires after element is shown (after animation finishes) */
      $open: Event;
      /** Fires before hide is happened;
       * @tutorial rules
       * * can be prevented via `e.preventDefault()` */
      $willClose: CustomEvent<CloseCases>;
      /** Fires after element is hidden (after animation finishes) */
      $close: Event;
    }
    interface JSXProps<T = WUPModalElement> extends WUP.Base.JSXProps<T>, WUP.Base.OnlyNames<Options> {
      /** QuerySelector to find target - element that modal need to listen for click. If `target` missed modal will be opened on init
       * @tutorial rules
       * * point 'prev' to select previousSibling */
      "w-target"?: string;
      "w-placement"?: Options["placement"];
      "w-autoFocus"?: boolean | "";
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willOpen') instead */
      onWillOpen?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$open') instead */
      onOpen?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willClose') instead */
      onWillClose?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$close') instead */
      onClose?: never;
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
> extends WUPBaseElement<TOptions, Events> {
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
        --modal-anim: var(--modal-anim-t) cubic-bezier(0, 0, 0.2, 1) 0ms;
        z-index: 9002;
        display: none;
        position: fixed;
        width: 100%;
        max-width: 600px;
        min-height: 150px;
        border-radius: var(--border-radius);
        color: var(--modal-text);
        background: var(--modal-bg);
        border: 1px solid #0002;
        padding: var(--base-margin);
        box-sizing: border-box;
        opacity: 0;
        white-space: pre-line;
        overflow: auto;
        overflow: overlay;
        user-select: none;
        pointer-events: none;
        touch-action: none;
        outline: none;
      }
      ${WUPcssScrollSmall(":host")}
      :host[open] {
        display: block;
        user-select: initial;
        pointer-events: initial;
        touch-action: initial;
       }
      :host[show] { opacity: 1; }
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
      @media not all and (prefers-reduced-motion) {
        :host,
        .${this.$classFade} {
          transition: opacity var(--modal-anim), transform var(--modal-anim);
        }
      }`;
  }

  static $defaults: WUP.Modal.Options = {
    target: null,
    placement: "center",
    autoFocus: true,
    // todo selfDestroy
  };

  static get mappedAttributes(): Record<string, AttributeMap> {
    const m = super.mappedAttributes;
    m.target = { type: AttributeTypes.selector };
    return m;
  }

  #isOpened = false;
  /** Returns if modal is open (before show-animation started)
   * @tutorial Troubleshooting
   * * stack: $open() > `$isOpened:true` > opening > opened
   * * stack: $close() > closing > closed > `$isOpened:false`
   * * to listen to animation-end use events `$open` & `$close` OR methods `$open().then(...)` & `$close().then(... )` */
  get $isOpened(): boolean {
    return this.#isOpened;
  }

  #isOpening?: true;
  /** Returns if modal is opening (only if animation enabled) */
  get $isOpening(): boolean {
    return this.#isOpening === true;
  }

  /** Returns if modal is closed (after hide-animation finished)
   * @tutorial Troubleshooting
   * * stack: $open() > `$isOpened:true` > opening > opened
   * * stack: $close() > closing > closed > `$isOpened:false`
   * * to listen to animation-end use events `$open` & `$close` OR methods `$open().then(...)` & `$close().then(... )` */
  get $isClosed(): boolean {
    return !this.#isOpened && !this.#isClosing;
  }

  #isClosing?: true;
  /** Returns if modal is opening (only if animation enabled) */
  get $isClosing(): boolean {
    return this.#isClosing === true;
  }

  /** Fires before show is happened;
   * @tutorial rules
   * * can be prevented via `e.preventDefault()` */
  $onWillOpen?: (e: CustomEvent<OpenCases>) => void;
  /** Fires after element is shown (after animation finishes) */
  $onOpen?: (e: Event) => void;
  /** Fires before hide is happened;
   * @tutorial rules
   * * can be prevented via `e.preventDefault()` */
  $onWillClose?: (e: CustomEvent<CloseCases>) => void;
  /** Fires after element is hidden (after animation finishes) */
  $onClose?: (e: Event) => void;

  #whenOpen?: Promise<any>;
  /** Open modal
   * @returns Promise resolved by animation-end */
  $open(): Promise<boolean> {
    return this.goOpen(OpenCases.onManuallCall);
  }

  #whenClose?: Promise<any>;
  $close(): Promise<boolean> {
    return this.goClose(CloseCases.onManuallCall, null);
  }

  /** Reference to fade element */
  $refFade?: HTMLElement;
  /** Reference to button[close] */
  $refClose?: HTMLButtonElement;

  protected override gotRender(): void {
    /** empty because component is hidden by default and need to focus on speed of init-phase */
  }

  _prevTarget?: Element | null;
  _prevTargetClick?: () => void;

  protected override gotReady(): void {
    super.gotReady();
    this._willFocus && clearTimeout(this._willFocus);
    delete this._willFocus; // prevent default autofocus behavior since here need to use it only on open
  }

  protected override gotChanges(propsChanged: string[] | null): void {
    super.gotChanges(propsChanged);

    const trg = this._opts.target;
    const isTrgChange = this._prevTarget !== trg;
    if (isTrgChange) {
      this._prevTarget?.removeEventListener("click", this._prevTargetClick!);
      this._prevTarget = trg;
    }

    if (!trg) {
      !propsChanged && this.goOpen(OpenCases.onInit); // call here to wait for options before opening
    } else if (isTrgChange) {
      this._prevTargetClick = (): void => {
        this.goOpen(OpenCases.onTargetClick);
      };
      trg.addEventListener("click", this._prevTargetClick);
    }
  }

  /** Id of last focused item on item itself */
  _lastFocused?: Element | string | null;
  /** Hide modal. @openCase as reason of open() */
  protected goOpen(openCase: OpenCases): Promise<boolean> {
    if (this.#whenOpen) {
      return this.#whenOpen;
    }
    const e = this.fireEvent("$willOpen", { cancelable: true, detail: { openCase } });
    if (e.defaultPrevented) {
      return Promise.resolve(false);
    }
    // store id of focused element
    const ael = document.activeElement;
    this._lastFocused = ael?.id || ael;

    // clear state
    this.#whenClose = undefined;
    this.#isClosing = undefined;
    this.#isOpened = true;
    // setup Accesibility attrs
    this.tabIndex = -1; // WA: to allow scroll modal - possible that tabindex: -1 doesn't allow tabbing inside
    this.role = "dialog"; // possible alertdialog for Confirm modal
    this.setAttribute("aria-modal", true); // WARN for old readers it doesn't work and need set aria-hidden to all content around modal
    const header = this.querySelector("h1,h2,h3,h4,h5,h6,[role=heading]");
    if (!header) {
      console.error("WA: header missed. Add <h2>..<h6> or role='heading' to modal content");
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
    this.prepend(this.$refClose);
    // init fade - // todo need to prevent it if prev modal still here
    this.$refFade ??= document.body.appendChild(document.createElement("div"));
    this.$refFade.className = this.#ctr.$classFade;
    this.$refFade.setAttribute("open", "");

    // apply open styles
    this.setAttribute("w-placement", this._opts.placement);
    this.setAttribute("open", "");
    setTimeout(() => {
      this.setAttribute("show", "");
      this.$refFade?.setAttribute("show", "");
    });
    document.body.classList.add(this.#ctr.$classOpened); // to maybe hide scroll-bars

    // listen for close-events
    this.$refClose.onclick = (ev) => this.goClose(CloseCases.onCloseClick, ev);
    this.$refFade.onclick = (ev) => this.goClose(CloseCases.onOutsideClick, ev);
    // this.appendEvent(this, "focusout", (ev) => this.gotFocusOut(ev), { passive: false });
    this.appendEvent(this, "keydown", (ev) => this.gotKeyDown(ev), { passive: false });

    this._opts.autoFocus ? this.focusAny() : this.focus(); // bug: FF doesn't adjust suggest-popup according to animation
    this.scroll({ left: 0, top: 0, behavior: "instant" });

    // wait for animation
    this.#isOpening = true;
    this.#whenOpen = new Promise((res) => {
      const animTime = parseMsTime(getComputedStyle(this).transitionDuration);
      setTimeout(() => {
        if (!this.#whenOpen) {
          res(false); // possible when call $close during the opening
          return;
        }

        this.#isOpening = undefined;
        res(true);
        setTimeout(() => this.fireEvent("$open"));
      }, animTime);
    });
    return this.#whenOpen;
  }

  /** Hide modal. @closeCase as reason of close() */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  goClose(closeCase: CloseCases, ev: MouseEvent | KeyboardEvent | null): Promise<boolean> {
    // todo need confirm window if user has unsaved changes
    if (this.#whenClose) {
      return this.#whenClose;
    }
    const e = this.fireEvent("$willClose", { cancelable: true, detail: { closeCase } });
    if (e.defaultPrevented) {
      return Promise.resolve(false);
    }
    // clear state
    this.#whenOpen = undefined;
    this.#isOpening = undefined;
    this.#isClosing = true;
    // remove events
    this.$refClose!.onclick = null;
    this.$refFade!.onclick = null;
    super.dispose(); // remove only events WARN: don't call this.dispose()!
    // apply animation
    document.body.classList.remove(this.#ctr.$classOpened); // testCase: on modal.remove everythin must returned to prev state
    !document.body.className && document.body.removeAttribute("class");
    this.removeAttribute("show");
    this.$refFade!.removeAttribute("show"); // todo only if last

    this.#whenClose = new Promise((res) => {
      const animTime = parseMsTime(getComputedStyle(this).transitionDuration);
      setTimeout(() => {
        if (!this.#whenClose) {
          res(false); // possible when call $open during the hiding
          return;
        }

        this.dispose();
        // this.remove(); // todo only if self-destroy enabled
        res(true);
        setTimeout(() => this.fireEvent("$close"));
      }, animTime);
    });

    this.focusBack();
    return this.#whenClose;
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
    switch (e.key) {
      case "Escape":
        if (!e.defaultPrevented) {
          e.preventDefault();
          // todo it works together on control where Escape clears input
          this.goClose(CloseCases.onPressEsc, e);
        }
        break;
      case "Tab": {
        if (!e.altKey && !e.ctrlKey && !e.metaKey) {
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
        }
        break;
      }
      default:
        break;
    }
  }

  focus(): boolean {
    if (!this.$isOpened) {
      return false;
    }
    return super.focus();
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

  protected override dispose(): void {
    document.body.classList.remove(this.#ctr.$classOpened); // testCase: on modal.remove > everything must returned to prev state
    !document.body.className && document.body.removeAttribute("class");
    this.removeAttribute("open");
    this.$refFade?.remove(); // todo only if last
    this.$refFade = undefined;
    this.#isOpened = false;
    this.#isClosing = undefined;
    this.#isOpening = undefined;
    this.#whenClose = undefined;
    this.#whenOpen = undefined;
    super.dispose();
  }
}

customElements.define(tagName, WUPModalElement);

// NiceToHave: handle  Ctrl+S, Meta+S for submit & close ???

// testcase: add modal with target and remove after 100ms  expected 0 exceptions
// testcase: close on Escape + when control is in edit mode + when dropdown is opened
