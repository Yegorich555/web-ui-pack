/* eslint-disable no-use-before-define */
import onFocusGot from "../helpers/onFocusGot";
import WUPBaseControl, { WUPBaseControlTypes } from "./baseControl";

export namespace WUPTextControlTypes {
  type Def = {
    /** Debounce time to wait for user finishes typing to start validate and provide $change event
     * @defaultValue 0; */
    debounceMs?: number;
    /** Select whole text when input got focus (when input is not readonly and not disabled);
     * @defaultValue true */
    selectOnFocus: boolean;
  };

  // eslint-disable-next-line @typescript-eslint/ban-types
  type Opt = {};

  export type ValidationMap = WUPBaseControlTypes.ValidationMap & {
    min: number;
    max: number;
  };

  export type Generics<
    ValueType = string,
    ValidationKeys extends WUPBaseControlTypes.ValidationMap = ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPBaseControlTypes.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;

  export type Validation<T = string> = Generics<T>["Validation"];
  export type Defaults<T = string> = Generics<T>["Defaults"];
  export type Options<T = string> = Generics<T>["Options"];
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
export default class WUPTextControl<
  ValueType = string,
  EventMap extends WUPBaseControlTypes.EventMap = WUPBaseControlTypes.EventMap
> extends WUPBaseControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextControl;

  /** StyleContent related to component */
  static get style(): string {
    return `
        :host {
          cursor: text;
        }
        :host label > span {
          width: 100%;
          position: relative;
        }
        :host input {
          width: 100%;
          box-sizing: border-box;
          font: inherit;
          margin: 0;
          padding: var(--ctrl-padding);
          padding-left: 0;
          padding-right: 0;
          border: none;
          background: none;
          outline: none;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        :host input + * {
          display: block;
          position: absolute;
          top: 50%;
          left: 0;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
          max-width: 100%;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          transform-origin: top left;
          transform: translateY(-50%);
          font-weight: normal;
          text-decoration: none;
        }
        @media not all and (prefers-reduced-motion) {
          :host input + * {
            transition: top var(--anim), transform var(--anim), color var(--anim);
          }
        }
        :host input:focus + *,
        :host input:not(:placeholder-shown) + *,
        :host legend {
          top: 0.2em;
          transform: scale(0.9);
        }`;
  }

  /** Get rawValue for input based on argument [value] */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static provideInputValue<T, C extends WUPTextControl<T>>(v: T | undefined, ctrl: C): string | Promise<string> {
    return v != null ? (v as any).toString() : "";
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPTextControlTypes.Defaults = {
    ...WUPBaseControl.$defaults,
    selectOnFocus: true,
    validationRules: {
      required: WUPBaseControl.$defaults.validationRules.required,
      min: (v, setV) => v.length < setV && `Min length is ${setV} characters`,
      max: (v, setV) => v.length > setV && `Max length is ${setV} characters`,
    },
  };

  $options: WUPTextControlTypes.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

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

  protected override gotReady() {
    super.gotReady();
    this.appendEvent(this.$refInput, "input", this.gotInput as any);
  }

  protected override gotReinit() {
    super.gotReinit();

    setTimeout(() => {
      this._opts.selectOnFocus &&
        !this.$refInput.readOnly &&
        this.disposeLstInit.push(onFocusGot(this, () => this.$refInput.select()));
    }); // timeout requires because selectControl can setup readOnly after super.gotReinit
  }

  #inputTimer?: number;
  /** Fired when user types text */
  protected gotInput(e: Event & { currentTarget: HTMLInputElement }) {
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
    this.setInputValue(v);
  }

  protected setInputValue(v: ValueType | undefined) {
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
      [tagName]: WUPBaseControlTypes.JSXControlProps<WUPTextControl>;
    }
  }
}

// todo remove after tests
const el = document.createElement(tagName);
el.$options.name = "testMe";
el.$options.validations = {
  required: true,
  max: 2,
  min: (v) => v.length > 500 && "This is error",
  extra: (v) => "test Me",
};
// el.$validate();
