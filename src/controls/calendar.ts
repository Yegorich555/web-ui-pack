import WUPBaseControl, { WUPBaseIn } from "./baseControl";
import { WUPcssHidden } from "../styles";
import scrollCarousel from "../helpers/scrollCarousel";

const tagName = "wup-calendar";

const add: <K extends keyof HTMLElementTagNameMap>(el: HTMLElement, tagName: K) => HTMLElementTagNameMap[K] = (
  el,
  tag
) => el.appendChild(document.createElement(tag));

export namespace WUPCalendarIn {
  export interface Def {
    /** First day of week in calendar where 1-Monday, 7-Sunday;
     * @default 1 (Monday) */
    firstDayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  }
  export interface Opt {
    min?: Date;
    max?: Date;
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

  export const enum PickersEnum {
    Day = 1,
    Month,
    Year,
  }

  export interface PickerResult {
    renderItems: (ol: HTMLElement, replaceItems: HTMLElement[], v: Date, cur: Date) => HTMLElement[];
    next: (v: Date, n: -1 | 1) => Date;
    onItemClick: (e: MouseEvent & { target: HTMLElement }, targetValue: number) => void;
    onTitleClick: (e: MouseEvent) => void;
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
      /** ValueOf first Date of result */
      first: number;
    }
    interface ValidationMap extends WUPBase.ValidationMap {}
    interface EventMap extends WUPBase.EventMap {}
    interface Defaults<T = string> extends WUPCalendarIn.GenDef<T> {}
    interface Options<T = string> extends WUPCalendarIn.GenOpt<T> {}
    interface JSXProps<T extends WUPCalendarControl> extends WUPBase.JSXProps<T> {}
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

  // static get observedOptions(): Array<string> {
  //   const arr = super.observedOptions as Array<keyof WUPCalendar.Options>;
  //   // arr.push("clearButton");
  //   return arr;
  // }

  // static get $styleRoot(): string {
  //   return `:root { }`;
  // }

  static get $style(): string {
    return `${super.$style}
      :host input {${WUPcssHidden}}`;
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
    dt.setDate(2 - firstDayOfWeek); // reset to first day of week
    let $1 = dt.getDay() - 1; // get index of first day of current month
    if ($1 === -1) $1 = 6; // getDay returns Sun...Sat (0...6) and need to normalize to Mon-0 Sun-6
    if ($1 !== 0) {
      dt = new Date(year, month, 0);
      const to = dt.getDate();
      const from = to - $1 + 1;
      r.prev = { from, to };
      dt.setDate(from);
    }
    r.first = dt.valueOf();
    // const weeksDays = Math.ceil((r.total + $1) / 7) * 7; // Generate days for 35 or 42 cells with previous month dates for placeholders
    const weeksDays = 42;
    r.nextTo = weeksDays - $1 - r.total;
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
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  parseValue(text: string): ValueType | undefined {
    if (!text) {
      return undefined;
    }
    const dt = Date.parse(text);
    if (Number.isNaN(dt)) {
      throw new Error(`Impossible to parse date from '${text}'`);
    }
    return new Date(dt) as any;
  }

  $refCalenar = document.createElement("div");
  $refCalenarTitle = document.createElement("button");
  $refCalenarItems = document.createElement("ol");

  protected renderControl(): void {
    // todo mobile: focus on input opens keyboard;
    // todo mobile: click on item makes focus-frame blink
    setTimeout(() => (this.$refInput.readOnly = true));

    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    // todo resolve it
    // this.$refInput.type = "date";
    const s = add(this.$refLabel, "span");
    s.appendChild(this.$refInput); // input appended to span to allow user use :after,:before without padding adjust
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);

    // render calendar
    const h = add(this.$refCalenar, "header");
    /* */ h.appendChild(this.$refCalenarTitle);
    this.$refCalenar.appendChild(this.$refCalenarItems);
    this.appendChild(this.$refCalenar);

    const v = this.$value ? new Date(this.$value.valueOf()) : new Date();
    this.changePicker(v, WUPCalendarIn.PickersEnum.Day);

    this.addEventListener("click", (e) => this.gotClick(e));
  }

  #clearPicker?: () => void;
  protected changePicker(v: Date, picker: WUPCalendarIn.PickersEnum): void {
    this.#clearPicker?.call(this);

    let r: WUPCalendarIn.PickerResult;
    let type = "day";
    if (picker === WUPCalendarIn.PickersEnum.Day) {
      r = this.getDayPicker();
    } else if (picker === WUPCalendarIn.PickersEnum.Month) {
      type = "month";
      r = this.getMonthPicker();
    } else {
      type = "year";
      r = this.getDayPicker();
    }
    this.$refCalenar.setAttribute("calendar", type);

    this.#handleClickItem = r.onItemClick;
    this.#handleClickTitle = r.onTitleClick;
    r.renderItems(this.$refCalenarItems, [], v, v);

    let lock = true;
    const scrollObj = scrollCarousel(this.$refCalenarItems, (n, els) => {
      v = lock ? v : r.next(v, n);
      const nextVal = r.next(new Date(v.valueOf()), n);
      const items = r.renderItems(this.$refCalenarItems, els, nextVal, v);
      return items;
    });

    this.#clearPicker = () => {
      // todo animation when picker is changed
      scrollObj.remove();
      this.$refCalenarItems.textContent = "";
    };
    lock = false;
  }

