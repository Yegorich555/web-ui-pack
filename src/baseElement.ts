/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import onEvent, { onEventType } from "./helpers/onEvent";

/** Basic abstract class for every component in web-ui-pack */
export default abstract class WUPBaseElement extends HTMLElement {
  /** Options that applied to element */
  abstract $options: Record<string, any>;

  constructor() {
    super();
    // autoBind functions
    const bindAll = (p: unknown) => {
      Object.getOwnPropertyNames(p).forEach((s) => {
        const k = s as keyof Omit<WUPBaseElement, keyof HTMLElement>;
        if (s !== "constructor" && typeof Object.getOwnPropertyDescriptor(p, s)?.value === "function") {
          this[k] = this[k].bind(this);
        }
      });
    };
    bindAll(WUPBaseElement.prototype);
    // todo it doesn't work for middle prototype between WUPBaseElement > Middle > PopupElement
    // bindAll(Object.getPrototypeOf(this));
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
      r();
      const i = this.disposeLst.indexOf(r);
      i !== -1 && this.disposeLst.splice(i, 1);
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

export namespace WUPBase {
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
