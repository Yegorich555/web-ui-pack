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

  export interface Opt {
    /** Make input masked
     * @example
     * "0000-00-00" // date in format yyyy-mm-dd
     * "##0.##0.##0.##0" // IPaddress
     * "+1(000) 000-0000" // phoneNumber
     * `0` // required digit
     * '#' // optional digit
     * //todo details about currency
     */
    mask?: string;
    /** Replace missed masked values with placeholder; for date maskholder the same as format 'yyyy-mm-dd' */
    maskholder?: string;
  }

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
      /** Called when value parsing from input is invalid (skipped on default validation logic) */
      _invalidParse: true;
    }
    interface EventMap extends WUPBase.EventMap {}
    interface Defaults<T = string> extends WUPTextIn.GenDef<T> {}
    interface Options<T = string> extends WUPTextIn.GenOpt<T> {}
    interface JSXProps<T extends WUPTextControl> extends WUPBase.JSXProps<T> {
      /** @deprecated Make input masked
       * @example
       * "0000-00-00" // date in format yyyy-mm-dd
       * "##0.##0.##0.##0" // IPaddress
       * "+1(000) 000-0000" // phoneNumber
       * `0` // required digit
       * '#' // optional digit
       */
      mask?: string;
      /** @deprecated Replace missed masked values with placeholder; for date maskholder the same as format 'yyyy-mm-dd' */
      maskholder?: string;
    }
    interface InputEvent extends Event {
      currentTarget: HTMLInputElement;
      /** Call it to prevent calling setValue by input event */
      preventSetValue: () => void;
      setValuePrevented: boolean;
    }
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

/** Form-control with text-input
 * @example
  const el = document.createElement("wup-text");
  el.$options.name = "email";
  el.$options.validations = { required: true, max: 100, email: true };
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-text name="firstName" initvalue="Donny" validations="myValidations"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input/>
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 */
export default class WUPTextControl<
  ValueType = string,
  EventMap extends WUPText.EventMap = WUPText.EventMap
