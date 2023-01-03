import onScroll from "../helpers/onScroll";
import { localeInfo, mathSumFloat, onEvent } from "../indexHelpers";
import WUPBaseControl from "./baseControl";
import WUPTextControl, { WUPTextIn } from "./text";

const tagName = "wup-num";
export namespace WUPNumberIn {
  export interface Format {
    /** Decimal separator; for number 123.4 it's dot
     * localeInfoInfo @see localeInfo.sepDecimal */
    sepDecimal?: string;
    /** Thouthands separator; for number 1,234.5 it's comma
     *  localeInfoInfo @see localeInfo.sep1000 */
    sep1000?: string;
    /** Maximum displayed fraction digits; for 123.45 it's 2
     * @defaultValue 0 */
    maxDecimal?: number;
    /** Minimun displayed fraction digits; if pointed 2 then 123.4 goes to 123.40
     * @defaultValue 0 */
    minDecimal?: number;
  }
  export interface Def {}
  export interface Opt {
    format?: Format;
  }
  export type Generics<
    ValueType = number,
    ValidationKeys extends WUP.BaseControl.ValidationMap = WUP.Number.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPTextIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = number> = Generics<T>["Defaults"];
  export type GenOpt<T = number> = Generics<T>["Options"];
}

declare global {
  namespace WUP.Number {
    interface ValidationMap
      extends WUP.BaseControl.ValidationMap,
        Pick<WUP.Text.ValidationMap, "_mask" /* | "_parse" */> {
      /** If $value < pointed shows message 'Min value {x}` */
      min: number;
      /** If $value < pointed shows message 'Max value {x}` */
      max: number;
    }
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface Defaults<T = number> extends WUPNumberIn.GenDef<T> {}
    interface Options<T = number> extends WUPNumberIn.GenOpt<T> {}

    // @ts-expect-error
    interface JSXProps<T extends WUPNumberControl> extends WUP.Text.JSXProps<T> {
      // some options can be here
    }
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPNumberControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Number.JSXProps<WUPNumberControl>;
    }
  }
}

/** Form-control with number-input
 * @example
  const el = document.createElement("wup-num");
  el.$options.name = "number";
  el.$options.validations = {
    min: 1,
    max: 1000,
  };

  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-num name="number" validations="myValidations"/>
  </wup-form>;
 * @see WUPTextControl
 */