  /** Returns render function of DayPicker */
  #isDayWeeksAdded = false;
  protected getDayPicker(): WUPCalendarIn.PickerResult {
    // render daysOfWeek - need to hide for other month and year calendar
    if (!this.#isDayWeeksAdded) {
      const days = this.$refCalenar.insertBefore(document.createElement("ul"), this.$refCalenarItems);
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

    let curValue = 0;
    const renderItems = (ol: HTMLElement, replaceItems: HTMLElement[], v: Date, cur: Date): HTMLElement[] => {
      this.$refCalenarTitle.textContent = `${this.#ctr.$namesMonth[cur.getMonth()]} ${cur.getFullYear()}`;
      curValue = cur.valueOf();
      const valMonth = v.getMonth();
      const valYear = v.getFullYear();

      const items: HTMLElement[] = [];
      const r = this.#ctr.$daysOfMonth(valYear, valMonth, this._opts.firstDayOfWeek);
      let i = 0;
      const addItem = (n: number, attr: string): void => {
        const d = replaceItems[i] || add(ol, "li");
        d.textContent = n.toString();
        if (attr) {
          d.setAttribute(attr, "");
        } else {
          while (d.attributes.length > 0) {
            d.removeAttributeNode(d.attributes[0]);
          }
        }
        (d as any)._value = r.first + i * 86400000;
        items.push(d);
        ++i;
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

      i = Math.floor((Date.now() - r.first) / 86400000);
      items[i]?.setAttribute("aria-current", "date");
      if (this.$value) {
        i = Math.floor((this.$value.valueOf() - r.first) / 86400000);
        items[i] && this.selectItem(items[i]);
      }

      return items;
    };

    // todo attr [disabled]

    return {
      renderItems,
      next: (v, n) => {
        v.setMonth(v.getMonth() + n);
        return v;
      },
      onItemClick: ({ target }, v) => {
        this.selectItem(target);
        this.setValue(new Date(v) as ValueType);
        console.warn("new value", new Date(v).toJSON()); // todo remove after tests
      },
      onTitleClick: () => this.changePicker(new Date(curValue), WUPCalendarIn.PickersEnum.Month),
    };
  }

  protected getMonthPicker(): WUPCalendarIn.PickerResult {
    let curYear = 0;
    let curValue = 0;

    const renderItems = (ol: HTMLElement, replaceItems: HTMLElement[], v: Date, cur: Date): HTMLElement[] => {
      curYear = cur.getFullYear();
      curValue = cur.valueOf();
      this.$refCalenarTitle.textContent = `${curYear}`;

      const namesShort = this.#ctr.$namesMonthShort;
      //  const names = this.#ctr.$namesMonth;
      // todo don't forget about aria-label

      const items: HTMLElement[] = [];
      const addItem = (n: string, i: number): HTMLElement => {
        const d = replaceItems[i] || add(ol, "li");
        d.textContent = n;
        (d as any)._value = i;
        items.push(d);
        return d;
      };

      namesShort.forEach(addItem);
      const n = items.length;
      for (let i = 0; i < 4; ++i) {
        const d = addItem(namesShort[i], i + n);
        d.setAttribute("next", "");
      }

      // i = Math.floor((Date.now() - r.first) / 86400000);
      // items[i]?.setAttribute("aria-current", "date");
      // if (this.$value) {
      //   i = Math.floor((this.$value.valueOf() - r.first) / 86400000);
      //   items[i] && this.selectItem(items[i]);
      // }

      return items;
    };

    return {
      renderItems,
      next: (v, n) => {
        v.setFullYear(v.getFullYear() + n);
        return v;
      },
      onItemClick: (_e, v) => {
        const dt = new Date(curValue);
        dt.setMonth(v);
        this.changePicker(dt, WUPCalendarIn.PickersEnum.Day);
        console.warn("month change", dt.toJSON()); // todo remove after tests
      },
      onTitleClick: () => this.changePicker(new Date(curValue), WUPCalendarIn.PickersEnum.Year),
    };
  }

  /** Focus for item (via aria-activedescendant) */
  protected focusItem(el: HTMLElement): void {
    const id = el.id || this.#ctr.$uniqueId;
    el.setAttribute("aria-label", `${el.textContent} ${this.$refCalenarTitle.textContent}`);
    this.$refInput.setAttribute("aria-activedescendant", id);
    el.id = id;
  }

  /** Select item (set aria-selected and focus) */
  protected selectItem(el: HTMLElement | undefined): void {
    this.querySelector("[aria-selected]")?.removeAttribute("aria-selected");
    if (el) {
      el.setAttribute("aria-selected", "true");
      this.focusItem(el);
    }
  }

  protected override gotFocusLost(): void {
    this.$refInput.removeAttribute("aria-activedescendant");
  }

  #handleClickTitle?: (e: MouseEvent) => void;
  #handleClickItem?: WUPCalendarIn.PickerResult["onItemClick"];
  /** Called when user clicks on calendar */
  protected gotClick(e: MouseEvent): void {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }
    e.preventDefault();
    if (this.$refCalenarTitle === e.target || this.$refCalenarTitle.contains(e.target)) {
      this.#handleClickTitle!.call(this, e);
    } else {
      // WARN: if li element will include span or something else it won't work
      const v = (e.target as any)._value;
      v !== undefined && this.#handleClickItem!.call(this, e as MouseEvent & { target: HTMLElement }, v);
    }
  }
}

customElements.define(tagName, WUPCalendarControl);

// todo testcase: no change event if user selected the same date
// todo testcase: dayPickerSize === monthPickerSize === yearPickerSize
