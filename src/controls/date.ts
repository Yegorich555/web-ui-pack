import dateFromString from "../helpers/dateFromString";
import dateToString from "../helpers/dateToString";
import WUPPopupElement from "../popup/popupElement";
import WUPBaseComboControl, { WUPBaseComboIn } from "./baseCombo";
import { ValidateFromCases } from "./baseControl";
import WUPCalendarControl, { PickersEnum, WUPCalendarIn } from "./calendar";

/* c8 ignore next */
/* istanbul ignore next */
!WUPCalendarControl && console.error("!"); // It's required otherwise import is ignored by webpack

const tagName = "wup-date";
export namespace WUPDateIn {
  export interface Defs extends WUPCalendarIn.Def {
    /** String representation of a date;
     * @defaultValue "YYYY-MM-DD" */
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
      min: Date;
      max: Date;
      exclude: Date[];
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
  ValueType extends Date = Date,
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
    validationRules: {
      ...WUPBaseComboControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v === undefined || v < setV) && `Min date is ${dateToString(setV, (c as WUPDateControl)._opts.format)}`,
      max: (v, setV, c) =>
        (v === undefined || v > setV) && `Max date is ${dateToString(setV, (c as WUPDateControl)._opts.format)}`,
      exclude: (v, setV) =>
        (v === undefined || setV.some((d) => d.valueOf() === v.valueOf())) && `This date is disabled`,
    },
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

  /** Converts date-string into Date according (to $options.utc/.format), @see WUPCalendarControl.$parse */
  override parseValue(text: string, strict = false): ValueType | undefined {
    /* istanbul ignore else */
    if (!text) {
      return undefined;
    }
    const f = `${this._opts.format} hh:mm:ss.fff`;
    return (dateFromString(text, this._opts.utc ? `${f}Z` : f, { strict }) ?? undefined) as unknown as ValueType;
  }

  protected override gotChanges(propsChanged: Array<keyof WUPDate.Options> | null): void {
    this._opts.utc = this.getBoolAttr("utc", this._opts.utc);
    super.gotChanges(propsChanged as any);

    const attr = this.getAttribute("startwith");
    if (attr != null) {
      // prettier-ignore
      switch (attr.toLowerCase()) {
        case "year": this._opts.startWith = PickersEnum.Year; break;
        case "month": this._opts.startWith = PickersEnum.Month; break;
        case "day": this._opts.startWith = PickersEnum.Day; break;
        default: delete this._opts.startWith;
      }
    }

    this._opts.min = this.parseValue(this.getAttribute("min") || "") ?? this._opts.min;
    this._opts.max = this.parseValue(this.getAttribute("max") || "") ?? this._opts.max;
    this._opts.exclude = this.getRefAttr<Date[]>("exclude");
  }

  protected get validations(): WUPBase.Options["validations"] | undefined {
    const vls = (super.validations as WUPDate.Options["validations"]) || {};
    // user can type not valid value according to options min,max,exclude. So we need enable validations rules in this case
    if (this._opts.min) vls.min = this._opts.min;
    if (this._opts.max) vls.max = this._opts.max;
    if (this._opts.exclude) vls.exclude = this._opts.exclude;
    return vls as WUPBase.Options["validations"];
  }

  protected goValidate(fromCase: ValidateFromCases, canShowError = true): string | false {
    // reset hours for validations
    const v = this.$value as Date | undefined;
    const key = this._opts.utc ? "UTC" : "";
    const hh = v && [
      v[`get${key}Hours`](),
      v[`get${key}Minutes`](),
      v[`get${key}Seconds`](),
      v[`get${key}Milliseconds`](),
    ];
    v && v[`set${key}Hours`](0, 0, 0, 0);
    const r = super.goValidate(fromCase, canShowError);
    hh && v[`set${key}Hours`](hh[0], hh[1], hh[2], hh[3]);
    return r;
  }

