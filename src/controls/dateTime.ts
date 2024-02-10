import dateCompareWithoutTime from "../helpers/dateCompareWithoutTime";
import dateFromString from "../helpers/dateFromString";
import dateToString from "../helpers/dateToString";
import localeInfo from "../objects/localeInfo";
import WUPCalendarControl from "./calendar";
import WUPDateControl from "./date";

WUPCalendarControl.$use();

const tagName = "wup-datetime";
declare global {
  namespace WUP.DateTime {
    interface EventMap extends WUP.Date.EventMap {}
    interface ValidityMap extends WUP.Date.ValidityMap {}
    interface NewOptions {
      /** String representation of displayed date & time (enables mask, - to disable mask set $options.mask="");
       * @defaultValue localeInfo.dateTime
       * @example `YYYY-MM-DD hh:mm:ss A` or `DD/MM/YYYY h:mm:ss`
       * @tutorial Troubleshooting
       * * with changing $options.format need to change/reset mask/maskholder also */
      format: string;
    }
    interface Options<T = Date, VM = ValidityMap> extends WUP.Date.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPDateTimeControl> extends WUP.Date.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      "w-format"?: string;
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPDateTimeControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with date & time picker
       *  @see {@link WUPDateTimeControl} */
      [tagName]: WUP.Base.ReactHTML<WUPDateTimeControl> & WUP.DateTime.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with date & time picker
       *  @see {@link WUPDateTimeControl} */
      [tagName]: HTMLAttributes<WUPDateTimeControl> & WUP.DateTime.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Form-control with date & time picker
 * @tutorial Troubleshooting
 * * $options.format related only to displayed text, to work with other date-options like min/max use strict format 'YYYY-MM-DD hh:mm:ss A'
 * @example
  const el = document.createElement("wup-datetime");
  el.$options.utc = true;
  el.$options.name = "scheduled";
  el.$options.validations = { required: true };
  el.$options.format = "yyyy-MM-dd hh:mm:ss";
  el.$initValue = new Date(1990,9,24,10,50) || el.parse("1990-10-24 10:50");
  el.$options.min = el.parse("1930-01-01 12:40");
  el.$options.max = el.parse("2010-01-01 22:14");
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-datetime w-name="scheduled" w-utc w-initvalue="1990-10-24 10:50" w-min="1930-01-01 12:40" w-max="2010-01-01 22:14"/>
  </wup-form>; */
export default class WUPDateTimeControl<
  ValueType extends Date = Date,
  TOptions extends WUP.DateTime.Options = WUP.DateTime.Options,
  EventMap extends WUP.DateTime.EventMap = WUP.DateTime.EventMap
> extends WUPDateControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPDateTimeControl;

  // static get $styleRoot(): string {
  //   return "";
  // }

  static get $style(): string {
    return `${super.$style}
      :host {

      }`;
  }

  static $defaults: WUP.DateTime.Options = {
    ...WUPDateControl.$defaults,
    // debounceMs: 500,
    validationRules: {
      // todo update validations
      ...WUPDateControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v === undefined || dateCompareWithoutTime(v, setV, (c as WUPDateTimeControl)._opts.utc) === -1) &&
        __wupln(`Min value is ${(c as WUPDateTimeControl).valueToInput(setV)}`, "validation"),
      max: (v, setV, c) =>
        (v === undefined || dateCompareWithoutTime(v, setV, (c as WUPDateTimeControl)._opts.utc) === 1) &&
        __wupln(`Max value is ${(c as WUPDateTimeControl).valueToInput(setV)}`, "validation"),
      exclude: (v, setV, c) =>
        (v === undefined ||
          setV.some((d) => dateCompareWithoutTime(v, d, (c as WUPDateTimeControl)._opts.utc) === 0)) &&
        __wupln(`This value is disabled`, "validation"),
    },
    format: "",
    // firstWeekDay: 1,
    // format: localeInfo.dateTime.toLowerCase()
  };

  constructor() {
    super();

    this.#ctr.$defaults.format ||= localeInfo.dateTime.toLowerCase();
    this._opts.format ||= this.#ctr.$defaults.format; // init here to depends on localeInfo
  }

  /** Called to parse input text to value (related to locale or pointed format)
   *  @tutorial Troubleshooting
   * * for "yyyy-mm-dd" the correct format is "yyyy-MM-dd" */
  override parseInput(text: string): ValueType | undefined {
    const format = `${this._opts.format}${this._opts.utc ? "Z" : ""}`;
    const v = dateFromString(text, format, { throwOutOfRange: true }) ?? undefined;
    return v as any;
  }

  override valueToUrl(v: ValueType): string {
    return dateToString(v, `yyyy-MM-dd hh:mm${this._opts.utc ? "Z" : ""}`);
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Date.Options> | null): void {
    this._opts.format ||= "YYYY-MM-DD";
    if (this._opts.format.toUpperCase().includes("MMM")) {
      this.throwError(`'MMM' in format isn't supported`);
      this._opts.format = "YYYY-MM-DD";
    }
    this._opts.mask ||= this._opts.format
      .replace(/[yY]/g, "0")
      .replace(/dd|DD/, "00")
      .replace(/[dD]/, "#0")
      .replace(/mm|MM/, "00")
      .replace(/[mM]/, "#0"); // convert yyyy-mm-dd > 0000-00-00; d/m/yyyy > #0/#0/0000
    this._opts.maskholder ||= this._opts.format.replace(/([mMdD]){1,2}/g, "$1$1");

    super.gotChanges(propsChanged as any);
  }
}

customElements.define(tagName, WUPDateTimeControl);
// NiceToHave: role 'spinbutton" + changing input value via scrolling: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/spinbutton_role
// NiceToHave: allowYear, allowMonth, allowDays based on format: "YYYY-MM" - only for selection year & month
// NiceToHave: alt-behavior; when user press Alt allow to use arrowKeys to navigate in input - use logic for all comboboxes
