import onFocusGot from "../helpers/onFocusGot";
import onFocusLost from "../helpers/onFocusLost";
import { focusFirst, onEvent } from "../indexHelpers";
import { PopupCloseCases, PopupOpenCases } from "./popupElement.types";

export interface PopupListenerOptions {
  target: HTMLElement | SVGElement;
  openCase?: PopupOpenCases;
  hoverOpenTimeout?: number;
  hoverCloseTimeout?: number;
  focusDebounceMs?: number;
}

/** Listen for target according to openCase. If target removed call stopListen + don't forget to remove popup yourself;
 * @tutorial Troubleshooting/rules:
 * * To allow user close/open popup before previous action is ended provide for onOpen and onClose-
 *   callbacks results as fast as it's possible without waiting for animation */
export default class PopupListener {
  static $defaults = {
    openCase: PopupOpenCases.onClick,
    hoverOpenTimeout: 200,
    hoverCloseTimeout: 500,
  };

  constructor(
    public options: PopupListenerOptions,
    public onOpen: (
      openCase: PopupOpenCases,
      ev: MouseEvent | FocusEvent | null
    ) => HTMLElement | null | Promise<HTMLElement | null>,
    public onClose: (
      closeCase: PopupCloseCases,
      ev: MouseEvent | FocusEvent | KeyboardEvent | null
    ) => boolean | Promise<boolean>
  ) {
    this.options = { ...PopupListener.$defaults, ...options };
    const t = this.options.target;
    if (!(t instanceof HTMLElement)) {
      throw new Error("WUP-Popup. Target is required");
    }
    if (!t.isConnected) {
      throw new Error("WUP-Popup. Target must be appended to layout");
    }
    this.listen();
  }

  openedEl: Element | null = null;
  isOpening?: boolean | Promise<unknown>; // required to prevent infinite-calling from parent
  isClosing?: boolean | Promise<unknown>; // required to prevent infinite-calling from parent

  /** Called on open */
  async open(openCase: PopupOpenCases, e: MouseEvent | FocusEvent | null): Promise<void> {
    if (this.openedEl || this.isOpening || !this.options.target.isConnected) {
      return;
    }
    this.isOpening = true;
    this.#lastActive = document.activeElement as HTMLElement | SVGElement;
    // eslint-disable-next-line no-async-promise-executor
    this.isOpening = new Promise<void>(async (res, rej) => {
      try {
        this.openedEl = await this.onOpen(openCase, e);
        res();
      } catch (err) {
        rej(err);
      }
    }).finally(() => (this.isOpening = false));
    await this.isOpening;
    // timeout required to avoid immediate close by bubbling events to root
    if (this.openedEl) {
      setTimeout(() => this.openedEl && this.listenOnOpen());
    }
  }

  /** Called on close */
  async close(closeCase: PopupCloseCases, e: MouseEvent | FocusEvent | KeyboardEvent | null): Promise<void> {
    this.isOpening && (await this.isOpening);
    if (!this.openedEl || this.isClosing) {
      return;
    }
    this.disposeOnClose();
    const was = this.openedEl; // required when user clicks again during the hiding > we need to open in this case
    this.openedEl = null;
    try {
      this.isClosing = true;
      // prevent focusing popupContent during the hiding
      const r = onEvent(was as HTMLElement, "focusin", ({ relatedTarget }) => {
        this.focusBack(relatedTarget); // WARN: it returns focus to target but better move focus forward - but it's impossible
      });
      const isOk = await this.onClose.call(was, closeCase, e || null);
      r();
      if (isOk) {
        this.#openedByHover = false;
        // case1: popupClick > focus lastActive or target
        // case2: close & focus in popup > focus lastActive or target
        const isMeFocused = this.isMe(document.activeElement, was);
        const needFocusBack = isMeFocused || closeCase === PopupCloseCases.onPopupClick;
        needFocusBack && this.focusBack(null);
        this.#lastActive = undefined;
      }
      if (!isOk && !this.openedEl) {
        this.openedEl = was; // rollback if onClose was prevented and onOpen wasn't called again during the hiding
        this.listenOnOpen();
      }
    } catch (error) {
      Promise.reject(error); // handle error from onClose
    }
    this.isClosing = false;
  }

