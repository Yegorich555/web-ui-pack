import { AttributeMap, AttributeTypes, inheritDefaults } from "../baseElement";
import dateCompareWithoutTime from "../helpers/dateCompareWithoutTime";
import dateCopyTime from "../helpers/dateCopyTime";
import dateFromString from "../helpers/dateFromString";
import dateToString from "../helpers/dateToString";
import localeInfo, { WUPDateFormat } from "../objects/localeInfo";
import WUPTimeObject from "../objects/timeObject";
import WUPPopupElement from "../popup/popupElement";
import WUPBaseComboControl from "./baseCombo";
import WUPBaseControl, { SetValueReasons } from "./baseControl";
import WUPCalendarControl, { PickersEnum } from "./calendar";
import WUPTimeControl from "./time";

WUPCalendarControl.$use();

/** Returns true if date (or some of dates with option `multiple`) matches the predicate */
const someDate = (v: Date | Date[], fn: (d: Date) => boolean): boolean => (Array.isArray(v) ? v.some(fn) : fn(v));

const tagName = "wup-date";
declare global {
  namespace WUP.Date {
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap {
      /** Enabled if option [min] is pointed; If $value < pointed shows message 'Min value is {x}`
       * * WARN: option `min` has higher priority: it's assigned to `$options.validations.min` (overrides pointed one) */
      min: Date;
      /** Enabled if option [max] is pointed; if $value > pointed shows message 'Max value is {x}`
       * * WARN: option `max` has higher priority: it's assigned to `$options.validations.max` (overrides pointed one) */
      max: Date;
      /** Enabled if option [exclude] is pointed; If invalid shows "This value is disabled"
       * * WARN: option `exclude` has higher priority: it's assigned to `$options.validations.exclude` (overrides pointed one) */
      exclude: Date[];
    }
    interface NewOptions {
      /** String representation of displayed date (enables mask, - to disable mask set $options.mask="");
       * @defaultValue localeInfo.date
       * @example `yyyy-mm-dd` or `dd/mm/yyyy`; `yyyy-mm` to select only year & month; `yyyy` to select only year (see option `endWith`)
       * @tutorial Troubleshooting
       * * with changing $options.format need to change/reset mask/maskholder also */
      format: WUPDateFormat | (string & {});
      /** Anchor to TimeControl to sync with date
       * @tutorial dateControl is master and it means
       * * DateControl value merged with TimeControl value (don't need to look for timeControl value at all)
       * * DateControl options/validations `min`, `max` & `required` are applied to TimeControl according to selected date
       * * Option `exclude` are not sync between control for performance purpose (check demo code to implement custom `exclude` for TimeControl)
       * * Ignored with option `multiple`
       * @example
       * ```html
       * <wup-date w-sync="next" w-min="2016-01-02 12:40"></wup-date>
       * <wup-time></wup-time>
       * ``` */
      sync: WUPTimeControl | null;
    }
    interface Options<T = Date, VM = ValidityMap>
      extends WUP.Calendar.Options<T, VM>,
        WUP.BaseCombo.Options<T, VM>,
        NewOptions {
      /** Sets minWidth of popup-menu 100% of control width (option `minWidthByTarget` of `<wup-popup/>`)
       * @defaultValue false */
      popupMinWidthByTarget: boolean;
      /** Picker where user selects value (lower pickers aren't rendered);
       * @defaultValue based on format: `yyyy-mm` => PickersEnum.Month, `yyyy` => PickersEnum.Year, otherwise PickersEnum.Day
       * @tutorial
       * * options `min`, `max` & `exclude` are compared by month/year for PickersEnum.Month/Year */
      endWith: PickersEnum | null;
      /** Allow to select multiple dates; in this case $value & $initValue must be `Date[]`
       * @tutorial rules
       * * click (or Enter) on date selects it OR removes if it's already selected; menu stays opened
       * * selected dates are shown in input separated by comma; new date is added at the end; time isn't copied from previous value
       * * user types the next date at the end of input (mask is applied to it): completed date is added, already selected is ignored
       * * Backspace/Delete removes the whole selected date
       * * validations `min`, `max` & `exclude` are checked for every date
       * * option `sync` is ignored
       * @defaultValue false */
      multiple: boolean;
    }
    interface JSXProps<C = WUPDateControl>
      extends WUP.BaseCombo.JSXProps<C>,
        WUP.Calendar.JSXProps<C>,
        WUP.Base.OnlyNames<NewOptions> {
      /** Default value in strict format yyyy-MM-dd hh:mm:ss.fff; with option `multiple` dates are separated by comma
       * @example "2022-10-25" OR "2022-10-25, 2022-10-28 02:40" */
      "w-initValue"?: string;
      "w-format"?: WUPDateFormat | (string & {});
      /** Anchor to TimeControl to sync with date
       *  * Point querySelector (`#id`, `prev`, `next` or`false`) to related element
       * @example
       * ```html
       * <wup-date w-sync="next" w-min="2016-01-02 12:40"></wup-date>
       * <wup-time></wup-time>
       * ``` */
      "w-sync"?: string;
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPDateControl; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with datepicker
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/date}
       *  @see {@link WUPDateControl} */
      [tagName]: WUP.Base.ReactHTML<WUPDateControl> & WUP.Date.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with datepicker
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/date}
       *  @see {@link WUPDateControl} */
      [tagName]: HTMLAttributes<WUPDateControl> & WUP.Date.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Form-control with datepicker
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/date}
 * @tutorial Troubleshooting
 * * $options.format related only to displayed text, to work with other date-options like min/max use strict format 'YYYY-MM-DD'
 * @example
  const el = document.createElement("wup-date");
  el.$options.name = "dateOfBirthday";
  el.$initValue = new Date("1990-10-24");
  el.$options.validations = { required: true };
  el.$options.format = "yyyy-MM-dd";
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-date w-name="dateOfBirthday" w-utc w-initvalue="1990-10-24" w-min="1930-01-01" w-max="2010-01-01"/>
  </wup-form>; */
