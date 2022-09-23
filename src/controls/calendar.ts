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
    min?: Date;
    /** User can't select date more than max */
    max?: Date;
    /** Picker that must be rendered at first; if undefined then when isEmpty - year, otherwise - day */
    startWith?: PickersEnum;
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
    interface JSXProps<T extends WUPCalendarControl> extends WUPBase.JSXProps<T> {
      /** @deprecated Picker that must be rendered at first */
      startWith?: "year" | "month" | "day";
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

  protected override renderControl(): void {
    // todo mobile: focus on input opens keyboard;
    // todo mobile: click on item makes focus-frame blink

    const i = this.$refInput;
    i.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", i.id);
    i.type = "text";
    i.setAttribute("role", "combobox");
    // i.setAttribute("aria-haspopup", "grid");
    // i.setAttribute("aria-expanded", true);
    const menuId = this.#ctr.$uniqueId;
    i.setAttribute("aria-owns", menuId);
    i.setAttribute("aria-controls", menuId);

    const s = add(this.$refLabel, "span");
    s.appendChild(this.$refInput); // input appended to span to allow user use :after,:before without padding adjust
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);

    // render calendar
    this.$refCalenar.id = menuId;
    const h = add(this.$refCalenar, "header");
    /* */ h.appendChild(this.$refCalenarTitle);
    // this.$refCalenarTitle.setAttribute("aria-live", "polite");
    // this.$refCalenarTitle.setAttribute("aria-atomic", true);
    this.$refCalenarTitle.setAttribute("tabindex", "-1");
    this.$refCalenarTitle.setAttribute("aria-hidden", true);
    const box = add(this.$refCalenar, "div");
    const animBox = add(box, "div");
    /* */ animBox.appendChild(this.$refCalenarItems);
    this.$refCalenarItems.setAttribute("role", "grid");
    this.appendChild(this.$refCalenar);

    setTimeout(() => {
      const v = this.$value ? new Date(this.$value.valueOf()) : new Date();
      this.changePicker(v, this._opts.startWith ?? this.$isEmpty ? PickersEnum.Year : PickersEnum.Day);
    }); // wait for options
  }

  /** Append calendar item to parent or replace previous */
  protected appendItem(prevEl: HTMLElement | undefined, text: string, v: number): HTMLElement {
    let el: HTMLElement;
    if (prevEl) {
      el = prevEl;
      while (el.attributes.length > 0) {
        el.removeAttributeNode(el.attributes[0]);
      }
    } else {
      el = add(this.$refCalenarItems, "li");
    }
    el.setAttribute("role", "gridcell");
    el.textContent = text;
    (el as any)._value = v;
    return el;
  }

  #wasPicker: PickersEnum = PickersEnum.Day;
  #clearPicker?: (isIn: boolean) => Promise<void>;
  protected async changePicker(v: Date, picker: PickersEnum): Promise<void> {
    await this.#clearPicker?.call(this, !!(picker - this.#wasPicker));

    let r: WUPCalendarIn.PickerResult;
    let type: string;
    if (picker === PickersEnum.Year) {
      type = "year";
      r = this.getYearPicker();
      this.$refCalenarTitle.disabled = true;
    } else if (picker === PickersEnum.Month) {
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
    this.#handleClickTitle = r.onTitleClick;
    r.renderItems(this.$refCalenarItems, [], v, v);

    let lock = true;
    const scrollObj = scrollCarousel(this.$refCalenarItems, (n, els) => {
      v = lock ? v : r.next(v, n);
      const nextVal = r.next(new Date(v.valueOf()), n);
      const items = r.renderItems(this.$refCalenarItems, els, nextVal, v);
      return items;
    });
    lock = false;

    this.#clearPicker = async (isOut: boolean) => {
      const box = this.$refCalenar.children[1].children[0] as HTMLElement;

      const animate = (attrVal: string): Promise<any> =>
        new Promise<any | void>((resolve) => {
          let id = 0;
          id = window.requestAnimationFrame(() => {
            id = window.requestAnimationFrame(resolve);
          });
          box.addEventListener(
            "animationstart",
            () => {
              window.cancelAnimationFrame(id);
              box.addEventListener("animationend", resolve, { once: true });
            },
            { once: true }
          );
          box.setAttribute("zoom", attrVal);
        });

      await animate(isOut ? "out" : "in");
      scrollObj.remove();
      this.$refCalenarItems.textContent = "";

      animate(isOut ? "out2" : "in2").then(() => box.removeAttribute("zoom")); // WARN: it's important not to wait
    };
  }

  /** Returns result to render day picker */
  #isDayWeeksAdded = false;
  protected getDayPicker(): WUPCalendarIn.PickerResult {
    // render daysOfWeek - need to hide for other month and year calendar
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

    let curValue = 0;
    const renderItems = (_ol: HTMLElement, replaceItems: HTMLElement[], v: Date, cur: Date): HTMLElement[] => {
      this.$refCalenarTitle.textContent = `${this.#ctr.$namesMonth[cur.getMonth()]} ${cur.getFullYear()}`;
      curValue = cur.valueOf();
      const valMonth = v.getMonth();
      const valYear = v.getFullYear();

      const items: HTMLElement[] = [];
      const r = this.#ctr.$daysOfMonth(valYear, valMonth, this._opts.firstDayOfWeek);
      let i = 0;
      const addItem = (n: number, attr: string): void => {
        const d = this.appendItem(replaceItems[i], n.toString(), r.first + i * 86400000);
        attr && d.setAttribute(attr, "");
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
      onTitleClick: () => this.changePicker(new Date(curValue), PickersEnum.Month),
    };
  }

  /** Returns result to render month picker */
  protected getMonthPicker(): WUPCalendarIn.PickerResult {
    let curYear = 0;
    let curValue = 0;

    const renderItems = (_ol: HTMLElement, replaceItems: HTMLElement[], v: Date, cur: Date): HTMLElement[] => {
      curYear = cur.getFullYear();
      curValue = cur.valueOf();
      this.$refCalenarTitle.textContent = `${curYear}`;

      const namesShort = this.#ctr.$namesMonthShort;
      const items: HTMLElement[] = [];
      const addItem = (n: string, i: number): HTMLElement => {
        const d = this.appendItem(replaceItems[i], n, i);
        items.push(d);
        return d;
      };

      namesShort.forEach(addItem);
      const n = items.length;
      for (let i = 0; i < 4; ++i) {
        const d = addItem(namesShort[i], i + n);
        d.setAttribute("next", "");
      }

      const vyear = v.getFullYear();
      const getIndex = (b: Date | undefined): number => {
        if (!b) return -1;
        return (vyear - b.getFullYear()) * 12 + b.getMonth();
      };

      const now = new Date();
      let i = getIndex(now);
      items[i]?.setAttribute("aria-current", "date");

      i = getIndex(this.$value);
      items[i] && this.selectItem(items[i]);

      i = getIndex(cur);
      items[i] && this.focusItem(items[i]); // todo or focus to first

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
        this.changePicker(dt, PickersEnum.Day);
      },
      onTitleClick: () => this.changePicker(new Date(curValue), PickersEnum.Year),
    };
  }

  /** Returns result to render year picker */
  protected getYearPicker(): WUPCalendarIn.PickerResult {
    let curValue = 0;
    const pageSize = 16;

    const renderItems = (_ol: HTMLElement, replaceItems: HTMLElement[], v: Date, cur: Date): HTMLElement[] => {
      curValue = cur.valueOf();
      let page = Math.floor((cur.getFullYear() - 1970) / pageSize);
      let year = page * pageSize + 1970;

      this.$refCalenarTitle.textContent = `${year} ... ${year + pageSize - 1}`;

      page = Math.floor((v.getFullYear() - 1970) / pageSize);
      year = page * pageSize + 1970;
      const items: HTMLElement[] = [];
      let i = 0;
      for (i = 0; i < pageSize; ++i) {
        const d = this.appendItem(replaceItems[i], year.toString(), year);
        items.push(d);
        ++year;
      }

      const getIndex = (b: Date | undefined): number => {
        if (!b) return -1;
        return pageSize - (year - b.getFullYear());
      };

      const now = new Date();
      i = getIndex(now);
      items[i]?.setAttribute("aria-current", "date");

      i = getIndex(this.$value);
      items[i] && this.selectItem(items[i]);

      i = getIndex(cur);
      items[i] && this.focusItem(items[i]); // todo or focus to first

      return items;
    };

    return {
      renderItems,
      next: (v, n) => {
        v.setFullYear(v.getFullYear() + n * pageSize);
        return v;
      },
      onItemClick: (_e, v) => {
        const dt = new Date(curValue); // todo when user changes year we must reset month and date to 0
        dt.setFullYear(v);
        this.changePicker(dt, PickersEnum.Month);
      },
      onTitleClick: () => null,
    };
  }

  #focusedItem?: HTMLElement | null;
  /** Focus item (via aria-activedescendant) */
  protected focusItem(el: HTMLElement): void {
    this.#focusedItem?.removeAttribute("focused");

    this.#focusedItem = el;
    el.id = el.id || this.#ctr.$uniqueId;
    el.setAttribute("focused", "");
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
      this.$isFocused && this.focusItem(el);
    }
  }

  protected override setValue(v: ValueType | undefined, canValidate = true): boolean | null {
    const r = super.setValue(v, canValidate);
    this.$refInput.value = v != null ? `${v.getDate()} ${this.#ctr.$namesMonth[v.getMonth()]} ${v.getFullYear()}` : "";
    return r;
  }

  protected override gotChanges(propsChanged: Array<keyof WUPCalendar.Options | any> | null): void {
    super.gotChanges(propsChanged);

    // todo when developer skips label need not to parse from name
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
  }

  protected override gotFocusLost(): void {
    this.$refInput.removeAttribute("aria-activedescendant");
    super.gotFocusLost();
  }

  protected override gotFocus(): Array<() => void> {
    const r = super.gotFocus();
    r.push(this.appendEvent(this, "click", (e) => this.gotClick(e), { passive: false }));
    return r;
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

// todo testcase: no change event if user selected the same date again
// todo testcase: dayPickerSize === monthPickerSize === yearPickerSize
// todo testcase: find aria-current for different pickers

// todo animation from year to month is reverted
