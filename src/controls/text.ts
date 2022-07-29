import { onEvent } from "../indexHelpers";
import { WUPcssIcon } from "../styles";
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
    /** Show/hide clear button. @see ClearActions
     * @defaultValue true */
    clearButton: boolean;
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

  /** Text announced by screen-readers when input cleared; @defaultValue `input cleared` */
  static get $ariaCleared(): string {
    return "input cleared";
  }

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUPText.Options>;
    arr.push("clearButton");
    return arr;
  }

  static get $styleRoot(): string {
    return `:root {
      --ctrl-clear-hover: rgba(255,0,0,0.1);
      --ctrl-clear-hover-size: 22px;
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
          ${WUPcssIcon}
          -webkit-mask-image: none;
          mask-image: none;
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
        :host button[clear]:before {
          width: var(--ctrl-clear-hover-size);
          padding-top: var(--ctrl-clear-hover-size);
        }
        @media (hover: hover) {
          :host button[clear]:hover {
            box-shadow: none;
          }
          :host button[clear]:hover:before {
            content: "";
            border-radius: 50%;
            box-shadow: inset 0 0 0 99999px var(--ctrl-clear-hover);
          }
          :host button[clear]:hover:after {
            background-color: var(--ctrl-err-text);
          }
          :host[readonly] button[clear] {
            pointer-events: none;
          }
        }`;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPText.Defaults = {
    ...WUPBaseControl.$defaults,
    selectOnFocus: true,
    clearButton: true,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
      min: (v, setV) =>
        (v === undefined || v.length < setV) && `Min length is ${setV} character${setV === 1 ? "" : "s"}`,
      max: (v, setV) =>
        (v === undefined || v.length > setV) && `Max length is ${setV} character${setV === 1 ? "" : "s"}`,
      email: (v, setV) => setV && (!v || !emailReg.test(v)) && "Invalid email address",
    },
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

  protected override parseValue(text: string): ValueType | undefined {
    return (text || undefined) as unknown as ValueType;
  }

  protected override renderControl(): void {
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    this.$refInput.type = "text";
    const s = this.$refLabel.appendChild(document.createElement("span"));
    s.appendChild(this.$refInput); // input appended to span to allow user user :after,:before without padding adjust
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);
  }

  /** Create & append element to control */
  protected renderBtnClear(): HTMLButtonElement {
    const bc = document.createElement("button");
    const span = this.$refLabel.querySelector("span");
    if (span!.nextElementSibling) {
      this.$refLabel.insertBefore(bc, span!.nextElementSibling);
    } else {
      this.$refLabel.appendChild(bc);
    }
    bc.setAttribute("clear", "");
    bc.setAttribute("aria-hidden", true);
    bc.tabIndex = -1;
    onEvent(bc, "click", (e) => {
      e.stopPropagation(); // prevent from affect on parent
      e.preventDefault(); // prevent from submit
      this.clearValue();
    });
    return bc;
  }

  protected override gotFocus(): Array<() => void> {
    const arr = super.gotFocus();
    const r = this.appendEvent(this.$refInput, "input", (e) => this.gotInput(e, this.$refInput));
    this._opts.selectOnFocus && !this.$refInput.readOnly && this.$refInput.select();

    arr.push(r);
    return arr;
  }

  protected override gotChanges(propsChanged: Array<keyof WUPText.Options> | null): void {
    super.gotChanges(propsChanged as any);

    if (this._opts.clearButton && !this.$refBtnClear) {
      this.$refBtnClear = this.renderBtnClear();
    }
    if (!this._opts.clearButton && this.$refBtnClear) {
      this.$refBtnClear.remove();
      this.$refBtnClear = undefined;
    }
  }

  #inputTimer?: number;
  /** Called when user types text */
  protected gotInput(e: Event, inputEl: HTMLInputElement): void {
    this._validTimer && clearTimeout(this._validTimer);
    const v = this.parseValue(inputEl.value);

    if (this._opts.debounceMs) {
      this.#inputTimer && clearTimeout(this.#inputTimer);
      this.#inputTimer = window.setTimeout(() => this.setValue(v as any), this._opts.debounceMs);
    } else {
      this.setValue(v);
    }
  }

  protected override setValue(v: ValueType | undefined, canValidate = true): boolean | null {
    const r = super.setValue(v, canValidate);
    this.setInputValue(v);
    return r;
  }

  protected setInputValue(v: ValueType | undefined): void {
    this.$refInput.value = v != null ? (v as any).toString() : "";
  }

  protected override clearValue(canValidate = true): void {
    super.clearValue(canValidate);
    this.$refInput.select();
    !this.$refInput.value && this.$ariaSpeak(this.#ctr.$ariaCleared);
  }
}

customElements.define(tagName, WUPTextControl);

// manual testcase: form with email+password ignores autocomplete: "off" if previously it was saved

// todo docs about usage with css-variables... Maybe FAQ ???
// todo docs about removing required-asterisk-label

// todo Optimization: refactor events to be listen only by focusGot!!!
