/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import onEvent, { onEventType } from "./helpers/onEvent";

export default abstract class WUPBaseElement extends HTMLElement {
  /** Options that applied to element */
  abstract $options: Record<string, any>;

  constructor() {
    super();

    this.appendEvent = this.appendEvent.bind(this);
    this.contains = this.contains.bind(this);
    this.dispose = this.dispose.bind(this);

    // autoBind all other functions
    const p = this.constructor.prototype;
    Object.getOwnPropertyNames(p).forEach((k) => {
      if (k !== "constructor" && typeof Object.getOwnPropertyDescriptor(p, k)?.value === "function") {
        // @ts-ignore
        this[k] = this[k].bind(this);
      }
    });
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
      this.disposeLst.splice(this.disposeLst.indexOf(r), 1);
    };

    return remove;
  }

  /** Remove events/functions that was appended */
  protected dispose() {
    this.disposeLst.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLst.length = 0;
  }

  contains(other: unknown): boolean {
    return other instanceof Node && this.contains(other);
  }
}

export type JSXCustomProps<T> = React.DetailedHTMLProps<
  // todo write babel-transform className > class
  Omit<React.HTMLAttributes<T>, "className"> & { class?: string | undefined },
  T
>;

export namespace WUPBase {
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

    appendEvent<T extends keyof E, K extends HTMLElement | Document>(
      ...args: Parameters<onEventType<T, K, E>>
    ): () => void;
    appendEvent<T extends keyof E2, K extends HTMLElement | Document, E2 extends E = E>(
      ...args: Parameters<onEventType<T, K, E2>>
    ): () => void;
  }
}
