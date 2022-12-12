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
    interface ValidationMap extends WUPBase.ValidationMap {
      /** If $value < pointed shows message 'Min value {x}` */
      min: number;
      /** If $value < pointed shows message 'Max value {x}` */
      max: number;
    }
    interface EventMap extends WUPBase.EventMap {}
    interface Defaults<T = number> extends WUPNumberIn.GenDef<T> {}
    interface Options<T = number> extends WUPNumberIn.GenOpt<T> {}
    interface JSXProps<T extends WUPNumberControl> extends WUPBase.JSXProps<T> {
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
export default class WUPNumberControl<
  ValueType = number,
  EventMap extends WUPNumber.EventMap = WUPNumber.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  #ctr = this.constructor as typeof WUPNumberControl;

  // static get $style(): string {
  //   return `${super.$style}`;
  // }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPNumber.Defaults<string | number> = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
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

  protected override gotInput(e: WUPText.GotInputEvent): void {
    super.gotInput(e);
    if (!this._opts.mask) {
      e.target.value = (this.$value ?? "")!.toString(); // todo need to resuse mask-remove-behavior for removing restricted chars
    }
    // todo how to use with mask
    // todo use 'currency' alias here: despite on debounce need to update input according to currency here
  }

  protected override gotChanges(propsChanged: Array<keyof WUPNumber.Options> | null): void {
    super.gotChanges(propsChanged as any);
  }

  protected override gotFocus(): Array<() => void> {
    const r = super.gotFocus();
    this.$refInput.setAttribute("inputMode", "numeric"); // textControl removes if mask not applied
    return r;
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
