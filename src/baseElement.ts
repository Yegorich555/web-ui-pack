/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line max-classes-per-file
import observer, { Observer } from "./helpers/observer";
import onEvent, { onEventType } from "./helpers/onEvent";

/** Basic abstract class for every component in web-ui-pack */
export default abstract class WUPBaseElement extends HTMLElement {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  protected get ctr(): typeof WUPBaseElement {
    return this.constructor as typeof WUPBaseElement;
  }

  /** Options that need to watch for changes; use gotOptionsChanged() */
  static observedOptions?: Set<keyof Record<string, any>>;
  /** Options that applied to element */
  abstract $options: Record<string, any>;

  constructor() {
    super();

    // autoBind functions (recursive until HMTLElement)
    const bindAll = (t: unknown) => {
      const p = Object.getPrototypeOf(t);
      if (p !== HTMLElement.prototype) {
        Object.getOwnPropertyNames(p).forEach((s) => {
          const k = s as keyof Omit<WUPBaseElement, keyof HTMLElement | "$isReady">;
          const desc = Object.getOwnPropertyDescriptor(p, s) as PropertyDescriptor;
          if (desc.value instanceof Function && s !== "constructor") {
            this[k] = this[k].bind(this);
          }
        });
        bindAll(p);
      }
    };
    bindAll(this);

    setTimeout(() => {
      // cast options to observed
      const prev = this.$options;
      Object.defineProperty(this, "$options", {
        set: this.#setOptions,
        get: () => {
          const watched = this.ctr.observedOptions;
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
  }

  /* rawOptions despite on $options is observer */
  protected _opts: Record<string, any> = {};
  #optsObserved?: Observer.Observed<Record<string, any>>;
  #removeObserved?: Func;
  #setOptions(v: Record<string, any>) {
    if (!v) {
      throw new Error("$options can't be empty");
    }
    const prev = this._opts;
    this._opts = v;

    // unsubscribe from previous events here
    this.#removeObserved?.call(this);
    this.#optsObserved = undefined;
    this.#removeObserved = undefined;

    if (!this.ctr.observedOptions?.size) {
      return;
    }

    if (this.#isReady && prev.valueOf() !== v.valueOf()) {
      const props: string[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const [k] of this.ctr.observedOptions.entries()) {
        if (this._opts[k] !== prev[k]) {
          props.push(k);
        }
      }

      props.length && this.gotOptionsChanged({ props, target: this._opts });
    }
  }

  /** Returns true if element is appended (result of setTimeout on connectedCallback) */
  get $isReady() {
    return this.#isReady;
  }

  #isReady = false;
  /** Fired when element is added to document */
  protected gotReady() {
    this.#isReady = true;
  }

  /** Fired when element is removed from document */
  protected gotRemoved() {
    this.#isReady = false;
    this.dispose();
  }

  /** Fired when element isReady and at least one of observedOptions is changed */
  protected gotOptionsChanged(e: WUP.OptionEvent) {}

  /** Browser calls this method when the element is added to the document */
  protected connectedCallback() {
    // async requires otherwise attributeChangedCallback doesn't set immediately
    setTimeout(this.gotReady);
  }

  /** Browser calls this method when the element is removed from the document;
   * (can be called many times if an element is repeatedly added/removed) */
  protected disconnectedCallback() {
    this.gotRemoved();
  }

  /** Fired when element isReady and one of observedAttributes is changed */
  protected gotAttributeChanged(name: string, oldValue: string, newValue: string) {}
  /** Browser calls this method when attrs pointed in observedAttributes is changed */
  protected attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    this.#isReady && this.gotAttributeChanged(name, oldValue, newValue);
  }

  dispatchEvent<K extends keyof HTMLElementEventMap>(type: K, eventInit?: EventInit): boolean;
  dispatchEvent(event: Event): boolean;
  dispatchEvent(ev: Event | string, eventInit?: EventInit): boolean {
    if (typeof ev === "string") ev = new Event(ev, eventInit);
    return super.dispatchEvent(ev as Event);
  }

  /** Calls dispatchEvent and returns created event */
  fireEvent<K extends keyof HTMLElementEventMap>(type: K, eventInit?: EventInit): Event {
    const ev = new Event(type, eventInit);
    super.dispatchEvent(ev as Event);
    return ev;
  }

  protected disposeLst: Array<() => void> = [];
  /** Add event listener and remove after component removed; @options.passive=true by default */
  appendEvent<
    T extends keyof E,
    K extends HTMLElement | Document,
    E extends HTMLElementEventMap & Record<keyof E, Event>
  >(...args: Parameters<onEventType<T, K, E>>): () => void {
    args[3] = <AddEventListenerOptions>{ passive: true, ...(args[3] as AddEventListenerOptions) };
    // self-removing when option.once
    if (args[3].once) {
      const listener = args[2];
      args[2] = function wrapper(...args2) {
        const v = listener.call(this, ...args2);
        remove();
        return v;
      };
    }
    // @ts-ignore
    const r = onEvent(...args);
    this.disposeLst.push(r);
    const remove = () => {
      const i = this.disposeLst.indexOf(r);
      if (i !== -1) {
        r();
        this.disposeLst.splice(i, 1);
      }
    };

    return remove;
  }

  /** Remove events/functions that was appended */
  protected dispose() {
    this.disposeLst.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLst.length = 0;
  }

  /** Returns true if el is instance of Node and contains pointer element */
  includes(el: unknown): boolean {
    return el instanceof Node && this.contains(el);
  }
}

export type JSXCustomProps<T> = React.DetailedHTMLProps<
  // todo write babel-transform className > class
  Omit<React.HTMLAttributes<T>, "className"> & { class?: string | undefined },
  T
>;

export namespace WUP {
  export type OptionEvent<T extends Record<string, any> = Record<string, any>> = {
    props: Array<Extract<keyof T, string>>;
    target: T;
  };
  // export interface IEvent<T extends HTMLElementEventMap> extends Event {
  //   // eslint-disable-next-line @typescript-eslint/no-misused-new
  //   new (type: keyof T, eventInitDict?: EventInit): IEvent<T>;
  // }
  export interface IBaseElement<E extends HTMLElementEventMap & Record<keyof E, Event>> extends WUPBaseElement {
    dispatchEvent(type: keyof E, eventInitDict?: EventInit): boolean;
    dispatchEvent(event: E[keyof E]): boolean;
    addEventListener<K extends keyof E>(
      type: K,
      listener: (this: WUPBaseElement, ev: E[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof E>(
      type: K,
      listener: (this: WUPBaseElement, ev: E[K]) => any,
      options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;

    fireEvent(type: keyof E, eventInitDict?: EventInit): Event;
    appendEvent<T extends keyof E, K extends HTMLElement | Document>(
      ...args: Parameters<onEventType<T, K, E>>
    ): () => void;
    appendEvent<T extends keyof E2, K extends HTMLElement | Document, E2 extends E = E>(
      ...args: Parameters<onEventType<T, K, E2>>
    ): () => void;
  }
}

// todo make all props not-enumerable (beside starts with $...): https://stackoverflow.com/questions/34517538/setting-an-es6-class-getter-to-enumerable
