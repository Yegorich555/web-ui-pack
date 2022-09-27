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
    renderItems: (ol: HTMLElement, v: Date) => HTMLElement[];
    getIndex: (v: Date, firstValue: number) => number;
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
      v.setDate(1);
      v.setHours(0, 0, 0, 0); // otherwise month increment works wrong for the last days of the month
      this.changePicker(v, this._opts.startWith ?? this.$isEmpty ? PickersEnum.Year : PickersEnum.Day);
    }); // wait for options
  }

  /** Append calendar item to parent or replace previous */
  protected appendItem(prevEl: HTMLElement | undefined | null, text: string, v: number): HTMLElement {
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

  #wasPicker: PickersEnum = 0;
  #clearPicker?: (isIn: boolean) => Promise<void>;
  /** Called when need set/change day/month/year picker */
  protected async changePicker(v: Date, picker: PickersEnum): Promise<void> {
    console.warn("change picker to", v.toDateString());
    await this.#clearPicker?.call(this, picker - this.#wasPicker > 0);
    this.#wasPicker = picker;

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

    const renderPicker = (next: Date): HTMLElement[] => {
      const a = r.renderItems(this.$refCalenarItems, next);

      const first = (a[0] as any)._value as any;
      let i = r.getIndex(new Date(), first);
      a[i]?.setAttribute("aria-current", "date");

      if (this.$value) {
        i = r.getIndex(this.$value, first);
        a[i] && this.selectItem(a[i]);
      }

      if (this.$isFocused) {
        i = r.getIndex(next, first);
        a[i] && this.focusItem(a[i]);
      }

      return a;
    };

    renderPicker(v);
    const scrollObj = scrollCarousel(this.$refCalenarItems, (n) => renderPicker(r.next(v, n)));

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

    let curValue: Date;
    const getIndex: WUPCalendarIn.PickerResult["getIndex"] = (b, first) =>
      Math.floor((b.valueOf() - (first as number)) / 86400000);

    const renderItems = (ol: HTMLElement, v: Date): HTMLElement[] => {
      curValue = v;
      const valMonth = v.getMonth();
      const valYear = v.getFullYear();
      this.$refCalenarTitle.textContent = `${this.#ctr.$namesMonth[valMonth]} ${valYear}`;

      const items: HTMLElement[] = [];
      const r = this.#ctr.$daysOfMonth(valYear, valMonth, this._opts.firstDayOfWeek);

      let iPrev = -999;
      if (ol.children.length) {
        iPrev = getIndex(new Date(r.first), (ol.children.item(0) as any)._value);
      }

      let i = 0;
      const addItem = (n: number, attr: string): void => {
        const d = this.appendItem(ol.children.item(iPrev) as HTMLElement, n.toString(), r.first + i * 86400000);
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

    // todo attr [disabled]

    return {
      getIndex,
      renderItems,
      next: (v, n) => {
        v.setMonth(v.getMonth() + n);
        return v;
      },
      onItemClick: ({ target }, v) => {
        this.selectItem(target);
        const dt = new Date(v);
        if (this.$value) {
          dt.setHours(
            this.$value.getHours(),
            this.$value.getMinutes(),
            this.$value.getSeconds(),
            this.$value.getMilliseconds()
          );
        }
        curValue = dt;
        this.setValue(dt as ValueType);
      },
      onTitleClick: () => this.changePicker(curValue, PickersEnum.Month),
    };
  }

  /** Returns result to render month picker */
  protected getMonthPicker(): WUPCalendarIn.PickerResult {
    let curValue: Date;

    const getIndex: WUPCalendarIn.PickerResult["getIndex"] = //
      (b, first) => b.getFullYear() * 12 + b.getMonth() - first;

    const renderItems = (ol: HTMLElement, v: Date): HTMLElement[] => {
      curValue = v;
      const year = v.getFullYear();
      this.$refCalenarTitle.textContent = `${year}`;

      const namesShort = this.#ctr.$namesMonthShort;
      const items: HTMLElement[] = [];
      const total = year * 12;

      let iPrev = -999;
      if (ol.children.length) {
        iPrev = getIndex(new Date(year, 0), (ol.children.item(0) as any)._value);
      }

      const addItem = (n: string, i: number): HTMLElement => {
        const d = this.appendItem(ol.children.item(iPrev) as HTMLElement, n, total + i);
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
        v.setFullYear(v.getFullYear() + n);
        return v;
      },
      onItemClick: (_e, v) => this.changePicker(new Date(Math.floor(v / 12), Math.ceil(v / 12), 1), PickersEnum.Day),
      onTitleClick: () => this.changePicker(curValue, PickersEnum.Year),
    };
  }

  /** Returns result to render year picker */
  protected getYearPicker(): WUPCalendarIn.PickerResult {
    const pageSize = 16;

    const renderItems = (_ol: HTMLElement, v: Date): HTMLElement[] => {
      const page = Math.floor((v.getFullYear() - 1970) / pageSize);
      let year = page * pageSize + 1970;

      this.$refCalenarTitle.textContent = `${year} ... ${year + pageSize - 1}`;
      const items: HTMLElement[] = [];
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
      getIndex: (b, first) => b.getFullYear() - (first as number),
      next: (v, n) => {
        v.setFullYear(v.getFullYear() + n * pageSize);
        return v;
      },
      onItemClick: (_e, v) => this.changePicker(new Date(v, 0), PickersEnum.Month),
      onTitleClick: () => null,
    };
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
      this.$isFocused && this.focusItem(el);
    }
  }

  protected override setValue(v: ValueType | undefined, canValidate = true): boolean | null {
    const r = super.setValue(v, canValidate);
    // todo fire selectItem on picker here
    this.$refInput.value = v != null ? `${v.getDate()} ${this.#ctr.$namesMonth[v.getMonth()]} ${v.getFullYear()}` : "";
    return r;
  }

  protected override gotChanges(propsChanged: Array<keyof WUPCalendar.Options | any> | null): void {
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
  }

  protected override gotFocusLost(): void {
    this.$refInput.removeAttribute("aria-activedescendant");
    super.gotFocusLost();
  }

  protected override gotFocus(): Array<() => void> {
    const r = super.gotFocus();
    r.push(this.appendEvent(this, "click", (e) => this.gotClick(e), { passive: false }));
    const el = this.$refCalenarItems.querySelector("[aria-selected=true]") as HTMLElement;
    el && this.focusItem(el); // todo check with NVDA: it can announce twice
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
// todo testCase: 31 Mar 2022  + 1 month > return April (but returns May)

// todo testcase: initValue: 2022-03-20 10:05; Month picker must show focused in visible area
// todo when user scrolls pickers title changing must be announced
