import WUPBaseElement, { JSXCustomProps } from "./baseElement";
import isEqual from "./helpers/isEqual";

export interface TextControlOptions {
  label?: string;
  disabled?: boolean;
}

interface WUPBaseControl<T> {
  $value: T | undefined;
  readonly $isChanged: boolean;
  readonly $isValid: boolean;
  // readonly $validate(): boolean;
}

export default class WUPTextControl<T extends string | undefined = undefined>
  extends WUPBaseElement
  implements WUPBaseControl<T>
{
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  // @ts-ignore
  protected get ctr(): typeof WUPTextControl {
    return this.constructor as typeof WUPTextControl;
  }

  static get style(): string {
    return `
      :host {

      }
     `;
  }

  static isEqual(v1: unknown, v2: unknown): boolean {
    return isEqual(v1, v2);
  }

  static $defaults: TextControlOptions = {};
  $options: TextControlOptions = { ...this.ctr.$defaults };
  protected override _opts = this.$options;

  $refs = {
    label: document.createElement("label"),
    input: document.createElement("input"),
    title: document.createElement("strong"),
  };

  #initValue: T | undefined; // todo implement
  #value: T | undefined;
  get $value(): T | undefined {
    return this.#value; // todo implement parse from rawValue
  }

  set $value(v: T | undefined) {
    if (!isEqual(this.#value, v)) {
      this.#value = v;
      this.$refs.input.value = v ? v.toString() : "";
    }
  }

  get $isChanged() {
    return this.ctr.isEqual(this.$value, this.#initValue);
  }

  get $isValid() {
    throw new Error("not implemented");
    return true;
  }

  constructor() {
    super();

    this.$refs.input.placeholder = " ";
  }

  protected override gotReady() {
    super.gotReady();
    this.$refs.title.textContent = this._opts.label || null;
    this.$refs.input.name = "email";
    this.$refs.input.disabled = this._opts.disabled || false;
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.$refs.label.appendChild(this.$refs.input);
    this.$refs.label.appendChild(this.$refs.title);
    this.appendChild(this.$refs.label);
    // todo unique id for input + label
  }
}

const tagName = "wup-text-ctrl";
customElements.define(tagName, WUPTextControl);

declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPTextControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSXCustomProps<WUPTextControl> &
        Partial<{
          /**/
        }>;
    }
  }
}
