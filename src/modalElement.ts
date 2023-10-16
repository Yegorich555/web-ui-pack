import WUPBaseElement, { AttributeMap, AttributeTypes } from "./baseElement";
import { parseMsTime } from "./helpers/styleHelpers";

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
    // todo add details to types.html.json
    interface Options {
      /** Element that modal need to listen for click. If `target` missed modal will be opened on init
       * @defaultValue null */
      target?: Element | null;
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

// todo prettify example here
/** Popup element
 * @example
 * JS/TS
 * ```js
 * WUPModalElement.$defaults.placement = ...;
 *
 * const el = document.createElement('wup-modal');
 * el.$options.placement = ...;
 * document.body.append(el);
 *```
 * HTML
 * ```html
 * <!-- You can skip pointing attribute 'target' if popup appended after target -->
 * <wup-modal>Some content here</wup-popup>
 * ```
 * @tutorial Troubleshooting:
 * * ...
 */
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

  static get $styleRoot(): string {
    return `:root {
        --modal: inherit;
        --modal-bg: #fff;
        --modal-fade: #0007;
      }
      [wupdark] {
        --modal-bg: #222a36;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        z-index: 9002;
        display: none;
        position: fixed;
        width: 100%;
        max-width: 600px;
        min-height: 150px;
        border-radius: var(--border-radius);
        color: var(--modal);
        background: var(--modal-bg);
        border: 1px solid #0002;
        padding: 1em;
        box-sizing: border-box;
        opacity: 0;
        user-select: none;
        pointer-events: none;
        touch-action: none;
      }
      :host[open] { display: block; }
      :host[show] {
        opacity: 1;
        user-select: initial;
        pointer-events: initial;
        touch-action: initial;
      }
      .${this.$classFade} {
        z-index: 9000;
        display: none;
        position: fixed;
        top:0;left:0;right:0;bottom:0;
        background: var(--modal-fade);
        opacity: 0;
        pointer-events: none;
        touch-action: none;
      }
      .${this.$classFade} { display: block; }
      .${this.$classFade}[show] {
        opacity: 1;
        pointer-events: initial;
        touch-action: initial;
       }
      :host > button[close] {
        --icon-img: var(--wup-icon-cross);
        position: absolute;
        right: 0;
        margin: 0 1em;
      }
      :host h2 {
        padding-right: 1.8em;
      }
      @media not all and (prefers-reduced-motion) {
        :host,
        .${this.$classFade} {
          transition: opacity var(--anim);
        }
      }`;
  }

  static $defaults: WUP.Modal.Options = {
    target: null,
    // todo placement, selfDestroy
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
    /** empty because component is hidden by defaults */
  }

  _prevTarget?: Element | null;
  _prevTargetClick?: () => void;

  protected override gotChanges(propsChanged: string[] | null): void {
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

  /** Hide modal. @openCase as reason of open() */
  protected goOpen(openCase: OpenCases): Promise<boolean> {
    if (this.#whenOpen) {
      return this.#whenOpen;
    }
    const e = this.fireEvent("$willOpen", { cancelable: true, detail: { openCase } });
    if (e.defaultPrevented) {
      return Promise.resolve(false);
    }
    // clear state
    this.#whenClose = undefined;
    this.#isClosing = undefined;
    this.#isOpened = true;
    // setup Accesibility attrs
    this.tabIndex = -1; // WA: to allow scroll modal
    this.role = "dialog"; // todo alertdialog for Confirm modal
    this.setAttribute("aria-modal", true); // WARN for old readers it doesn't work and need set aria-hidden to all content around modal
    // todo implement this.setAttribute("w-placement", this._opts.placement);
    const header = this.querySelector("h1,h2,h3,h4,h5,h6,[role=heading]");
    if (!header) {
      console.error("WA: header missed. Add <h2>..<h6> or role='heading' to modal content");
    } else {
      header.id ??= this.#ctr.$uniqueId;
      this.setAttribute("aria-labelledby", header.id);
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
    this.setAttribute("open", "");
    setTimeout(() => {
      this.setAttribute("show", "");
      this.$refFade!.setAttribute("show", "");
    });
    document.body.classList.add(this.#ctr.$classOpened); // todo maybe hide scroll-bars

    // listen for close-events
    this.$refClose.onclick = (ev) => this.goClose(CloseCases.onCloseClick, ev);
    this.$refFade.onclick = (ev) => this.goClose(CloseCases.onOutsideClick, ev);
    this.appendEvent(
      this,
      "keydown",
      (ev) => {
        ev.key === "Escape" && !ev.defaultPrevented && this.goClose(CloseCases.onPressEsc, ev);
        ev.preventDefault();
      },
      { passive: false }
    );
    this.focus(); // todo skip autofocus on self and for btnClose if possible to focus on another

    // wait for animation
    this.#isOpening = true;
    this.#whenOpen = new Promise((res) => {
      const animTime = parseMsTime(getComputedStyle(this).transitionDuration);
      console.warn(animTime, getComputedStyle(this).transitionDuration);

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
    super.dispose(); // remove only events WARN: don't call this!
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
    return this.#whenClose;
  }

  protected override dispose(): void {
    document.body.classList.remove(this.#ctr.$classOpened); // testCase: on modal.remove everythin must returned to prev state
    this.removeAttribute("open");
    this.$refFade!.remove(); // todo only if last
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

/*  todo WA
  1. Autofocus: true by default
  2. Hide scroll on the body
  4. On close return focus back but element can be missed: So need to store id, classNames and any selectors to find such item in the future
  5. Cycling tab + shift-tab inside

  7. Ctrl+S, Meta+S submit & close ???

  modal placement top/center/left/right
  Remove modal margins and borders for small screens
*/
// todo update other popup z-indexes to be less than modal

// testcase: impossible to close same window 2nd time
