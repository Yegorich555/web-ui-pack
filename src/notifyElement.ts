import WUPBaseModal from "./baseModal";

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
    interface Options {
      /** Case when need to show;
       * @defaultValue `NotifyOpenCases.onInit` */
      openCase: NotifyOpenCases;
      /** Position on the screen
       * @defaultValue 'bottom-left' */
      placement: "top-left" | "top-middle" | "top-right" | "bottom-left" | "bottom-middle" | "bottom-right";
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
        z-index: 9000;
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

  static $show(textContent: string, opts?: WUP.Notify.Options & { className?: string }): void {
    // todo reuse from modal
    throw new Error("Not implemented yet");
  }

  /** Reference to button[close] */
  $refClose?: HTMLButtonElement;

  protected override gotRender(): void {
    /** empty because component is hidden by default and need render in GotOpen */
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotOpen(openCase: NotifyOpenCases, e: MouseEvent | null): void {
    // todo show at the top
    // todo if $options are not observed then need to merge it manually ???
    this.setAttribute("role", "alert");

    // init button[close]
    this.$refClose ??= document.createElement("button");
    this.$refClose.type = "button";
    this.$refClose.setAttribute("aria-label", __wupln("close", "aria"));
    this.$refClose.setAttribute(this.#ctr.classNameBtnIcon, "");
    this.$refClose.setAttribute("close", "");

    this.prepend(this.$refClose);

    // apply open styles
    this.setAttribute("w-placement", this._opts.placement);
    // listen for close-events
    this._opts.closeOnClick && this.appendEvent(this, "click", (ev) => this.gotClick(ev));

    const ms = this._opts.autoClose;
    ms && setTimeout(() => this.goClose(NotifyCloseCases.onTimeEnd, null), ms);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotClose(closeCase: NotifyCloseCases, ev: MouseEvent | null): void {
    /** empty because no extra logic */
  }

  protected resetState(): void {
    // todo shift other alerts
    super.resetState();
    this.isConnected && this._opts.selfRemove && this.remove();
  }

  /** Called when handles click to check if was close-click */
  gotClick(e: MouseEvent): void {
    const t = e.target;
    if (e.defaultPrevented || t === this || e.button) {
      return;
    }
    const all = this.querySelectorAll("[close]").values(); // allow to use any button with attr to close modal
    // eslint-disable-next-line no-restricted-syntax
    for (const el of all) {
      if (this.itsMe.call(el, t)) {
        this.goClose(NotifyCloseCases.onCloseClick, e);
        break;
      }
    }
  }
}

customElements.define(tagName, WUPNotifyElement);

// todo add to types.html
// todo bind with form