  /** Returns focus back during the hiding */
  focusBack(relatedTarget: Element | EventTarget | { focus: () => void } | null): void {
    this.#preventFocusEvent = true;
    const t = this.options.target;
    const el =
      (relatedTarget as HTMLElement) ||
      (t === this.#lastActive || this.includes.call(t, this.#lastActive) ? this.#lastActive! : t); // focus target on item inside target if popup was focused;
    el !== document.activeElement && focusFirst(el);
    this.#preventFocusEvent = false;
  }

  /** Returns whether el is part of another  */
  includes(this: Element, el: unknown): boolean {
    return el instanceof Node && this.contains(el);
  }

  /** Returns whether element if part of openedElement */
  isMe(el: unknown, openedEl = this.openedEl): boolean {
    return openedEl === el || this.includes.call(openedEl!, el);
  }

  #preventFocusEvent?: boolean;
  #preventClickAfterFocus?: boolean;
  #wasOutsideClick?: boolean; // fix when labelOnClick > inputOnClick
  /** Single event handler */
  handleEventsDocument(e: Event): void {
    if (e.defaultPrevented) {
      return;
    }
    // eslint-disable-next-line default-case
    switch (e.type) {
      case "focusin":
        if (!this.isMe(e.target)) {
          this.#lastActive = e.target as HTMLElement; // case when focus changes inside target
        }
        break;
      case "click":
        {
          this.#preventClickAfterFocus = false; // mostly it doesn't make sense but maybe it's possible
          // filter click from target because we have target event for this
          const isTarget = this.includes.call(this.options.target, e.target);
          if (isTarget) {
            return;
          }
          if (this.isMe(e.target)) {
            this.close(PopupCloseCases.onPopupClick, e as MouseEvent);
          } else {
            this.close(PopupCloseCases.onOutsideClick, e as MouseEvent);
            this.#wasOutsideClick = true;
            setTimeout(() => (this.#wasOutsideClick = false), 50);
          }
        }
        break;
      case "keydown":
        if ((e as unknown as KeyboardEvent).key === "Escape") {
          this.close(PopupCloseCases.onPressEsc, e as MouseEvent);
        }
        break;
    }
  }

  #openedByHover?: ReturnType<typeof setTimeout> | false;
  #debounceClick?: ReturnType<typeof setTimeout>;
  #hoverTimeout?: ReturnType<typeof setTimeout>;

  /** Single event handler */
  handleEvents(ev: Event): void {
    if (ev.defaultPrevented) {
      return;
    }
    // eslint-disable-next-line default-case
    switch (ev.type) {
      case "click":
        {
          const e = ev as MouseEvent;
          if (!e.pageX) {
            // pageX is null or 0 if it was called programmatically
            this.#preventClickAfterFocus = false; // test-case: focus without click > open....click programatically on target > it should close
          }
          const skip =
            this.#preventClickAfterFocus ||
            this.#debounceClick ||
            this.#wasOutsideClick ||
            this.#openedByHover ||
            // e.detail >= 2 || // it's double-click
            e.button; // it's not left-click
          if (skip) {
            return;
          }
          // popupClick possible when popup inside target
          this.openedEl
            ? this.close(this.isMe(e.target) ? PopupCloseCases.onPopupClick : PopupCloseCases.onTargetClick, e)
            : this.open(PopupOpenCases.onClick, e);
          // fix when labelOnClick > inputOnClick > inputOnFocus
          this.#debounceClick = setTimeout(() => (this.#debounceClick = undefined), 1);
        }
        break;
      case "mouseenter":
        this.#hoverTimeout && clearTimeout(this.#hoverTimeout);
        if (!this.openedEl) {
          this.#hoverTimeout = setTimeout(() => {
            this.#openedByHover && clearTimeout(this.#openedByHover);
            this.#openedByHover = setTimeout(() => (this.#openedByHover = false), 300); // allow close by click when opened by hover (300ms to prevent unexpected click & hover colision)
            this.open(PopupOpenCases.onHover, ev as MouseEvent);
          }, this.options.hoverOpenTimeout);
        }
        break;
      case "mouseleave":
        this.#hoverTimeout && clearTimeout(this.#hoverTimeout);
        if (this.openedEl) {
          this.#hoverTimeout = setTimeout(() => {
            this.#openedByHover && clearTimeout(this.#openedByHover);
            this.#openedByHover = false;
            this.close(PopupCloseCases.onMouseLeave, ev as MouseEvent);
          }, this.options.hoverCloseTimeout);
        }
        break;
      case "focusin":
        if (!this.openedEl && !this.#preventFocusEvent && !this.#openedByHover) {
          this.#preventClickAfterFocus = !!(this.options.openCase! & PopupOpenCases.onClick);
          this.open(PopupOpenCases.onFocus, ev as FocusEvent).then(() => {
            if (this.#preventClickAfterFocus) {
              // WARN: event is self-destroyed on 1st event so not required to dispose it
              document.addEventListener("pointerdown", () => (this.#preventClickAfterFocus = false), {
                once: true,
                capture: true,
                passive: true,
              }); // pointerdown includes touchstart & mousedown
            }
          });
        }
        break;
      case "focusout":
        /* istanbul ignore else - case impossible but better always to check this */
        if (this.openedEl) {
          const e = ev as FocusEvent;
          const next = e.relatedTarget || document.activeElement;
          const isToMe = this.isMe(next);
          const t = this.options.target;
          const isToTarget = t === next || this.includes.call(t, next);
          !isToMe && !isToTarget && this.close(PopupCloseCases.onFocusOut, e);
        }
        break;
    }
  }

  /** Last focused element before popup is opened */
  #lastActive?: HTMLOrSVGElement | null;
  #defargs: AddEventListenerOptions = { passive: true };
  #disposeFocus?: () => void;
  #disposeFocusLost?: () => void;
  #disposeFocusLost2?: () => void;
  /** Called on init to apply eventListeners */
  listen(): void {
    this.handleEventsDocument = this.handleEventsDocument.bind(this);
    this.handleEvents = this.handleEvents.bind(this);

    const { target: t, openCase } = this.options as Required<PopupListenerOptions>;

    if (openCase & PopupOpenCases.onClick) {
      t.addEventListener("click", this.handleEvents, this.#defargs);
    }
    if (openCase & PopupOpenCases.onHover) {
      t.addEventListener("mouseenter", this.handleEvents, this.#defargs);
      t.addEventListener("mouseleave", this.handleEvents, this.#defargs); // use only appendEvent; with onOpenEvent it doesn't work properly (because filtered by timeout)
    }
    if (openCase & PopupOpenCases.onFocus) {
      this.#disposeFocus = onFocusGot(t as HTMLElement, this.handleEvents, {
        debounceMs: this.options.focusDebounceMs,
      });
      // isAlreadyFocused
      const a = document.activeElement;
      if (a === t || t.contains(a)) {
        this.handleEvents(new FocusEvent("focusin"));
        this.#preventClickAfterFocus = false;
      }
    }
  }

  /** Called to add extra events when open */
  listenOnOpen(): void {
    const el = this.openedEl as HTMLElement;
    document.addEventListener("focusin", this.handleEventsDocument, this.#defargs);
    document.addEventListener("keydown", this.handleEventsDocument, this.#defargs);

    const { target: t, openCase } = this.options as Required<PopupListenerOptions>;
    if (openCase & PopupOpenCases.onClick) {
      document.addEventListener("click", this.handleEventsDocument, this.#defargs);
    }
    if (openCase & PopupOpenCases.onHover) {
      el.addEventListener("mouseenter", this.handleEvents, this.#defargs);
      el.addEventListener("mouseleave", this.handleEvents, this.#defargs);
    }
    // if (openCase & PopupOpenCases.onFocus) {
    // WARN: use focusLost forever for accessibility purpose
    this.#disposeFocusLost = onFocusLost(t as HTMLElement, this.handleEvents, {
      debounceMs: this.options.focusDebounceMs,
    });
    this.#disposeFocusLost2 = onFocusLost(el, this.handleEvents, {
      debounceMs: this.options.focusDebounceMs,
    });
    // }
  }

  /** Called to remove extra events when close */
  disposeOnClose(): void {
    document.removeEventListener("keydown", this.handleEventsDocument, this.#defargs);
    document.removeEventListener("focusin", this.handleEventsDocument, this.#defargs);
    document.removeEventListener("click", this.handleEventsDocument, this.#defargs);
    this.openedEl?.removeEventListener("mouseenter", this.handleEvents, this.#defargs);
    this.openedEl?.removeEventListener("mouseleave", this.handleEvents, this.#defargs);
    this.#disposeFocusLost?.call(this);
    this.#disposeFocusLost2?.call(this);
  }

  /** Remove all event listeners */
  stopListen(): void {
    this.disposeOnClose();
    const t = this.options.target;
    t.removeEventListener("click", this.handleEvents, this.#defargs);
    t.removeEventListener("mouseenter", this.handleEvents, this.#defargs);
    t.removeEventListener("mouseleave", this.handleEvents, this.#defargs);
    this.#disposeFocus?.call(this);
    this.openedEl = null;
  }
}
