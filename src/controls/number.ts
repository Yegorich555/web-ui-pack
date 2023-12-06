/* eslint-disable max-classes-per-file */
import onScroll from "../helpers/onScroll";
import { mathSumFloat, onEvent } from "../indexHelpers";
import localeInfo from "../objects/localeInfo";
import WUPBaseControl, { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";

const tagName = "wup-num";

declare global {
  namespace WUP.Number {
    interface Format {
      /** Decimal separator; for number 123.4 it's dot
       *  @see {@link localeInfo.sepDecimal} */
      sepDecimal?: string;
      /** Thousands separator; for number 1,234.5 it's comma
       *  @see {@link localeInfo.sep1000} */
      sep1000?: string;
      /** Maximum displayed fraction digits; for 123.45 it's 2
       * @defaultValue 0 */
      maxDecimal?: number;
      /** Minimun displayed fraction digits; if pointed 2 then 123.4 goes to 123.40
       * @defaultValue 0 */
      minDecimal?: number;
    }
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface ValidityMap extends WUP.Text.ValidityMap {
      /** If $value < pointed shows message 'Min value {x}` */
      min: number;
      /** If $value < pointed shows message 'Max value {x}` */
      max: number;
    }
    interface NewOptions {
      /** String representation of displayed value
       * @defaultValue no-decimal and separators from localeInfo */
      format: Format | null;
    }
    interface TextAnyOptions<T = any, VM = ValidityMap> extends WUP.Text.Options<T, VM> {}
    interface Options<T = number, VM extends ValidityMap = ValidityMap> extends TextAnyOptions<T, VM>, NewOptions {}
    interface JSXProps<C = WUPNumberControl> extends WUP.Text.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      /** String representation of displayed value
       * Point Global reference to object @see {@link Format}
       * @example
       * ```js
       * window.format = {};
       * <wup-number w-items="window.format"></wup-number>
       * ```
       * @defaultValue no-decimal and separators from localeInfo */
      "w-format"?: string; // NiceToHave: parse from string
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPNumberControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with number input
       *  @see {@link WUPNumberControl} */
      [tagName]: WUP.Base.ReactHTML<WUPNumberControl> & WUP.Number.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with number input
       *  @see {@link WUPNumberControl} */
      [tagName]: HTMLAttributes<WUPNumberControl> & WUP.Number.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

abstract class TextAnyControl<
  ValueType,
  TOptions extends WUP.Number.TextAnyOptions,
  EventMap extends WUP.Text.EventMap
> extends WUPTextControl<ValueType, TOptions, EventMap> {}

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
    <wup-num w-name="number" w-validations="myValidations"/>
  </wup-form>;
 * @see {@link WUPTextControl} */
export default class WUPNumberControl<
  ValueType = number,
  TOptions extends WUP.Number.Options = WUP.Number.Options,
  EventMap extends WUP.Number.EventMap = WUP.Number.EventMap
> extends TextAnyControl<ValueType, TOptions, EventMap> {
  #ctr = this.constructor as typeof WUPNumberControl;

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Number.Options = {
    ...(WUPTextControl.$defaults as any),
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v == null || v < setV) && __wupln(`Min value is ${(c as WUPNumberControl).valueToInput(setV)}`, "validation"),
      max: (v, setV, c) =>
        (v == null || v > setV) && __wupln(`Max value is ${(c as WUPNumberControl).valueToInput(setV)}`, "validation"),
    },
    format: null,
  };

  /** Custom number parsing: better Number.parse because ignores wrong chars + depends format */
  static $parse(s: string, format: Required<WUP.Number.Format>): number | undefined {
    let v: number | undefined = 0;
    let ok = false;
    let dec: number | null = null;
    let decLn = 1;
    let decI = 0;
    const f = format;
    for (let i = 0; i < s.length; ++i) {
      const ascii = s.charCodeAt(i);
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
      v = undefined; // case impossible but maybe...
    } else if (s.charCodeAt(0) === 45) {
      v *= -1; // case: "-123"
    }
    return v;
  }

  static $stringify(v: number | undefined | null, format: Required<WUP.Number.Format>): string {
    if (v == null) {
      return "";
    }

    // if (this._opts.mask) {
    //   return (v as any).toString();
    // }
    // eslint-disable-next-line prefer-const
    let [int, dec] = (v as any).toString().split(".");
    const f = format;
    if (f.sep1000) {
      const to = (v as number)! > 0 ? 0 : 1;
      for (let i = int.length - 3; i > to; i -= 3) {
        int = `${int.substring(0, i)}${f.sep1000}${int.substring(i)}`;
      }
    }

    if (dec || f.minDecimal || f.maxDecimal) {
      dec = dec === undefined ? "" : dec.substring(0, Math.min(f.maxDecimal, dec.length));
      dec += "0".repeat(Math.max(f.minDecimal - dec.length, 0));
      if (dec.length) {
        return int + f.sepDecimal + dec;
      }
    }

    return int;
  }

  /** Returns $options.format joined with defaults */
  get $format(): Required<WUP.Number.Format> {
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
  valueToInput(v: ValueType | undefined): string {
    if (this._opts.mask) {
      return v ? (v as any).toString() : v;
    }
    return this.#ctr.$stringify(v as number, this.$format);
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
    const v = this.#ctr.$parse(text, this.$format);
    if (v != null && (v! > Number.MAX_SAFE_INTEGER || v! < Number.MIN_SAFE_INTEGER)) {
      this.declineInput(); // decline looks better validation "Out of range"
      throw new RangeError("Out of range");
      // return v as any;
    }

    if (!this._opts.mask) {
      // otherwise it conflicts with mask
      const next = this.#ctr.$stringify(v as number, this.$format);
      const hasDeclined = this._canShowDeclined && text.length > next.length;
      if (hasDeclined && next === this.#ctr.$stringify(this.$value as number, this.$format)) {
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
        this.setInputValue(v as any, SetValueReasons.userInput); // WARN: it calls valueToInput again
        const end = pos + dp;
        el.setSelectionRange(end, end);
      }
    }

    return v as any;
  }

  // @ts-expect-error - because expected string
  protected override setInputValue(v: ValueType | undefined, reason: SetValueReasons): void {
    const txt = this.valueToInput(v);
    super.setInputValue(txt, reason);
  }

  protected override renderControl(): void {
    super.renderControl();
    this.$refInput.setAttribute("role", "spinbutton");
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Number.Options> | null): void {
    super.gotChanges(propsChanged as any);
    if ((!propsChanged && this._opts.format) || propsChanged?.includes("format")) {
      this.setInputValue(this.$value, SetValueReasons.userInput);
    }
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
              pos += isBefore ? 0 : 1; // case "1|,234" + Delete => 1|34
              el.setSelectionRange(pos, pos);
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

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const r = super.gotFocus(ev);
    this.$refInput.setAttribute("inputmode", "numeric"); // otherwise textControl removes it if mask isn't applied
    r.push(
      onScroll(
        this, //
        (v) => this.gotIncrement(-1 * v),
        { skip: () => this.$isReadOnly || this.$isDisabled }
      )
    ); // allow inc/dec via scroll/swipe
    this.style.overflow = ""; // disable inline-style from onScroll helper
    r.push(
      onEvent(
        this,
        "keyup",
        (e) => {
          if (!e.altKey) {
            delete this._isAltDown;
            e.key === "Alt" && this._wasInc && e.preventDefault(); // otherwise focus moves to browser
            delete this._wasInc;
          }
          if (!e.shiftKey) delete this._isShiftDown;
          if (!e.ctrlKey) delete this._isCtrlDown;
        },
        { passive: false }
      )
    );
    r.push(() => {
      delete this._wasInc;
      delete this._isAltDown;
      delete this._isShiftDown;
      delete this._isCtrlDown;
    });
    return r;
  }

  /** To prevent focus to browser panel by Alt key */
  _wasInc?: boolean;
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
    this._wasInc = true;
    if (this._isAltDown) {
      dval *= 0.1;
      if (this.$format.maxDecimal < 1) {
        return; // don't allow decimal increment
      }
    } else if (this._isShiftDown) dval *= 10;
    else if (this._isCtrlDown) dval *= 100;

    const tv = this.$refInput.value;
    const v = (tv && this.#ctr.$parse(tv, this.$format)) || 0;
    const hasFloat = this._isAltDown || v % 1 !== 0;
    const next = hasFloat ? mathSumFloat(v, dval) : v + dval;

    const el = this.$refInput;
    const inputType = dval > 0 ? "_inc" : "_dec";
    const data = this.valueToInput(next as any);
    setTimeout(() => {
      const isPrevented = !el.dispatchEvent(
        new InputEvent("beforeinput", { inputType, data, bubbles: true, cancelable: true })
      );
      if (!isPrevented) {
        el.value = data;
        el.dispatchEvent(new InputEvent("input", { inputType, bubbles: true }));
      }
    });
  }
}

customElements.define(tagName, WUPNumberControl);
