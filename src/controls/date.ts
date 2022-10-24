import dateToString from "../helpers/dateToString";
import WUPPopupElement from "../popup/popupElement";
import WUPBaseComboControl, { WUPBaseComboIn } from "./baseCombo";
import WUPCalendarControl, { WUPCalendarIn } from "./calendar";

/* c8 ignore next */
/* istanbul ignore next */
!WUPCalendarControl && console.error("!"); // It's required otherwise import is ignored by webpack

const tagName = "wup-date";
export namespace WUPDateIn {
  export interface Defs extends WUPCalendarIn.Def {
    /** String representation of a date;
     * @default "DD-MM-YYYY" */
    format: string;
  }
  export interface Opt extends Pick<WUPCalendarIn.Opt, "min" | "max" | "exclude" | "utc" | "startWith"> {}
  export interface JSXProps extends Pick<WUPCalendarIn.JSXProps, "min" | "max" | "exclude" | "utc" | "startWith"> {}

  export type Generics<
    ValueType = Date,
    ValidationKeys extends WUPDate.ValidationMap = WUPDate.ValidationMap,
    Defaults = Defs,
    Options = Opt
  > = WUPBaseComboIn.Generics<ValueType, ValidationKeys, Defaults & Defs, Options & Opt>;

  export type GenDef<T = Date> = Generics<T>["Defaults"];
  export type GenOpt<T = Date> = Generics<T>["Options"];
}
declare global {
  namespace WUPDate {
    interface ValidationMap {
      required: boolean;
    }
    interface EventMap extends WUPBaseCombo.EventMap {}
    interface Defaults<T = Date> extends WUPDateIn.GenDef<T> {}
    interface Options<T = Date> extends WUPDateIn.GenOpt<T> {}
    interface JSXProps<T extends WUPDateControl> extends WUPBaseCombo.JSXProps<T>, WUPDateIn.JSXProps {
      // extra props here
    }
  }
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPDateControl;
  }
  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPDate.JSXProps<WUPDateControl>;
    }
  }
}

/** Form-control with date picker
 * @example
  const el = document.createElement("wup-date");
  el.$options.name = "dateOfBirthday";
  el.$initValue = "1990-10-24";
  el.$options.validations = { required: true };
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-date name="dateOfBirhday" utc initvalue="1990-10-24" min="1930-01-01" max="2010-01-01"/>
  </wup-form>;
 */
export default class WUPDateControl<
  ValueType = Date,
  EventMap extends WUPDate.EventMap = WUPDate.EventMap
> extends WUPBaseComboControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPDateControl;

  static get $styleRoot(): string {
    return `:root {
        --ctrl-date-icon-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M652.801 76.8c42.24 0 76.8 34.56 76.8 76.8v537.601c0 42.24-34.56 76.8-76.8 76.8H115.2c-42.624 0-76.8-34.56-76.8-76.8l.384-537.601c0-42.24 33.792-76.8 76.416-76.8h38.4V0h76.8v76.8h307.2V0h76.8v76.8h38.4zM192 345.6h76.8v76.8H192v-76.8zm230.4 0v76.8h-76.8v-76.8h76.8zm153.601 0h-76.8v76.8h76.8v-76.8zM115.2 691.2h537.601V268.8H115.2v422.4z'/%3E%3C/svg%3E");
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        --ctrl-icon-img: var(--ctrl-date-icon-img);
      }
      :host wup-calendar {
        margin: 0;
      }
      :host [menu] {
        overflow: hidden;
      }`;
  }

  static $defaults: WUPDate.Defaults<Date> = {
    ...WUPBaseComboControl.$defaults,
    validationRules: { ...WUPBaseComboControl.$defaults.validationRules },
    firstDayOfWeek: 1,
    format: "YYYY-MM-DD",
  };

  $options: WUPDate.Options<ValueType> = {
    ...this.#ctr.$defaults,
    utc: true,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  /** Converts date-string into Date according (to $options.utc), @see WUPCalendarControl.$parse */
  override parseValue(text: string): ValueType | undefined {
    /* istanbul ignore else */
    if (!text) {
      return undefined;
    }
    return WUPCalendarControl.$parse(text, !!this._opts.utc) as unknown as ValueType;
  }

  protected override async renderMenu(popup: WUPPopupElement, menuId: string): Promise<HTMLElement> {
    popup.$options.minWidthByTarget = false;

    const el = document.createElement("wup-calendar");
    // todo handle keyboard
    el.renderInput = () => {
      el.$refLabel.remove();
      return { menuId }; // todo check aria-owns when id applied to role-element directly
    };
    el.focus = () => true; // don't allow to focus calendar itselft
    el.gotFocus.call(el);
    el.$options.startWith = this._opts.startWith;
    el.$options.exclude = this._opts.exclude;
    el.$options.max = this._opts.max;
    el.$options.min = this._opts.min;
    el.$options.utc = this._opts.utc;
    el.$options.name = undefined; // to detach from formElement
    el.$options.validationCase = 0; // disable any validations for control
    el.$initValue = this.$value as unknown as Date;
    el.addEventListener("$change", () => this.setValue(el.$value as unknown as ValueType));

    popup.appendChild(el);
    return Promise.resolve(el);
  }

  protected override setValue(v: ValueType | undefined, canValidate = true): boolean | null {
    const r = super.setValue(v, canValidate);
    const clnd = this.$refPopup?.firstElementChild as WUPCalendarControl;
    if (clnd) {
      clnd.$value = v as unknown as Date;
    }
    return r;
  }

  protected override valueToInput(v: ValueType | undefined): Promise<string> | string {
    if (v === undefined) {
      return "";
    }
    return dateToString(v as unknown as Date, this._opts.format.toUpperCase() + (this._opts.utc ? "Z" : ""));
  }

  protected override gotInput(e: Event & { currentTarget: HTMLInputElement }): void {
    super.gotInput(e);
    console.error("Not implemented yet");
    // todo since user can input value outside min/max/exclude need to validate according to this
    // todo implement mask ?
    this.$refPopup!.$refresh();
  }
}

customElements.define(tagName, WUPDateControl);

// todo what about role spinner ? with ability to change input values by scroll