export default class WUPDateControl<
  ValueType extends Date | Date[] = Date,
  TOptions extends WUP.Date.Options = WUP.Date.Options,
  EventMap extends WUP.Date.EventMap = WUP.Date.EventMap
> extends WUPBaseComboControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPDateControl;

  // static get $styleRoot(): string {
  //   return "";
  // }

  static get $style(): string {
    return super.$style;
  }

  /** Returns true if value is empty; empty array (option `multiple`) is empty also */
  static override $isEmpty(v: unknown): boolean {
    return WUPCalendarControl.$isEmpty(v);
  }

  /** Compares by valueOf(); arrays (option `multiple`) are equal if contain the same dates in any order */
  static override $isEqual(v1: unknown, v2: unknown, c: WUPBaseControl): boolean {
    return WUPCalendarControl.$isEqual(v1, v2, c);
  }

  static get mappedAttributes(): Record<string, AttributeMap> {
    const m = super.mappedAttributes;
    m.min = { type: AttributeTypes.parsedObject };
    m.max = { type: AttributeTypes.parsedObject };
    m.firstweekday = { type: AttributeTypes.number };
    m.startwith = { type: AttributeTypes.string };
    m.endwith = { type: AttributeTypes.string };
    m.sync = { type: AttributeTypes.selector };
    return m;
  }

  static $defaults: WUP.Date.Options = inheritDefaults([WUPBaseComboControl.$defaults, WUPCalendarControl.$defaults], {
    // debounceMs: 500,
    validationRules: inheritDefaults(WUPBaseComboControl.$defaults.validationRules, {
      min: (v, setV, c) =>
        (v === undefined || someDate(v, (d) => (c as WUPDateControl).compareDates(d, setV) === -1)) &&
        __wupln(`Min value is ${(c as WUPDateControl).valueToInput(setV)}`, "validation"),
      max: (v, setV, c) =>
        (v === undefined || someDate(v, (d) => (c as WUPDateControl).compareDates(d, setV) === 1)) &&
        __wupln(`Max value is ${(c as WUPDateControl).valueToInput(setV)}`, "validation"),
      exclude: (v, setV, c) =>
        (v === undefined || someDate(v, (d) => setV.some((ex) => (c as WUPDateControl).compareDates(d, ex) === 0))) &&
        __wupln(`This value is disabled`, "validation"),
    }),
    format: "",
    sync: null,
    popupMinWidthByTarget: false,
    // firstWeekDay: 1,
    // format: localeInfo.date.toLowerCase()
  });

  get $initValue(): ValueType | undefined {
    return super.$initValue;
  }

  set $initValue(v: ValueType | undefined) {
    super.$initValue = v;
    this.setTimeValue(this.refTime, v, SetValueReasons.initValue);
  }

  constructor() {
    super();
    this.#ctr.$defaults.firstWeekDay ||= localeInfo.firstWeekDay;
    this._opts.firstWeekDay ||= this.#ctr.$defaults.firstWeekDay; // init here to depends on localeInfo

    this.#ctr.$defaults.format ||= localeInfo.date.toLowerCase();
    this._opts.format ||= this.#ctr.$defaults.format; // init here to depends on localeInfo
  }

  /** Parse string to Date; with option `multiple` returns array of dates from string where dates are separated by comma
   * @see {@link WUPCalendarControl.$parse} */
  override parse(text: string): ValueType | undefined {
    if (!text) {
      return undefined;
    }
    const utc = !!this._opts.utc;
    if (this._opts.multiple) {
      return text.split(",").map((s) => WUPCalendarControl.$parse(s.trim(), utc)) as ValueType;
    }
    return WUPCalendarControl.$parse(text, utc) as ValueType;
  }

  /** Called when need to parse attribute; attrs [min], [max] are single dates even with option `multiple` */
  override parseAttr(type: AttributeTypes, attrValue: string, propName: string, attrName: string): any {
    const { multiple } = this._opts;
    this._opts.multiple = false;
    const v = super.parseAttr(type, attrValue, propName, attrName);
    this._opts.multiple = multiple;
    return v;
  }

  /** Called to parse input text to value (related to locale or pointed format);
   * with option `multiple` dates are separated by comma (the same dates & not completed last date are skipped) */
  override parseInput(text: string): ValueType | undefined {
    const format = `${this._opts.format.toUpperCase()} hh:mm:ss.fff${this._opts.utc ? "Z" : ""}`;
    const parse = (s: string): Date | undefined => dateFromString(s, format, { throwOutOfRange: true }) ?? undefined;
    if (!this._opts.multiple) {
      return parse(text) as ValueType;
    }
    const arr = text.split(",");
    this.refMask?.isCompleted === false && arr.pop(); // date that user types now
    const dates: Date[] = [];
    arr.forEach((str) => {
      const s = str.trim();
      if (s) {
        const d = parse(s);
        if (!d) {
          throw new RangeError(`Impossible to parse date from '${s}'`);
        }
        !dates.some((a) => this.compareDates(a, d) === 0) && dates.push(d);
      }
    });
    return (dates.length ? dates : undefined) as ValueType;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override canParseInput(_text: string): boolean {
    return this._opts.multiple || !this.refMask || this.refMask.isCompleted; // with option `multiple` not completed date is skipped
  }

  /** Returns length of text with selected dates (option `multiple`): mask is applied only to the date that user types after them */
  protected override get maskOffset(): number {
    const i = this._opts.multiple ? this.$refInput.value.lastIndexOf(", ") : -1;
    return i === -1 ? 0 : i + 2;
  }

  /** Returns date in format `yyyy-MM-dd`; with option `multiple` dates are joined by `_` */
  override valueToStorage(v: ValueType): string {
    const f = `yyyy-MM-dd${this._opts.utc ? "Z" : ""}`;
    return Array.isArray(v) ? v.map((d) => dateToString(d, f)).join("_") : dateToString(v, f);
  }

  override valueFromStorage(str: string): ValueType | undefined {
    if (this._opts.multiple) {
      return str.split("_").map((s) => WUPCalendarControl.$parse(s, !!this._opts.utc)) as ValueType;
    }
    return super.valueFromStorage(str);
  }

  /** Returns picker where user selects value: $options.endWith or based on $options.format */
  protected get endWith(): PickersEnum {
    const { endWith, format } = this._opts;
    if (endWith != null) return endWith;
    if (/d/i.test(format)) return PickersEnum.Day;
    return /m/i.test(format) ? PickersEnum.Month : PickersEnum.Year;
  }

  /** Compares dates without time by year/month/day according to `endWith` (see $options.endWith)
   * @returns 1, -1 or 0 */
  protected compareDates(a: Date, b: Date): number {
    const p = this.endWith;
    const { utc } = this._opts;
    if (!p) {
      return dateCompareWithoutTime(a, b, utc);
    }
    const u = utc ? "UTC" : "";
    const val = (v: Date): number => v[`get${u}FullYear`]() * 12 + (p === PickersEnum.Month ? v[`get${u}Month`]() : 0);
    return Math.sign(val(a) - val(b));
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

    const el = this.refTime;
    if (el) {
      if (this._opts.name && !el.$options.name) {
        el.$options.name = ""; // important to enable validation for time control
      }
      this.setTimeValidations(el); // to sync validation required
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

  protected override renderMenu(popup: WUPPopupElement, menuId: string): HTMLElement {
    const el = document.createElement("wup-calendar");
    el.renderInput = () => {
      el.$refLabel.remove();
      return { menuId };
    };
    el.focusItem = (a) => this.focusMenuItem(a);
    el.focus = () => true; // to not allow to focus calendar itself
    el.gotFocus.call(el, new FocusEvent("focusin"));
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    el.setInputValue = () => {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    el.gotFormChanges = () => {}; // it's must be completely detached from formElement
    el.$refInput = this.$refInput;
    el.$options.validations = this.validations!.required ? { required: true } : undefined;
    el.$options.startWith = this._opts.startWith;
    el.$options.endWith = this.endWith;
    el.$options.exclude = this._opts.exclude;
    el.$options.max = this._opts.max;
    el.$options.min = this._opts.min;
    el.$options.utc = this._opts.utc;
    el.$options.multiple = this._opts.multiple;
    el.$options.name = undefined; // to detach from formElement
    el.$options.validationCase = 0; // disable any validations for control
    const v = this.$value;
    el.$initValue = (v && !Number.isNaN(v.valueOf()) ? v : undefined) as Date | undefined;
    el.setValue = (val, reason) => {
      const r = WUPCalendarControl.prototype.setValue.call(el, val, reason);
      if (reason === SetValueReasons.userSelect) {
        this.selectValue(el.$value as ValueType, !this._opts.multiple); // menu stays opened to select several dates
      }
      return r;
    };
    el.$onChange = (e) => e.stopPropagation(); // otherwise date change event fired twice
    popup.appendChild(el);
    return el;
  }

  protected override setValue(v: ValueType | undefined, reason: SetValueReasons, skipInput = false): boolean | null {
    const elTime = this.refTime;

    if (v && !Array.isArray(v)) {
      let isCopied = false;
      if (skipInput) {
        const prev = (this.$value || this.$initValue) as Date | undefined;
        prev && dateCopyTime(v, prev, this._opts.utc); // copy time if was changing from input (calendar do it itself)
        isCopied = !!prev;
      }

      // copy time value from synced timeControl
      if (!isCopied && reason !== SetValueReasons.manual && reason !== SetValueReasons.initValue) {
        const vt = elTime?.$value;
        if (vt) {
          v = vt.copyToDate(v, this._opts.utc) as ValueType;
        }
      }
    } else if (v && skipInput) {
      // time isn't shown in input: so the same dates are taken from previous value
      const prev = [this.$value, this.$initValue].flat() as Array<Date | undefined>;
      v = v.map((d) => prev.find((p) => p && this.compareDates(p, d) === 0) || d) as ValueType;
    }

    const isChanged = super.setValue(v, reason, skipInput);
    if (isChanged) {
      const c = this.$refPopup?.firstElementChild as WUPCalendarControl;
      if (c) {
        c._isStopChanges = true; // to prevent hiding popup by calendar valueChange
        c.$value = (v && !Number.isNaN(v.valueOf()) ? v : undefined) as Date | undefined;
        setTimeout(() => (c._isStopChanges = false)); // without timeout calendar.$changeEvent is fired
      }
      if (skipInput && this._opts.multiple) {
        // add delimiter for the next date; keep date that user types now
        const tail = this.refMask?.isCompleted === false ? this.$refInput.value.substring(this.maskOffset) : "";
        const s = this.valueToInput(this.$value) + tail;
        s !== this.$refInput.value && this.setInputValueDirect(s, reason);
      }
    }

    if (elTime) {
      this.setTimeValidations(elTime);
      if (reason === SetValueReasons.manual) {
        this.setTimeValue(elTime, v, reason);
      } else if (elTime.$value) {
        !elTime.$isEmpty && elTime.$validate();
      }
    }
    return isChanged;
  }

  protected override valueToInput(v: ValueType | undefined): string {
    if (v === undefined) {
      return "";
    }
    const f = this._opts.format.toUpperCase() + (this._opts.utc ? "Z" : "");
    if (!Array.isArray(v)) {
      return dateToString(v, f);
    }
    const s = v.map((d) => dateToString(d, f)).join(", ");
    return s && this.$isFocused && !this.$refInput.readOnly ? `${s}, ` : s; // delimiter to type the next date
  }

  protected override gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    const head = this.maskOffset; // text with selected dates (option `multiple`)
    if (head) {
      const el = this.$refInput;
      const t = e.inputType;
      let pos1 = el.selectionStart!;
      let pos2 = el.selectionEnd!;
      if (t.startsWith("delete")) {
        if (pos1 === pos2) {
          if (t.endsWith("Forward")) ++pos2;
          else --pos1;
        }
        if (pos1 >= 0 && pos1 < head) {
          // select the whole dates so browser removes them itself
          const s = el.value;
          const i = s.lastIndexOf(", ", pos1 - 2);
          pos2 <= head && (pos2 = s.indexOf(", ", pos2 - 2) + 2);
          el.setSelectionRange(i === -1 ? 0 : i + 2, pos2);
        }
      } else if (t === "insertText" || t === "insertFromPaste") {
        if (this.refMask?.isCompleted && !this._inputError) {
          this.setInputValue(this.$value, SetValueReasons.userInput); // start the next date (removes typed date if it's already selected)
        } else if (pos1 < head) {
          el.setSelectionRange(el.value.length, el.value.length); // user can type only the next date
        }
      }
    }
    super.gotBeforeInput(e);
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    this._opts.multiple && !this._inputError && this.setInputValue(this.$value, SetValueReasons.userInput); // to add delimiter
    return super.gotFocus(ev);
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    this._opts.multiple && !this._inputError && this.setInputValue(this.$value, SetValueReasons.userInput); // to remove delimiter
  }

  protected override focusMenuItem(next: HTMLElement | null): void {
    // WARN: it's important not use super... because the main logic is implemented inside calendar
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

  /** Returns tied TimeControl related to option `sync`; returns `null` with option `multiple` (sync isn't supported) */
  get refTime(): WUPTimeControl | null {
    if (this._opts.multiple) {
      return null;
    }
    const s = this._opts.sync;
    if (s && typeof s === "string") {
      this._opts.sync = this.findBySelector(s);
    }
    return this._opts.sync;
  }

  /** Set value if found tied timeControl@see refTime  */
  protected setTimeValue(elTime: WUPTimeControl | null, v: ValueType | undefined, reason: SetValueReasons): void {
    if (!elTime) {
      return;
    }

    // @ts-expect-error
    delete elTime.setValue; // delete hook to prevent cycle

    const t = v && new WUPTimeObject(v as Date, this._opts.utc);
    // eslint-disable-next-line default-case
    switch (reason) {
      case SetValueReasons.initValue:
        elTime.$initValue = t;
        break;
      case SetValueReasons.manual:
        elTime.$value = t;
        break;
    }

    // set hook on value change
    // @ts-expect-error - because protected
    const orig = (Object.getPrototypeOf(elTime) as WUPTimeControl).setValue;
    // @ts-expect-error - because protected
    elTime.setValue = (...args) => {
      const isChanged = orig.call(elTime, ...args);
      const dt = this.$value as Date | undefined;
      if (isChanged && dt) {
        (elTime.$value || new WUPTimeObject(0, 0)).copyToDate(dt, this._opts.utc);
      }
      return isChanged;
    };
  }

  /** Called when possible need to update min/max/exclude for time control */
  protected setTimeValidations(elTime: WUPTimeControl): void {
    const v = this.$value as Date | undefined;
    const obj: { min?: WUPTimeObject; max?: WUPTimeObject } = {};
    const vld = this._opts.validations;
    if (v) {
      (["min", "max"] as Array<"min" | "max">).forEach((k) => {
        const dFrom = this._opts[k] || (vld && vld[k]);
        if (dFrom) {
          if (typeof dFrom === "function") {
            this.throwError("Impossible to sync [min] with time. Expected Date instead of function");
            return;
          }
          const c = dateCompareWithoutTime(v, dFrom, this._opts.utc);
          obj[k] = c === 0 ? new WUPTimeObject(dFrom, this._opts.utc) : obj[k]; // in other cases dateControl must show error
        }
      });
    }

    const o = elTime.$options;
    o.min = obj.min;
    o.max = obj.max;
    o.validations ||= {};
    o.validations.required = !!vld?.required; // if date is required then time also is required
    o.validations.min = undefined;
    o.validations.max = undefined;
  }
}

customElements.define(tagName, WUPDateControl);
