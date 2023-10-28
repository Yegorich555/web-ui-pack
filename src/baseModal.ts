import WUPBaseElement from "./baseElement";
import { parseMsTime } from "./helpers/styleHelpers";
import { WUPcssScrollSmall } from "./styles";

const enum OpenCases {
  /** When $open() is called programmatically */
  onManuallCall = 0,
}

const enum CloseCases {
  /** When $close() is called programmatically */
  onManuallCall = 0,
}

declare global {
  namespace WUP.BaseModal {
    interface Options {}
    interface EventMap<OpenCases = number, CloseCases = number> extends WUP.Base.EventMap {
      /** Fires before opening
       * @tutorial rules
       * * can be prevented via `e.preventDefault()` */
      $willOpen: CustomEvent<{ openCase: OpenCases }>;
      /** Fires after element is opened (after animation ends) */
      $open: Event;
      /** Fires before closing
       * @tutorial rules
       * * can be prevented via `e.preventDefault()` */
      $willClose: CustomEvent<{ closeCase: CloseCases }>;
      /** Fires after element is closed (after animation ends) */
      $close: Event;
    }
    interface JSXProps<T = WUPBaseModal> extends WUP.Base.JSXProps<T>, WUP.Base.OnlyNames<Options> {
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
}

/** Base modal element */
export default abstract class WUPBaseModal<
  TOptions extends WUP.BaseModal.Options = WUP.BaseModal.Options,
  Events extends WUP.BaseModal.EventMap = WUP.BaseModal.EventMap
> extends WUPBaseElement<TOptions, Events> {
  // #ctr = this.constructor as typeof WUPBaseModal;

  static get $style(): string {
    return `${super.$style}
      :host {
        z-index: 8000;
        display: none;
        opacity: 0;
        position: fixed!important;
        border-radius: var(--border-radius);
        padding: var(--base-margin);
        box-sizing: border-box;
        white-space: pre-line;
        overflow: auto;
        overflow: overlay;
      }
      :host[open] { display: block; }
      :host[show] { opacity: 1; }
      ${WUPcssScrollSmall(":host")}`;
  }

  // static $defaults: WUP.BaseModal.Options = {};

  #isOpened = false;
  /** Returns if element is open (before show-animation started)
   * @tutorial Troubleshooting
   * * stack: $open() > `$isOpened:true` > opening > opened
   * * stack: $close() > closing > closed > `$isOpened:false`
   * * to listen to animation-end use events `$open` & `$close` OR methods `$open().then(...)` & `$close().then(... )` */
  get $isOpened(): boolean {
    return this.#isOpened;
  }

  #isOpening?: true;
  /** Returns if element is opening (only if animation enabled) */
  get $isOpening(): boolean {
    return this.#isOpening === true;
  }

  /** Returns if element is closed (after hide-animation finished)
   * @tutorial Troubleshooting
   * * stack: $open() > `$isOpened:true` > opening > opened
   * * stack: $close() > closing > closed > `$isOpened:false`
   * * to listen to animation-end use events `$open` & `$close` OR methods `$open().then(...)` & `$close().then(... )` */
  get $isClosed(): boolean {
    return !this.#isOpened && !this.#isClosing;
  }

  #isClosing?: true;
  /** Returns if element is opening (only if animation enabled) */
  get $isClosing(): boolean {
    return this.#isClosing === true;
  }

  /** Fires before opening
   * @tutorial rules
   * * can be prevented via `e.preventDefault()` */
  $onWillOpen?: (e: Events["$willOpen"]) => void;
  /** Fires after element is opened (after animation ends) */
  $onOpen?: (e: Events["$open"]) => void;
  /** Fires before closing
   * @tutorial rules
   * * can be prevented via `e.preventDefault()` */
  $onWillClose?: (e: Events["$willClose"]) => void;
  /** Fires after element is closed (after animation ends) */
  $onClose?: (e: Events["$close"]) => void;

  #whenOpen?: Promise<any>;
  /** Open element
   * @returns Promise resolved by animation-end ('true' if it finished & wasn't prevented) */
  $open(): Promise<boolean> {
    return this.goOpen(OpenCases.onManuallCall);
  }

  #whenClose?: Promise<boolean>;
  /** Close element
   * @returns Promise resolved by animation-end ('true' if it finished & wasn't prevented) */
  $close(): Promise<boolean> {
    return this.goClose(CloseCases.onManuallCall, null);
  }

  protected override gotReady(): void {
    super.gotReady();
    this._willFocus && clearTimeout(this._willFocus);
    delete this._willFocus; // prevent default autofocus behavior since here need to use it only on open
  }

  // protected override gotChanges(propsChanged: string[] | null): void {
  //   super.gotChanges(propsChanged);
  // }

  /** Implement extra logic on opening */
  abstract gotOpen(openCase: OpenCases | number): void;
  /** Implement extra logic on closing */
  abstract gotClose(closeCase: CloseCases | number, e: Event | null): void;

  /** Hide modal. @openCase as reason of open() */
  protected goOpen(openCase: OpenCases | number): Promise<boolean> {
    if (this.#whenOpen) {
      return this.#whenOpen;
    }
    const e = this.fireEvent("$willOpen", { cancelable: true, bubbles: true, detail: { openCase } });
    if (e.defaultPrevented) {
      return Promise.resolve(false);
    }

    // clear state
    this.#whenClose = undefined;
    this.#isClosing = undefined;
    this.#isOpened = true;
    this.#isOpening = true;
    // apply open styles
    this.setAttribute("open", ""); // apply display effect
    this.gotOpen(openCase);

    setTimeout(() => {
      this.scroll({ left: 0, top: 0, behavior: "instant" }); // scroll at the top: to clear prev possible state
      this.setAttribute("show", ""); // apply show animation
    }); // timeout to allow animation works

    // wait for animation
    this.#whenOpen = new Promise((res) => {
      const animTime = parseMsTime(getComputedStyle(this).transitionDuration);
      setTimeout(() => {
        if (!this.#whenOpen) {
          res(false); // possible when call $close during the opening
          return;
        }

        this.#isOpening = undefined;
        res(true);
        setTimeout(() => this.fireEvent("$open", { cancelable: false, bubbles: true }));
      }, animTime);
    });
    return this.#whenOpen;
  }

  /** Hide element; @closeCase as reason of close() */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  goClose(closeCase: CloseCases | number, ev: Event | null): Promise<boolean> {
    if (this.#whenClose) {
      return this.#whenClose;
    }
    if (!this.#whenOpen) {
      return Promise.resolve(true); // possible when on init $close is called
    }
    const e = this.fireEvent("$willClose", { cancelable: true, bubbles: true, detail: { closeCase } });
    if (e.defaultPrevented) {
      return Promise.resolve(false);
    }
    // clear state
    this.#whenOpen = undefined;
    this.#isOpening = undefined;
    this.#isClosing = true;
    // apply animation
    this.removeAttribute("show");

    this.gotClose(closeCase, ev);

    this.#whenClose = new Promise((res) => {
      const animTime = parseMsTime(getComputedStyle(this).transitionDuration);
      setTimeout(() => {
        if (!this.#whenClose) {
          res(false); // possible when call $open during the hiding
          return;
        }
        this.resetState();
        res(true);
        setTimeout(() => this.fireEvent("$close", { cancelable: false, bubbles: true }));
      }, animTime);
    });

    return this.#whenClose;
  }

  focus(): boolean {
    if (!this.$isOpened) {
      return false;
    }
    return super.focus();
  }

  /* Called to clear current state/vars to init: after gotClose end */
  protected resetState(): void {
    this.removeAttribute("open");
    this.#isOpened = false;
    this.#isClosing = undefined;
    this.#isOpening = undefined;
    this.#whenClose = undefined;
    this.#whenOpen = undefined;
  }

  /* Call it to call baseElement.dispose */
  protected disposeEvents(): void {
    super.dispose();
  }

  protected override dispose(): void {
    this.resetState();
    super.dispose();
  }
}
