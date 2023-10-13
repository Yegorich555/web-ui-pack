import WUPBaseElement from "./baseElement";

export const enum OpenCases {
  /** When $open() is called programmatically */
  onManuallCall,
  /** On init (when appended to layout) */
  onInit,
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
      // todo add details to types.html.json
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

      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        z-index: 9002;
      }
      .${this.$classFade} {
        z-index: 9000;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #0007;
      }`;
  }

  static $defaults: WUP.Modal.Options = {
    // todo placement, selfDestroy
  };

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
  $refFade?: HTMLElement;
  /** Open modal
   * @returns Promise resolved by animation-end */
  $open(): Promise<boolean> {
    return this.goOpen(OpenCases.onManuallCall);
  }

  #whenClose?: Promise<any>;
  $close(): Promise<boolean> {
    return this.goClose(CloseCases.onManuallCall, null);
  }

  protected override gotRender(): void {
    this.tabIndex = -1; // WA: to allow scroll modal
    this.role = "dialog";
    this.setAttribute("aria-modal", true); // WARN for old readers it doesn't work and need set aria-hidden to all content around modal
  }

  protected override gotChanges(propsChanged: string[] | null): void {
    !propsChanged && this.goOpen(OpenCases.onInit); // call here to wait options
  }

  /** Hide modal. @openCase as reason of open() */
  protected goOpen(openCase: OpenCases): Promise<boolean> {
    if (this.#whenOpen) {
      return this.#whenOpen;
    }
    const e = this.fireEvent("$willOpen", { cancelable: true, detail: { openCase } });
    if (e.defaultPrevented) {
      this.setAttribute("aria-hidden", true);
      return Promise.resolve(false);
    }
    this.#whenClose = undefined;
    this.#isClosing = undefined;
    this.#isOpened = true;

    this.removeAttribute("aria-hidden");
    document.body.classList.add(this.#ctr.$classOpened); // todo so possible to hide scroll-bars
    this.$refFade = document.body.appendChild(document.createElement("div"));
    this.$refFade.className = this.#ctr.$classFade;

    const header = this.querySelector("h1,h2,h3,h4,h5,h6,[role=heading]");
    if (!header) {
      console.error("WA: header missed. Add <h1>..<h6> or role='heading' to modal content");
    } else {
      header.id ??= this.#ctr.$uniqueId;
      this.setAttribute("aria-labelledby", header.id);
    }

    this.#isOpening = true;
    this.#whenOpen = new Promise((res) => {
      if (!this.#whenOpen) {
        res(false); // possible when call $close during the opening
        return;
      }
      // todo listen for clicks to close
      // todo animation here
      this.#isOpening = undefined;
      res(true);
      setTimeout(() => this.fireEvent("$open"));
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

    this.#whenOpen = undefined;
    this.#isOpening = undefined;
    this.#isClosing = true;
    this.#whenClose = new Promise((res) => {
      if (!this.#whenClose) {
        res(false); // possible when call $open during the hiding
        return;
      }
      // todo animation here
      this.clearState();
      delete this.$refFade;
      this.#isOpened = false;
      this.#isClosing = undefined;
      res(true);
      setTimeout(() => this.fireEvent("$close")); // todo add option 'selfDestroy' to remove self by close
    });
    return this.#whenClose;
  }

  protected override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearState();
  }

  /** Rollback classes/focus to state before modal is opened */
  protected clearState(): void {
    this.$refFade?.remove();
    document.body.classList.remove(this.#ctr.$classOpened); // testCase: on modal.remove everythin must returned to prev state
    // todo try to move focus back to actor
  }
}

customElements.define(tagName, WUPModalElement);

/*  todo WA
  1. Autofocus: true by default
  2. Hide scroll on the body
  4. On close return focus back but element can be missed: So need to store id, classNames and any selectors to find such item in the future
  5. Cycling tab + shift-tab inside
  6. Close by $close, outsideClick, btnClose click, Esc

  7. Ctrl+S, Meta+S submit & close ???

  modal placement top/center/left/right
  Remove modal margins and borders for small screens
*/
// todo update other popup z-indexes to be less than modal
