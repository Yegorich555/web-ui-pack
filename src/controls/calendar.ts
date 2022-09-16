import WUPBaseControl, { WUPBaseIn } from "./baseControl";
import { WUPcssHidden } from "../styles";

export const enum FirstDayOfWeek {
  Monday = 1,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday,
  Sunday,
}

const tagName = "wup-calendar";
export namespace WUPCalendarIn {
  export interface Def {
    /** First day of week in calendar where 1-Monday, 7-Sunday;
     * @default Monday === 1 */
    firstDayOfWeek: FirstDayOfWeek;
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
  static $daysOfMonth(year: number, month: number, firstDayOfWeek = FirstDayOfWeek.Monday): WUPCalendar.MonthInfo {
    let dt = new Date(year, month + 1, 0); // month in JS is 0-11 index based but here is a hack: returns last day of month
    const r: WUPCalendar.MonthInfo = { total: dt.getDate(), nextTo: 0, first: 0 };
    dt.setDate(2 - firstDayOfWeek); // reset to first day of week
    const $1 = dt.getDay() - 1; // get index of first day of current month
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
    firstDayOfWeek: FirstDayOfWeek.Monday,
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

  protected renderControl(): void {
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    // this.$refInput.type = "date";
    const s = this.$refLabel.appendChild(document.createElement("span"));
    s.appendChild(this.$refInput); // input appended to span to allow user user :after,:before without padding adjust
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);

    this.renderDayPicker();
    this.addEventListener("click", this.gotClick, { passive: true });
  }

  /** Called when user clicks on calendar */
  protected gotClick(e: MouseEvent): void {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }
    this.#handleClick!.call(this, e);
  }

  #handleClick?: (e: MouseEvent) => void;

  /** Appends DayPicker on layout */
  protected renderDayPicker(): void {
    const now = new Date();
    const v = (this.$value || now) as Date;
    const $1 = this._opts.firstDayOfWeek;
    const valMonth = v.getMonth();
    const valYear = v.getFullYear();
    const r = this.#ctr.$daysOfMonth(valYear, valMonth, $1);
    const add: <K extends keyof HTMLElementTagNameMap>(el: HTMLElement, tagName: K) => HTMLElementTagNameMap[K] = (
      el,
      tag
    ) => el.appendChild(document.createElement(tag));

    // const ri = this.$refInput;
    // ri.setAttribute("role", "combobox");
    // ri.setAttribute("aria-owns", "test123");
    // ri.setAttribute("aria-controls", "test123");

    const box = add(this, "div");
    box.id = "test123";
    box.setAttribute("calendar", "day");
    const header = add(box, "header");
    /**/ const title = add(header, "button");
    /**/ title.textContent = `${this.#ctr.$namesMonth[valMonth]} ${valYear}`;

    const days = add(box, "ul");
    const names = this.#ctr.$namesDayShort;
    for (let i = 0, n = $1 - 1; i < 7; ++i, ++n) {
      const d = add(days, "li");
      if (n >= names.length) {
        n = 0;
      }
      d.textContent = names[n];
    }

    const items: HTMLElement[] = [];
    const ol = add(box, "ol");
    ol.setAttribute("role", "grid");
    const addItem = (i: number, attr: string): void => {
      const d = add(ol, "li");
      d.textContent = i.toString();
      d.setAttribute("role", "gridcell");
      attr && d.setAttribute(attr, "");
      items!.push(d);
    };
    if (r.prev) {
      for (let i = r.prev.from; i <= r.prev.to; ++i) {
        addItem(i, "prev");
      }
    }
    for (let i = 1; i <= r.total; ++i) {
      addItem(i, "");
    }
    for (let i = 1; i <= r.nextTo; ++i) {
      addItem(i, "next");
    }

    let i = Math.floor((now.valueOf() - r.first) / 86400000);
    items[i]?.setAttribute("aria-current", "date");
    if (this.$value) {
      i = Math.floor((this.$value.valueOf() - r.first) / 86400000);
      items[i]?.setAttribute("aria-selected", "true");
    }
    // todo attr [disabled]

    const firstValue = r.first;
    this.#handleClick = (e) => {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const i = items!.findIndex((li) => li === e.target || li.contains(e.target as HTMLElement));
      if (i > -1) {
        this.querySelector("[aria-selected]")?.removeAttribute("aria-selected");
        const el = items![i];
        el.setAttribute("aria-selected", "true");
        const d = new Date(firstValue + i * 86400000);
        this.setValue(d as ValueType);
        console.warn("new value", d);

        const id = this.#ctr.$uniqueId;
        el.setAttribute("aria-label", `${el.textContent} ${title.textContent}`);
        this.$refInput.setAttribute("aria-activedescendant", id);
        items[i].id = id;
      }
    };
  }

  protected override gotFocusLost(): void {
    this.$refInput.removeAttribute("aria-activedescendant");
  }
}

customElements.define(tagName, WUPCalendarControl);
