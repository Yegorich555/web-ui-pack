import dateCopyTime from "../helpers/dateCopyTime";
import dateFromString from "../helpers/dateFromString";
import dateToString from "../helpers/dateToString";
import localeInfo from "../objects/localeInfo";
import WUPPopupElement from "../popup/popupElement";
import WUPBaseComboControl from "./baseCombo";
import { ValidateFromCases } from "./baseControl";
import WUPCalendarControl, { PickersEnum } from "./calendar";

/* c8 ignore next */
/* istanbul ignore next */
!WUPCalendarControl && console.error("!"); // It's required otherwise import is ignored by webpack

const tagName = "wup-date";
declare global {
  namespace WUP.Date {
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap, Pick<WUP.Text.ValidityMap, "_mask" | "_parse"> {
      /** Enabled if option [min] is pointed; If $value < pointed shows message 'Min date is {x}` */
      min: Date;
      /** Enabled if option [min] is pointed; if $value > pointed shows message 'Max date is {x}` */
      max: Date;
      /** Enabled if option [exclude] is pointed; If invalid shows "This date is disabled" */
      exclude: Date[];
    }
    interface Defaults<T = Date, VM = ValidityMap> extends WUP.Calendar.Defaults<T, VM>, WUP.BaseCombo.Defaults<T, VM> {
      /** String representation of displayed date (enables mask, - to disable mask set $options.mask="");
       * @defaultValue localeInfo.date
       * @tutorial Troubleshooting
       * * with changing $options.format need to change/reset mask/maskholder also */
      format?: string;
    }
    interface Options<T = Date, VM = ValidityMap>
      extends WUP.Calendar.Options<T, VM>,
        WUP.BaseCombo.Options<T, VM>,
        Defaults<T, VM> {
      format: string;
      firstWeekDay: number;
    }
    interface Attributes extends WUP.Calendar.Attributes, Pick<Defaults, "format"> {}
    interface JSXProps<C = WUPDateControl> extends WUP.BaseCombo.JSXProps<C>, WUP.Calendar.JSXProps<C>, Attributes {
      initValue?: string;
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPDateControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Date.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with date picker
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
    <wup-date name="dateOfBirhday" utc initvalue="1990-10-24" min="1930-01-01" max="2010-01-01"/>
  </wup-form>;
 */
export default class WUPDateControl<
  ValueType extends Date = Date,
  EventMap extends WUP.Date.EventMap = WUP.Date.EventMap
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

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.Date.Options>;
    arr.push("format");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.Date.Attributes>>;
    arr.push("format", "min", "max", "utc", "exclude");
    return arr;
  }

  static $defaults: WUP.Date.Defaults = {
    ...WUPBaseComboControl.$defaults,
    // debounceMs: 500,
    validationRules: {
      ...WUPBaseComboControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v === undefined || v < setV) &&
        `Min value is ${dateToString(setV, (c as WUPDateControl)._opts.format.toUpperCase())}`,
      max: (v, setV, c) =>
        (v === undefined || v > setV) &&
        `Max value is ${dateToString(setV, (c as WUPDateControl)._opts.format.toUpperCase())}`,
      exclude: (v, setV) =>
        (v === undefined || setV.some((d) => d.valueOf() === v.valueOf())) && `This date is disabled`,
    },
    // firstWeekDay: 1,
    // format: localeInfo.date.toLowerCase()
  };

  // @ts-expect-error reason: validationRules is different
  $options: WUP.Date.Options = {
    ...this.#ctr.$defaults,
    utc: true,
    format: this.#ctr.$defaults.format || localeInfo.date.toLowerCase(),
    firstWeekDay: this.#ctr.$defaults.firstWeekDay || localeInfo.firstWeekDay,
  };

  // @ts-expect-error reason: validationRules is different
  protected override _opts = this.$options;

  /** Parse string to Date
   * @see WUPCalendarControl.$parse */
  override parse(text: string): ValueType | undefined {
    /* istanbul ignore else */
    if (!text) {
      return undefined;
    }
    return WUPCalendarControl.$parse(text, !!this._opts.utc) as ValueType;
  }

  /** Called to parse input text to value (related to locale or pointed format)
   *  @tutorial Troubleshooting
   * * for "yyyy-mm-dd" the correct format is "yyyy-MM-dd" */
  override parseInput(text: string): ValueType | undefined {
    if (!text) {
      return undefined;
    }
    const format = `${this._opts.format.toUpperCase()} hh:mm:ss.fff${this._opts.utc ? "Z" : ""}`;
    const v = dateFromString(text, format, { throwOutOfRange: true }) ?? undefined;
    return v as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override canParseInput(_text: string): boolean {
    return !this.refMask || this.refMask.isCompleted;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Date.Options> | null): void {
    this._opts.utc = this.getBoolAttr("utc", this._opts.utc);
    this._opts.format = (this.getAttribute("format") ?? this._opts.format) || "YYYY-MM-DD";
    if (this._opts.format.toUpperCase().includes("MMM")) {
      console.error(`${this.tagName}. 'MMM' in format isn't supported`);
      this._opts.format = "YYYY-MM-DD";
    }
    this._opts.mask =
      this._opts.mask ??
      this._opts.format
        .replace(/[yY]/g, "0")
        .replace(/dd|DD/, "00")
        .replace(/[dD]/, "#0")
        .replace(/mm|MM/, "00")
        .replace(/[mM]/, "#0"); // convert yyyy-mm-dd > 0000-00-00; d/m/yyyy > #0/#0/0000
    this._opts.maskholder = this._opts.maskholder ?? this._opts.format.replace(/([mMdD]){1,2}/g, "$1$1");
    this._opts.min = this.parse(this.getAttribute("min") || "") ?? this._opts.min;
    this._opts.max = this.parse(this.getAttribute("max") || "") ?? this._opts.max;
    this._opts.exclude = this.getRefAttr<Date[]>("exclude");

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

  protected goValidate(fromCase: ValidateFromCases, silent = false): string | false {
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
    const r = super.goValidate(fromCase, silent);
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
    const v = this.$value;
    el.$initValue = v && !Number.isNaN(v.valueOf()) ? v : undefined;
    el.addEventListener("$change", (e) => {
      e.stopPropagation(); // otherwise date change event fired twice
      !el._isStopChanges && this.selectValue(el.$value as any);
    });

    popup.appendChild(el);
    return Promise.resolve(el);
  }

  protected override setValue(v: ValueType | undefined, canValidate = true, skipInput = false): boolean | null {
    if (v && skipInput) {
      const prev = this.$value || this.$initValue;
      prev && dateCopyTime(v, prev, !!this._opts.utc); // copy time if was changing from input (calendar do it itself)
    }
    const isChanged = super.setValue(v, canValidate, skipInput);
    if (isChanged) {
      const c = this.$refPopup?.firstElementChild as WUPCalendarControl;
      if (c) {
        c._isStopChanges = true; // to prevend hidding popup by calendar valueChange
        c.$value = v && !Number.isNaN(v.valueOf()) ? v : undefined;
        setTimeout(() => (c._isStopChanges = false)); // without timeout calendar $changeEvent is fired
      }
    }
    return isChanged;
  }

  protected override valueToInput(v: ValueType | undefined): Promise<string> | string {
    if (v === undefined) {
      return "";
    }
    return dateToString(v, this._opts.format.toUpperCase() + (this._opts.utc ? "Z" : ""));
  }

  protected override resetInputValue(): void {
    // don't call super because validation is appeared
  }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    super.gotInput(e, true);
  }

  protected override gotKeyDown(e: KeyboardEvent): Promise<void> {
    const wasOpen = this.$isOpen;
    let skipCalendar = false;
    switch (e.key) {
      case "Escape":
      case " ":
        skipCalendar = true;
        break;
      case "Home":
      case "End":
        skipCalendar = e.shiftKey || e.ctrlKey; // skip only if pressed shift + Home/End
        break;
      default:
        break;
    }

    const clnd = this.$refPopup?.firstElementChild as WUPCalendarControl;
    wasOpen && !skipCalendar && clnd.gotKeyDown.call(clnd, e); // skip actions for Escape & Space keys
    const r = !e.defaultPrevented && super.gotKeyDown(e);
    !wasOpen && this.$isOpen && !skipCalendar && clnd.gotKeyDown.call(clnd, e); // case when user press ArrowKey for opening menu
    return r || Promise.resolve();
  }

  protected override focusMenuItem(next: HTMLElement | null): void {
    // WARN: it's important don't use call super... because the main logic is implemented inside calendar
    // can be fired from baseCombo => when need to clear selection
    const el = this.$refPopup?.firstElementChild as WUPCalendarControl;
    /* istanbul ignore else */
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
// NiceToHave: alt-behavior; when user press Alt allow to use arrowKeys to navigate in input - use logic for all comboboxes
