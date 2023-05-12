import onEvent, { onEventType } from "../helpers/onEvent";
import onFocusGot from "../helpers/onFocusGot";
import onFocusLost from "../helpers/onFocusLost";
import { focusFirst } from "../indexHelpers";
import { HideCases, ShowCases } from "./popupElement.types";
// todo popup must be always closed by focusout & Esc if it wasn't prevented

interface Options {
  target: Element;
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
  /** Events that must be added on show; Should return removeCallbacks/onHideCallbacks */
  onShowCallbacks: Array<() => () => void> = [];
  onHideCallbacks: Array<() => void> = [];
  onRemoveCallbacks: Array<() => void> = [];

  async show(showCase: ShowCases, e?: MouseEvent | FocusEvent): Promise<void> {
    if (this.openedEl || this.isShowing) {
      return;
    }
    this.isShowing = true;
    this.#lastActive = document.activeElement;
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
      setTimeout(() => this.openedEl && this.onShowCallbacks.forEach((f) => this.onHideCallbacks.push(f())));
    }
  }

  onHideRef(): void {
    this.onHideCallbacks.forEach((f) => f());
    this.onHideCallbacks.length = 0;
  }

  stopListen(): void {
    this.openedEl = null;
    this.onRemoveCallbacks.forEach((f) => f());
    this.onRemoveCallbacks.length = 0;
    this.onHideRef();
    this.onShowCallbacks.length = 0;
  }

  async hide(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): Promise<void> {
    this.isShowing && (await this.isShowing); // todo need option how to wait for showing or hide immediately
    if (!this.openedEl || this.isHidding) {
      return;
    }
    const isMeFocused = this.isMe(document.activeElement);
    const was = this.openedEl; // required when user clicks again during the hidding > we need to show in this case
    this.openedEl = null;
    this.onHideRef();
    try {
      this.isHidding = true;
      // console.warn("hidding");
      const isOk = await this.onHide(hideCase, e || null);
      // console.warn("hidden"); // todo we are waiting for hidding
      if (isOk) {
        this.#openedByHover = false;
        // todo during the hidding if we waits user can press Tab and focus goes to popupContent. But it must be prevented

        // case1: popupClick > focus lastActive or target
        // case2: hide & focus in popup > focus lastActive or target
        const needFocusBack = isMeFocused || hideCase === HideCases.onPopupClick;
        if (needFocusBack) {
          const next =
            this.options.target === this.#lastActive || this.includes.call(this.options.target, this.#lastActive)
              ? this.#lastActive
              : this.options.target; // focus target on item inside target if popup was focused
          next !== document.activeElement && focusFirst(next as HTMLElement);
        }
        this.#lastActive = undefined;
      }
      if (!isOk && !this.openedEl) {
        this.openedEl = was; // rollback if onHide was prevented and onShow wasn't called again during the hidding
        this.onShowCallbacks.forEach((f) => this.onHideCallbacks.push(f()));
      }
    } catch (error) {
      Promise.reject(error); // handle error from onHide
    }
    this.isHidding = false;
  }

  appendEvent<K extends keyof HTMLElementEventMap>(
    ...args: Parameters<onEventType<K, HTMLElement | Document>>
  ): () => void {
    const r = onEvent(...args);
    this.onRemoveCallbacks.push(r);
    return r;
  }

  // add event by popup.onShow and remove by onHide
  onShowEvent<K extends keyof HTMLElementEventMap>(...args: Parameters<onEventType<K, Document | HTMLElement>>): void {
    this.onShowCallbacks.push(() => onEvent(...args)); // todo remove it to avoid extra function
  }

  includes(this: Element, el: unknown): boolean {
    return el instanceof Node && this.contains(el);
  }

  isMe(el: unknown): boolean {
    return this.openedEl === this.options.target || this.includes.call(this.openedEl!, el);
  }

  #preventClickAfterFocus?: boolean;
  #wasOutsideClick?: boolean; // fix when labelOnClick > inputOnClick
  handleEventDocument(e: Event): void {
    // eslint-disable-next-line default-case
    switch (e.type) {
      case "focusin":
        if (!this.isMe(e.target)) {
          this.#lastActive = e.target as Element; // case when focus changes inside target
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
    }
  }

  #openedByHover?: ReturnType<typeof setTimeout> | false;
  #debounceClick?: ReturnType<typeof setTimeout>;
  #hoverTimeout?: ReturnType<typeof setTimeout>;

  handleEventTarget(ev: Event): void {
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
            if (!this.options.target.isConnected) {
              return; // possible when target removed via innerHTML
            }
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
        if (!this.openedEl || this.#debounceClick) {
          this.#preventClickAfterFocus = !!(this.options.showCase! & ShowCases.onClick);
          this.show(ShowCases.onFocus, ev as FocusEvent).then(() => {
            if (this.#preventClickAfterFocus) {
              this.appendEvent(document, "pointerdown", () => (this.#preventClickAfterFocus = false), {
                once: true,
                capture: true,
              }); // pointerdown includes touchstart & mousedown
            }
          });
        }
        break;
      case "focusout":
        /* istanbul ignore else - case impossible but better always to check this */
        if (this.openedEl) {
          const e = ev as FocusEvent;
          const isToMe = this.openedEl === document.activeElement || this.openedEl === e.relatedTarget;
          const isToMeInside = !isToMe && this.isMe(document.activeElement || e.relatedTarget);
          !isToMe && !isToMeInside && this.hide(HideCases.onFocusOut, e);
        }
        break;
    }
  }

  /** Last focused element before popup is opened */
  #lastActive?: Element | null;
  listen(): void {
    this.handleEventDocument = this.handleEventDocument.bind(this);
    this.handleEventTarget = this.handleEventTarget.bind(this);

    const opts = this.options as Required<Options>;
    const t = opts.target as HTMLElement;

    this.onShowEvent(document, "focusin", this.handleEventDocument);

    // onClick
    if (opts.showCase & ShowCases.onClick) {
      this.onShowEvent(document, "click", this.handleEventDocument);
      this.appendEvent(t, "click", this.handleEventTarget);
    }

    // onHover
    if (opts.showCase & ShowCases.onHover) {
      this.appendEvent(t, "mouseenter", this.handleEventTarget);
      this.appendEvent(t, "mouseleave", this.handleEventTarget); // use only appendEvent; with onShowEvent it doesn't work properly (because filtered by timeout)
      // todo simplify onShowCallbacks to single one
      this.onShowCallbacks.push(() => onEvent(this.openedEl as HTMLElement, "mouseenter", this.handleEventTarget));
      this.onShowCallbacks.push(() => onEvent(this.openedEl as HTMLElement, "mouseleave", this.handleEventTarget));
    }

    // onFocus
    if (opts.showCase & ShowCases.onFocus) {
      this.onRemoveCallbacks.push(onFocusGot(t, this.handleEventTarget, { debounceMs: opts.focusDebounceMs }));
      this.onShowCallbacks.push(() => onFocusLost(t, this.handleEventTarget, { debounceMs: opts.focusDebounceMs }));
      // isAlreadyFocused
      const a = document.activeElement;
      if (a === t || t.contains(a)) {
        this.handleEventTarget(new FocusEvent("focusin"));
        this.#preventClickAfterFocus = false;
      }
    }
  }
}
