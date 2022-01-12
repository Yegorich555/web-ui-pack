export default abstract class WUPBaseElement extends HTMLElement {
  // watch-fix: https://github.com/microsoft/TypeScript/issues/34516
  // static abstract defaults: Record<string, any>;

  /** Options that applied to element */
  abstract $options: Record<string, any>;

  #isReady = false;
  /** Fired when element is added to document */
  protected gotReady() {
    this.#isReady = true;
  }

  /** Fired when element isReady and one of observedAttributes is changed */
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected gotAttributeChanged(name: string, oldValue: string, newValue: string) {}

  /** Browser calls this method when the element is added to the document */
  protected connectedCallback() {
    // async requires otherwise attributeChangedCallback doesn't set immediately
    setTimeout(() => {
      this.#isReady = true;
      this.gotReady();
    });
  }

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
}

export type JSXCustomProps<T> = React.DetailedHTMLProps<
  // todo write babel-transform className > class
  Omit<React.HTMLAttributes<T>, "className"> & { class?: string | undefined },
  T
>;
