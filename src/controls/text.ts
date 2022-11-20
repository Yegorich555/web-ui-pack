import maskInput, { IMaskInputOptions } from "../helpers/maskInput";
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
      /** If textLength < pointed shows message 'Min length is {x} characters` */
      min: number;
      /** If textLength > pointed shows message 'Max length is {x} characters` */
      max: number;
      /** If $value doesn't match email-pattern shows message 'Invalid email address` */
      email: boolean;
      /** Called when parseValue() is invalid (skipped on default validation logic) */
      _invalidParse: true; // todo maybe throw error message in this case ?
      /** Enabled if option [mask] is pointed; if input value doesn't comletely fit mask shows "Incomplete value" */
      mask: boolean;
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
      /** Returns a boolean value indicating whether or not the call to InputEvent.preventSetValue() */
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
          visibility: hidden;
          font-style: inherit;
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
        :host:focus-within input + strong,
        :host input:not(:placeholder-shown) + strong,
        :host legend {
          top: 0.2em;
          transform: scale(0.9);
        }
        :host:focus-within [maskholder] {
          display: inline-block;
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
      mask: (v, setV, c) => {
        if (setV && v !== undefined && !!(c as WUPTextControl)._opts.mask) {
          const m = maskInput(v, (c as WUPTextControl)._opts.mask!);
          const pref = !m.chunks[0].isDigit ? m.chunks[0].text : "";
          return !m.isCompleted && v !== pref && "Incomplete value";
        }
        return false;
      },
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

  protected get validations(): WUPText.Options["validations"] | undefined {
    const vls = (super.validations as WUPText.Options["validations"]) || {};
    if (this._opts.mask && vls.mask == null) vls.mask = true; // enable validation mask based on option mask
    return vls;
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

    if (!this.$refInput.readOnly) {
      if (!this.$refInput.value) {
        if (this._opts.mask) {
          this.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true, data: "To apply mask before start" })); // apply prefix/suffix from mask
        }
      } else {
        this._opts.selectOnFocus && this.$refInput.select();
      }
    }

    arr.push(() => setTimeout(r));
    return arr;
  }

  protected override gotFocusLost(): void {
    if (this._opts.mask) {
      const prefAndSuf = maskInput("", this._opts.mask).text;
      if (this.$refInput.value === prefAndSuf) {
        this.$refInput.value = ""; // rollback prefix/suffix if user types nothing
        this.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true, data: "To rollback prefix-sufix" }));
      }
    }
    super.gotFocusLost();
  }

  protected override gotChanges(propsChanged: Array<keyof WUPText.Options> | null): void {
    // apply mask options
    this._opts.mask = this.getAttribute("mask") ?? this._opts.mask;
    this._opts.maskholder = this.getAttribute("maskholder") ?? this._opts.maskholder;
    if (!this._opts.maskholder && this.$refMaskholder) {
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

  protected override gotKeyDown(e: KeyboardEvent): void {
    super.gotKeyDown(e);
    if (!this._opts.mask) {
      return;
    }

    // todo it's required only if 'prediction: true'
    // when user press Delete and user removed not digit chunk need to remove the whole chunk + 1 num
    const isBackDel = e.key === "Backspace";
    if (!isBackDel && e.key !== "Delete") {
      return;
    }
    const el = this.$refInput;
    if (el.selectionEnd !== el.selectionStart) {
      return; // skip action if several chars are selected
    }
    const v = el.value;
    const removeIndex = (isBackDel ? 0 : 1) + el.selectionStart! - 1; // char that will be removed
    if (removeIndex >= v.length || removeIndex < 0) {
      return; // nothing to remove
    }

    // case when 1234-- for pattern 0000-- and user tries to remove last number; prediction adds removed separator again
    let i = removeIndex;
    const mr = maskInput(v, this._opts.mask); // todo how to reuse options from maskInputProcess
    // console.warn(mr);
    const removeChunkInd = mr.chunks.findIndex((c) => {
      i -= c.text.length;
      return i < 0;
    })!;
    const removeChunk = mr.chunks[removeChunkInd];
    if (removeChunk.isDigit) {
      // todo when user removes required digits it's replaced by zeros but need to shift other digits from chunks
      return; // digits are removed by default
    }
    // todo need to prevent removing prefix !!!
    // todo if remove first chars than selection goes to the end: '.323.232.323'
    // todo if add digits in the middle need to shift other digits if chunk is overflow
    i = isBackDel ? removeIndex - removeChunk.text.length + 1 : removeIndex;
    // todo user can't delete in case "##0|.##" with key Delete
    const next = v.substring(0, i) + v.substring(el.selectionStart!);
    el.selectionStart = i;
    el.selectionEnd = i;
    el.value = next;
    // console.warn(next, i);
  }

  #inputTimer?: number;
  /** Called when user types text OR when need to apply/reset mask (on focusGot, focusLost) */
  protected gotInput(e: WUPText.InputEvent): void {
    let txt = e.currentTarget.value;
    txt = this._opts.mask ? this.maskInputProcess(this._opts.mask, this._opts.maskholder) : txt;
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
          this.#inputTimer = window.setTimeout(() => this.setValue(v, true, true), this._opts.debounceMs);
        } else {
          this.setValue(v, true, true);
        }
      }
    }
  }

  /** Called to apply mask-behavior (on "input" event) */
  protected maskInputProcess(
    mask: string,
    maskholder?: string,
    options: IMaskInputOptions = { lazy: true, prediction: true }
  ): string {
    const el = this.$refInput;
    const v = el.value;

    if (!v && !this.$isFocused) {
      el.value = v;
      return v; // ignore mask prefix+suffix if user isn't touched input - possible on autofill
    }
    const mr = maskInput(v, mask, options);

    const setMaskHolder = (str: string, leftLength: number): void => {
      if (!maskholder) {
        return;
      }
      if (!this.$refMaskholder) {
        const m = document.createElement("span");
        m.setAttribute("aria-hidden", "true");
        m.setAttribute("maskholder", "");
        m.appendChild(document.createElement("i"));
        m.append("");
        this.$refInput.parentElement!.prepend(m);
        this.$refMaskholder = m;
      }
      this.$refMaskholder.firstChild!.textContent = str;
      this.$refMaskholder.lastChild!.textContent = maskholder.substring(maskholder.length - leftLength);
    };

    const removedChars = Math.max(v.length - mr.text.length, 0); // chars removed after mask
    const cursorShift = (el.selectionStart !== v.length ? el.selectionStart! : 0) - removedChars;

    const setV = (): void => {
      el.value = mr.text;
      if (cursorShift || removedChars) {
        el.selectionStart = cursorShift;
        el.selectionEnd = cursorShift;
      }
      setMaskHolder(mr.text, mr.leftLength);
    };

    if (removedChars) {
      setMaskHolder(v, mr.leftLength - removedChars);
      setTimeout(setV, 100); // set value after time to show user typed value before mask applied
    } else {
      setV();
    }
    return mr.text;
  }

  protected override setValue(v: ValueType | undefined, canValidate = true, skipInput = false): boolean | null {
    const isChanged = super.setValue(v, canValidate);
    if (isChanged) {
      !skipInput && this.setInputValue(v);
      this._isValid !== false && this.$hideError();
    }
    return isChanged;
  }

  /** Called to update value for <input/> */
  protected setInputValue(v: ValueType | undefined): void {
    const str = v != null ? (v as any).toString() : "";
    this.$refInput.value = str;
    this._opts.mask && this.maskInputProcess(this._opts.mask, this._opts.maskholder);
  }
}

customElements.define(tagName, WUPTextControl);
// todo example how to create bult-in dropdown before the main input (like phone-number with ability to select countryCode)
// gotInput > setMask > parseValue >... setValue ....> toString > setInput > setMask

// (() => {
//   const div = document.body.appendChild(document.createElement("div"));
//   div.style.position = "fixed";
//   div.style.fontSize = "120px";
//   div.style.width = "100vw";
//   div.style.top = "50vh";
//   div.style.left = "0";
//   div.style.textAlign = "center";
//   div.style.background = "white";
//   div.textContent = "-3";
//   setInterval(() => {
//     div.textContent = ++div.textContent;
//   }, 1000);
// })();
