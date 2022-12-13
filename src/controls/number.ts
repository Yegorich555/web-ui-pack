import onScroll from "../helpers/onScroll";
import { localeInfo, onEvent } from "../indexHelpers";
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
  export interface Def {
    format?: Format;
  }
  export interface Opt {}
  export type Generics<
    ValueType = number,
    ValidationKeys extends WUPBase.ValidationMap = WUPNumber.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPTextIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = number> = Generics<T>["Defaults"];
  export type GenOpt<T = number> = Generics<T>["Options"];
}

declare global {
  namespace WUPNumber {
    interface ValidationMap extends WUPBase.ValidationMap, Pick<WUPText.ValidationMap, "_mask"> {
      /** If $value < pointed shows message 'Min value {x}` */
      min: number;
      /** If $value < pointed shows message 'Max value {x}` */
      max: number;
    }
    interface EventMap extends WUPBase.EventMap {}
    interface Defaults<T = number> extends WUPNumberIn.GenDef<T> {}
    interface Options<T = number> extends WUPNumberIn.GenOpt<T> {}

    // @ts-expect-error
    interface JSXProps<T extends WUPNumberControl> extends WUPText.JSXProps<T> {
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
      [tagName]: WUPNumber.JSXProps<WUPNumberControl>;
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
  EventMap extends WUPNumber.EventMap = WUPNumber.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  #ctr = this.constructor as typeof WUPNumberControl;

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPNumber.Defaults<number> = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
      _mask: WUPTextControl.$defaults.validationRules._mask as any,
      min: (v, setV) => (v == null || v < setV) && `Min value is ${setV}`,
      max: (v, setV) => (v == null || v > setV) && `Max value is ${setV}`,
    },
  };

  $options: WUPNumber.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  /** Returns $options.format joined with defaults */
  protected get format(): Required<WUPNumberIn.Format> {
    return {
      sepDecimal: localeInfo.sepDecimal,
      sep1000: localeInfo.sep1000,
      maxDecimal: 0,
      minDecimal: 0,
      ...this._opts.format,
    };
  }
  /*
    options:
      * sep1000: empty/localeInfo/custom - how to point localeInfo ?
      * sepDecimal: localeInfo/custom - how to point localeInfo ?
      * minDecimal
      * maxDecimal
    // todo how to do it with string-pattern ?
    #,###.### - min:0, max:3, sep1000:',' sepDecimal:'.'
    # ###.#0 - min:1, max:2, sep1000:' ' sepDecimal:'.'
    # - min:0, max:0, sep1000:'', sepDecimal:localeInfo
    ####.### - min:0, max:3, sep1000:'' sepDecimal:'.'
    #,### - ...
    #.00 - min:2, max:2, sep1000:
   */

  /** Called when need to format value */
  protected valueToInput(v: ValueType | undefined): string {
    if (v == null) {
      return "";
    }
    // eslint-disable-next-line prefer-const
    let [int, dec] = (v.toString() || "").split(".");
    if (dec) {
      const f = this.format;
      dec = dec.substring(0, Math.min(f.maxDecimal, dec.length));
      dec += "0".repeat(Math.max(f.minDecimal - dec.length, 0));
      if (dec.length) {
        return int + this.format.sepDecimal + dec;
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

  override parseInput(text: string): ValueType | undefined {
    // such parsing is better then Number.parse because ignores wrong chars
    let v: number | undefined = 0;
    let ok = false;
    let dec: number | null = null;
    let decLn = 1;
    let decI = 0;
    const f = this.format;
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
        // WARN: expected: sepDecimal is single char
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

    if (!this._opts.mask) {
      // otherwise it conflicts with mask
      this.$refInput.value = this.valueToInput(v as any);
    }

    return v as any;
  }

  protected override setInputValue(v: ValueType | undefined): void {
    const txt = this.valueToInput(v);
    super.setInputValue(txt);
  }

  protected override renderControl(): void {
    super.renderControl();
    this.$refInput.setAttribute("role", "spinbutton");
  }

  protected override gotChanges(propsChanged: Array<keyof WUPNumber.Options> | null): void {
    super.gotChanges(propsChanged as any);
  }

  // protected override gotInput(e: WUPText.GotInputEvent): void {
  //   super.gotInput(e);
  //   !this._opts.mask && this.setInputValue(this.$value);
  // }

  protected override gotFocus(): Array<() => void> {
    const r = super.gotFocus();
    this.$refInput.setAttribute("inputMode", "numeric"); // otherwise textControl removes it if mask isn't applied
    r.push(onScroll(this, (v) => this.gotIncrement(-1 * v))); // allow inc/dec via scroll/swipe
    r.push(
      onEvent(this, "keyup", (e) => {
        if (!e.shiftKey) delete this._isAltDown;
        if (!e.shiftKey) delete this._isShiftDown;
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
    if (this.$isReadOnly || this.$isDisabled) {
      return;
    }

    if (this._isAltDown) dval *= 0.1;
    else if (this._isShiftDown) dval *= 10;
    else if (this._isCtrlDown) dval *= 100;

    const next = +(this.$value ?? 0) + dval;
    this.$refInput.value = next.toString();
    this.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: dval > 0 ? "_inc" : "_dec" }));
  }
}

customElements.define(tagName, WUPNumberControl);
