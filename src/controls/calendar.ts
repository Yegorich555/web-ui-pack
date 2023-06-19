import WUPBaseControl, { SetValueReasons } from "./baseControl";
import { WUPcssHidden } from "../styles";
import WUPScrolled from "../helpers/scrolled";
import { dateCopyTime, dateFromString, dateToString } from "../indexHelpers";
import localeInfo from "../objects/localeInfo";

const tagName = "wup-calendar";

export const enum PickersEnum {
  Day = 0,
  Month,
  Year,
}

declare global {
  namespace WUP.Calendar {
    interface IItemElement extends HTMLElement {
      _value: number;
    }
    interface IPickerResult {
      renderItems: (ol: HTMLElement, v: Date) => IItemElement[];
      getIndex: (v: Date, firstValue: number) => number;
      next: (v: Date, n: number) => Date;
      onItemClick: (e: MouseEvent & { target: HTMLElement }, targetValue: number) => void;
    }
    /** UTC-normalized params for disabled dates */
    interface INormalized {
      months: number[];
      years: number[];
      scrollFrom?: number;
      scrollTo?: number;
      min: Date | undefined;
      max: Date | undefined;
      exclude: Date[] | undefined;
    }
    interface IMonthInfo {
      /** Total days in month */
      total: number;
      /** Previous days-range for placeholders */
      prev?: { from: number; to: number };
      /** Count of next days */
      nextTo: number;
      /** ValueOf first Date of result in UTC */
      first: number;
    }
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface ValidityMap extends WUP.BaseControl.ValidityMap {}
    interface Defaults<T = Date, VM = ValidityMap> extends WUP.BaseControl.Defaults<T, VM> {
      /** First day of week in calendar where 1-Monday, 7-Sunday;
       * @defaultValue localeInfo.firstWeekDay */
      firstWeekDay?: number;
    }
    interface Options<T = Date, VM = ValidityMap> extends WUP.BaseControl.Options<T, VM>, Defaults<T, VM> {
      /** User can't select date less than min; point new Date(Date.UTC(2022,1,25)) for `utc:true`, or new Date(2022,1,25) */
      min?: Date;
      /** User can't select date more than max; point new Date(Date.UTC(2022,1,25)) for `utc:true`, or new Date(2022,1,25) */
      max?: Date;
      /** Picker that must be rendered at first; if undefined then when isEmpty - year, otherwise - day;
       * @not observed (affects only on init) */
      startWith?: PickersEnum;
      /** Dates that user can't choose (disabled dates) */
      exclude?: Date[];
      /** Provide local or UTC date; min/max/exclude $initValue/$value must be provided according to this
       *  @defaultValue true */
      utc?: boolean;
      firstWeekDay: number;
    }
    interface Attributes extends WUP.BaseControl.Attributes, Pick<Options, "utc"> {
      /** Picker that must be rendered at first */
      startWith?: "year" | "month" | "day";
      /** User can't select date less than min; format yyyy-MM-dd */
      min?: string;
      /** User can't select date more than max; format yyyy-MM-dd  */
      max?: string;
      /** Dates that user can't choose. Point global obj-key (window.myExclude = [] ) */
      exclude?: string;
      /** default value; format yyyy-MM-dd hh:mm:ss.fff */
      initValue?: string;
    }
    interface JSXProps<C = WUPCalendarControl> extends WUP.BaseControl.JSXProps<C>, Attributes {
      initValue?: string;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPCalendarControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control represented by date picker
       *  @see {@link WUPCalendarControl} */
      [tagName]: WUP.Calendar.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

const add: <K extends keyof HTMLElementTagNameMap>(el: HTMLElement, tagName: K) => HTMLElementTagNameMap[K] = (
  el,
  tag
) => el.appendChild(document.createElement(tag));

/** Form-control represented by date picker
 * @example
  const el = document.createElement("wup-calendar");
  el.$options.name = "dateOfBirthday";
  el.$initValue = "1990-10-24";
  el.$options.validations = { required: true };
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-calendar name="dateOfBirhday" utc initvalue="1990-10-24" min="1930-01-01" max="2010-01-01"/>
  </wup-form>;
 */
export default class WUPCalendarControl<
  ValueType extends Date = Date,
  EventMap extends WUP.Calendar.EventMap = WUP.Calendar.EventMap
> extends WUPBaseControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPCalendarControl;

  static get nameUnique(): string {
    return "WUPCalendarControl";
  }

  static get $styleRoot(): string {
    return `:root {
      --ctrl-clr-selected: #fff;
      --ctrl-clr-selected-bg: #009fbc;
      --ctrl-clr-width: 17em;
      --ctrl-clr-cell-gap: 0px;
      --ctrl-clr-padding: calc(4px + var(--ctrl-clr-cell-gap) / 2);
    }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        max-width: fit-content;
        margin: auto auto 20px;
        border-radius: var(--ctrl-border-radius);
        box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.1);
        background: none;
        text-transform: capitalize;
      }
      :host label {
        max-width: var(--ctrl-clr-width);
        display: block;
        padding-right: 0;
      }
      :host strong {
        display: block;
        box-sizing: border-box;
        max-width: 100%;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
      :host input {${WUPcssHidden}}
      :host [calendar] {
        --ctrl-clr-cell-day-w: calc(var(--ctrl-clr-width) / 7 - var(--ctrl-clr-cell-gap));
        --ctrl-clr-h: calc((var(--ctrl-clr-cell-day-w) + var(--ctrl-clr-cell-gap)) * 6);
        width: var(--ctrl-clr-width);
        padding: var(--ctrl-clr-padding);
        border-radius: var(--ctrl-border-radius);
        background: var(--ctrl-bg);
        box-sizing: content-box;
      }
      :host [calendar="day"] {
        --ctrl-clr-cell-w: var(--ctrl-clr-cell-day-w);
        --ctrl-clr-cell-h: var(--ctrl-clr-cell-day-w);
      }
      :host [calendar="month"],
      :host [calendar="year"] {
        --ctrl-clr-cell-w: calc(var(--ctrl-clr-width) / 4 - var(--ctrl-clr-cell-gap));
        --ctrl-clr-cell-h: calc((var(--ctrl-clr-h) + 1em + var(--ctrl-clr-padding)) / 4 - var(--ctrl-clr-cell-gap));
      }
      :host [calendar="month"] ul,
      :host [calendar="year"] ul {
        display: none;
      }
      :host header,
      :host ol,
      :host ul {
        display: flex;
        flex-wrap: wrap;
        margin:0; padding:0;
      }
      :host header > button {
        box-sizing: border-box;
        cursor: pointer;
        margin: auto;
        padding: 4px 1em;
        font-size: larger;
        font-weight: initial;
        border: none;
        border-radius: 2em;
        color: inherit;
        background-color: white;
        box-shadow: none;
        text-transform: inherit;
      }
      :host header > button[disabled] {
        pointer-events: none;
      }
      :host ol,
      :host ul {
        margin-top: var(--ctrl-clr-padding);
        list-style: none;
      }
      :host ul {
        color: var(--ctrl-label);
      }
      :host li {
        height: var(--ctrl-clr-cell-h);
        width: var(--ctrl-clr-cell-w);
        padding: 0;
        margin: calc(var(--ctrl-clr-cell-gap) / 2);
        font: inherit;
        line-height: var(--ctrl-clr-cell-h);
        text-align: center;
        border-radius: 50%;
      }
      :host ul>li {
        margin: 0 calc(var(--ctrl-clr-cell-gap) / 2);
        height: 1em;
        line-height: 1em;
      }
      :host li[prev],
      :host li[next] {
        opacity: 0.6;
      }
      :host li[aria-current] {
        color: var(--ctrl-clr-selected-bg);
        font-weight: bold;
        opacity: 1;
      }
      :host li[aria-selected] {
        background-color: var(--ctrl-clr-selected-bg);
        color: var(--ctrl-clr-selected);
        opacity: 1;
      }
      :host li[focused] {
        box-shadow: 0 0 3px 1px inset var(--ctrl-focus);
        //box-shadow: 0 0 3px 1px var(--ctrl-focus);
        opacity: 1;
      }
      :host li[focused][aria-selected] {
        text-decoration: underline;
      }
      @media (hover: hover) and (pointer: fine) {
        :host header>button:hover {
          background-color: var(--ctrl-clr-selected-bg);
          color: var(--ctrl-clr-selected);
        }
        ol>li:hover:not([disabled]) {
          box-shadow: 0 0 3px 1px inset var(--ctrl-focus);
          //box-shadow: 0 0 3px 1px var(--ctrl-focus);
          opacity: 1;
        }
      }
      :host li[disabled] {
        color: var(--ctrl-err-text);
        background-color: var(--ctrl-err-bg);
      }
      @media not all and (prefers-reduced-motion) {
        @keyframes WUP-ZOOM-OUT-1 {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes WUP-ZOOM-OUT-2 {
          0% { transform: scale(5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes WUP-ZOOM-IN-1 {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(5); opacity: 0; }
        }
        @keyframes WUP-ZOOM-IN-2 {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        :host [calendar]>div {
          overflow: hidden;
        }
        :host [zoom] { animation: none var(--anim-time) linear forwards; }
        :host [zoom="out"] { animation-name: WUP-ZOOM-OUT-1; }
        :host [zoom="out2"] { animation-name: WUP-ZOOM-OUT-2; }
        :host [zoom="in"] { animation-name: WUP-ZOOM-IN-1; }
        :host [zoom="in2"] { animation-name: WUP-ZOOM-IN-2; }
      }`;
  }

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.Calendar.Options>;
    arr.push("utc", "min", "max", "exclude");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.Calendar.Attributes>>;
    arr.push("utc", "min", "max", "exclude");
    return arr;
  }

  /** Returns days of pointed number-of-month with placeholders of prev, next months
   * @param year 2022 etc.
   * @param month index of month (0-11)
   * @param firstWeekDay where 1-Monday, 7-Sunday
   */
  static $daysOfMonth(year: number, month: number, firstWeekDay = 1): WUP.Calendar.IMonthInfo {
    let dt = new Date(year, month + 1, 0); // month in JS is 0-11 index based but here is a hack: returns last day of month
    const r: WUP.Calendar.IMonthInfo = { total: dt.getDate(), nextTo: 0, first: 0 };
    dt.setDate(1); // reset to first day
    let shift = (dt.getDay() || 7) - firstWeekDay; // days-shift to firstOfWeek // get dayOfWeek  returns Sun...Sat (0...6) and need to normalize to Mon-1 Sun-7
    if (shift < 0) {
      shift += 7;
    }
    if (shift) {
      dt = new Date(year, month, 0);
      const to = dt.getDate();
      const from = to - shift + 1;
      r.prev = { from, to };
      dt.setDate(from);
    }
    r.first = dt.valueOf() - dt.getTimezoneOffset() * 60000; // store in UTC
    const weeksDays = 42; // const weeksDays = Math.ceil((r.total + $1) / 7) * 7; // Generate days for 35 or 42 cells with previous month dates for placeholders
    r.nextTo = weeksDays - shift - r.total;
    return r;
  }

  /** Parse string to Date
   * @example
   * "2022-10-25" asUTC >> returns new Date(Date.UTC(yyyy, MM, dd))
   * "2022-10-25 02:40" asUTC >> returns new Date(Date.UTC(yyyy, MM, dd, hh, mm))
   * "2022-10-25" >> returns new Date(yyyy, MM, dd)
   * "2022-10-25 02:40" >> returns new Date(yyyy, MM, dd, hh, mm)
   * "2022-10-25T02:40:00.000Z" >> returns UTC Date (argument `asUTC:false` is ignored)
   */
  static $parse(yyyyMMdd: string, asUTC: boolean): Date {
    const sep = yyyyMMdd.includes("T") ? "T" : " ";
    const format = `YYYY-MM-DD${sep}hh:mm:ss.fff${asUTC || yyyyMMdd.endsWith("Z") ? "Z" : ""}`;
    const v = dateFromString(yyyyMMdd, format, { throwOutOfRange: true });
    if (v == null) {
      throw new Error(`Impossible to parse date from '${yyyyMMdd}'. Expected format '${format}'`);
    }
    return v!; // null impossible here
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Calendar.Defaults = {
    ...WUPBaseControl.$defaults,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
    },
  };

  $options: WUP.Calendar.Options<ValueType> = {
    ...this.#ctr.$defaults,
    utc: true,
    firstWeekDay: this.#ctr.$defaults.firstWeekDay || localeInfo.firstWeekDay,
  };

  protected override _opts = this.$options;

  /** Call when need to re-rended picker (min/max changed etc.) */
  $refreshPicker(): void {
    /* istanbul ignore else */
    if (this._pickerValue != null) {
      this.changePicker(this._pickerValue, this._picker);
    }
  }

  /** Converts date-string into Date according (to $options.utc)
   * @see {@link WUPCalendarControl.$parse} */
  override parse(text: string): ValueType | undefined {
    if (!text) {
      return undefined;
    }
    return this.#ctr.$parse(text, !!this._opts.utc) as ValueType;
  }

  /** Reference to calendar-container */
  $refCalenar = document.createElement("div");
  /** Reference to header-button */
  $refCalenarTitle = document.createElement("button");
  /** Reference to container with items */
  $refCalenarItems: HTMLOListElement & { _items?: WUP.Calendar.IItemElement[] } = document.createElement("ol");

  /** Called once when need to render label + input */
  renderInput(): { menuId: string } {
    const i = this.$refInput;
    i.type = "text"; // to allow browser-autofill. type="date" is announced wrong in our case
    i.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", i.id);
    i.setAttribute("role", "combobox");
    const menuId = this.#ctr.$uniqueId;
    i.setAttribute("aria-owns", menuId);
    i.setAttribute("aria-controls", menuId);

    const s = add(this.$refLabel, "span");
    s.appendChild(this.$refInput);
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);
    return { menuId };
  }

  protected override renderControl(): void {
    const { menuId } = this.renderInput();

    // render calendar
    this.$refCalenar.id = menuId;
    const h = add(this.$refCalenar, "header");
    /* */ h.appendChild(this.$refCalenarTitle);
    this.$refCalenarTitle.setAttribute("tabindex", "-1");
    this.$refCalenarTitle.setAttribute("aria-hidden", true);
    this.$refCalenarTitle.setAttribute("type", "button");
    const box = add(this.$refCalenar, "div");
    const animBox = add(box, "div");
    /* */ animBox.appendChild(this.$refCalenarItems);
    this.$refCalenarItems.setAttribute("role", "grid");
    this.appendChild(this.$refCalenar);
    // WARN: for render picker see gotReady
  }

  override valueToUrl(v: ValueType): string {
    return dateToString(v, "yyyy-MM-dd");
  }

  /** Appends calendar item to parent or replace previous */
  protected appendItem(
    prevEl: WUP.Calendar.IItemElement | undefined | null,
    text: string,
    v: number
  ): WUP.Calendar.IItemElement {
    let el: WUP.Calendar.IItemElement;
    if (prevEl) {
      el = prevEl;
      while (el.attributes.length > 0) {
        el.removeAttributeNode(el.attributes[0]);
      }
    } else {
      el = add(this.$refCalenarItems, "li") as unknown as WUP.Calendar.IItemElement;
    }
    el.setAttribute("role", "gridcell");
    el.textContent = text;
    el._value = v;
    return el;
  }

  _pickerValue?: Date;
  _picker: PickersEnum = 0;
  #refreshSelected?: () => void;
  #clearPicker?: (isIn: boolean) => Promise<void>;
  #scrollObj?: WUPScrolled;

  /** Call it to manually show next/prev picker-section;
   * @returns promise resolved by scroll-animation-end */
  showNext(isNext: boolean): Promise<void> {
    return !this.#scrollObj ? Promise.resolve() : this.#scrollObj.goTo(isNext);
  }

  /** Called when need set/change day/month/year picker */
  protected async changePicker(v: Date, pickerNext: PickersEnum): Promise<void> {
    await this.#clearPicker?.call(this, pickerNext - this._picker > 0);
    this._picker = pickerNext;

    let r: WUP.Calendar.IPickerResult;
    let type: string;
    switch (pickerNext) {
      case PickersEnum.Year:
        type = "year";
        r = this.getYearPicker(v);
        this.$refCalenarTitle.disabled = true;
        break;
      case PickersEnum.Month:
        type = "month";
        r = this.getMonthPicker(v);
        this.$refCalenarTitle.disabled = false;
        break;
      default:
        type = "day";
        r = this.getDayPicker();
        this.$refCalenarTitle.disabled = false;
    }

    this.$refCalenar.setAttribute("calendar", type);
    this.#handleClickItem = r.onItemClick;

    const renderPicker = (next: Date): WUP.Calendar.IItemElement[] => {
      this._pickerValue = next;
      const a = r.renderItems(this.$refCalenarItems, next);
      this.$refCalenarItems._items = a;

      const first = a[0]._value;
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      let i = r.getIndex(now, first);
      a[i]?.setAttribute("aria-current", "date");

      this.#refreshSelected = () => {
        let uv = this.$value as Date;
        if (uv) {
          if (!this._opts.utc) {
            uv = new Date(uv.valueOf() - uv.getTimezoneOffset() * 60000);
          }
          i = r.getIndex(uv, first);
          this.selectItem(a[i]);
        }
      };
      this.#refreshSelected();

      this.disableItems(a, r.getIndex);
      this.$isFocused && this.$ariaSpeak(this.$refCalenarTitle.textContent!);
      this.#focused && this.focusItem(a.find((e) => !e.hasAttribute("prev"))!);
      return a;
    };

    renderPicker(v);

    const scrollObj = new WUPScrolled(this.$refCalenarItems, {
      onRender: (n) => {
        const nextDate = r.next(v, n);
        const { scrollFrom: from, scrollTo: to } = this.#disabled!;
        /* istanbul ignore else */
        if (from != null || to !== null) {
          const nextDateEnd = r.next(new Date(v), 1).setUTCMilliseconds(-1);
          if ((from as unknown as number) > nextDateEnd || (to as unknown as Date) < nextDate) {
            r.next(v, (-1 * n) as 1);
            return null;
          }
        }
        const arr = renderPicker(nextDate);
        return arr;
      },
    });

    this.#scrollObj = scrollObj;

    this.#clearPicker = async (isOut: boolean) => {
      const box = this.$refCalenar.children[1].children[0] as HTMLElement;
      const animate = (attrVal: string): Promise<any> =>
        new Promise<any>((resolve) => {
          box.setAttribute("zoom", attrVal);
          const { animationDuration: ad } = window.getComputedStyle(box);
          if (!ad) {
            resolve(null);
          } else {
            // for cases when animation somehow not fired
            setTimeout(resolve, Number.parseFloat(ad.substring(0, ad.length - 1)) * 1000);
            box.addEventListener(
              "animationstart",
              () => box.addEventListener("animationend", resolve, { once: true }),
              { once: true }
            );
          }
        });

      await animate(isOut ? "out" : "in");
      scrollObj.dispose();
      this.removeChildren.call(this.$refCalenarItems);
      this.#refreshSelected = undefined;

      animate(isOut ? "out2" : "in2").then(() => box.removeAttribute("zoom")); // WARN: it's important not to wait
    };
  }

  /** Returns result to render day picker */
  #isDayWeeksAdded = false;
  protected getDayPicker(): WUP.Calendar.IPickerResult {
    // render daysOfWeek
    if (!this.#isDayWeeksAdded) {
      const box = this.$refCalenarItems.parentElement!;
      const days = document.createElement("ul");
      days.setAttribute("aria-hidden", true);
      box.prepend(days);
      const names = localeInfo.namesDayShort;
      for (let i = 0, n = this._opts.firstWeekDay - 1; i < 7; ++i, ++n) {
        const d = add(days, "li");
        if (n >= names.length) {
          n = 0;
        }
        d.textContent = names[n];
      }
      this.#isDayWeeksAdded = true;
    }

    // WARN: the whole calendar must be in UTC, otherwise getIndex is wrong for locales with DST (daylightSavingTime)
    const getIndex: WUP.Calendar.IPickerResult["getIndex"] = (b, first) =>
      Math.floor((b.valueOf() - (first as number)) / 86400000);

    const { namesMonth } = localeInfo;
    const renderItems = (ol: HTMLElement, v: Date): WUP.Calendar.IItemElement[] => {
      const valMonth = v.getUTCMonth();
      const valYear = v.getUTCFullYear();
      this.$refCalenarTitle.textContent = `${namesMonth[valMonth]} ${valYear}`;

      const items: WUP.Calendar.IItemElement[] = [];
      const r = this.#ctr.$daysOfMonth(valYear, valMonth, this._opts.firstWeekDay);

      let iPrev = -999;
      if (ol.children.length) {
        iPrev = getIndex(r.first as unknown as Date, (ol.children.item(0) as any)._value);
      }

      let i = 0;
      const addItem = (n: number, attr: string): void => {
        const d = this.appendItem(
          ol.children.item(iPrev) as WUP.Calendar.IItemElement,
          n.toString(),
          r.first + i * 86400000
        );
        attr && d.setAttribute(attr, "");
        items.push(d);
        ++i;
        ++iPrev;
      };

      if (r.prev) {
        for (let n = r.prev.from; n <= r.prev.to; ++n) {
          addItem(n, "prev");
        }
      }
      for (let n = 1; n <= r.total; ++n) {
        addItem(n, "");
      }
      for (let n = 1; n <= r.nextTo; ++n) {
        addItem(n, "next");
      }

      return items;
    };

    return {
      getIndex,
      renderItems,
      next: (v, n) => {
        v.setUTCMonth(v.getUTCMonth() + n);
        return v;
      },
      onItemClick: ({ target }, v) => {
        this.selectItem(target);
        let dt = new Date(v);
        if (!this._opts.utc) {
          dt = new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
        }
        const prev = this.$value || this.$initValue;
        prev && dateCopyTime(dt, prev, !!this._opts.utc);
        this.setValue(dt as ValueType, SetValueReasons.userInput);
        this.$ariaSpeak(this.$refInput.value);
        // this.focusItem(target);
      },
    };
  }

  /** Returns result to render month picker */
  protected getMonthPicker(dateToRound: Date): WUP.Calendar.IPickerResult {
    const pageSize = 12;
    dateToRound.setUTCMonth(0, 1); // required to define rendered range for min/max

    const getIndex: WUP.Calendar.IPickerResult["getIndex"] = //
      (b, first) => b.getUTCFullYear() * pageSize + b.getUTCMonth() - first;

    const renderItems = (ol: HTMLElement, v: Date): WUP.Calendar.IItemElement[] => {
      const year = v.getUTCFullYear();
      this.$refCalenarTitle.textContent = `${year}`;

      const namesShort = localeInfo.namesMonthShort;
      const items: WUP.Calendar.IItemElement[] = [];
      const total = year * pageSize;

      let iPrev = -999;
      if (ol.children.length) {
        iPrev = getIndex(new Date(Date.UTC(year, 0)), (ol.children.item(0) as any)._value);
      }

      const addItem = (n: string, i: number): WUP.Calendar.IItemElement => {
        const d = this.appendItem(ol.children.item(iPrev) as WUP.Calendar.IItemElement, n, total + i);
        items.push(d);
        ++iPrev;
        return d;
      };

      namesShort.forEach(addItem);
      const n = items.length;
      for (let i = 0; i < 4; ++i) {
        const d = addItem(namesShort[i], i + n);
        d.setAttribute("next", "");
      }

      return items;
    };

    return {
      renderItems,
      getIndex,
      next: (v, n) => {
        v.setUTCFullYear(v.getUTCFullYear() + n);
        return v;
      },
      onItemClick: (_e, v) =>
        this.changePicker(new Date(Date.UTC(Math.floor(v / pageSize), v % pageSize, 1)), PickersEnum.Day),
    };
  }

  /** Returns result to render year picker */
  protected getYearPicker(dateToRound: Date): WUP.Calendar.IPickerResult {
    const pageSize = 16;

    const getFirst = (v: Date): number => {
      const page = Math.floor((v.getUTCFullYear() - 1970) / pageSize);
      return page * pageSize + 1970;
    };

    dateToRound.setUTCMonth(0, 1);
    dateToRound.setUTCFullYear(getFirst(dateToRound)); // required to define rendered range for min/max

    const renderItems = (_ol: HTMLElement, v: Date): WUP.Calendar.IItemElement[] => {
      let year = getFirst(v);

      this.$refCalenarTitle.textContent = `${year} ... ${year + pageSize - 1}`;
      const items: WUP.Calendar.IItemElement[] = [];
      let i = 0;
      for (i = 0; i < pageSize; ++i) {
        const d = this.appendItem(undefined, year.toString(), year);
        items.push(d);
        ++year;
      }

      return items;
    };

    return {
      renderItems,
      getIndex: (b, first) => b.getUTCFullYear() - (first as number),
      next: (v, n) => {
        v.setUTCFullYear(v.getUTCFullYear() + n * pageSize);
        return v;
      },
      onItemClick: (_e, v) => this.changePicker(new Date(Date.UTC(v, 0)), PickersEnum.Month),
    };
  }

  /** Set [disabled] for items according to $options.exclude & min & max */
  protected disableItems(items: WUP.Calendar.IItemElement[], getIndex: WUP.Calendar.IPickerResult["getIndex"]): void {
    const first = items[0]._value;
    let i = 0;

    const { min, max } = this.#disabled!;
    if (min) {
      const last = getIndex(min, first);
      items.some((item, k) => {
        if (k >= last) {
          return true;
        }
        return item.setAttribute("disabled", "");
      });
    }

    if (max) {
      i = getIndex(max, first);
      for (++i; i < items.length; ++i) {
        items[i]?.setAttribute("disabled", "");
      }
    }

    if (this._picker === PickersEnum.Day) {
      const { exclude } = this.#disabled!;
      if (!exclude) {
        return;
      }
      i = exclude.findIndex((d) => d.valueOf() >= first);
      if (i < 0) {
        return;
      }
      for (; i < exclude.length; ++i) {
        const el = items[getIndex(exclude[i], first)];
        if (el) {
          el.setAttribute("disabled", "");
        } else {
          return;
        }
      }
    } else {
      const arr = this._picker === PickersEnum.Month ? this.#disabled!.months : this.#disabled!.years;
      let k = 0;
      for (i = 0; i < items.length && k < arr.length; ++i) {
        const el = items[i];
        for (; k < arr.length; ++k) {
          /* istanbul ignore else */
          if (arr[k] > el._value) {
            break;
          } else if (arr[k] === el._value) {
            el.setAttribute("disabled", "");
            ++k;
            break;
          }
        }
      }
    }
  }

  #disabled?: WUP.Calendar.INormalized;
  /** Returns utc-normalized object based on options;
   *  where monthValue: y*12 + m, yearValue: y */
  calcDisabled(): WUP.Calendar.INormalized {
    const months: number[] = [];
    const years: number[] = [];

    // eslint-disable-next-line prefer-const
    let { min, max, utc } = this._opts;
    if (!utc) {
      min = min ? new Date(min.valueOf() - min.getTimezoneOffset() * 60000) : min;
      max = max ? new Date(max.valueOf() - max.getTimezoneOffset() * 60000) : max;
    }

    let ex = this._opts.exclude;
    if (ex?.length) {
      const from = min ? new Date(min).setUTCHours(23, 59, 59, 999) : Number.MIN_SAFE_INTEGER; // shift min at the end of day
      const to = max ? new Date(max).setUTCHours(0, 0, 0, 0) : Number.MAX_SAFE_INTEGER; // shift max at the start of day

      let prevY: number | null = null;
      let mCnt = 0;
      const last = ex.length - 1;
      if (!this._opts.utc) {
        ex = ex.map((v) => new Date(v.valueOf() - v.getTimezoneOffset() * 60000));
      }
      for (let i = 0; i < ex.length; ++i) {
        const iStart = i;
        const y = ex[i].getUTCFullYear();
        const m = ex[i].getUTCMonth();
        const nextM = new Date(Date.UTC(y, m + 1));
        if (prevY !== y) {
          prevY = y;
          mCnt = 0;
        }
        for (; i < ex.length; ++i) {
          if (ex[i + 1] >= nextM || i === last) {
            const cnt = i - iStart + 1;
            const total = new Date(y, m + 1, 0).getDate(); // WARN: convert to UTC is useless
            const hasEnabled =
              (ex[i] as unknown as number) > from && cnt !== total && (ex[i] as unknown as number) < to;
            if (!hasEnabled) {
              months.push(y * 12 + m);
              ++mCnt === 12 && years.push(y);
            }
            if (i !== last) {
              break;
            }
          }
        }
      }
    }

    return {
      months,
      years,
      scrollFrom: min ? Date.UTC(min.getUTCFullYear(), min.getUTCMonth()) : undefined, // start of pointed month
      scrollTo: max
        ? new Date(Date.UTC(max.getUTCFullYear(), max.getUTCMonth() + 1)).setUTCMilliseconds(-1)
        : undefined, // end of pointed month
      min,
      max,
      exclude: ex,
    };
  }

  /** Virtually focused element */
  #focused?: HTMLElement | null;
  /** Focus/clear of item (via aria-activedescendant) */
  focusItem(el: HTMLElement | null): void {
    if (el?.hasAttribute("focused")) {
      return;
    }
    const was = this.#focused;
    if (was) {
      was.removeAttribute("focused");
      was.removeAttribute("aria-label"); // without removing label NVDA doesn't announce it again
      was.removeAttribute("aria-disabled"); // without removing label NVDA doesn't announce it again
    }

    this.#focused = el;
    if (el) {
      el.id = el.id || this.#ctr.$uniqueId;
      el.setAttribute("focused", ""); // focus only if user uses keyboard otherwise only announce by clicks
      this.$refInput.setAttribute("aria-activedescendant", el.id);
      el.hasAttribute("aria-selected") && el.setAttribute("aria-selected", "false");
      setTimeout(() => {
        el.setAttribute("aria-label", `${el.textContent} ${this.$refCalenarTitle.textContent}`);
        el.hasAttribute("disabled") && el.setAttribute("aria-disabled", true);
        el.hasAttribute("aria-selected") && el.setAttribute("aria-selected", "true"); // otherwise NVDA doesn't announce it again
      }, 100); // without timeout text isn't announced when switch pickers
    } else {
      !this.$isFocused && this.$refInput.removeAttribute("aria-activedescendant");
    }
  }

  /** Focus sibling item OR show next/prev and focus (via focusItem) */
  protected focusSibling(n: number): HTMLElement | null {
    const was = this.#focused;
    let will: Element | null = null;

    const isSkip = (el: Element): boolean => el.hasAttribute("prev") || el.hasAttribute("next");
    if (!was) {
      const items = this.$refCalenarItems._items!;
      will =
        items.find((el) => el.hasAttribute("aria-selected") && !isSkip(el)) ||
        items.find((el) => el.hasAttribute("aria-current") && !isSkip(el)) ||
        items.find((el) => !el.hasAttribute("prev"))!;
    } else {
      const getSibling = (nn: number): Element | null => {
        let el: Element | null = was;
        for (let i = 0; i < Math.abs(nn); ++i) {
          el = nn > 0 ? el.nextElementSibling : el.previousElementSibling;
          if (!el) break;
        }
        if (el && isSkip(el)) {
          return null;
        }
        return el;
      };

      will = getSibling(n);
      if (!will) {
        this.showNext(n > 0);
        will = getSibling(n);
      }
    }
    will && this.focusItem(will as HTMLElement);
    return will as HTMLElement;
  }

  /** Select item (set aria-selected and focus) */
  protected selectItem(el: HTMLElement | undefined): void {
    this.querySelector("[aria-selected]")?.removeAttribute("aria-selected");
    el?.setAttribute("aria-selected", "true");
  }

  protected override setValue(v: ValueType | undefined, reason: SetValueReasons): boolean | null {
    const r = super.setValue(v, reason);
    this.setInputValue(v);
    this.#refreshSelected?.call(this);
    return r;
  }

  /** Called when need to update/announce value for input */
  setInputValue(v: ValueType | undefined | null): void {
    if (v) {
      const key = this._opts.utc ? "UTC" : "";
      // prettier-ignore
      const {namesMonth} = localeInfo
      this.$refInput.value = `${v[`get${key}Date`]()} ${namesMonth[v[`get${key}Month`]()]} ${v[`get${key}FullYear`]()}`;
    } else {
      this.$refInput.value = "";
    }
  }

  override clearValue(): void {
    super.clearValue();
    this.$isEmpty && this.selectItem(undefined);
  }

  protected override gotReady(): void {
    super.gotReady();

    const v = this.$value ? new Date(this.$value.valueOf()) : new Date();
    (!this.$value || !this._opts.utc) && v.setMinutes(v.getMinutes() - v.getTimezoneOffset());
    v.setUTCHours(0, 0, 0, 0); // otherwise month increment works wrong for the last days of the month
    v.setUTCDate(1);
    this.changePicker(v, this._opts.startWith ?? (this.$isEmpty ? PickersEnum.Year : PickersEnum.Day));
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Calendar.Options> | null): void {
    this._opts.utc = this.getAttr("utc", "bool");
    super.gotChanges(propsChanged);

    (this.$isReadOnly || this.$isDisabled) && this.focusItem(null);

    if (!this._opts.label) {
      this.$refTitle.classList.add(this.#ctr.classNameHidden);
    } else {
      this.$refTitle.classList.remove(this.#ctr.classNameHidden);
    }

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

    this._opts.min = this.getAttr("min", "obj");
    this._opts.max = this.getAttr("max", "obj");
    this._opts.exclude = this.getAttr<Date[]>("exclude", "ref");
    if (!propsChanged || propsChanged.includes("exclude")) {
      this._opts.exclude?.sort((a, b) => a.valueOf() - b.valueOf());
    }
    const isNeedRecalc =
      propsChanged &&
      (propsChanged.includes("min") ||
        propsChanged.includes("max") ||
        propsChanged.includes("exclude") ||
        propsChanged.includes("utc"));
    /* istanbul ignore else */
    if (!propsChanged || isNeedRecalc) {
      this.#disabled = this.calcDisabled();
    }
    isNeedRecalc && this.$refreshPicker();
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotFormChanges(propsChanged);

    const i = this.$refInput;
    i.readOnly = true;
    this.$isReadOnly ? i.removeAttribute("aria-readonly") : i.setAttribute("aria-readonly", false); // input must be readonly to hide mobile-keyboard on focus
  }

  protected override gotRemoved(): void {
    this.focusItem(null); // possible re-init control
    super.gotRemoved();
  }

  protected override gotFocusLost(): void {
    this.focusItem(null);
    super.gotFocusLost();
  }

  override gotFocus(ev: FocusEvent): Array<() => void> {
    const r = super.gotFocus(ev);
    const i = this.$refInput;
    r.push(this.appendEvent(this, "click", (e) => this.gotClick(e), { passive: false }));
    r.push(this.appendEvent(i, "input", (e) => this.gotInput(e as WUP.Text.GotInputEvent)));
    // r.push(this.appendEvent(i, "keypress", (e) => e.preventDefault(), { passive: false })); // input is readonly so default keyPress doesn't required
    return r;
  }

  #handleClickItem?: WUP.Calendar.IPickerResult["onItemClick"];
  /** Called when user clicks on calendar */
  protected gotClick(e: MouseEvent): void {
    if (e.button || this.$isReadOnly || this.$isDisabled) {
      return; // only left button
    }
    let t = e.target as Node | HTMLElement;
    /* istanbul ignore else */
    if (this.$refCalenarTitle === t || this.$refCalenarTitle.contains(t)) {
      e.preventDefault();
      this._picker !== PickersEnum.Year && this.changePicker(this._pickerValue!, this._picker + 1);
    } else if (this.$refCalenarItems.contains(t)) {
      while (t !== this.$refCalenarItems) {
        const v = (t as any)._value;
        /* istanbul ignore else */
        if (v !== undefined) {
          e.preventDefault();
          !(t as HTMLElement).hasAttribute("disabled") &&
            this.#handleClickItem!.call(this, e as MouseEvent & { target: HTMLElement }, v);
          break;
        }
        t = t.parentElement!;
      }
    }
  }

  /** Called when browsers fills the field via autocomplete */
  protected gotInput(e: WUP.Text.GotInputEvent): void {
    const v = this.parse(e.target.value);
    this.setValue(v, SetValueReasons.userInput);
  }

  override gotKeyDown(e: KeyboardEvent): void {
    super.gotKeyDown(e);
    if (e.altKey) {
      return;
    }

    let isHandled = true;
    const isDayPicker = this._picker === PickersEnum.Day;
    const items = this.$refCalenarItems._items!;
    switch (e.key) {
      case "Enter":
        isHandled = this.#focused != null; // WARN: submit by enter impossible if user focused item
      // eslint-disable-next-line no-fallthrough
      case " ": {
        const el = this.#focused;
        if (el && !el.hasAttribute("disabled")) {
          setTimeout(() => el.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true })));
        }
        break;
      }
      case "ArrowLeft":
        this.focusSibling(-1);
        break;
      case "ArrowRight":
        this.focusSibling(1);
        break;
      case "ArrowUp":
        this.focusSibling(isDayPicker ? -7 : -4);
        break;
      case "ArrowDown":
        this.focusSibling(isDayPicker ? 7 : 4);
        break;
      case "Home":
        this.focusItem(items.find((el) => !el.hasAttribute("prev"))!);
        break;
      case "End":
        for (let i = items.length - 1; ; --i) {
          if (!items[i].hasAttribute("next")) {
            this.focusItem(items[i]);
            break;
          }
        }
        break;
      case "PageDown":
        this.showNext(true);
        if (e.shiftKey) {
          for (let i = 0; i < 11; ++i) {
            this.showNext(true); // shift the whole year
          }
        }
        this.focusItem(this.$refCalenarItems._items!.find((el) => !el.hasAttribute("prev"))!);
        break;
      case "PageUp":
        this.showNext(false);
        if (e.shiftKey) {
          for (let i = 0; i < 11; ++i) {
            this.showNext(false); // shift the whole year
          }
        }
        this.focusItem(this.$refCalenarItems._items!.find((el) => !el.hasAttribute("prev"))!);
        break;
      default:
        isHandled = false;
    }

    isHandled && e.preventDefault();
  }
}

customElements.define(tagName, WUPCalendarControl);

/**
 *  UTC -5 EST >>> DST
 *  Mar 13...14 >>>  + 1h
 *  Nov 6...7 >>> -1h
 */

// todo add ability to select range
