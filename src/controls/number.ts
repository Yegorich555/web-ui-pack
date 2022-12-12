import onScroll from "../helpers/onScroll";
import { onEvent } from "../indexHelpers";
import WUPBaseControl from "./baseControl";
import WUPTextControl, { WUPTextIn } from "./text";

const tagName = "wup-num";
export namespace WUPNumberIn {
  export interface Def {}
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

  // static get $style(): string {
  //   return `${super.$style}`;
  // }

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

  override parse(text: string): ValueType | undefined {
    // such parsing is better then Number.parseInt because it ignores wrong chars
    let v = 0;
    let ok = false;
    for (let i = 0; i < text.length; ++i) {
      const num = text.charCodeAt(i) - 48;
      if (num >= 0 && num <= 9) {
        ok = true;
        v = v * 10 + num;
      }
    }
    if (!ok) {
      return undefined;
    }
    if (text[0] === "-") {
      v *= -1; // case: "-123"
    }
    return v as any;
  }

  protected override renderControl(): void {
    super.renderControl();
    this.$refInput.setAttribute("role", "spinbutton");
  }

  protected override gotChanges(propsChanged: Array<keyof WUPNumber.Options> | null): void {
    super.gotChanges(propsChanged as any);
  }

  protected override gotInput(e: WUPText.GotInputEvent): void {
    super.gotInput(e);
    if (!this._opts.mask) {
      e.target.value = (this.$value as any)?.toString() ?? "";
    }
    // todo use 'currency' alias here: despite on debounce need to update input according to currency here
  }

  protected override gotFocus(): Array<() => void> {
    const r = super.gotFocus();
    this.$refInput.setAttribute("inputMode", "numeric"); // textControl removes if mask not applied
    r.push(onScroll(this, (v) => this.gotIncrement(-1 * v))); // allow inc/dec via scroll/swipe
    r.push(
      onEvent(this, "keyup", (e) => {
        if (!e.shiftKey) delete this._isShiftDown;
        if (!e.ctrlKey) delete this._isCtrlDown;
      })
    );
    r.push(() => {
      delete this._isShiftDown;
      delete this._isCtrlDown;
    });
    return r;
  }

  _isShiftDown?: true;
  _isCtrlDown?: true;
  protected override gotKeyDown(e: KeyboardEvent): void {
    super.gotKeyDown(e);

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
    if (this._isShiftDown) dval *= 10;
    else if (this._isCtrlDown) dval *= 100;

    const next = +(this.$value ?? 0) + dval;
    this.$refInput.value = next.toString();
    this.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: dval > 0 ? "_inc" : "_dec" }));
  }
}

customElements.define(tagName, WUPNumberControl);

// Intl.NumberFormat("en-US", {
//   style: "currency",
//   currency: "USD",
//   maximumFractionDigits: 0,
//   minimumFractionDigits: 0,
// }).format(1234.5); '$1,234.50'

// new Date(2222, 0, 3).toLocaleDateString(); // '1/3/2222'
// (1234.5).toLocaleString(); // '1,234.5'
