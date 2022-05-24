/* eslint-disable no-use-before-define */
import onFocusGot from "../helpers/onFocusGot";
import { onEvent } from "../indexHelpers";
import WUPBaseControl, { WUPBaseControlTypes } from "./baseControl";

export namespace WUPTextControlTypes {
  type Def = {
    /** Debounce time to wait for user finishes typing to start validate and provide $change event
     * @defaultValue 0; */
    debounceMs?: number;
    /** Select whole text when input got focus (when input is not readonly and not disabled);
     * @defaultValue true */
    selectOnFocus: boolean;
    /** Show/hide clear button
     * @defaultValue true */
    hasButtonClear: boolean;
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

  static observedOptions = (super.observedOptions as Set<keyof WUPTextControlTypes.Options>).add(
    "hasButtonClear"
  ) as any;

  static get styleRoot(): string {
    return `:root {
      --ctrl-btn-clear-hover: rgba(255, 0, 0, 0.1);
      --ctrl-icon-hover-size: 10px;
     }`;
  }

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
        }
        /* style for icons */
        :host label button,
        :host label button::after,
        :host label::after,
        :host label::before {
          display: inline-block;
          width: var(--ctrl-icon-size);
          min-height: var(--ctrl-icon-size);
          box-sizing: content-box;
          margin: 0;
          padding: 0 calc(var(--ctrl-icon-size) / 2);
          flex: 0 0 auto;
          align-self: stretch;
          cursor: pointer;
          border: none;
          box-shadow: none;
          background: var(--ctrl-label);
          -webkit-mask-size: var(--ctrl-icon-size);
          mask-size: var(--ctrl-icon-size);
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
        }
        :host label::after {
          margin-right: calc(var(--ctrl-icon-size) / -2);
        }
        :host label::before {
          margin-left: calc(var(--ctrl-icon-size) / -2);
        }
        :host label button {
           z-index: 1;
           contain: strict;
           padding: calc(var(--ctrl-icon-hover-size) / 2);
        }
        :host label>span + button {
          margin-right: -0.5em;
        }
        :host button[clear] {
          position: relative;
          background: none;
        }
        :host button[clear]::after {
          content: "";
          padding: 0;
          background-color: var(--ctrl-label);
          -webkit-mask-image: var(--wup-icon-cross);
          mask-image: var(--wup-icon-cross);
        }
        :host button[clear]::after,
        :host button[clear]::before {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          padding-top: 100%;
        }
        @media (hover: hover) {
          :host button[clear]:hover {
            box-shadow: none;
          }
          :host button[clear]:hover::before {
            content: "";
            border-radius: 50%;
            box-shadow: inset 0 0 0 99999px var(--ctrl-btn-clear-hover);
          }
          :host button[clear]:hover::after {
            background-color: var(--ctrl-err);
          }
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
    hasButtonClear: true,
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

  $refBtnClear?: HTMLButtonElement;

  constructor() {
    super();

    this.$refInput.placeholder = " ";
  }

  protected override renderControl() {
    this.$refInput.id = this.#ctr.uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    const s = this.$refLabel.appendChild(document.createElement("span"));
    s.appendChild(this.$refInput); // input appended to span to allow user user :after,:before without padding adjust
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

    // todo should we show error after clearing ?
    if (this._opts.hasButtonClear && !this.$refBtnClear) {
      const bc = this.$refLabel.appendChild(document.createElement("button"));
      this.$refBtnClear = bc;
      bc.setAttribute("clear", "");
      bc.setAttribute("aria-hidden", "true");
      bc.tabIndex = -1;
      const r = onEvent(bc, "click", (e) => {
        e.preventDefault(); // prevent from submit
        this.setValue(undefined);
      });

      this.disposeLstInit.push(r);
      this.disposeLstInit.push(() => {
        if (!this._opts.hasButtonClear) {
          bc.remove();
          this.$refBtnClear = undefined;
        }
      });
    }
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

// todo btn-clear.click deletes data, shows error & opens popup - is it correct ???
