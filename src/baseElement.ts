/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line max-classes-per-file
import focusFirst from "./helpers/focusFirst";
import observer, { Observer } from "./helpers/observer";
import onEvent, { onEventType } from "./helpers/onEvent";

// theoritcally such single appending is faster than using :host inside shadowComponent
const appendedStyles = new Set<string>();
let lastUniqueNum = 0;

/** Basic abstract class for every component in web-ui-pack */
export default abstract class WUPBaseElement<Events extends WUP.EventMap = WUP.EventMap> extends HTMLElement {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseElement;

  /** Options that need to watch for changes; use gotOptionsChanged() */
  static observedOptions?: Set<keyof Record<string, any>>;

  static $refStyle: HTMLStyleElement;

  /** Visually hidden but accessible */
  static get $styleHidden(): string {
    return `position: absolute;
            height: 1px;
            width: 1px;
            overflow: hidden;
            clip: rect(1px, 1px, 1px, 1px);`;
  }

  /** StyleContent related to component */
  static get $style(): string {
    return "";
  }

  /** StyleContent related to component & inherrited components */
  static get $styleRoot(): string {
    return `:root {
          --base-back: #fff;
          --base-text: #232323;
          --base-focus: #00778d;
          --base-btn-back: #009fbc;
          --base-btn-text: #fff;
          --base-btn-focus: #005766;
          --base-btn2-back: var(--base-btn-text);
          --base-btn2-text: var(--base-btn-back);
          --border-radius: 6px;
          --anim-time: 200ms;
          --anim: var(--anim-time, 200ms) cubic-bezier(0, 0, 0.2, 1) 0ms;
        }`;
  }

  /** Get unique id for html elements; Every getter returns new id */
  static get $uniqueId(): string {
    return `wup${++lastUniqueNum}`;
  }

  /** Options that applied to element */
  abstract $options: Record<string, any>;

  constructor() {
    super();

    if (!this.#ctr.$refStyle) {
      this.#ctr.$refStyle = document.createElement("style");
      /* from https://snook.ca/archives/html_and_css/hiding-content-for-accessibility  */
      this.#ctr.$refStyle.append(`.wup-hidden, [wup-hidden] {${this.#ctr.$styleHidden}}`);
      document.head.prepend(this.#ctr.$refStyle);
    }
    const refStyle = this.#ctr.$refStyle;

    // setup options to be observable
    setTimeout(() => {
      // cast options to observed
      const prev = this.$options;
      Object.defineProperty(this, "$options", {
        set: this.#setOptions,
        get: () => {
          const watched = this.#ctr.observedOptions;
          if (!watched?.size) {
            return this._opts;
          }
          // cast to observed only if option was retrieved: to optimize init-performance
          if (!this.#optsObserved) {
            this.#optsObserved = observer.make(this._opts);
            this.#removeObserved = observer.onChanged(this.#optsObserved, (e) => {
              this.#isReady && e.props.some((p) => watched.has(p)) && this.gotOptionsChanged(e);
            });
          }

          return this.#optsObserved;
        },
      });
      this._opts = prev;
      this.#setOptions(prev);
    });

