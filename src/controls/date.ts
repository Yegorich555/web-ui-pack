import { AttributeMap, AttributeTypes } from "../baseElement";
import dateCompareWithoutTime from "../helpers/dateCompareWithoutTime";
import dateCopyTime from "../helpers/dateCopyTime";
import dateFromString from "../helpers/dateFromString";
import dateToString from "../helpers/dateToString";
import localeInfo from "../objects/localeInfo";
import WUPPopupElement from "../popup/popupElement";
import WUPBaseComboControl from "./baseCombo";
import { SetValueReasons } from "./baseControl";
import WUPCalendarControl from "./calendar";

WUPCalendarControl.$use();

const tagName = "wup-date";
declare global {
  namespace WUP.Date {
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap {
      /** Enabled if option [min] is pointed; If $value < pointed shows message 'Min date is {x}` */
      min: Date;
      /** Enabled if option [min] is pointed; if $value > pointed shows message 'Max date is {x}` */
      max: Date;
      /** Enabled if option [exclude] is pointed; If invalid shows "This date is disabled" */
      exclude: Date[];
    }
    interface NewOptions {
      /** String representation of displayed date (enables mask, - to disable mask set $options.mask="");
       * @defaultValue localeInfo.date
       * @example `yyyy-mm-dd` or `dd/mm/yyyy`
       * @tutorial Troubleshooting
       * * with changing $options.format need to change/reset mask/maskholder also */
      format: string;
    }
    interface Options<T = Date, VM = ValidityMap>
      extends WUP.Calendar.Options<T, VM>,
        WUP.BaseCombo.Options<T, VM>,
        NewOptions {}
    interface JSXProps<C = WUPDateControl>
      extends WUP.BaseCombo.JSXProps<C>,
        WUP.Calendar.JSXProps<C>,
        WUP.Base.OnlyNames<NewOptions> {
      "w-initValue"?: string;
      "w-format"?: string;
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPDateControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with datepicker
       *  @see {@link WUPDateControl} */
      [tagName]: WUP.Date.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with datepicker
 * @tutorial Troubleshooting
 * * $options.format related only to displayed text, to work with other date-options like min/max use strict format 'YYYY-MM-DD'
 * @example
  const el = document.createElement("wup-date");
  el.$options.name = "dateOfBirthday";
  el.$initValue = "1990-10-24";
  el.$options.validations = { required: true };
  el.$options.format = "yyyy-MM-dd";
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-date w-name="dateOfBirhday" w-utc w-initvalue="1990-10-24" w-min="1930-01-01" w-max="2010-01-01"/>
  </wup-form>; */
export default class WUPDateControl<
  ValueType extends Date = Date,
  TOptions extends WUP.Date.Options = WUP.Date.Options,
  EventMap extends WUP.Date.EventMap = WUP.Date.EventMap
> extends WUPBaseComboControl<ValueType, TOptions, EventMap> {
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
      :host > [menu] {
        overflow: hidden;
      }
      :host > [menu] > wup-calendar {
        margin: 0;
      }`;
  }

  static get mappedAttributes(): Record<string, AttributeMap> {
    const m = super.mappedAttributes;
    m.min = { type: AttributeTypes.parsedObject };
    m.max = { type: AttributeTypes.parsedObject };
    m.firstweekday = { type: AttributeTypes.number };
    m.startwith = { type: AttributeTypes.string };
    return m;
  }

  static $defaults: WUP.Date.Options = {
    ...WUPBaseComboControl.$defaults,
    ...WUPCalendarControl.$defaults,
    // debounceMs: 500,
    validationRules: {
      ...WUPBaseComboControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v === undefined || dateCompareWithoutTime(v, setV, (c as WUPDateControl)._opts.utc) === -1) &&
        __wupln(`Min value is ${(c as WUPDateControl).valueToInput(setV)}`, "validation"),
      max: (v, setV, c) =>
        (v === undefined || dateCompareWithoutTime(v, setV, (c as WUPDateControl)._opts.utc) === 1) &&
        __wupln(`Max value is ${(c as WUPDateControl).valueToInput(setV)}`, "validation"),
      exclude: (v, setV, c) =>
        (v === undefined || setV.some((d) => dateCompareWithoutTime(v, d, (c as WUPDateControl)._opts.utc) === 0)) &&
        __wupln(`This value is disabled`, "validation"),
    },
    format: "",
    // firstWeekDay: 1,
    // format: localeInfo.date.toLowerCase()
  };

  constructor() {
    super();
    this.#ctr.$defaults.firstWeekDay ||= localeInfo.firstWeekDay;
    this._opts.firstWeekDay ||= this.#ctr.$defaults.firstWeekDay; // init here to depends on localeInfo

    this.#ctr.$defaults.format ||= localeInfo.date.toLowerCase();
    this._opts.format ||= this.#ctr.$defaults.format; // init here to depends on localeInfo
  }

  /** Parse string to Date
   * @see {@link WUPCalendarControl.$parse} */
  override parse(text: string): ValueType | undefined {
    if (!text) {
      return undefined;
    }
    return WUPCalendarControl.$parse(text, !!this._opts.utc) as ValueType;
  }

  /** Called to parse input text to value (related to locale or pointed format)
   *  @tutorial Troubleshooting
   * * for "yyyy-mm-dd" the correct format is "yyyy-MM-dd" */
  override parseInput(text: string): ValueType | undefined {
    const format = `${this._opts.format.toUpperCase()} hh:mm:ss.fff${this._opts.utc ? "Z" : ""}`;
    const v = dateFromString(text, format, { throwOutOfRange: true }) ?? undefined;
    return v as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override canParseInput(_text: string): boolean {
    return !this.refMask || this.refMask.isCompleted;
  }

  override valueToUrl(v: ValueType): string {
    return dateToString(v, `yyyy-MM-dd${this._opts.utc ? "Z" : ""}`);
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Date.Options> | null): void {
    WUPCalendarControl.prototype.gotChangesSharable.call(this);

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

  protected get validations(): WUP.Text.Options["validations"] {
    const vls = (super.validations as WUP.Date.Options["validations"])!; // undefined impossible because of textControl || {};
    // user can type not valid value according to options min,max,exclude. So need to enable validations rules in this case
    if (this._opts.min) vls.min = this._opts.min;
    if (this._opts.max) vls.max = this._opts.max;
    if (this._opts.exclude) vls.exclude = this._opts.exclude;
    return vls as WUP.BaseControl.Options["validations"];
  }

  protected override renderMenu(popup: WUPPopupElement, menuId: string): HTMLElement {
    popup.$options.minWidthByTarget = false;

    const el = document.createElement("wup-calendar");
    el.renderInput = () => {
      el.$refLabel.remove();
      return { menuId };
    };
    el.focusItem = (a) => this.focusMenuItem(a);
    el.focus = () => true; // to not allow to focus calendar itselft
    el.gotFocus.call(el, new FocusEvent("focusin"));
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    el.setInputValue = () => {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    el.gotFormChanges = () => {}; // it's must be completely detached from formElement
    el.$refInput = this.$refInput;
    el.$options.validations = this.validations!.required ? { required: true } : undefined;
    el.$options.startWith = this._opts.startWith;
    el.$options.exclude = this._opts.exclude;
    el.$options.max = this._opts.max;
    el.$options.min = this._opts.min;
    el.$options.utc = this._opts.utc;
    el.$options.name = undefined; // to detach from formElement
    el.$options.validationCase = 0; // disable any validations for control
    const v = this.$value;
    el.$initValue = v && !Number.isNaN(v.valueOf()) ? v : undefined;
    el.setValue = (val, reason) => {
      const r = WUPCalendarControl.prototype.setValue.call(el, val, reason);
      if (reason === SetValueReasons.userSelect) {
        this.selectValue(el.$value as any);
      }
      return r;
    };
    el.$onChange = (e) => e.stopPropagation(); // otherwise date change event fired twice
    popup.appendChild(el);
    return el;
  }

  protected override setValue(v: ValueType | undefined, reason: SetValueReasons, skipInput = false): boolean | null {
    if (v && skipInput) {
      const prev = this.$value || this.$initValue;
      prev && dateCopyTime(v, prev, !!this._opts.utc); // copy time if was changing from input (calendar do it itself)
    }
    const isChanged = super.setValue(v, reason, skipInput);
    if (isChanged) {
      const c = this.$refPopup?.firstElementChild as WUPCalendarControl;
      if (c) {
        c._isStopChanges = true; // to prevent hiding popup by calendar valueChange
        c.$value = v && !Number.isNaN(v.valueOf()) ? v : undefined;
        setTimeout(() => (c._isStopChanges = false)); // without timeout calendar $changeEvent is fired
      }
    }
    return isChanged;
  }

  protected override valueToInput(v: ValueType | undefined): string {
    if (v === undefined) {
      return "";
    }
    return dateToString(v, this._opts.format.toUpperCase() + (this._opts.utc ? "Z" : ""));
  }

  protected override focusMenuItem(next: HTMLElement | null): void {
    // WARN: it's important don't use call super... because the main logic is implemented inside calendar
    // can be fired from baseCombo => when need to clear selection
    const el = this.$refPopup?.firstElementChild as WUPCalendarControl;
    if (el) {
      (Object.getPrototypeOf(el) as WUPCalendarControl).focusItem.call(el, next);
    } else {
      // if (!next)
      this.$refInput.removeAttribute("aria-activedescendant");
    }
    this._focusedMenuItem = next;
  }

  protected focusMenuItemByKeydown(e: KeyboardEvent): void {
    const clnd = this.$refPopup?.firstElementChild as WUPCalendarControl;
    clnd.gotKeyDown.call(clnd, e);
  }
}

customElements.define(tagName, WUPDateControl);
// NiceToHave: role 'spinbutton" + changing input value via scrolling: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/spinbutton_role
// NiceToHave: allowYear, allowMonth, allowDays based on format: "YYYY-MM" - only for selection year & month
// NiceToHave: alt-behavior; when user press Alt allow to use arrowKeys to navigate in input - use logic for all comboboxes