> extends WUPBaseControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextControl;

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUPText.Options>;
    arr.push("clearButton", "maskholder");
    return arr;
  }

  static get observedAttributes(): Array<LowerKeys<WUPText.Options>> {
    const arr = super.observedAttributes as Array<LowerKeys<WUPText.Options>>;
    arr.push("maskholder");
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
        :host input,
        :host [maskholder] {
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
        :host [maskholder] {
          position: absolute;
          opacity: 0.65;
          display: none;
          pointer-events: none;
        }
        :host [maskholder]>i {
          visibility: hidden
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
        :host input:not(:focus)::placeholder {
          color: transparent;
        }
        :host input:focus + *,
        :host input:not(:placeholder-shown) + *,
        :host legend {
          top: 0.2em;
          transform: scale(0.9);
        }
        :host:focus-within [maskholder] {
          display: initial;
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
  static $defaults: WUPText.Defaults<string> = {
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
      _invalidParse: (v) => v === undefined && "Invalid value",
    },
  };

  $options: WUPText.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  $refBtnClear?: HTMLButtonElement;
  $refMaskholder?: HTMLSpanElement;

  constructor() {
    super();

    this.$refInput.placeholder = " ";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override parseValue(text: string, _out?: { showError?: boolean }): ValueType | undefined {
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
    onEvent(
      bc,
      "click",
      (e) => {
        e.stopPropagation(); // prevent from affect on parent
        e.preventDefault(); // prevent from submit
        this.clearValue();
      },
      { passive: false }
    );
    return bc;
  }

  protected override gotFocus(): Array<() => void> {
    const arr = super.gotFocus();
    const r = this.appendEvent(this.$refInput, "input", (e) => {
      (e as WUPText.InputEvent).setValuePrevented = false;
      (e as WUPText.InputEvent).preventSetValue = () => ((e as WUPText.InputEvent).setValuePrevented = true);
      this.gotInput(e as WUPText.InputEvent);
    });
    this._opts.selectOnFocus && !this.$refInput.readOnly && this.$refInput.select();

    arr.push(r);
    return arr;
  }

  protected override gotChanges(propsChanged: Array<keyof WUPText.Options> | null): void {
    // apply mask options
    this._opts.mask = this.getAttribute("mask") ?? this._opts.mask;
    this._opts.maskholder = this.getAttribute("maskholder") ?? this._opts.maskholder;
    if (this._opts.maskholder) {
      if (!this.$refMaskholder) {
        const m = document.createElement("span");
        m.setAttribute("aria-hidden", "true");
        m.setAttribute("maskholder", "");
        m.appendChild(document.createElement("i"));
        m.append("");
        this.$refInput.parentElement!.prepend(m);
        this.$refMaskholder = m;
      }
    } else if (this.$refMaskholder) {
      this.$refMaskholder.remove();
      this.$refMaskholder = undefined;
    }

    super.gotChanges(propsChanged as any);

    if (this._opts.clearButton) {
      this.$refBtnClear = this.$refBtnClear || this.renderBtnClear();
    } else if (this.$refBtnClear) {
      this.$refBtnClear.remove();
      this.$refBtnClear = undefined;
    }

    setTimeout(() => !this.$value && this.setInputValue(undefined)); // wait for timeout (wait for applying of inherrited) to set maskholder
  }

  #inputTimer?: number;
  /** Called when user types text */
  protected gotInput(e: WUPText.InputEvent): void {
    let txt = e.currentTarget.value;
    txt = this._opts.mask ? this.maskInput(this._opts.mask, this._opts.maskholder) : txt;

    const outRef: { showError?: boolean } = {};
    const v = this.parseValue(txt, outRef);
    if (outRef.showError) {
      // parseValue must return valid/not-valid result
      const vl = (this.validations as WUPText.Options["validations"])?._invalidParse;
      const msg = typeof vl === "function" ? vl : this.#ctr.$defaults.validationRules._invalidParse;
      this.$showError(msg!.call(this, undefined as any, true, this) as string);
    } else {
      this._isValid !== false && this.$hideError();
      if (!e.setValuePrevented) {
        this._validTimer && clearTimeout(this._validTimer);
        if (this._opts.debounceMs) {
          this.#inputTimer && clearTimeout(this.#inputTimer);
          this.#inputTimer = window.setTimeout(() => this.setValue(v), this._opts.debounceMs);
        } else {
          this.setValue(v);
        }
      }
    }
  }

  // pattern ###0.## where # - optional, 0 - required
  /** Called to apply mask-behavior (on "input" event) */
  protected maskInput(mask: string, maskholder?: string): string {
    const el = this.$refInput as HTMLInputElement & { _prev?: string };
    const v = el.value;

    const next = this.maskProcess(v, mask, { prediction: true, lazy: true });
    const isCharNotAllowed = v.length > next.length;
    const isNeedRemove = el.selectionStart === v.length && el._prev?.startsWith(v) && next === el._prev;
    if (isNeedRemove) {
      // console.warn("need remove", { next, prev: el._prev, v, isNeedRemove });
      // case when 1234- for pattern 0000-0 and user tries to remove last number; prediction adds removed separator again
      // next = next.substring(0, next.length - 2); // todo it doesn't work if user removes from the middle
    }

    const setMaskHolder = (str: string): void => {
      if (maskholder) {
        this.$refMaskholder!.lastChild!.textContent = maskholder.substring(str.length); // todo it's wrong for optional numbers
        this.$refMaskholder!.firstElementChild!.textContent = str;
      }
    };

    const ds = (el.selectionEnd || v.length) - v.length;

    const setV = (): void => {
      el.value = next;
      el._prev = next;
      el.selectionEnd = next.length - ds; // todo it's wrong if user types in the middle
      el.selectionStart = el.selectionEnd;
      setMaskHolder(next);
    };
    if (isCharNotAllowed) {
      setMaskHolder(v);
      setTimeout(setV, 100); // set value after time to show user typed value before mask applied
    } else {
      setV();
    }
    return next;
  }

  /**
   * Format string accoring to pattern
   * @param v string that must be processed
   * @param pattern 0000-00-00 (for date yyyy-MM-dd), ##0.##0.##0.##0 (for IPaddress), $ ### ### ### ### ### ##0 (for currency)
   * #### where # - optional, 0 - required numbers
   * @returns corrected result
   */
  maskProcess(
    v: string,
    pattern: string,
    options = {
      /** Add next constant-symbol to allow user don't worry about non-digit values */
      prediction: true,
      /** Add missed zero: for pattern '0000-00' and string '1 ' result will be "0001-"  */
      lazy: true,
    }
  ): string {
    if (!v) {
      return "";
    }

    const charIsNumber = (str: string, i: number): boolean => {
      const ascii = str.charCodeAt(i);
      return ascii > 47 && ascii < 58;
    };

    let vi = 0;
    let pi = 0;
    const s: string[] = [""];
    const regSep = /[., _+-/\\]/;
    const ln = Math.max(v.length, pattern.length);
    let cntOptional = 0; // count of optionalNumbers
    for (; vi < ln; ++vi, ++pi) {
      let p = pattern[pi];
      const c = v[vi];
      if (p === undefined) {
        // || c === undefined) {
        return s.join("");
      }
      switch (p) {
        case "0":
          if (!charIsNumber(v, vi)) {
            if (cntOptional) {
              --cntOptional;
              --vi;
              continue;
            }
            if (options.lazy && regSep.test(c)) {
              const last = s[s.length - 1];
              if (charIsNumber(last, 0)) {
                s[s.length - 1] = `0${last}`; // prepend '0' only if user typed number before '1234--' >>> '1234-', '1234-1-' >>> '1234-01-'
                --vi;
                continue;
              } else {
                return s.join("");
              }
            } else {
              return s.join("");
            }
          }
          break;
        case "#":
          if (!charIsNumber(v, vi)) {
            --vi;
            continue;
          }
          ++cntOptional;
          break;
        case c:
          cntOptional = 0;
          s.push(c);
          s.push(""); // for lazy mode
          continue;
        case "\0":
          // todo allow user to use char '#'
          cntOptional = 0;
          if (v.charCodeAt(vi) === 0) {
            // todo check it >> s.push("");
            break;
          } else p = "0";
        // eslint-disable-next-line no-fallthrough
        default: {
          cntOptional = 0;
          const isNum = charIsNumber(v, vi);
          if (isNum || regSep.test(c)) {
            s.push(p);
            s.push(""); // for lazy mode
            isNum && --vi;
            continue;
          } else if (options.prediction && c === undefined) {
            s.push(p); // past suffix at the end
            s.push(""); // for lazy mode
            continue;
          } else {
            return s.join("");
          }
        }
        // break;
      }

      s[s.length - 1] += c;
    }

    return s.join("");
  }

  protected override setValue(v: ValueType | undefined, canValidate = true): boolean | null {
    const isChanged = super.setValue(v, canValidate);
    isChanged && this.setInputValue(v); // todo it can be wrong for previous tests ?
    isChanged && this._isValid !== false && this.$hideError();
    return isChanged;
  }

  /** Called to update value for <input/> */
  protected setInputValue(v: ValueType | undefined): void {
    const str = v != null ? (v as any).toString() : "";
    this.$refInput.value = str;
    this._opts.mask && this.maskInput(this._opts.mask, this._opts.maskholder);
  }
}

customElements.define(tagName, WUPTextControl);
// todo example how to create bult-in dropdown before the main input (like phone-number with ability to select countryCode)
// gotInput > setMask > parseValue >... setValue ....> toString > setInput > setMask

// function testMask(v: string, pattern = "0000-00-00"): void {
//   console.warn("testMask", { p: pattern, v, will: WUPTextControl.prototype.maskProcess(v, pattern) });
// }

// testMask("192.16. ", "##0.##0.##0.##0");
// testMask("$ 5", "$ #####0 USD");
// testMask("1.2.3.4", "##0.##0.##0.##0");