// @ts-expect-error
export default class WUPNumberControl<
  ValueType = number,
  EventMap extends WUP.Number.EventMap = WUP.Number.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  #ctr = this.constructor as typeof WUPNumberControl;

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.Number.Options>;
    arr.push("format");
    return arr;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Number.Defaults<number> = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
      _mask: WUPTextControl.$defaults.validationRules._mask as any,
      // _parse: WUPTextControl.$defaults.validationRules._parse as any,
      min: (v, setV) => (v == null || v < setV) && `Min value is ${setV}`,
      max: (v, setV) => (v == null || v > setV) && `Max value is ${setV}`,
    },
  };

  $options: WUP.Number.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  /** Returns $options.format joined with defaults */
  get $format(): Required<WUPNumberIn.Format> {
    const f = this._opts.format;
    return {
      sepDecimal: localeInfo.sepDecimal,
      sep1000: localeInfo.sep1000,
      ...f,
      maxDecimal: f?.maxDecimal ?? f?.minDecimal ?? 0,
      minDecimal: f?.minDecimal ?? 0,
    };
  }

  // WARN usage format #.### impossible because unclear what sepDec/sep100 and what if user wants only limit decimal part
  /** Called when need to format value */
  protected valueToInput(v: ValueType | undefined): string {
    if (v == null) {
      return "";
    }

    if (this._opts.mask) {
      return (v as any).toString();
    }
    // eslint-disable-next-line prefer-const
    let [int, dec] = (v as any).toString().split(".");
    const f = this.$format;
    if (f.sep1000) {
      for (let i = int.length - 3; i > 0; i -= 3) {
        int = `${int.substring(0, i)}${f.sep1000}${int.substring(i)}`;
      }
    }

    if (dec || f.minDecimal || f.maxDecimal) {
      dec = dec === undefined ? "" : dec.substring(0, Math.min(f.maxDecimal, dec.length));
      dec += "0".repeat(Math.max(f.minDecimal - dec.length, 0));
      if (dec.length) {
        return int + this.$format.sepDecimal + dec;
      }
    }

    return int;
  }

  override parse(text: string): ValueType | undefined {
    const v = Number(text);
    if (!text || Number.isNaN(v)) {
      return undefined;
    }
    return v as any;
  }

  override canParseInput(text: string): boolean {
    const f = this.$format;
    if (f.maxDecimal > 0 && text.endsWith(f.sepDecimal)) {
      return false; // case "4.|" - use must able to type '.'
    }
    return true;
  }

  override parseInput(text: string): ValueType | undefined {
    // such parsing is better then Number.parse because ignores wrong chars
    let v: number | undefined = 0;
    let ok = false;
    let dec: number | null = null;
    let decLn = 1;
    let decI = 0;
    const f = this.$format;
    for (let i = 0; i < text.length; ++i) {
      const ascii = text.charCodeAt(i);
      const num = ascii - 48;
      if (num >= 0 && num <= 9) {
        ok = true;
        if (dec === null) {
          v = v * 10 + num;
        } else if (f.maxDecimal >= ++decI) {
          dec = dec * 10 + num;
          decLn *= 10;
        }
      } else if (ascii === f.sepDecimal.charCodeAt(0)) {
        // WARN: expected sepDecimal is single char
        dec = 0;
      }
    }

    if (dec) {
      v += dec / decLn;
    }
    if (!ok) {
      v = undefined;
    } else if (text.charCodeAt(0) === 45) {
      v *= -1; // case: "-123"
    }

    if (ok && (v! > Number.MAX_SAFE_INTEGER || v! < Number.MIN_SAFE_INTEGER)) {
      // throw new RangeError("Out of range");
      this.declineInput(); // decline looks better than error "Out of range"
      return v as any;
    }

    if (!this._opts.mask) {
      // otherwise it conflicts with mask
      const next = this.valueToInput(v as any);
      const hasDeclined = this._canShowDeclined && text.length > next.length;
      if (hasDeclined && next === this.valueToInput(this.$value)) {
        // WARN: don't compare v === this.$value because $value=4.567 but format can be 4.56
        this.declineInput();
      } else if (text !== next) {
        const el = this.$refInput;
        // fix cursor position
        const pos = el.selectionStart || 0;
        let dp = 0;
        for (let i = 0, k = 0; k < pos && i < next.length; ++i, ++k) {
          const ascii = text.charCodeAt(k);
          if (!(ascii >= 48 && ascii <= 57)) {
            --i;
            --dp;
          } else if (next[i] !== text[k]) {
            ++dp;
            --k;
          }
        }
        // el.value = next;
        this.setInputValue(v as any); // WARN: it refreshes onceError but calls valueToInput again
        el.selectionStart = pos + dp;
        el.selectionEnd = el.selectionStart;
      }
    }

    return v as any;
  }

  protected override canHandleUndo(): boolean {
    return true;
  }

  protected override setInputValue(v: ValueType | undefined): void {
    const txt = this.valueToInput(v);
    super.setInputValue(txt);
  }

  protected override renderControl(): void {
    super.renderControl();
    this.$refInput.setAttribute("role", "spinbutton");
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Number.Options> | null): void {
    super.gotChanges(propsChanged as any);
    propsChanged?.includes("format") && this.setInputValue(this.$value);
  }

  protected override gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    super.gotBeforeInput(e);

    if (!this._opts.mask) {
      const el = e.target;
      let pos = el.selectionStart || 0;
      if (pos === el.selectionEnd) {
        let isBefore = false;
        switch (e!.inputType) {
          case "deleteContentBackward":
            --pos;
            isBefore = true;
          // eslint-disable-next-line no-fallthrough
          case "deleteContentForward":
            if (el.value[pos] === this.$format.sep1000) {
              el.selectionStart = pos + (isBefore ? 0 : 1); // case "1|,234" + Delete => 1|34
              // el.selectionStart = pos; // case "1,|234" + Backspace => 1|34
              el.selectionEnd = el.selectionStart;
            }
            break;
          default:
            break;
        }
      }
    }
  }

  private _canShowDeclined?: boolean;
  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    if (!this._opts.mask) {
      switch (e!.inputType) {
        case "insertText":
        case "insertFromPaste":
          this._canShowDeclined = true;
          break;
        default:
          delete this._canShowDeclined;
          break;
      }
    }

    super.gotInput(e);
  }

  protected override gotFocus(): Array<() => void> {
    const r = super.gotFocus();
    this.$refInput.setAttribute("inputmode", "numeric"); // otherwise textControl removes it if mask isn't applied
    r.push(
      onScroll(
        this, //
        (v) => this.gotIncrement(-1 * v),
        { skip: () => this.$isReadOnly || this.$isDisabled }
      )
    ); // allow inc/dec via scroll/swipe
    r.push(
      onEvent(this, "keyup", (e) => {
        /* istanbul ignore else */
        if (!e.altKey) delete this._isAltDown;
        /* istanbul ignore else */
        if (!e.shiftKey) delete this._isShiftDown;
        /* istanbul ignore else */
        if (!e.ctrlKey) delete this._isCtrlDown;
      })
    );
    r.push(() => {
      delete this._isAltDown;
      delete this._isShiftDown;
      delete this._isCtrlDown;
    });
    return r;
  }

  _isAltDown?: true;
  _isShiftDown?: true;
  _isCtrlDown?: true;
  protected override gotKeyDown(e: KeyboardEvent): void {
    super.gotKeyDown(e);

    if (e.altKey) this._isAltDown = true;
    if (e.shiftKey) this._isShiftDown = true;
    if (e.ctrlKey) this._isCtrlDown = true;

    let v = 0;
    switch (e.key) {
      case "ArrowUp":
        ++v;
        break;
      case "ArrowDown":
        --v;
        break;
      default:
        break;
    }
    if (v) {
      e.preventDefault();
      this.gotIncrement(v);
    }
  }

  /** Called when user tries to increment/decrement value (via ArrowKeys/Mouse/Swipe) */
  protected gotIncrement(dval: number): void {
    if (this._isAltDown) dval *= 0.1;
    else if (this._isShiftDown) dval *= 10;
    else if (this._isCtrlDown) dval *= 100;

    const v = +(this.$value ?? 0);
    const hasFloat = this._isAltDown || v % 1 !== 0;
    const next = hasFloat ? mathSumFloat(v, dval) : v + dval;

    const el = this.$refInput;
    const inputType = dval > 0 ? "_inc" : "_dec";
    const data = this.valueToInput(next as any);
    if (el.dispatchEvent(new InputEvent("beforeinput", { inputType, data, bubbles: true, cancelable: true }))) {
      el.value = data;
      el.dispatchEvent(new InputEvent("input", { inputType, bubbles: true }));
    }
  }
}

customElements.define(tagName, WUPNumberControl);
