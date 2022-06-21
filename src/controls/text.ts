import onFocusGot from "../helpers/onFocusGot";
import { onEvent } from "../indexHelpers";
import WUPBaseControl, { WUPBaseIn } from "./baseControl";

const emailReg =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const tagName = "wup-text";
export namespace WUPTextIn {
  export interface Def {
    /** Debounce time to wait for user finishes typing to start validate and provide $change event
     * @defaultValue 0; */
    debounceMs?: number;
    /** Select whole text when input got focus (when input is not readonly and not disabled);
     * @defaultValue true */
    selectOnFocus: boolean;
    /** Show/hide clear button
     * @defaultValue true */
    hasButtonClear: boolean;
  }

  export interface Opt {}

  export type Generics<
    ValueType = string,
    ValidationKeys extends WUPBase.ValidationMap = WUPText.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPBaseIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = string> = Generics<T>["Defaults"];
  export type GenOpt<T = string> = Generics<T>["Options"];
}

declare global {
  namespace WUPText {
    interface ValidationMap extends WUPBase.ValidationMap {
      min: number;
      max: number;
      email: boolean;
    }
    interface EventMap extends WUPBase.EventMap {}
    interface Defaults<T = string> extends WUPTextIn.GenDef<T> {}
    interface Options<T = string> extends WUPTextIn.GenOpt<T> {}
    interface JSXProps<T extends WUPTextControl> extends WUPBase.JSXProps<T> {}
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPTextControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPText.JSXProps<WUPTextControl>;
    }
  }
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
  EventMap extends WUPText.EventMap = WUPText.EventMap
> extends WUPBaseControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextControl;

  static observedOptions = (super.observedOptions as Set<keyof WUPText.Options>).add("hasButtonClear") as any;

  static get $styleRoot(): string {
    return `:root {
      --ctrl-btn-clear-hover: rgba(255, 0, 0, 0.1);
      --ctrl-icon-hover-size: 10px;
     }`;
  }

  static get $style(): string {
    return `${super.$style}
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
          color: inherit;
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
        :host input:-webkit-autofill {
          font: inherit;
          -webkit-background-clip: text;
        }
        :host input:autofill {
          font: inherit;
          background-clip: text;
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
        :host label button:after,
        :host label:after,
        :host label:before {
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
        :host label:after {
          margin-right: calc(var(--ctrl-icon-size) / -2);
        }
        :host label:before {
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
        :host button[clear]:after {
          content: "";
          padding: 0;
          background-color: var(--ctrl-label);
          -webkit-mask-image: var(--wup-icon-cross);
          mask-image: var(--wup-icon-cross);
        }
        :host button[clear]:after,
        :host button[clear]:before {
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
          :host button[clear]:hover:before {
            content: "";
            border-radius: 50%;
            box-shadow: inset 0 0 0 99999px var(--ctrl-btn-clear-hover);
          }
          :host button[clear]:hover:after {
            background-color: var(--ctrl-err-text);
          }
          :host[readonly] button[clear] {
            pointer-events: none;
          }
        }`;
  }

  /** Get rawValue for input based on argument [value] */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static $provideInputValue<T, C extends WUPTextControl<T>>(v: T | undefined, ctrl: C): string | Promise<string> {
    return v != null ? (v as any).toString() : "";
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPText.Defaults = {
    ...WUPBaseControl.$defaults,
    selectOnFocus: true,
    hasButtonClear: true,
    validationRules: Object.assign(WUPBaseControl.$defaults.validationRules, {
      min: (v, setV) => v.length < setV && `Min length is ${setV} characters`,
      max: (v, setV) => v.length > setV && `Max length is ${setV} characters`,
      email: (v, setV) => setV && !emailReg.test(v) && "Please enter a valid email address",
    } as WUPText.Defaults["validationRules"]),
  };

  $options: WUPText.Options<ValueType> = {
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
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    this.$refInput.type = "text";
    const s = this.$refLabel.appendChild(document.createElement("span"));
    s.appendChild(this.$refInput); // input appended to span to allow user user :after,:before without padding adjust
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);
  }

  protected override gotReady() {
    super.gotReady();
    this.appendEvent(this.$refInput, "input", this.gotInput as any);
  }

  protected override gotChanges(propsChanged: Array<keyof WUPText.Options> | null) {
    super.gotChanges(propsChanged as any);

    // todo implement password input
    const isPwd = this._opts.name?.includes("password");
    this.$refInput.type = isPwd ? "password" : "text";
    this.$refInput.autocomplete = this.$autoComplete || (isPwd ? "new-password" : "off"); // otherwise form with email+password ignores autocomplete: "off" if previously it was saved
    // it can be ignored by browsers. To fix > https://stackoverflow.com/questions/2530/how-do-you-disable-browser-autocomplete-on-web-form-field-input-tags
    // https://stackoverflow.com/questions/11708092/detecting-browser-autofill

    setTimeout(() => {
      this._opts.selectOnFocus &&
        !this.$refInput.readOnly &&
        this.disposeLstInit.push(onFocusGot(this, () => this.$refInput.select()));
    }); // timeout required because selectControl can setup readOnly after super.gotChanges

    if (this._opts.hasButtonClear && !this.$refBtnClear) {
      const bc = this.$refLabel.appendChild(document.createElement("button"));
      this.$refBtnClear = bc;
      bc.setAttribute("clear", "");
      bc.setAttribute("aria-hidden", "true");
      bc.tabIndex = -1;
      const r = onEvent(bc, "click", (e) => {
        e.stopPropagation(); // prevent from affect on parent
        e.preventDefault(); // prevent from submit
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

  protected override setValue(v: ValueType | undefined, canValidate = true) {
    super.setValue(v, canValidate);
    this.setInputValue(v);
  }

  protected setInputValue(v: ValueType | undefined) {
    const p = this.#ctr.$provideInputValue(v, this);
    if (p instanceof Promise) {
      p.then((s) => (this.$refInput.value = s));
    } else {
      this.$refInput.value = p;
    }
  }
}

customElements.define(tagName, WUPTextControl);

// todo all $defaults.validationRules are inherrited and use common object. So every rule-name must be unique

// testcase: form with email+password ignores autocomplete: "off" if previously it was saved
