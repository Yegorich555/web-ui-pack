import WUPBaseModal from "./baseModal";
import listenSwipe from "./helpers/onSwipe";
import { px2Number } from "./helpers/styleHelpers";

export const enum NotifyOpenCases {
  /** When $open() is called programmatically */
  onManualCall = 0,
  /** On init (when appended to layout/HTML) */
  onInit = 1,
}

export const enum NotifyCloseCases {
  /** When $close() is called programmatically */
  onManualCall = 0,
  /** When was click on button[close] */
  onCloseClick = 1,
  /** When closed according to pointed show-time */
  onTimeEnd,
  /** When swiped out by touch */
  onSwipe,
}

const tagName = "wup-notify";
declare global {
  namespace WUP.Notify {
    interface ShowOptions {
      /** Id of element; if notification with the same id exists then it's refreshed (content updated & closing-time restarted) instead of showing new one
       * @tutorial Troubleshooting
       * * closing (or closed but not removed) notification is re-opened
       * * on refreshing `defaults` are merged with previous options
       * @example
       * WUPNotifyElement.$show({ id: "saving", textContent: "Saving...", defaults: { autoClose: 0 } });
       * WUPNotifyElement.$show({ id: "saving", textContent: "Saved", defaults: { autoClose: 3000 } }); // replaces previous one */
      id?: string;
      /** Message appended to element  */
      textContent: string;
      /** Options to override defaults */
      defaults?: Partial<WUP.Notify.Options>;
      /** Called when element is already rendered; so possible to change innerHTML */
      onRender?: (el: WUPNotifyElement) => void;
      /** Default class that appended to element */
      className?: string;
    }
    interface Options {
      /** Case when need to show;
       * @defaultValue `NotifyOpenCases.onInit` */
      openCase: NotifyOpenCases;
      /** Position on the screen
       * @defaultValue 'bottom-left' */
      placement: "top-left" | "top-middle" | "top-right" | "bottom-left" | "bottom-middle" | "bottom-right";
      /** Type of message: defines icon & colors (rendered as attribute [w-type] for styling)
       * @defaultValue '' (without icon) */
      type: "" | "info" | "success" | "warning" | "error";
      /** Time (ms) after that Notify is closed; if provide `0` then it will be closed only by click event
       *  @defaultValue 5000 (ms) */
      autoClose: number | null | false;
      /** Close on element click
       * @defaultValue false */
      closeOnClick: boolean;
      /** Close on horizontal swipe out (touch & pen) like messages in popular mobile apps:
       * element follows the finger & closes when it's swiped for 40% of width or flung
       * @defaultValue true */
      closeOnSwipe: boolean;
      /** Remove itself after closing
       * @defaultValue true */
      selfRemove: boolean;
      /** Pause on mouse-hover OR touch; AND when autoClose > 0
       * @defaultValue true */
      pauseOnHover: boolean;
      /** Pause when window loses focus
       * @defaultValue true */
      pauseOnWinBlur: boolean;
    }
    interface EventMap extends WUP.BaseModal.EventMap<NotifyOpenCases, NotifyCloseCases> {}
    interface JSXProps extends WUP.BaseModal.JSXProps, WUP.Base.OnlyNames<Options> {
      "w-placement"?: Options["placement"];
      "w-type"?: Options["type"];
      "w-autoClose"?: number | "";
      "w-closeOnClick"?: boolean | "";
      "w-closeOnSwipe"?: boolean | "";
      "w-selfRemove"?: boolean | "";
      "w-pauseOnHover"?: boolean | "";
      "w-pauseOnWinBlur"?: boolean | "";
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPNotifyElement; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /**  Notify element
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/notify}
       *  @see {@link WUPNotifyElement} */
      [tagName]: WUP.Base.ReactHTML<WUPNotifyElement> & WUP.Notify.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /**  Notify element
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/notify}
       *  @see {@link WUPNotifyElement} */
      [tagName]: HTMLAttributes<WUPNotifyElement> & WUP.Notify.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Notify element
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/notify}
 * @example
 * JS/TS
 * ```js
 * WUPNotifyElement.$defaults.placement = ...;
 *
 * const el = document.createElement('wup-notify');
 * el.textContent = ...;
 * document.body.append(el);
 * el.$onClose = () => console.warn("its closed & self removed");
 *```
 * HTML
 * ```html
 * <wup-notify>Some content here</wup-notify>
 * ``` */
export default class WUPNotifyElement<
  TOptions extends WUP.Notify.Options = WUP.Notify.Options,
  Events extends WUP.Notify.EventMap = WUP.Notify.EventMap
> extends WUPBaseModal<TOptions, Events> {
  #ctr = this.constructor as typeof WUPNotifyElement;

  // perfect bg color is: #121212c8
  // WARN: modal-anim shouldn't affect on animation of nested
  static get $styleRoot(): string {
    return "";
  }

  static get $style(): string {
    return super.$style;
  }

  static $defaults: WUP.Notify.Options = {
    openCase: NotifyOpenCases.onInit,
    placement: "bottom-left",
    type: "",
    autoClose: 5000,
    closeOnClick: false,
    closeOnSwipe: true,
    selfRemove: true,
    pauseOnHover: true,
    pauseOnWinBlur: true,
  };

  /** Create & show notification OR refresh existed one with the same `id`
   * @returns created (or refreshed) element
   * @tutorial Troubleshooting
   * * On close notify-element self-removed */
  static $show(opts: WUP.Notify.ShowOptions): WUPNotifyElement {
    const el = opts.id ? document.getElementById(opts.id) : null;
    const prev = el instanceof WUPNotifyElement ? el : null;
    const me: WUPNotifyElement<any, any> = prev ?? document.createElement(tagName);
    opts.className && me.classList.add(opts.className);
    // WARN: _opts instead of $options: otherwise async gotChanges refreshes item twice
    prev || (me._opts.selfRemove = true);
    Object.assign(me._opts, opts.defaults);
    me._opts.openCase = NotifyOpenCases.onInit;
    // render
    me.textContent = opts.textContent;
    opts.id && (me.id = opts.id);
    prev || document.body.appendChild(me); // append to root
    // callback to allow user re-define it
    opts.onRender?.(me); // WARN: onRender called here but real render will be on gotOpen
    prev?.gotRefresh();
    return me;
  }

  /** Reference to button[close] */
  $refClose?: HTMLButtonElement;
  /** Reference to progress bar  */
  $refProgress?: HTMLDivElement;

  /** Pause progress bar & closing by time (if option autoClose is set)
   * @returns ms that left before closing */
  $pause(): number {
    const r = this.#pauseRef;
    if (r && this.#isPlayed) {
      clearTimeout(r.t);
      r.anim?.pause();
      r.left = r.end - Date.now();
    }
    this.#isPlayed = false;
    return r?.left ?? -1;
  }

  #pauseRef?: { anim?: Animation; t: ReturnType<typeof setTimeout>; end: number; left?: number };

  #isPlayed = false;
  /** Returns whether element in play mode and will be closed after a time */
  get $isPlayed(): boolean {
    return this.#isPlayed;
  }

  /** Play/resume progress bar & close/hide by pointed time
   * @param ms time closing; if missed then will be used stored time from $pause OR from $options.autoClose */
  $play(ms?: number | null): void {
    const r = this.#pauseRef;
    clearTimeout(r?.t); // prevent duplicated timers
    ms ||= r?.left ?? (this._opts.autoClose || 0);
    const anim =
      r?.anim ??
      this.$refProgress?.animate([{ transform: "scaleX(100%)" }, { transform: "scaleX(0)" }], {
        fill: "forwards",
        duration: Math.max(0, ms - 100), // less time for more native effect
      });
    anim?.play();
    this.#isPlayed = true;
    const t = setTimeout(() => this.goClose(NotifyCloseCases.onTimeEnd, null), ms);
    this.#pauseRef = { anim, t, end: Date.now() + ms };
  }

  /** Called on every opening */
  protected override gotRender(isOpening = false): void {
    if (!isOpening) {
      return; // empty because component is hidden by default and need to focus on open-phase
    }
    this.setAttribute("role", "alert");
    this.#placement = this._opts.placement;
    this._isStopChanges = true; // otherwise attributes are parsed back to options & trigger gotChanges (refreshing)
    this.setAttribute("w-placement", this.#placement);
    this.setAttr("w-type", this._opts.type);
    this._isStopChanges = false;

    // init button[close]: click is handled by gotClick
    if (!this.$refClose) {
      this.$refClose = document.createElement("button");
      const q = this.$refClose;
      q.type = "button";
      q.setAttribute("aria-label", __wupln("close", "aria"));
      q.setAttribute(this.#ctr.classNameBtnIcon, "");
      q.setAttribute("close", "");
    }
    this.$refClose.parentNode !== this && this.prepend(this.$refClose); // WARN: refs are removed on textContent changes

    // init progress bar
    if (!this._opts.autoClose) {
      this.$refProgress?.remove();
      delete this.$refProgress;
    } else if (!this.$refProgress) {
      this.$refProgress = document.createElement("div");
      this.$refProgress.setAttribute("progress", "");
      this.$refProgress.setAttribute("role", "progressbar");
    }
    this.$refProgress && this.$refProgress.parentNode !== this && this.appendChild(this.$refProgress);
  }

  protected override gotChanges(propsChanged: string[] | null): void {
    super.gotChanges(propsChanged);
    if (propsChanged && this.$isOpened && !this.$isClosing) {
      this.gotRefresh(); // apply changed options to opened element
    } else {
      this._opts.openCase === NotifyOpenCases.onInit && this.goOpen(NotifyOpenCases.onInit, null);
    }
  }

  /** Placement applied on render: defines the stack of element while options can be already changed */
  #placement?: string;
  /** Saved dy position (vertical shift in the stack) */
  _dy = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotOpen(openCase: NotifyOpenCases, e: MouseEvent | null): void {
    this.resetPosition(); // WARN: required when $open() is called during the closing: in this case resetState is skipped
    this.gotRender(true);
    const prev = this._openedItems.findLast((a) => this.isSameSibling(a));
    this._openedItems.push(this as WUPNotifyElement<any, any>);
    // WARN: translate is animated only for [show] (see styles) so element appears at the shifted position
    prev && this.refreshVertical([prev, this as WUPNotifyElement<any, any>], true);
    this.gotPlay();
  }

  /** Called on opening & refreshing: listens for close-events & starts closing by time (if option autoClose is set) */
  protected gotPlay(): void {
    const o = this._opts;
    this.appendEvent(this, "click", (ev) => this.gotClick(ev));
    o.closeOnSwipe && this.disposeLst.push(this.gotSwipe());
    // reset previous playing (on re-opening & refreshing)
    this.$pause();
    this.#pauseRef?.anim?.cancel();
    this.#pauseRef = undefined;
    if (!o.autoClose) {
      return;
    }
    if (o.pauseOnWinBlur) {
      this.appendEvent(window as any, "blur", () => this.$pause());
      this.appendEvent(window as any, "focus", () => this.$play());
    }
    (!o.pauseOnWinBlur || document.hasFocus()) && this.$play(o.autoClose);
    if (o.pauseOnHover) {
      const onEnter = (): void => {
        this.$pause();
        this.appendEvent(this, "mouseleave", () => this.$play(), { once: true }); // resume with stored left-time
      };
      this.appendEvent(this, "mouseenter", onEnter);
      this.matches(":hover") && onEnter(); // possible on refreshing
      this.appendEvent(this, "touchstart", () => (this.$isPlayed ? this.$pause() : this.$play()));
    }
  }

  /** Called on options changes & from $show (when element with the same id exists): re-renders & restarts closing by time */
  protected gotRefresh(): void {
    if (!this.$isOpened || this.$isClosing) {
      this.$isReady && this.goOpen(NotifyOpenCases.onInit, null); // re-open closing OR closed but not removed (selfRemove: false)
      return;
    }
    if (this.#placement !== this._opts.placement) {
      this.resetPosition(); // remove from previous stack
      this._openedItems.push(this as WUPNotifyElement<any, any>);
    }
    this.disposeEvents();
    this.gotRender(true); // restore refs & apply options
    this.refreshVertical(); // WARN: required even for the same placement because height can be changed
    this.gotPlay();
  }

  /** Returns if item is visible and has same placement option */
  isSameSibling(item: WUPNotifyElement): boolean {
    return item._opts.placement === this._opts.placement && item.offsetHeight > 0;
  }

  /** Update vertical positions of all (or pointed) items + shift if something required */
  refreshVertical(items = this._openedItems.filter((x) => this.isSameSibling(x)), isInit = false): void {
    const isBottom = this._opts.placement.startsWith("bottom");
    const s = getComputedStyle(this); // WARN: expected that every component has same options
    const gap = px2Number(isBottom ? s.marginBottom : s.marginTop);
    const hs = items.map((a) => a.offsetHeight); // read all before writing to prevent forced re-layouts
    items.forEach((a, i) => {
      if (i) {
        a._dy = Math.round(items[i - 1]._dy + (isBottom ? -1 : 1) * (hs[i - 1] + gap));
        a.style.translate = `0 ${a._dy}px`; // WARN: separate from transform that is used by show/hide animation & swipe
      } else if (!isInit) {
        a._dy = 0;
        a.style.translate = "";
      }
    });
  }

  /** Called on opening when closeOnSwipe: element follows the horizontal swipe and closes when it's swiped out enough
   * @returns function to remove listeners */
  protected gotSwipe(): () => void {
    let w = 0; // width of element
    let wasPlayed = false;
    // WARN: gesture listeners aren't removed by refreshing (via $show) during the swipe
    return listenSwipe(this, {
      skip: () => this.$isClosing,
      onStart: () => {
        w = this.offsetWidth; // single read: otherwise re-layout on every move
        wasPlayed = this.$isPlayed;
        this.$pause();
        this.setAttribute("swiping", ""); // follow the pointer without delay
      },
      onMove: (dx) => {
        this.style.transform = `translateX(${dx}px)`;
        this.style.opacity = `${Math.max(0, 1 - Math.abs(dx) / w)}`;
      },
      onEnd: (dx, v, e) => {
        this.removeAttribute("swiping");
        this.style.opacity = "";
        e.type === "pointerup" &&
          (Math.abs(dx) > w * 0.4 || v * Math.sign(dx) > 0.5) &&
          this.goClose(NotifyCloseCases.onSwipe, e);
        // fly out OR return back (also when closing is prevented)
        this.style.transform = this.$isClosing ? `translateX(${Math.sign(dx) * 100}vw)` : "";
        !this.$isClosing && wasPlayed && this.$play();
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotClose(closeCase: NotifyCloseCases, ev: MouseEvent | null): void {
    this.$pause(); // otherwise timer closes re-opened item
    this.disposeEvents(); // remove all events added on opening (for case when item is not removed and will be opened again)
  }

  /** Reset saved position & remove itself from the list of opened items (+ update positions of the rest) */
  protected resetPosition(): void {
    this.style.transform = "";
    this.style.translate = "";
    this._dy = 0;
    const arr = this._openedItems;
    const i = arr.indexOf(this as WUPNotifyElement<any, any>);
    if (i > -1) {
      arr.splice(i, 1);
      arr.find((a) => a.#placement === this.#placement)?.refreshVertical(); // close the gap in the stack
    }
  }

  protected resetState(): void {
    super.resetState();
    this.resetPosition();
    this.isConnected && this._opts.selfRemove && this.remove();
  }

  /** Called when handles click to check if was close-click */
  gotClick(e: MouseEvent): void {
    if (e.defaultPrevented || e.button) {
      return;
    }
    const c = (e.target as Element).closest("[close]"); // allow to use any button with attr to close
    (this._opts.closeOnClick || (c !== this && this.contains(c))) && this.goClose(NotifyCloseCases.onCloseClick, e);
  }

  /** Singleton array with opened elements */
  get _openedItems(): Array<WUPNotifyElement> {
    return __openedItems;
  }
}

const __openedItems: Array<WUPNotifyElement> = [];

customElements.define(tagName, WUPNotifyElement);
