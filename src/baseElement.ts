/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import onEvent, { onEventType } from "./helpers/onEvent";

export default abstract class WUPBaseElement extends HTMLElement {
  // watch-fix: https://github.com/microsoft/TypeScript/issues/34516
  // static abstract defaults: Record<string, any>;

  /** Options that applied to element */
  abstract $options: Record<string, any>;

  // todo autoBind all functions inside

  #isReady = false;
  /** Fired when element is added to document */
  protected gotReady() {
    this.#isReady = true;
  }

  /** Fired when element is removed from document */
  protected gotRemoved() {
    this.#isReady = false;
    this.removeEvents();
  }

  /** Browser calls this method when the element is added to the document */
  protected connectedCallback() {
    // async requires otherwise attributeChangedCallback doesn't set immediately
    setTimeout(() => this.gotReady());
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

  dispatchEvent(type: string, eventInit?: EventInit): boolean;
  dispatchEvent(event: Event): boolean;
  dispatchEvent(ev: Event | string, eventInit?: EventInit): boolean {
    if (typeof ev === "string") ev = new Event(ev, eventInit);
    return super.dispatchEvent(ev as Event);
  }

  protected disposeLst: Array<() => void> = [];
  /** Add event listener and push to disposeLst */
  appendEvent<K extends keyof M, M extends HTMLElementEventMap>(...args: Parameters<onEventType<K, M>>): () => void {
    // todo once doesn't work in this case
    const forRemove = onEvent<K, M>(...args);
    this.disposeLst.push(forRemove);

    return () => {
      forRemove();
      this.disposeLst.splice(this.disposeLst.indexOf(forRemove), 1);
    };
  }

  /** Remove events that was appended */
  protected removeEvents() {
    this.disposeLst.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLst.length = 0;
  }
}

export type JSXCustomProps<T> = React.DetailedHTMLProps<
  // todo write babel-transform className > class
  Omit<React.HTMLAttributes<T>, "className"> & { class?: string | undefined },
  T
>;
