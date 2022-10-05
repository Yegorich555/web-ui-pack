import WUPBaseControl, { WUPBaseIn } from "./baseControl";
import { WUPcssHidden } from "../styles";
import scrollCarousel from "../helpers/scrollCarousel";

const tagName = "wup-calendar";

const add: <K extends keyof HTMLElementTagNameMap>(el: HTMLElement, tagName: K) => HTMLElementTagNameMap[K] = (
  el,
  tag
) => el.appendChild(document.createElement(tag));

export const enum PickersEnum {
  Day = 0,
  Month,
  Year,
}

export namespace WUPCalendarIn {
  export interface Def {
    /** First day of week in calendar where 1-Monday, 7-Sunday;
     * @default 1 (Monday) */
    firstDayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  }
  export interface Opt {
    /** User can't select date less than min */
    min?: Date; // todo allow string
    /** User can't select date more than max */
    max?: Date; // todo allow string
    /** Picker that must be rendered at first; if undefined then when isEmpty - year, otherwise - day;
     * @not observed (affects only on init) */
    startWith?: PickersEnum;
    /** Dates that user can't choose (disabled dates) */
    exclude?: Date[];
    /** Provide local or UTC date; @default true (UTC); min/max/exclude $initValue/$value must be provided according to pointed attr */
    utc?: boolean; // todo check if possible observed
  }
  export type Generics<
    ValueType = string,
    ValidationKeys extends WUPBase.ValidationMap = WUPCalendar.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPBaseIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = string> = Generics<T>["Defaults"];
  export type GenOpt<T = string> = Generics<T>["Options"];

  export interface PickerResult {
    renderItems: (ol: HTMLElement, v: Date) => ItemElement[];
    getIndex: (v: Date, firstValue: number) => number;
    next: (v: Date, n: -1 | 1) => Date;
    onItemClick: (e: MouseEvent & { target: HTMLElement }, targetValue: number) => void;
  }

  export interface ItemElement extends HTMLElement {
    _value: number;
  }
}

declare global {
  namespace WUPCalendar {
    interface MonthInfo {
      /** Total days in month */
      total: number;
      /** Previous days-range for placeholders */
      prev?: { from: number; to: number };
      /** Count of next days */
      nextTo: number;
      /** ValueOf first Date of result in UTC */
      first: number;
    }
    interface ValidationMap extends WUPBase.ValidationMap {}
    interface EventMap extends WUPBase.EventMap {}
    interface Defaults<T = string> extends WUPCalendarIn.GenDef<T> {}
    interface Options<T = string> extends WUPCalendarIn.GenOpt<T> {}
    interface JSXProps<T extends WUPCalendarControl> extends WUPBase.JSXProps<T> {
      /** @deprecated Picker that must be rendered at first */
      startWith?: "year" | "month" | "day";
      /** @deprecated User can't select date less than min */
      min?: string;
      /** @deprecated User can't select date more than max */
      max?: string;
      /** @deprecated Dates that user can't choose. Point global obj-key (window.myExclude = [] ) */
      exclude?: string;
      /** @deprecated Provide local or UTC date; @default true (UTC); min/max/exclude $initValue/$value must be provided according to pointed attr */
      utc?: boolean;
    }
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPCalendarControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPCalendar.JSXProps<WUPCalendarControl>;
    }
  }
}

/**
 todo leave details
 */
export default class WUPCalendarControl<
  ValueType extends Date = Date,
  EventMap extends WUPCalendar.EventMap = WUPCalendar.EventMap
