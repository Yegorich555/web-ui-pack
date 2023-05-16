import { KeyboardEvent } from "react";
import onFocusGot from "../helpers/onFocusGot";
import onFocusLost from "../helpers/onFocusLost";
import { focusFirst, onEvent } from "../indexHelpers";
import { HideCases, ShowCases } from "./popupElement.types";

interface Options {
  target: HTMLElement | SVGElement;
  showCase?: ShowCases;
  hoverShowTimeout?: number;
  hoverHideTimeout?: number;
  focusDebounceMs?: number;
}

/** Listen for target according to showCase. If target removed call stopListen + don't forget to remove popup yourself;
 * @tutorial Troubleshooting/rules:
 * * To allow user hide/show popup before previous action is ended provide for onShow and onHide-
 *   callbacks results as fast as it's possible without waiting for animation */
export default class PopupListener {
  static $defaults = {
    showCase: ShowCases.onClick,
    hoverShowTimeout: 200,
    hoverHideTimeout: 500,
  };

  constructor(
    public options: Options,
    public onShow: (
      showCase: ShowCases,
      ev: MouseEvent | FocusEvent | null
    ) => HTMLElement | null | Promise<HTMLElement | null>,
    public onHide: (hideCase: HideCases, ev: MouseEvent | FocusEvent | null) => boolean | Promise<boolean>
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
  isShowing?: boolean | Promise<unknown>; // required to prevent infinite-calling from parent
  isHidding?: boolean | Promise<unknown>; // required to prevent infinite-calling from parent

  /** Called on show */
  async show(showCase: ShowCases, e?: MouseEvent | FocusEvent): Promise<void> {
    if (this.openedEl || this.isShowing || !this.options.target.isConnected) {
      return;
    }
    this.isShowing = true;
    this.#lastActive = document.activeElement as HTMLElement | SVGElement;
    // eslint-disable-next-line no-async-promise-executor
    this.isShowing = new Promise<void>(async (res, rej) => {
      try {
        this.openedEl = await this.onShow(showCase, e || null);
        res();
      } catch (err) {
        rej(err);
      }
    }).finally(() => (this.isShowing = false));
    await this.isShowing;
    // timeout required to avoid immediate hide by bubbling events to root
    if (this.openedEl) {
      setTimeout(() => this.openedEl && this.listenOnShow());
    }
  }

  /** Called on hide */
  async hide(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): Promise<void> {
    this.isShowing && (await this.isShowing);
    if (!this.openedEl || this.isHidding) {
      return;
    }
    this.disposeOnHide();
    const was = this.openedEl; // required when user clicks again during the hidding > we need to show in this case
    this.openedEl = null;
    try {
      this.isHidding = true;
      // console.warn("hidding");
      // todo hideCase on popupClick must focus target immediately or don't wait for hideAnimation
      // prevent focusing popupContent during the hiding
      const r = onEvent(was as HTMLElement, "focusin", ({ relatedTarget }) => {
        this.focusBack(relatedTarget); // WARN: it returns focus to target but better move focus forward - but it's impossible
      });
      const isOk = await this.onHide(hideCase, e || null);
      r();
      // console.warn("hidden"); // todo we are waiting for hidding for real popup: fix this in popup
      if (isOk) {
        this.#openedByHover = false;
        // case1: popupClick > focus lastActive or target
        // case2: hide & focus in popup > focus lastActive or target
        const isMeFocused = this.isMe(document.activeElement, was);
        const needFocusBack = isMeFocused || hideCase === HideCases.onPopupClick;
        needFocusBack && this.focusBack(null);
        this.#lastActive = undefined;
      }
      if (!isOk && !this.openedEl) {
        this.openedEl = was; // rollback if onHide was prevented and onShow wasn't called again during the hidding
        this.listenOnShow();
      }
    } catch (error) {
      Promise.reject(error); // handle error from onHide
    }
    this.isHidding = false;
  }

  /** Returns focus back during the hidding */
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
            this.hide(HideCases.onPopupClick, e as MouseEvent);
          } else {
            this.hide(HideCases.onOutsideClick, e as MouseEvent);
            this.#wasOutsideClick = true;
            setTimeout(() => (this.#wasOutsideClick = false), 50);
          }
        }
        break;
      case "keydown":
        if ((e as unknown as KeyboardEvent).key === "Escape") {
          this.hide(HideCases.onPressEsc, e as MouseEvent);
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
            this.#preventClickAfterFocus = false; // test-case: focus without click > show....click programatically on target > it should hide
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
            ? this.hide(this.isMe(e.target) ? HideCases.onPopupClick : HideCases.onTargetClick, e)
            : this.show(ShowCases.onClick, e);
          // fix when labelOnClick > inputOnClick > inputOnFocus
          this.#debounceClick = setTimeout(() => (this.#debounceClick = undefined), 1);
        }
        break;
      case "mouseenter":
        this.#hoverTimeout && clearTimeout(this.#hoverTimeout);
        if (!this.openedEl) {
          this.#hoverTimeout = setTimeout(() => {
            this.#openedByHover && clearTimeout(this.#openedByHover);
            this.#openedByHover = setTimeout(() => (this.#openedByHover = false), 300); // allow hide by click when shown by hover (300ms to prevent unexpected click & hover colision)
            this.show(ShowCases.onHover, ev as MouseEvent);
          }, this.options.hoverShowTimeout);
        }
        break;
      case "mouseleave":
        this.#hoverTimeout && clearTimeout(this.#hoverTimeout);
        if (this.openedEl) {
          this.#hoverTimeout = setTimeout(() => {
            this.#openedByHover && clearTimeout(this.#openedByHover);
            this.#openedByHover = false;
            this.hide(HideCases.onMouseLeave, ev as MouseEvent);
          }, this.options.hoverHideTimeout);
        }
        break;
      case "focusin":
        if (!this.openedEl && !this.#preventFocusEvent && !this.#openedByHover) {
          this.#preventClickAfterFocus = !!(this.options.showCase! & ShowCases.onClick);
          this.show(ShowCases.onFocus, ev as FocusEvent).then(() => {
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
          !isToMe && !isToTarget && this.hide(HideCases.onFocusOut, e);
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

    const { target: t, showCase } = this.options as Required<Options>;

    if (showCase & ShowCases.onClick) {
      t.addEventListener("click", this.handleEvents, this.#defargs);
    }
    if (showCase & ShowCases.onHover) {
      t.addEventListener("mouseenter", this.handleEvents, this.#defargs);
      t.addEventListener("mouseleave", this.handleEvents, this.#defargs); // use only appendEvent; with onShowEvent it doesn't work properly (because filtered by timeout)
    }
    if (showCase & ShowCases.onFocus) {
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

  /** Called to add extra events when show */
  listenOnShow(): void {
    const el = this.openedEl as HTMLElement;
    document.addEventListener("focusin", this.handleEventsDocument, this.#defargs);
    document.addEventListener("keydown", this.handleEventsDocument, this.#defargs);

    const { target: t, showCase } = this.options as Required<Options>;
    if (showCase & ShowCases.onClick) {
      document.addEventListener("click", this.handleEventsDocument, this.#defargs);
    }
    if (showCase & ShowCases.onHover) {
      el.addEventListener("mouseenter", this.handleEvents, this.#defargs);
      el.addEventListener("mouseleave", this.handleEvents, this.#defargs);
    }
    // if (showCase & ShowCases.onFocus) {
    // WARN: use focusLost forever for accessibility purpose
    this.#disposeFocusLost = onFocusLost(t as HTMLElement, this.handleEvents, {
      debounceMs: this.options.focusDebounceMs,
    });
    this.#disposeFocusLost2 = onFocusLost(el, this.handleEvents, {
      debounceMs: this.options.focusDebounceMs,
    });
    // }
  }

  /** Called to remove extra events when hide */
  disposeOnHide(): void {
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
    this.disposeOnHide();
    const t = this.options.target;
    t.removeEventListener("click", this.handleEvents, this.#defargs);
    t.removeEventListener("mouseenter", this.handleEvents, this.#defargs);
    t.removeEventListener("mouseleave", this.handleEvents, this.#defargs);
    this.#disposeFocus?.call(this);
    this.openedEl = null;
  }
}
