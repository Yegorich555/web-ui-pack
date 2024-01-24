import WUPBaseModal from "./baseModal";
import viewportSize from "./helpers/viewportSize";

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
}

const tagName = "wup-notify";
declare global {
  namespace WUP.Notify {
    interface ShowOptions {
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
      placement: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      /** Default time (ms) after that notify is closed; if provide false then it will be closed only by click event
       *  @defaultValue 5000 (ms) */
      autoClose: number | null;
      /** Close on element click
       * @defaultValue true */
      closeOnClick: boolean;
      /** Remove itself after closing
       * @defaultValue true */
      selfRemove: boolean;
      /** Set `true` if only single notification possible to show otherwise it will showed in stack
       * @defaultValue false */
      single: boolean;
    }
    interface EventMap extends WUP.BaseModal.EventMap<NotifyOpenCases, NotifyCloseCases> {}
    interface JSXProps extends WUP.BaseModal.JSXProps, WUP.Base.OnlyNames<Options> {
      "w-placement"?: Options["placement"];
      "w-autoClose"?: number | "";
      "w-selfRemove"?: boolean | "";
      "w-closeOnClick"?: boolean | "";
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPNotifyElement; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /**  Modal element
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
      /**  Modal element
       *  @see {@link WUPNotifyElement} */
      [tagName]: HTMLAttributes<WUPNotifyElement> & WUP.Notify.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Notify element
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

  static get observedOptions(): Array<keyof WUP.Notify.Options> {
    return [];
  }

  static get observedAttributes(): Array<string> {
    return [];
  }

  // perfect bg color is: #121212c8
  // WARN: modal-anim shouldn't affect on animation of nested
  static get $styleRoot(): string {
    return `:root {
        --notify-anim-t: 400ms;
        --notify-margin: 1em 0;
        --notify-w: 300px;
        --notify-text: #fff;
        --notify-bg: rgba(16, 70, 82, 0.9);
        --notify-shadow: #0003;
      }
      [wupdark] {
        --notify-text: #d8d8d8;
        --notify-bg: rgba(16, 70, 82, 0.9);
        --notify-shadow: #0006;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        --modal-anim: var(--notify-anim-t) cubic-bezier(0, 0, 0.2, 1) 0ms;
        z-index: 9010;
        min-height: 64px;
        max-height: 80vh;
        width: var(--notify-w);
        max-width: 80wv;
        margin: var(--notify-margin);
        color: var(--notify-text);
        background: var(--notify-bg);
        box-shadow: 0 1px 4px 0 var(--notify-shadow);
      }
      :host[show] {
        transform: none;
      }
      :host > button[close] {
        --icon-img: var(--wup-icon-cross);
        --icon: var(--notify-text);
        z-index: 10;
        position: absolute;
        right:0; top:0;
        margin: 0.4em;
      }
    `;
  }

  static $defaults: WUP.Notify.Options = {
    openCase: NotifyOpenCases.onInit,
    placement: "bottom-left",
    autoClose: 5000,
    closeOnClick: true,
    selfRemove: true,
    single: false,
  };

  static $show(opts: WUP.Notify.ShowOptions): void {
    const me = document.createElement(tagName);
    opts.className && me.classList.add(opts.className);
    me.$options.selfRemove = true;
    Object.assign(me.$options, opts.defaults);
    me.$options.openCase = NotifyOpenCases.onInit;
    // render
    me.textContent = opts.textContent;
    // append to root
    document.body.appendChild(me);
    // call callback to allow user re-define it
    // me.gotOpen(NotifyOpenCases.onInit, null);
    opts.onRender?.(me); // todo onRender called here but real render will be on gotOpen
  }

  /** Reference to button[close] */
  $refClose?: HTMLButtonElement;
  /** Reference to progress bar  */
  $refProgress?: HTMLDivElement;

  protected override gotRender(isOpening = false): void {
    if (!isOpening) {
      return; // empty because component is hidden by default and need to focus on open-phase
    }
    this.setAttribute("role", "alert");
    this.setAttribute("w-placement", this._opts.placement);

    // init button[close]
    this.$refClose ??= document.createElement("button");
    this.$refClose.type = "button";
    this.$refClose.setAttribute("aria-label", __wupln("close", "aria"));
    this.$refClose.setAttribute(this.#ctr.classNameBtnIcon, "");
    this.$refClose.setAttribute("close", "");
    this.prepend(this.$refClose);

    this.$refProgress ??= document.createElement("div");
    const pr = this.$refProgress;
    pr.setAttribute("progress", "");
    pr.setAttribute("role", "progressbar");
    this.appendChild(pr);
    // apply open styles
  }

  /** Called once on opening */
  protected override gotChanges(propsChanged: string[] | null): void {
    super.gotChanges(propsChanged);
    this._opts.openCase === NotifyOpenCases.onInit && this.goOpen(NotifyOpenCases.onInit, null);
  }

  _dy = 0;
  _dx = "";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotOpen(openCase: NotifyOpenCases, e: MouseEvent | null): void {
    // todo if $options are not observed then need to merge it manually ???
    this.gotRender(true);
    // listen for close-events
    this._opts.closeOnClick && this.appendEvent(this, "click", (ev) => this.gotClick(ev));

    const curNum = this._openedItems.push(this as WUPNotifyElement<any, any>);
    if (curNum > 1) {
      const lastI = curNum - 2;
      const prev = this._openedItems.findLast(
        (a, i) => i <= lastI && a._opts.placement === this._opts.placement && a.offsetHeight > 0 // offsetHeight is 0 when item is hidden
      );

      if (prev) {
        let isBottom = false;
        switch (this._opts.placement) {
          case "bottom-left":
          case "bottom-right":
            isBottom = true;
            break;
          default:
            break;
        }
        const { top, bottom } = prev.getBoundingClientRect(); // position of previous item
        this._dx = getComputedStyle(this).transform;
        this._dy = Math.round(isBottom ? top - viewportSize().vh : bottom);
        this.style.transition = "none";
        this.style.transform = `${this._dx} translateY(${this._dy}px)`;
        setTimeout(() => {
          this.style.transform = `translateY(${this._dy}px)`;
          this.style.transition = "";
        });
      }
    }

    // todo uncomment it after tests
    // const ms = this._opts.autoClose;
    // ms && setTimeout(() => this.goClose(NotifyCloseCases.onTimeEnd, null), ms);
  }

  /** Update vertical positions of all items + shift if something required */
  refreshVertical(): void {
    let prev: WUPNotifyElement | undefined;
    let vh = 0;
    let isBottom = false;
    switch (this._opts.placement) {
      case "bottom-left":
      case "bottom-right":
        isBottom = true;
        vh = viewportSize().vh;
        break;
      default:
        break;
    }
    let sumY = 0;
    this._openedItems.forEach((a) => {
      if (a.offsetHeight > 0 && a._opts.placement === this._opts.placement) {
        const isNext = !!prev;
        const wasY = a._dy;
        if (isNext) {
          const { top, bottom } = prev!.getBoundingClientRect(); // position of previous item
          a._dy = sumY + Math.round(isBottom ? top - vh : bottom);
          a.style.transform = `translateY(${a._dy}px)`;
        } else {
          a.style.transform = "";
          a._dy = 0;
        }
        sumY = a._dy - wasY;
        prev = a;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotClose(closeCase: NotifyCloseCases, ev: MouseEvent | null): void {
    // todo need to return focus back if item (btnClose) is focused
    this.style.transform = this._dx ? `${this._dx} translateY(${this._dy}px)` : "";
  }

  protected resetState(): void {
    super.resetState();
    this.style.transform = "";
    const i = this._openedItems.indexOf(this as WUPNotifyElement<any, any>);
    if (i > -1) {
      this._openedItems.splice(i, 1);
      this.refreshVertical();
    }
    this.isConnected && this._opts.selfRemove && this.remove();
  }

  /** Called when handles click to check if was close-click */
  gotClick(e: MouseEvent): void {
    const t = e.target;
    if (e.defaultPrevented || t === this || e.button) {
      return;
    }
    const all = this.querySelectorAll("[close]").values(); // allow to use any button with attr to close
    // eslint-disable-next-line no-restricted-syntax
    for (const el of all) {
      if (this.itsMe.call(el, t)) {
        this.goClose(NotifyCloseCases.onCloseClick, e);
        break;
      }
    }
  }

  /** Singleton array with opened elements */
  get _openedItems(): Array<WUPNotifyElement> {
    return __openedItems;
  }
}

const __openedItems: Array<WUPNotifyElement> = [];

customElements.define(tagName, WUPNotifyElement);

// todo add to types.html
// todo bind with form
// todo add Ctrl+Z hook ???
// todo add ID to ability refresh existed