  protected override async renderMenu(popup: WUPPopupElement, menuId: string): Promise<HTMLElement> {
    popup.$options.minWidthByTarget = false;

    const el = document.createElement("wup-calendar");
    el.renderInput = () => {
      el.$refLabel.remove();
      return { menuId };
    };
    el.focusItem = (a) => this.focusMenuItem(a);
    el.focus = () => true; // to not allow to focus calendar itselft
    el.gotFocus.call(el);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    el.setInputValue = () => {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    el.gotFormChanges = () => {}; // it's must be completely detached from formElement
    el.$refInput = this.$refInput;
    el.$options.startWith = this._opts.startWith;
    el.$options.exclude = this._opts.exclude;
    el.$options.max = this._opts.max;
    el.$options.min = this._opts.min;
    el.$options.utc = this._opts.utc;
    el.$options.name = undefined; // to detach from formElement
    el.$options.validationCase = 0; // disable any validations for control
    el.$initValue = this.$value;
    el.addEventListener("$change", () => !el._isStopChanges && this.selectValue(el.$value as any));

    popup.appendChild(el);
    return Promise.resolve(el);
  }

  protected override setValue(v: ValueType | undefined, canValidate = true): boolean | null {
    const isChanged = super.setValue(v, canValidate);
    if (isChanged) {
      const clnd = this.$refPopup?.firstElementChild as WUPCalendarControl;
      if (clnd) {
        clnd._isStopChanges = true;
        clnd.$value = v;
        clnd._isStopChanges = false;
      }
      console.warn("setValue", v?.toISOString());
    }
    return isChanged;
  }

  protected override valueToInput(v: ValueType | undefined): Promise<string> | string {
    if (v === undefined) {
      return "";
    }
    return dateToString(v, this._opts.format.toUpperCase() + (this._opts.utc ? "Z" : ""));
  }

  protected override gotInput(e: Event & { currentTarget: HTMLInputElement }): void {
    super.gotInput(e);
    try {
      const txt = this.$refInput.value;
      if (!txt) {
        this.setValue(undefined);
      } else {
        const v = this.parseValue(txt, true);
        if (v) {
          const key = this._opts.utc ? "UTC" : "";
          const a = this.$value || this.$initValue;
          a &&
            v[`set${key}Hours`](
              a[`get${key}Hours`](),
              a[`get${key}Minutes`](),
              a[`get${key}Seconds`](),
              a[`get${key}Milliseconds`]()
            );
          this.setValue(v, true);
        }
      }
      // eslint-disable-next-line no-empty
    } catch {}
    /* todo mask/parsing
       during the parsing need to detect:
       1. isValid => allow change
       2. completed => setValue
    */
  }

  protected override gotKeyDown(e: KeyboardEvent): Promise<void> {
    const isOpen = this.$isOpen;
    const el = this.$refPopup!.firstElementChild as WUPCalendarControl;
    isOpen && e.key !== "Escape" && el.gotKeyDown.call(el, e); // skip actions for Escape key
    // todo allow user to type Space and prevent handling of ' ' ???
    const r = !e.defaultPrevented && super.gotKeyDown(e);
    !isOpen && this.$isOpen && e.key !== "Escape" && el.gotKeyDown.call(el, e); // case when user press ArrowKey for opening menu
    return r || Promise.resolve();
  }

  protected override focusMenuItem(next: HTMLElement | null): void {
    // WARN: it's important don't use call super... because the main logic is implemented inside calendar
    // can be fired from baseCombo when need to clear selection
    const el = this.$refPopup?.firstElementChild as WUPCalendarControl;
    if (el) {
      (Object.getPrototypeOf(el) as WUPCalendarControl).focusItem.call(el, next);
    } else if (!next) {
      this.$refInput.removeAttribute("aria-activedescendant");
    }
    this._focusedMenuItem = next;
  }
}

customElements.define(tagName, WUPDateControl);
// NiceToHave: role 'spinbutton" + changing input value via scrolling: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/spinbutton_role
// NiceToHave: allowYear, allowMonth, allowDays based on format: "YYYY-MM" - only for selection year & month

// todo testcase: startWith: year. User must be able goto dayPicker with pressing Enter

// interface IMaskResult {
//   isCompleted?: true;
//   isValid?: true;
//   value: string;
// }

// function maskDate(v: string, format = "YYYY-DD-MM"): IMaskResult {
//   if (!v) {
//     return { value: format };
//   }
// }