    // setup styles
    if (!appendedStyles.has(this.tagName)) {
      appendedStyles.add(this.tagName);

      // autoBind functions (recursive until HMTLElement)
      const findAllProtos = (t: unknown, protos: typeof WUPBaseElement[]): typeof WUPBaseElement[] => {
        const p = Object.getPrototypeOf(t);
        if (p !== HTMLElement.prototype) {
          protos.push(p.constructor);
          // Object.getOwnPropertyNames(p).forEach((s) => {
          //   const k = s as keyof Omit<WUPBaseElement, keyof HTMLElement | "$isReady">;
          //   const desc = Object.getOwnPropertyDescriptor(p, s) as PropertyDescriptor;
          //   if (desc.value instanceof Function && s !== "constructor") {
          //     this[k] = (this[k] as Function).bind(this);
          //   }
          // });
          findAllProtos(p, protos);
        }
        return protos;
      };
      const protos = findAllProtos(this, []);

      protos.reverse().forEach((p) => {
        // append $styleRoot
        if (!appendedStyles.has(p.name)) {
          appendedStyles.add(p.name);
          if (Object.prototype.hasOwnProperty.call(p, "$styleRoot")) {
            const s = p.$styleRoot;
            s && refStyle.append(s);
          }
        }
      });

      const c = protos[protos.length - 1].$style;
      refStyle.append(c.replace(/:host/g, `${this.tagName}`));
    }
  }

  /* rawOptions ($options is observed) */
  protected _opts: Record<string, any> = {};
  #optsObserved?: Observer.Observed<Record<string, any>>;
  #removeObserved?: Func;
  #setOptions(v: Record<string, any>): void {
    if (!v) {
      throw new Error("$options can't be empty");
    }
    const prev = this._opts;
    this._opts = v;

    // unsubscribe from previous events here
    this.#removeObserved?.call(this);
    this.#optsObserved = undefined;
    this.#removeObserved = undefined;

    if (!this.#ctr.observedOptions?.size) {
      return;
    }

    if (this.#isReady && prev.valueOf() !== v.valueOf()) {
      const props: string[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const [k] of this.#ctr.observedOptions.entries()) {
        if (this._opts[k] !== prev[k]) {
          props.push(k);
        }
      }

      props.length && this.gotOptionsChanged({ props, target: this._opts });
    }
  }

  /** Returns true if element is appended (result of setTimeout on connectedCallback) */
  get $isReady(): boolean {
    return this.#isReady;
  }

  /** Try to focus self or first possible children; returns true if succesful */
  focus(): boolean {
    return focusFirst(this);
  }

  #isReady = false;
  /** Called when element is added to document */
  protected gotReady(): void {
    this.#isReady = true;
    this._isStopChanges = true;
    this.gotChanges(null);
    this._isStopChanges = false;
    setTimeout(() => (this.autofocus || this._opts.autoFocus) && this.focus()); // timeout to wait for options
  }

  /** Called when element is removed from document */
  protected gotRemoved(): void {
    this.#isReady = false;
    this.dispose();
  }

  /** Called on Init and every time as options/attributes changed */
  protected gotChanges(propsChanged: Array<string> | null): void {}

  /** Called when element isReady and at least one of observedOptions is changed */
  protected gotOptionsChanged(e: WUP.OptionEvent): void {
    this._isStopChanges = true;
    this.gotChanges(e.props);
    this._isStopChanges = false;
  }

  /** Called once on Init */
  protected gotRender(): void {}

  #isFirstConn = true;
  /** Browser calls this method when the element is added to the document */
  protected connectedCallback(): void {
    // async requires otherwise attributeChangedCallback doesn't set immediately
    setTimeout(this.gotReady.bind(this));
    if (this.#isFirstConn) {
      this.#isFirstConn = false;
      this.gotRender();
    }
  }

  /** Browser calls this method when the element is removed from the document;
   * (can be called many times if an element is repeatedly added/removed) */
  protected disconnectedCallback(): void {
    this.gotRemoved();
  }

  _isStopChanges = true;
  #attrTimer?: number;
  #attrChanged?: string[];
  /** Called when element isReady and one of observedAttributes is changed */
  protected gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    if (this._isStopChanges) {
      return;
    }
    // debounce filter
    if (this.#attrTimer) {
      this.#attrChanged!.push(name);
      return;
    }
    this.#attrChanged = [name];
    this.#attrTimer = setTimeout(() => {
      this.#attrTimer = undefined;
      this._isStopChanges = true;
      this.gotChanges(this.#attrChanged as Array<keyof WUPForm.Options>);
      this._isStopChanges = false;
      this.#attrChanged = undefined;
    });
  }

  /** Browser calls this method when attrs pointed in observedAttributes is changed */
  protected attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    this.#isReady && this.gotAttributeChanged(name, oldValue, newValue);
  }

  dispatchEvent<K extends keyof Events>(type: K, eventInit?: EventInit): boolean;
  dispatchEvent(event: Event): boolean;
  dispatchEvent(ev: Event | string, eventInit?: EventInit): boolean {
    if (typeof ev === "string") ev = new Event(ev, eventInit);
    return super.dispatchEvent(ev as Event);
  }

  // watchfix: how to change  listener: (this: WUPBaseElement) to generic: https://github.com/microsoft/TypeScript/issues/299
  /* eslint-disable max-len */
  // prettier-ignore
  addEventListener<K extends keyof Events>(type: K, listener: (this: WUPBaseElement, ev: Events[K]) => any, options?: boolean | AddEventListenerOptions): void;
  // prettier-ignore
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: any, listener: any, options?: any): void {
    return super.addEventListener(type, listener, options);
  }

  // prettier-ignore
  removeEventListener<K extends keyof Events>(type: K, listener: (this: WUPBaseElement, ev: Events[K]) => any, options?: boolean | EventListenerOptions): void;
  // prettier-ignore
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: any, listener: any, options?: any): void {
    return super.removeEventListener(type, listener, options);
  }
  /* eslint-enable max-len */

  /** Calls dispatchEvent and returns created event */
  fireEvent<K extends keyof Events>(type: K, eventInit?: EventInit): Event {
    const ev = new Event(type as string, eventInit);
    super.dispatchEvent(ev as Event);
    return ev;
  }

  /** Array of removeEventListener() that called on remove */
  protected disposeLst: Array<() => void> = [];
  /** Add event listener and remove after component removed; @options.passive=true by default */
  appendEvent<
    T extends keyof E,
    K extends HTMLElement | Document,
    E extends HTMLElementEventMap & Record<string, Event>
  >(...args: Parameters<onEventType<T, K, E>>): () => void {
    // self-removing when option.once
    if ((args[3] as AddEventListenerOptions)?.once) {
      const listener = args[2];
      args[2] = function wrapper(...args2): any {
        const v = listener.call(this, ...args2);
        remove();
        return v;
      };
    }
    // @ts-expect-error
    const r = onEvent(...args);
    this.disposeLst.push(r);
    const remove = (): void => {
      const i = this.disposeLst.indexOf(r);
      if (i !== -1) {
        r();
        this.disposeLst.splice(i, 1);
      }
    };

    return remove;
  }

  /** Remove events/functions that was appended */
  protected dispose(): void {
    this.disposeLst.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLst.length = 0;
  }

  /** Returns true if el is instance of Node and contains pointer element */
  includes(el: unknown): boolean {
    return el instanceof Node && this.contains(el);
  }

  /** Parse attribute and return result */
  getBoolAttr(attr: string, alt: boolean): boolean;
  getBoolAttr(attr: string, alt: boolean | undefined): boolean | undefined;
  getBoolAttr(attr: string, alt: boolean | undefined): boolean | undefined {
    const a = this.getAttribute(attr);
    return a === null ? alt : a !== "false";
  }

  /**
   * Remove attr if value falseOrEmpty; set '' or 'true' if true for HTMLELement
   * @param isSetEmpty set if need to '' instead of 'value'
   */
  setAttr(attr: string, v: boolean | string | undefined | null, isSetEmpty?: boolean): void {
    v ? this.setAttribute(attr, isSetEmpty ? "" : v) : this.removeAttribute(attr);
  }
}

export namespace WUP {
  export type OptionEvent<T extends Record<string, any> = Record<string, any>> = {
    props: Array<Extract<keyof T, string>>;
    target: T;
  };
  export type EventMap<T = HTMLElementEventMap> = HTMLElementEventMap & Record<keyof T, Event>;
  export type JSXProps<T> = React.DetailedHTMLProps<
    // react doesn't support [className] attr for WebComponents; use [class] instead: https://github.com/facebook/react/issues/4933
    Omit<React.HTMLAttributes<T>, "className"> & { class?: string | undefined },
    T
  >;
}

// testcase: check if gotChanges sensitive to attr-case