> extends WUPBaseControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPCalendarControl;

  static get $styleRoot(): string {
    return `:root {
      --ctrl-clr-selected: #fff;
      --ctrl-clr-selected-bg: #009fbc;
      --ctrl-clr-width: 17em;
      --ctrl-clr-cell-gap: 4px;
      --ctrl-clr-padding: calc(4px + var(--ctrl-clr-cell-gap) / 2);
    }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        max-width: fit-content;
        margin: auto;
        border-radius: var(--ctrl-border-radius);
        box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.1);
        background: none;
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
        padding: 0.25em 1em;
        font-size: larger;
        font-weight: initial;
        border: none;
        border-radius: 2em;
        color: inherit;
        background-color: white;
        box-shadow: none;
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
        box-shadow: 0 0 4px 0 var(--ctrl-focus);
      }
      @media (hover: hover) {
        :host header>button:hover {
          background-color: var(--ctrl-clr-selected-bg);
          color: var(--ctrl-clr-selected);
        }
        ol>li:hover:not([disabled]) {
          box-shadow: 0 0 4px 0 var(--ctrl-focus);
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
          --anim-time: 300ms;
        }
        :host [zoom] { animation: none var(--anim-time) linear forwards; }
        :host [zoom="out"] { animation-name: WUP-ZOOM-OUT-1; }
        :host [zoom="out2"] { animation-name: WUP-ZOOM-OUT-2; }
        :host [zoom="in"] { animation-name: WUP-ZOOM-IN-1; }
        :host [zoom="in2"] { animation-name: WUP-ZOOM-IN-2; }
      }`;
  }

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUPCalendar.Options>;
    arr.push("min", "max", "exclude");
    return arr;
  }

  static get observedAttributes(): Array<LowerKeys<WUPCalendar.Options>> {
    const arr = super.observedAttributes as Array<LowerKeys<WUPCalendar.Options>>;
    arr.push("min", "max", "exclude");
    return arr;
  }

  /** Short names of days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] */
  static get $namesDayShort(): string[] {
    return ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  }

  /** Names of months: [ "January", "February", "March", ...] */
  static get $namesMonth(): string[] {
    return [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
  }

  /** Short names of days: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] */
  static get $namesMonthShort(): string[] {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  }

  /** Returns days of pointed number-of-month with placeholders of prev, next months
   * @param year 2022 etc.
   * @param month index of month (0-11)
   * @param firstDayOfWeek where 1-Monday, 7-Sunday
   */
  static $daysOfMonth(year: number, month: number, firstDayOfWeek = 1): WUPCalendar.MonthInfo {
    let dt = new Date(year, month + 1, 0); // month in JS is 0-11 index based but here is a hack: returns last day of month
    const r: WUPCalendar.MonthInfo = { total: dt.getDate(), nextTo: 0, first: 0 };
    dt.setDate(1); // reset to first day
    let shift = (dt.getDay() || 7) - firstDayOfWeek; // days-shift to firstOfWeek // get dayOfWeek  returns Sun...Sat (0...6) and need to normalize to Mon-1 Sun-7
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

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPCalendar.Defaults = {
    ...WUPBaseControl.$defaults,
    firstDayOfWeek: 1,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
    },
  };

  $options: WUPCalendar.Options<ValueType> = {
    ...this.#ctr.$defaults,
    utc: true,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  /** Call when need to re-rended picker (min/max changed etc.) */
  $refreshPicker(): void {
    if (this._pickerValue != null) {
      this.changePicker(this._pickerValue, this._picker);
    }
  }

  /** Converts date-string into Date according (to this._opt.UTC) */
  parseValue(text: string): ValueType | undefined {
    if (!text) {
      return undefined;
    }
    const dt = Date.parse(text);
    if (Number.isNaN(dt)) {
      throw new Error(`Impossible to parse date from '${text}'`);
    }
    const v = new Date(dt);
    const isUTC = text.length === 10;
    if (isUTC !== this._opts.utc || !"timeZonePointer") {
      // todo need to detect if timezone is pointed
      v.setMinutes(v.getMinutes() - v.getTimezoneOffset());
    }
    return v as any;
  }

  $refCalenar = document.createElement("div");
  $refCalenarTitle = document.createElement("button");
  $refCalenarItems = document.createElement("ol");

  protected override renderControl(): void {
    // todo mobile: focus on input opens keyboard;
    // todo mobile: click on item makes focus-frame blink

    const i = this.$refInput;
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

    // render calendar
    this.$refCalenar.id = menuId;
    const h = add(this.$refCalenar, "header");
    /* */ h.appendChild(this.$refCalenarTitle);
    this.$refCalenarTitle.setAttribute("tabindex", "-1");
    this.$refCalenarTitle.setAttribute("aria-hidden", true);
    const box = add(this.$refCalenar, "div");
    const animBox = add(box, "div");
    /* */ animBox.appendChild(this.$refCalenarItems);
    this.$refCalenarItems.setAttribute("role", "grid");
    this.appendChild(this.$refCalenar);

    // WARN: for render picker see gotReady
  }

  /** Append calendar item to parent or replace previous */
  protected appendItem(
    prevEl: WUPCalendarIn.ItemElement | undefined | null,
    text: string,
    v: number
  ): WUPCalendarIn.ItemElement {
    let el: WUPCalendarIn.ItemElement;
    if (prevEl) {
      el = prevEl;
      while (el.attributes.length > 0) {
        el.removeAttributeNode(el.attributes[0]);
      }
    } else {
      el = add(this.$refCalenarItems, "li") as unknown as WUPCalendarIn.ItemElement;
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

  /** Called when need set/change day/month/year picker */
  protected async changePicker(v: Date, pickerNext: PickersEnum): Promise<void> {
    await this.#clearPicker?.call(this, pickerNext - this._picker > 0);
    this._picker = pickerNext;

    let r: WUPCalendarIn.PickerResult;
    let type: string;
    if (pickerNext === PickersEnum.Year) {
      type = "year";
      r = this.getYearPicker();
      this.$refCalenarTitle.disabled = true;
    } else if (pickerNext === PickersEnum.Month) {
      type = "month";
      r = this.getMonthPicker();
      this.$refCalenarTitle.disabled = false;
    } else {
      type = "day";
      r = this.getDayPicker();
      this.$refCalenarTitle.disabled = false;
    }

    this.$refCalenar.setAttribute("calendar", type);
    this.#handleClickItem = r.onItemClick;

    const renderPicker = (next: Date): WUPCalendarIn.ItemElement[] => {
      this._pickerValue = next;
      const a = r.renderItems(this.$refCalenarItems, next);

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

      if (this.$isFocused) {
        // i = r.getIndex(next, first);
        // this.focusItem(a[i]); // todo focus only when user works with keyboard
        this.$ariaSpeak(this.$refCalenarTitle.textContent!);
      }
      this.disableItems(a, r.getIndex);
      return a;
    };

    renderPicker(v);

    let min: undefined | Date;
    if (this._opts.min) {
      // todo UTC
      min = new Date(this._opts.min.getUTCFullYear(), this._opts.min.getUTCMonth()); // start of pointed month
    }
    let max: undefined | Date;
    if (this._opts.max) {
      // todo UTC
      max = new Date(this._opts.max.getUTCFullYear(), this._opts.max.getUTCMonth() + 1);
      max.setUTCMilliseconds(-1); // end of pointed month
    }
    const scrollObj = scrollCarousel(this.$refCalenarItems, (n) => {
      const nextDate = r.next(v, n);
      if (nextDate > max! || nextDate < min!) {
        r.next(v, (-1 * n) as 1);
        return null;
      }
      const arr = renderPicker(nextDate);
      return arr;
    });

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
      scrollObj.remove();
      this.$refCalenarItems.textContent = "";
      this.#refreshSelected = undefined;

      animate(isOut ? "out2" : "in2").then(() => box.removeAttribute("zoom")); // WARN: it's important not to wait
    };
  }

  /** Returns result to render day picker */
  #isDayWeeksAdded = false;
  protected getDayPicker(): WUPCalendarIn.PickerResult {
    // render daysOfWeek
    if (!this.#isDayWeeksAdded) {
      const box = this.$refCalenarItems.parentElement!;
      const days = document.createElement("ul");
      days.setAttribute("aria-hidden", true);
      box.prepend(days);
      const names = this.#ctr.$namesDayShort;
      for (let i = 0, n = this._opts.firstDayOfWeek - 1; i < 7; ++i, ++n) {
        const d = add(days, "li");
        if (n >= names.length) {
          n = 0;
        }
        d.textContent = names[n];
      }
      this.#isDayWeeksAdded = true;
    }

    // WARN: the whole calendar must be in UTC, otherwise getIndex is wrong for locales with DST (daylightSavingTime)
    const getIndex: WUPCalendarIn.PickerResult["getIndex"] = (b, first) =>
      Math.floor((b.valueOf() - (first as number)) / 86400000);

    const renderItems = (ol: HTMLElement, v: Date): WUPCalendarIn.ItemElement[] => {
      const valMonth = v.getUTCMonth();
      const valYear = v.getUTCFullYear();
      this.$refCalenarTitle.textContent = `${this.#ctr.$namesMonth[valMonth]} ${valYear}`;

      const items: WUPCalendarIn.ItemElement[] = [];
      const r = this.#ctr.$daysOfMonth(valYear, valMonth, this._opts.firstDayOfWeek);

      let iPrev = -999;
      if (ol.children.length) {
        iPrev = getIndex(r.first as unknown as Date, (ol.children.item(0) as any)._value);
      }

      let i = 0;
      const addItem = (n: number, attr: string): void => {
        const d = this.appendItem(
          ol.children.item(iPrev) as WUPCalendarIn.ItemElement,
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
        const dt = new Date(v);
        const a = this.$value;
        if (a) {
          this._opts.utc
            ? dt.setUTCHours(a.getUTCHours(), a.getUTCMinutes(), a.getUTCSeconds(), a.getUTCMilliseconds())
            : dt.setUTCHours(
                a.getHours(),
                a.getMinutes() + dt.getTimezoneOffset(),
                a.getMilliseconds(),
                a.getSeconds()
              );
        }
        this.setValue(dt as ValueType);
        this.focusItem(target);
      },
    };
  }

  /** Returns result to render month picker */
  protected getMonthPicker(): WUPCalendarIn.PickerResult {
    const pageSize = 12;

    const getIndex: WUPCalendarIn.PickerResult["getIndex"] = //
      (b, first) => b.getUTCFullYear() * pageSize + b.getUTCMonth() - first;

    const renderItems = (ol: HTMLElement, v: Date): WUPCalendarIn.ItemElement[] => {
      const year = v.getUTCFullYear();
      this.$refCalenarTitle.textContent = `${year}`;

      const namesShort = this.#ctr.$namesMonthShort;
      const items: WUPCalendarIn.ItemElement[] = [];
      const total = year * pageSize;

      let iPrev = -999;
      if (ol.children.length) {
        iPrev = getIndex(new Date(year, 0), (ol.children.item(0) as any)._value);
      }

      const addItem = (n: string, i: number): WUPCalendarIn.ItemElement => {
        const d = this.appendItem(ol.children.item(iPrev) as WUPCalendarIn.ItemElement, n, total + i);
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
      onItemClick: (_e, v) => this.changePicker(new Date(Math.floor(v / pageSize), v % pageSize, 1), PickersEnum.Day),
    };
  }

  /** Returns result to render year picker */
  protected getYearPicker(): WUPCalendarIn.PickerResult {
    const pageSize = 16;

    const renderItems = (_ol: HTMLElement, v: Date): WUPCalendarIn.ItemElement[] => {
      const page = Math.floor((v.getUTCFullYear() - 1970) / pageSize);
      let year = page * pageSize + 1970;

      this.$refCalenarTitle.textContent = `${year} ... ${year + pageSize - 1}`;
      const items: WUPCalendarIn.ItemElement[] = [];
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
      onItemClick: (_e, v) => this.changePicker(new Date(v, 0), PickersEnum.Month),
    };
  }

  /** Set [disabled] for items according to $options.exclude */
  protected disableItems(items: WUPCalendarIn.ItemElement[], getIndex: WUPCalendarIn.PickerResult["getIndex"]): void {
    const first = items[0]._value;
    let i = 0;
    if (this._opts.min) {
      const last = getIndex(this._opts.min, first);
      items.some((item, k) => {
        if (k >= last) {
          return true;
        }
        return item.setAttribute("disabled", "");
      });
    }

    if (this._opts.max) {
      i = getIndex(this._opts.max, first);
      for (++i; i < items.length; ++i) {
        items[i].setAttribute("disabled", "");
      }
    }

    if (!this.#disabled) {
      return;
    }

    if (this._picker === PickersEnum.Day) {
      const { exclude } = this._opts;
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
      const arr = this._picker === PickersEnum.Month ? this.#disabled.months : this.#disabled.years;
      let k = 0;
      for (i = 0; i < items.length && k < arr.length; ++i) {
        const el = items[i];
        for (; k < arr.length; ++k) {
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

  /** Returns disabled years & months based on options; Called only when options.exclude is pointed;
   *  where month value: y*12 + m, year value: y */
  #disabled?: { months: number[]; years: number[] };
  calcDisabled(): { months: number[]; years: number[] } {
    const months: number[] = [];
    const years: number[] = [];

    const ex = this._opts.exclude!;
    let prevY: number | null = null;
    let mCnt = 0;
    // todo UTC
    const min = this._opts.min ? new Date(this._opts.min).setHours(23, 59, 59, 999) : Number.MIN_SAFE_INTEGER; // shift min at the end of day
    const max = this._opts.max ? new Date(this._opts.max).setHours(0, 0, 0, 0) : Number.MAX_SAFE_INTEGER; // shift min at the end of day

    const last = ex.length - 1;
    for (let i = 0; i < ex.length; ++i) {
      const iStart = i;
      const y = ex[i].getFullYear();
      const m = ex[i].getMonth();
      const nextM = new Date(y, m + 1);
      if (prevY !== y) {
        prevY = y;
        mCnt = 0;
      }
      for (; i < ex.length; ++i) {
        if (ex[i + 1] >= nextM || i === last) {
          const cnt = i - iStart;
          const total = new Date(y, m + 1, 0).getDate();
          const hasEnabled = ex[i].valueOf() > min && cnt !== total && ex[i].valueOf() < max;
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
    return { months, years };
  }

  #focusedItem?: HTMLElement | null;
  /** Focus item (via aria-activedescendant) */
  protected focusItem(el: HTMLElement): void {
    this.#focusedItem?.removeAttribute("focused");

    this.#focusedItem = el;
    el.id = el.id || this.#ctr.$uniqueId;
    el.setAttribute("focused", ""); // focus only if user uses keyboard otherwise only announce by clicks
    this.$refInput.setAttribute("aria-activedescendant", el.id);
    setTimeout(() => {
      el.setAttribute("aria-label", `${el.textContent} ${this.$refCalenarTitle.textContent}`);
    }, 100); // without timeout text isn't announced when switch pickers
  }

  /** Select item (set aria-selected and focus) */
  protected selectItem(el: HTMLElement | undefined): void {
    this.querySelector("[aria-selected]")?.removeAttribute("aria-selected");
    if (el) {
      el.setAttribute("aria-selected", "true");
    }
  }

  protected override setValue(v: ValueType | undefined, canValidate = true): boolean | null {
    const r = super.setValue(v, canValidate);
    // todo UTC
    this.$refInput.value = v != null ? `${v.getDate()} ${this.#ctr.$namesMonth[v.getMonth()]} ${v.getFullYear()}` : "";
    this.#refreshSelected?.call(this);
    return r;
  }

  protected override gotReady(): void {
    super.gotReady();

    const v = this.$value ? new Date(this.$value.valueOf()) : new Date();
    v.setUTCHours(0, 0, 0, 0); // otherwise month increment works wrong for the last days of the month
    v.setUTCDate(1);
    this.changePicker(v, this._opts.startWith ?? (this.$isEmpty ? PickersEnum.Year : PickersEnum.Day));
  }

  protected override gotChanges(propsChanged: Array<keyof WUPCalendar.Options> | null): void {
    this._opts.utc = this.getBoolAttr("utc", this._opts.utc);
    super.gotChanges(propsChanged);

    if (!this._opts.label) {
      this.$refTitle.classList.add(this.#ctr.classNameHidden);
    } else {
      this.$refTitle.classList.remove(this.#ctr.classNameHidden);
    }

    let attr = this.getAttribute("startwith");
    if (attr != null) {
      attr = attr.toLowerCase();
      if (attr === "year") {
        this._opts.startWith = PickersEnum.Year;
      } else if (attr === "month") {
        this._opts.startWith = PickersEnum.Month;
      } else if (attr === "day") {
        this._opts.startWith = PickersEnum.Day;
      } else {
        delete this._opts.startWith;
      }
    }

    this._opts.min = this.parseValue(this.getAttribute("min") || "") ?? this._opts.min;
    this._opts.max = this.parseValue(this.getAttribute("max") || "") ?? this._opts.max;
    this._opts.exclude = this.getRefAttr<Date[]>("exclude")?.sort((a, b) => a.valueOf() - b.valueOf());
    const isChangedDisabled =
      propsChanged &&
      (propsChanged.includes("min") || propsChanged.includes("max") || propsChanged.includes("exclude"));
    if (!propsChanged || isChangedDisabled) {
      this.#disabled = this._opts.exclude?.length ? this.calcDisabled() : undefined;
    }
    isChangedDisabled && this.$refreshPicker();
  }

  protected override gotFocusLost(): void {
    this.$refInput.removeAttribute("aria-activedescendant");
    super.gotFocusLost();
  }

  protected override gotFocus(): Array<() => void> {
    const r = super.gotFocus();
    r.push(this.appendEvent(this, "click", (e) => this.gotClick(e), { passive: false }));
    r.push(this.appendEvent(this.$refInput, "input", (e) => this.gotInput(e, this.$refInput)));
    r.push(this.appendEvent(this.$refInput, "keypress", (e) => e.preventDefault(), { passive: false }));
    return r;
  }

  #handleClickItem?: WUPCalendarIn.PickerResult["onItemClick"];
  /** Called when user clicks on calendar */
  protected gotClick(e: MouseEvent): void {
    // only left button
    if (!(e.target instanceof HTMLElement) || e.button) {
      return;
    }
    e.preventDefault();
    if (e.target.hasAttribute("disabled")) {
      return;
    }
    if (this.$refCalenarTitle === e.target || this.$refCalenarTitle.contains(e.target)) {
      this._picker !== PickersEnum.Year && this.changePicker(this._pickerValue!, this._picker + 1);
    } else {
      // WARN: if li element will include span or something else it won't work
      const v = (e.target as any)._value;
      v !== undefined && this.#handleClickItem!.call(this, e as MouseEvent & { target: HTMLElement }, v);
    }
  }

  /** Called when browsers fills the field via autocomplete */
  protected gotInput(e: Event, inputEl: HTMLInputElement): void {
    const v = this.parseValue(inputEl.value);
    this.setValue(v);
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    super.gotKeyDown(e);
    // todo handle keyboard here
  }
}

customElements.define(tagName, WUPCalendarControl);

// todo testcase: dayPickerSize === monthPickerSize === yearPickerSize
// todo testCase: 31 Mar 2022  + 1 month > return April (but returns May)
// todo testcase: initValue: 2022-03-20 10:05; Month picker must show focused in visible area

// todo testCase: min="2022-02-28" max="2022-04-01" exclude=[min, max] - Feb and Apr must be excluded
// todo testCase: min="2022-02-27" max="2022-04-02" exclude=["2022-02-27", "2022-02-28", "2022-04-01", "2022-04-02"] - Feb and Apr must be excluded

// const dt = new Date(2022, 0, 1);
// while (dt.getFullYear() < 2023) {
//   const was = dt.valueOf();
//   const next = dt.setDate(dt.getDate() + 1);
//   if (next - was !== 86400000) {
//     console.warn(dt, next - was);
//   }
// }

/**
 *  UTC -5 EST >>> DST
 *  Mar 13...14 >>>  + 1h
 *  Nov 6...7 >>> -1h
 */
