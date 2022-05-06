/* eslint-disable no-use-before-define */
import WUPBaseControl, { WUPBaseControlTypes } from "./baseControl";

export namespace WUPTextControlTypes {
  export type ValidationMap = WUPBaseControlTypes.ValidationMap & {
    min: number;
    max: number;
  };

  export type Generics<
    ValueType = string, //
    ValidationKeys extends ValidationMap = ValidationMap,
    ControlType extends WUPTextControl<ValueType> = WUPTextControl<ValueType>
  > = WUPBaseControlTypes.Generics<ValueType, ValidationKeys, ControlType>;

  export type Validation = Generics["Validation"];
  export type ExtraOptions = {
    /** Debounce time to wait for user finishes typing to start validate and provide $change event
     *
     * Default is `0`;
     */
    debounceMs: number;
  };

  export type Options<T = string> = Generics<T>["Options"] & ExtraOptions;
}
/**
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input />
 *      <strong>{$options.label}</strong>
 *   </span>
 * </label>
 */
export default class WUPTextControl<ValueType = string> extends WUPBaseControl<
  ValueType,
  WUPBaseControlTypes.EventMap
> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextControl;

  /** StyleContent related to component */
  static get style(): string {
    return `
      :host {

      }
     `;
  }

  static provideInputValue<T, C extends WUPTextControl<T>>(v: T | undefined, ctrl: C): string | Promise<string> {
    return v != null ? (v as any).toString() : "";
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  // @ts-expect-error - because validation 'required' is rewritten with incompatible ctrl
  static $defaults: WUPTextControlTypes.Options = {
    ...WUPBaseControl.$defaults,
    debounceMs: 0,
    validationRules: {
      required: WUPBaseControl.$defaults.validationRules.required as WUPTextControlTypes.Validation,
      min: (v, setV) => v.length < setV && `Min length is ${setV} characters`,
      max: (v, setV) => v.length > setV && `Max length is ${setV} characters`,
    },
  };

  // @ts-expect-error
  $options: Omit<WUPTextControlTypes.Options<ValueType>, "validationRules"> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  // @ts-expect-error
  protected override _opts = this.$options;

  constructor() {
    super();

    this.$refInput.placeholder = " ";
  }

  protected override renderControl() {
    this.$refInput.id = this.#ctr.uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    const s = this.$refLabel.appendChild(document.createElement("span"));
    s.appendChild(this.$refInput);
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.appendEvent(this.$refInput, "input", this.onInput as any);
  }

  #inputTimer?: number;
  protected onInput(e: Event & { currentTarget: HTMLInputElement }) {
    this._validTimer && clearTimeout(this._validTimer);
    const v = e.currentTarget.value;

    if (this._opts.debounceMs) {
      this.#inputTimer && clearTimeout(this.#inputTimer);
      this.#inputTimer = window.setTimeout(() => this.setValue(v as any), this._opts.debounceMs);
    } else {
      this.setValue(v as any);
    }
  }

  protected override setValue(v: ValueType | undefined) {
    super.setValue(v);

    const p = this.#ctr.provideInputValue(v, this);
    if (p instanceof Promise) {
      p.then((s) => (this.$refInput.value = s));
    } else {
      this.$refInput.value = p;
    }
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
      // @ts-expect-error
      [tagName]: WUPBaseControlTypes.JSXControlProps<WUPTextControl>;
    }
  }
}

const el = document.createElement(tagName);
el.$options.name = "testMe";
el.$options.validations = {
  required: true,
  max: 2,
  min: (v, ctrl) => v.length > 500 && "This is error",
  extra: (v) => "test Me",
};

// el.$validate();
