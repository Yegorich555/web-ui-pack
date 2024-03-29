/* eslint-disable jest/no-export */
import { WUPCalendarControl } from "web-ui-pack";
import { PickersEnum } from "web-ui-pack/controls/calendar";
import { initTestBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

let el: WUPCalendarControl;
const mockShowNext = () => {
  const { nextFrame } = h.useFakeAnimation();
  const showNext = async (isNext: boolean) => {
    el.showNext(isNext);
    await nextFrame();
    await nextFrame();
    await nextFrame();
    jest.advanceTimersByTime(1);
  };
  return showNext;
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

initTestBaseControl({
  type: WUPCalendarControl as any,
  htmlTag: "wup-calendar",
  onInit: (e) => {
    jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
    el = e as WUPCalendarControl;
  },
});

/** Test function for different timezones */
export default function calendarTZtest() {
  const daysSet = [
    {
      startOfWeek: 1,
      label: "Monday",
      days: [
        { total: 31, prev: { from: 27, to: 31 }, nextTo: 6, first: Date.UTC(2021, 11, 27) }, // Jan
        { total: 28, prev: { from: 31, to: 31 }, nextTo: 13, first: Date.UTC(2022, 0, 31) }, // Feb
        { total: 31, prev: { from: 28, to: 28 }, nextTo: 10, first: Date.UTC(2022, 1, 28) }, // Mar
        { total: 30, prev: { from: 28, to: 31 }, nextTo: 8, first: Date.UTC(2022, 2, 28) }, // Apr
        { total: 31, prev: { from: 25, to: 30 }, nextTo: 5, first: Date.UTC(2022, 3, 25) }, // May
        { total: 30, prev: { from: 30, to: 31 }, nextTo: 10, first: Date.UTC(2022, 4, 30) }, // June
        { total: 31, prev: { from: 27, to: 30 }, nextTo: 7, first: Date.UTC(2022, 5, 27) }, // July
        { total: 31, nextTo: 11, first: Date.UTC(2022, 7, 1) }, // Aug
        { total: 30, prev: { from: 29, to: 31 }, nextTo: 9, first: Date.UTC(2022, 7, 29) }, // Sep
        { total: 31, prev: { from: 26, to: 30 }, nextTo: 6, first: Date.UTC(2022, 8, 26) }, // Oct
        { total: 30, prev: { from: 31, to: 31 }, nextTo: 11, first: Date.UTC(2022, 9, 31) }, // Nov
        { total: 31, prev: { from: 28, to: 30 }, nextTo: 8, first: Date.UTC(2022, 10, 28) }, // Dec
      ],
    },
    {
      startOfWeek: 2,
      label: "Tuesday",
      days: [
        { total: 31, prev: { from: 28, to: 31 }, nextTo: 7, first: Date.UTC(2021, 11, 28) }, // Jan
        { total: 28, nextTo: 14, first: Date.UTC(2022, 1, 1) }, // Feb
        { total: 31, nextTo: 11, first: Date.UTC(2022, 2, 1) }, // Mar
        { total: 30, prev: { from: 29, to: 31 }, nextTo: 9, first: Date.UTC(2022, 2, 29) }, // Apr
        { total: 31, prev: { from: 26, to: 30 }, nextTo: 6, first: Date.UTC(2022, 3, 26) }, // May
        { total: 30, prev: { from: 31, to: 31 }, nextTo: 11, first: Date.UTC(2022, 4, 31) }, // June
        { total: 31, prev: { from: 28, to: 30 }, nextTo: 8, first: Date.UTC(2022, 5, 28) }, // July
        { total: 31, prev: { from: 26, to: 31 }, nextTo: 5, first: Date.UTC(2022, 6, 26) }, // Aug
        { total: 30, prev: { from: 30, to: 31 }, nextTo: 10, first: Date.UTC(2022, 7, 30) }, // Sep
        { total: 31, prev: { from: 27, to: 30 }, nextTo: 7, first: Date.UTC(2022, 8, 27) }, // Oct
        { total: 30, nextTo: 12, first: Date.UTC(2022, 10, 1) }, // Nov
        { total: 31, prev: { from: 29, to: 30 }, nextTo: 9, first: Date.UTC(2022, 10, 29) }, // Dec
      ],
    },
    {
      startOfWeek: 7,
      label: "Sunday",
      days: [
        { total: 31, prev: { from: 26, to: 31 }, nextTo: 5, first: Date.UTC(2021, 11, 26) }, // Jan
        { total: 28, prev: { from: 30, to: 31 }, nextTo: 12, first: Date.UTC(2022, 0, 30) }, // Feb
        { total: 31, prev: { from: 27, to: 28 }, nextTo: 9, first: Date.UTC(2022, 1, 27) }, // Mar
        { total: 30, prev: { from: 27, to: 31 }, nextTo: 7, first: Date.UTC(2022, 2, 27) }, // Apr
        { total: 31, nextTo: 11, first: Date.UTC(2022, 4, 1) }, // May
        { total: 30, prev: { from: 29, to: 31 }, nextTo: 9, first: Date.UTC(2022, 4, 29) }, // June
        { total: 31, prev: { from: 26, to: 30 }, nextTo: 6, first: Date.UTC(2022, 5, 26) }, // July
        { total: 31, prev: { from: 31, to: 31 }, nextTo: 10, first: Date.UTC(2022, 6, 31) }, // Aug
        { total: 30, prev: { from: 28, to: 31 }, nextTo: 8, first: Date.UTC(2022, 7, 28) }, // Sep
        { total: 31, prev: { from: 25, to: 30 }, nextTo: 5, first: Date.UTC(2022, 8, 25) }, // Oct
        { total: 30, prev: { from: 30, to: 31 }, nextTo: 10, first: Date.UTC(2022, 9, 30) }, // Nov
        { total: 31, prev: { from: 27, to: 30 }, nextTo: 7, first: Date.UTC(2022, 10, 27) }, // Dec
      ],
    },
  ];

  test("static $parse()", () => {
    expect(WUPCalendarControl.$parse("2022-10-25T02:40:00.000Z", false).toISOString()).toBe("2022-10-25T02:40:00.000Z");
    expect(WUPCalendarControl.$parse("2022-10-25T02:40:00.000Z", true).toISOString()).toBe("2022-10-25T02:40:00.000Z");

    let ds = new Date(2022, 9, 25).toLocaleString();
    expect(WUPCalendarControl.$parse("2022-10-25", true).toISOString()).toBe("2022-10-25T00:00:00.000Z");
    expect(WUPCalendarControl.$parse("2022-10-25", false).toLocaleString()).toBe(ds);

    ds = new Date(2022, 9, 25, 20, 40).toLocaleString();
    expect(WUPCalendarControl.$parse("2022-10-25T20:40", true).toISOString()).toBe("2022-10-25T20:40:00.000Z");
    expect(WUPCalendarControl.$parse("2022-10-25T20:40", false).toLocaleString()).toBe(ds);

    expect(WUPCalendarControl.$parse("2022-10-25 20:40", true).toISOString()).toBe("2022-10-25T20:40:00.000Z");
    expect(WUPCalendarControl.$parse("2022-10-25 20:40", false).toLocaleString()).toBe(ds);

    expect(() => WUPCalendarControl.$parse("hello", false)).toThrow();
  });

  describe("$daysOfMonth", () => {
    daysSet.forEach((ds) => {
      test(`2022..2023 firstOfWeek: ${ds.label}`, () => {
        ds.days.forEach((d, i) => {
          if (ds.startOfWeek === 1) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(WUPCalendarControl.$daysOfMonth(2022, i)).toEqual(d); // just for coverage default
          } else {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(WUPCalendarControl.$daysOfMonth(2022, i, ds.startOfWeek)).toEqual(d);
          }
        });
      });
    });
  });

  const goTest = async (opt: { utc: boolean }) => {
    const initDate = (y: number, m: number, d: number | string, hh = 0, mm = 0) =>
      opt.utc ? new Date(Date.UTC(y, m, +d, hh, mm)) : new Date(y, m, +d, hh, mm);

    const initDateStr = (utcString: string) => (opt.utc ? new Date(utcString) : new Date(`${utcString} 00:00`));

    describe(`utc=${opt.utc}`, () => {
      describe("day picker", () => {
        daysSet.forEach((ds) => {
          test(`firstOfWeek: ${ds.label}`, async () => {
            const curMonth = 11; // December WARN: it's important to test with December to check DST
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2022, curMonth, 16, 23, 49));
            el.remove(); // otherwise option startWith doesn't work
            el.$options.utc = opt.utc;
            el.$options.firstWeekDay = ds.startOfWeek as any;
            el.$options.startWith = PickersEnum.Day | 0;
            el.$initValue = initDate(2022, curMonth, 5);
            document.body.appendChild(el);
            await h.wait();

            expect(el.querySelector("[calendar='day']")).toBeTruthy();
            expect(el.$refCalendarTitle.textContent).toBe("December 2022");
            expect(el.$refCalendarItems.children.length).toBe(42);
            expect(el.$refCalendarItems.firstElementChild!.textContent).toBe(`${ds.days[curMonth].prev?.from ?? 1}`);
            expect(el.$refCalendarItems.lastElementChild!.textContent).toBe(`${ds.days[curMonth].nextTo}`);
            expect(el.querySelector("[aria-current]")?.textContent).toBe("16");
            expect(el.querySelector("[aria-selected]")?.textContent).toBe("5");
            expect(el.$refInput.value).toBe("5 December 2022");
            expect(el).toMatchSnapshot();

            el.$initValue = initDate(2022, curMonth, 10);
            expect(el.querySelector("[aria-selected]")?.textContent).toBe("10");
            expect(el.$refInput.value).toBe("10 December 2022");
            el.$initValue = initDate(2022, curMonth - 2, 5);
            expect(el.querySelector("[aria-selected]")).toBeFalsy();
            expect(el.$refInput.value).toBe("5 October 2022");

            // test click
            const onChange = jest.fn();
            el.addEventListener("$change", onChange);
            let item = el.$refCalendarItems.children.item(15) as HTMLElement;
            expect(onChange).toBeCalledTimes(0);
            await h.userClick(item);
            expect(item.getAttribute("aria-selected")).toBe("true");
            expect(el.querySelectorAll("[aria-selected]").length).toBe(1);
            jest.advanceTimersByTime(1);
            expect(onChange).toBeCalledTimes(1);
            expect(el.$value).toEqual(initDate(2022, curMonth, item.textContent!));
            expect(el.$isChanged).toBe(true);

            // click again on the same shouldn't change anything
            await h.userClick(item);
            jest.advanceTimersByTime(1);
            expect(onChange).toBeCalledTimes(1);
            expect(item.getAttribute("aria-selected")).toBe("true");
            expect(el.querySelectorAll("[aria-selected]").length).toBe(1);

            // click on the first
            onChange.mockClear();
            item = el.$refCalendarItems.firstElementChild as HTMLElement;
            await h.userClick(item);
            expect(item.getAttribute("aria-selected")).toBe("true");
            expect(el.querySelectorAll("[aria-selected]").length).toBe(1);
            jest.advanceTimersByTime(1);
            expect(onChange).toBeCalledTimes(1);
            const selectedM = ds.days[curMonth].prev?.from ? curMonth - 1 : curMonth;
            expect(el.$value).toEqual(initDate(2022, selectedM, item.textContent!));
            expect(el.$isChanged).toBe(true);

            // click on the last
            onChange.mockClear();
            item = el.$refCalendarItems.lastElementChild as HTMLElement;
            await h.userClick(item);
            expect(item.getAttribute("aria-selected")).toBe("true");
            expect(el.querySelectorAll("[aria-selected]").length).toBe(1);
            jest.advanceTimersByTime(1);
            expect(onChange).toBeCalledTimes(1);
            expect(el.$value).toEqual(initDate(2022, curMonth + 1, item.textContent!));
            expect(el.$isChanged).toBe(true);

            // test when initValue with time
            // for US: DST Nov 6..7, Mar 13..14
            el.$value = initDate(2022, 10, 1, 23, 50); // 2022-Nov-01
            el.remove();
            document.body.appendChild(el);
            await h.wait();
            expect(el.$refCalendarItems.children.length).toBe(42);
            expect(el.querySelector("[aria-selected]")?.textContent).toBe("1");
            item = el.$refCalendarItems.lastElementChild as HTMLElement;
            await h.userClick(item);
            expect(item.getAttribute("aria-selected")).toBe("true");
            expect(el.$value).toEqual(initDate(2022, 11, item.textContent!, 23, 50));

            el.$value = initDate(2022, 4, 2, 23, 50); // 2022-Mar-02
            el.remove();
            document.body.appendChild(el);
            await h.wait();
            expect(el.querySelector("[aria-selected]")?.textContent).toBe("2");
            item = el.$refCalendarItems.lastElementChild as HTMLElement;
            await h.userClick(item);
            expect(item.getAttribute("aria-selected")).toBe("true");
            expect(el.$value).toEqual(initDate(2022, 5, item.textContent!, 23, 50));
            // option startWith: string
            el.remove();
            el.$options.utc = opt.utc;
            el.$value = undefined;
            el.$initValue = undefined;
            el.$options.startWith = "1990-02-01";
            document.body.appendChild(el);
            await h.wait();
            expect(el.$refCalendarTitle.textContent).toBe("February 1990");
            // option startWith: is whole date
            el.remove();
            el.$options.startWith = "1990-01-01 10:55";
            document.body.appendChild(el);
            await h.wait();
            expect(el.$refCalendarTitle.textContent).toBe("January 1990");
            // option startWith: is wrong
            el.remove();
            el.$options.startWith = "a-b-c";
            document.body.appendChild(el);
            await h.wait();
            expect(el.$refCalendarTitle.textContent).toBe("January 2022");
            // option startWith: is wrong
            el.remove();
            el.$options.startWith = "1990-01-01-06";
            document.body.appendChild(el);
            await h.wait();
            expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");
            // option startWith: is empty
            el.remove();
            el.$options.startWith = "";
            document.body.appendChild(el);
            await h.wait();
            expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");
          });
        });
      });
      test("month picker", async () => {
        jest.setSystemTime(new Date(2022, 11, 31, 23, 0));
        el.remove();
        el.$options.utc = opt.utc;
        el.$initValue = initDate(2022, 11, 31, 23, 10);
        el.$options.startWith = PickersEnum.Month | 0;
        document.body.appendChild(el);
        await h.wait();

        expect(el.querySelector("[calendar='month']")).toBeTruthy();
        expect(el.$refCalendarItems.children.length).toBe(12 + 4);
        expect(el.$refCalendarTitle?.textContent).toBe("2022");
        expect(el.querySelector("[aria-current]")?.textContent).toBe("Dec");
        expect(el.querySelector("[aria-selected]")?.textContent).toBe("Dec");
        expect(el.$refCalendar).toMatchSnapshot();

        el.remove();
        el.$initValue = undefined;
        document.body.appendChild(el);
        await h.wait();
        expect(el.querySelector("[calendar='month']")).toBeTruthy();
        expect(el.$refCalendarTitle?.textContent).toBe("2022");
        expect(el.querySelector("[aria-selected]")).toBeFalsy();

        await h.userClick(el.$refCalendarItems.firstElementChild as HTMLElement);
        await h.wait();
        expect(el.querySelector("[calendar='day']")).toBeTruthy();
        expect(el.$refCalendarTitle.textContent).toBe("January 2022");
        // other click tests see in 'navigation between pickers'

        // option startWith: string
        el.remove();
        el.$options.utc = opt.utc;
        el.$value = undefined;
        el.$initValue = undefined;
        el.$options.startWith = "1990-01";
        document.body.appendChild(el);
        await h.wait();
        expect(el.$refCalendarTitle.textContent).toBe("1990");
      });

      test("year picker", async () => {
        jest.setSystemTime(new Date(2018, 1, 1));
        el.remove();
        el.$options.utc = opt.utc;
        el.$initValue = initDate(2018, 1, 1, 0, 46);
        el.$options.startWith = PickersEnum.Year | 0;
        document.body.appendChild(el);
        await h.wait();

        expect(el.querySelector("[calendar='year']")).toBeTruthy();
        expect(el.$refCalendarItems.children.length).toBe(16);
        expect(el.$refCalendarTitle?.textContent).toBe("2018 ... 2033");
        expect(el.querySelector("[aria-current]")?.textContent).toBe("2018");
        expect(el.querySelector("[aria-selected]")?.textContent).toBe("2018");
        expect(el.$refCalendar).toMatchSnapshot();

        el.remove();
        el.$initValue = undefined;
        document.body.appendChild(el);
        await h.wait();
        expect(el.querySelector("[calendar='year']")).toBeTruthy();
        expect(el.$refCalendarTitle?.textContent).toBe("2018 ... 2033");
        expect(el.querySelector("[aria-selected]")).toBeFalsy();

        await h.userClick(el.$refCalendarItems.firstElementChild as HTMLElement);
        await h.wait();
        expect(el.querySelector("[calendar='month']")).toBeTruthy();
        expect(el.$refCalendarTitle.textContent).toBe("2018");
        // other click tests see in 'navigation between pickers'

        // option startWith: string
        el.remove();
        el.$options.utc = opt.utc;
        el.$value = undefined;
        el.$initValue = undefined;
        el.setAttribute("w-startwith", "1990");
        document.body.appendChild(el);
        await h.wait();
        expect(el.$refCalendarTitle.textContent).toBe("1986 ... 2001");
      });

      test("navigation between pickers", async () => {
        const onChange = jest.fn();
        el.addEventListener("$change", onChange);

        jest.setSystemTime(new Date(2018, 1, 1, 1, 10, 15));
        el.$options.utc = opt.utc;
        el.remove(); // otherwise option startWith doesn't work
        document.body.appendChild(el);
        await h.wait();
        expect(el.querySelector("[calendar='year']")).toBeTruthy();
        expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");

        el.$initValue = initDate(2022, 3, 1, 1, 40);
        el.remove();
        document.body.appendChild(el);
        await h.wait();
        expect(el.querySelector("[calendar='day']")).toBeTruthy();
        expect(el.$refCalendarTitle.textContent).toBe("April 2022");
        onChange.mockClear();

        await h.userClick(el.$refCalendarTitle);
        await h.wait();
        expect(el.querySelector("[calendar='month']")).toBeTruthy();
        expect(el.$refCalendarTitle.textContent).toBe("2022");
        expect(el.querySelector("[aria-selected]")!.textContent).toBe("Apr");

        await h.userClick(el.$refCalendarTitle);
        await h.wait();
        expect(el.querySelector("[calendar='year']")).toBeTruthy();
        expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");
        expect(el.querySelector("[aria-selected]")!.textContent).toBe("2022");

        const wasHtml = el.outerHTML;
        await h.userClick(el.$refCalendarTitle); // click again on title does nothing
        await h.wait();
        expect(el.querySelector("[calendar='year']")).toBeTruthy();
        expect(wasHtml).toBe(el.outerHTML);

        // go back from year to day
        await h.userClick(el.$refCalendarItems.children.item(2) as HTMLElement); // click on 2020
        await h.wait();
        expect(el.querySelector("[calendar='month']")).toBeTruthy();
        expect(el.$refCalendarTitle.textContent).toBe("2020");
        expect(el.querySelector("[aria-selected]")?.textContent).toBeFalsy(); // because selected Apr 2022
        expect(el.querySelector("[aria-current]")?.textContent).toBeFalsy();

        await h.userClick(el.$refCalendarItems.children.item(5) as HTMLElement); // click on June
        await h.wait();
        expect(el.querySelector("[calendar='day']")).toBeTruthy();
        expect(el.$refCalendarTitle.textContent).toBe("June 2020");
        expect(el.querySelector("[aria-selected]")?.textContent).toBeFalsy(); // because selected Apr 2022
        expect(el.querySelector("[aria-current]")?.textContent).toBeFalsy();

        const item = el.$refCalendarItems.children.item(7) as HTMLElement;
        expect(item.textContent).toBe("8");
        await h.userClick(item); // 8 June 2020
        await h.wait();
        expect(el.querySelector("[aria-selected]")).toBe(item);
        expect(onChange).toBeCalledTimes(1);

        if (opt.utc) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(el.$value?.toISOString()).toBe("2020-06-08T01:40:00.000Z");
        } else {
          const v = el.$value!;
          const str = `${v.getFullYear()}-${
            v.getMonth() + 1
          }-${v.getDate()} ${v.getHours()}:${v.getMinutes()}:${v.getSeconds()}.${v.getMilliseconds()}`;
          // eslint-disable-next-line jest/no-conditional-expect
          expect(str).toBe("2020-6-8 1:40:0.0");
        }

        await h.userClick(el.$refCalendarTitle);
        await h.wait();
        expect(el.querySelector("[aria-selected]")?.textContent).toBe("Jun");

        await h.userClick(el.$refCalendarTitle);
        await h.wait();
        expect(el.querySelector("[aria-selected]")?.textContent).toBe("2020");

        // checking if value change affects on calendarSelection
        el.$value = initDate(2022, 11, 15); // 15 Dec 2022
        expect(el.querySelector("[aria-selected]")?.textContent).toBe("2022");
        await h.userClick(el.$refCalendarItems.children.item(0) as HTMLElement);
        await h.wait();
        el.$value = initDate(2018, 1, 15); // 15 Feb 2018
        expect(el.querySelector("[aria-selected]")?.textContent).toBe("Feb");
        await h.userClick(el.querySelector("[aria-selected]") as HTMLElement);
        await h.wait();
        expect(el.querySelector("[aria-selected]")?.textContent).toBe("15");
        el.$value = initDate(2018, 1, 26); // 26 Feb 2018
        expect(el.querySelector("[aria-selected]")?.textContent).toBe("26");
      });

      test("$options.min & .max", async () => {
        const showNext = mockShowNext();
        const mapContent = () => {
          const arr = new Array(el.$refCalendarItems.children.length);
          for (let i = 0; i < arr.length; ++i) {
            const item = el.$refCalendarItems.children.item(i)!;
            arr[i] = `${item.textContent}${item.hasAttribute("disabled") ? " disabled" : ""}`;
          }
          return arr;
        };
        jest.setSystemTime(new Date(2022, 9, 15));
        el.remove();
        el.$options.utc = opt.utc;
        el.$initValue = initDate(2022, 9, 11); // 11 Oct
        document.body.appendChild(el);
        await h.wait();
        el.$options.min = initDate(2022, 8, 30); // 30 Sep
        el.$options.max = initDate(2022, 10, 1); // 1 Nov
        await h.wait();

        expect(el.$refCalendarTitle.textContent).toBe("October 2022");
        expect(mapContent()).toMatchSnapshot();
        await showNext(true);
        expect(el.$refCalendarTitle.textContent).toBe("November 2022");
        expect(el.$refCalendarItems.children.length).toBe(42);
        expect(mapContent()).toMatchSnapshot();
        await showNext(true);
        expect(el.$refCalendarTitle.textContent).toBe("November 2022");
        expect(el.$refCalendarItems.children.length).toBe(42);

        await showNext(false);
        expect(el.$refCalendarTitle.textContent).toBe("October 2022");
        await showNext(false);
        expect(el.$refCalendarTitle.textContent).toBe("September 2022");
        expect(el.$refCalendarItems.children.length).toBe(42);
        expect(mapContent()).toMatchSnapshot();
        await showNext(false);
        expect(el.$refCalendarTitle.textContent).toBe("September 2022");
        expect(el.$refCalendarItems.children.length).toBe(42);

        // with monthPicker
        el.$options.min = initDateStr("2021-08-02");
        el.$options.max = initDateStr("2023-01-31");
        await h.wait();
        await h.userClick(el.$refCalendarTitle);
        await h.wait();
        expect(el.$refCalendarTitle.textContent).toBe("2022");
        await showNext(false);
        await showNext(false);
        expect(el.$refCalendarTitle.textContent).toBe("2021");
        expect(el).toMatchSnapshot();
        await showNext(true);
        await showNext(true);
        await showNext(true);
        expect(el.$refCalendarTitle.textContent).toBe("2023");
        expect(el).toMatchSnapshot();

        // checking with yearPicker
        el.$options.min = initDateStr("2016-01-02");
        el.$options.max = initDateStr("2034-05-01");
        await h.wait();
        await h.userClick(el.$refCalendarTitle);
        await h.wait();
        expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");
        await showNext(false);
        await showNext(false);
        expect(el.$refCalendarTitle.textContent).toBe("2002 ... 2017");
        expect(el.$refCalendarItems).toMatchSnapshot();
        await showNext(true);
        await showNext(true);
        await showNext(true);
        expect(el.$refCalendarTitle.textContent).toBe("2034 ... 2049");
        expect(el.$refCalendarItems).toMatchSnapshot();

        // start with $options.max
        jest.setSystemTime(new Date(2022, 9, 15));
        el.remove();
        el.$options.utc = opt.utc;
        el.$options.min = undefined;
        el.$options.max = initDate(1990, 0, 1); // 1 Jan
        el.$options.startWith = PickersEnum.Year | 0;
        el.$value = initDate(2022, 9, 15);
        document.body.appendChild(el);
        await h.wait();
        expect(el.$refCalendarTitle.textContent).toBe("1986 ... 2001");
        // start with $options.min
        el.remove();
        el.$options.min = initDate(2003, 5, 1);
        el.$options.max = undefined;
        el.$value = initDate(1990, 0, 1);
        document.body.appendChild(el);
        await h.wait();
        expect(el.$refCalendarTitle.textContent).toBe("2002 ... 2017");
      });

      test("$options.exclude (attr [disabled])", async () => {
        const showNext = mockShowNext();
        const mapContent = () => {
          const arr = new Array(el.$refCalendarItems.children.length);
          for (let i = 0; i < arr.length; ++i) {
            const item = el.$refCalendarItems.children.item(i)!;
            arr[i] = `${item.textContent}${item.hasAttribute("disabled") ? " disabled" : ""}`;
          }
          return arr;
        };
        jest.setSystemTime(new Date(2022, 9, 15));
        el.remove();
        el.$options.utc = opt.utc;
        el.$initValue = initDate(2022, 9, 11); // 11 Oct
        document.body.appendChild(el);
        await h.wait();

        const min = initDate(2022, 8, 30); // 30 Sep
        const max = initDate(2022, 10, 1); // 1 Nov
        el.$options.exclude = [new Date(min), new Date(max)];
        await h.wait();
        expect(el.$refCalendarTitle.textContent).toBe("October 2022");
        expect(mapContent()).toMatchSnapshot();
        el.$options.min = min;
        el.$options.max = max;
        el.$options.exclude = [
          new Date(el.$options.min),
          initDate(2022, 9, 10),
          initDate(2022, 9, 11),
          new Date(el.$options.max),
        ];
        await h.wait();
        expect(el.$refCalendarTitle.textContent).toBe("October 2022");
        expect(mapContent()).toMatchSnapshot();
        await showNext(true);
        expect(el.$refCalendarTitle.textContent).toBe("November 2022");
        expect(el.$refCalendarItems.children.length).toBe(42);
        expect(mapContent()).toMatchSnapshot();

        await h.userClick(el.$refCalendarTitle);
        await h.wait();
        expect(mapContent()).toMatchSnapshot();

        await h.userClick(el.$refCalendarTitle);
        await h.wait();
        expect(mapContent()).toMatchSnapshot();

        // checking when the whole year is disabled
        el.remove();
        el.$options.startWith = PickersEnum.Year | 0;
        el.$options.min = undefined;
        el.$options.max = undefined;
        let arr = [];
        for (
          let dt = initDate(2022, 0, 1);
          dt < initDate(2023, 0, 1);
          opt.utc ? dt.setUTCDate(dt.getUTCDate() + 1) : dt.setDate(dt.getDate() + 1)
        ) {
          arr.push(new Date(dt));
        }
        el.$options.exclude = arr;
        document.body.appendChild(el);
        await h.wait();
        expect(mapContent()).toMatchSnapshot(); // only 2022 year must be disabled

        // checking daypicker when the whole year is disabled
        el.remove();
        el.$initValue = initDate(2022, 1, 1);
        el.$options.startWith = PickersEnum.Day | 0;
        document.body.appendChild(el);
        await h.wait();
        expect(mapContent()).toMatchSnapshot(); // expected all days are disabled

        // checking when the whole month is disabled
        el.remove();
        el.$options.startWith = PickersEnum.Month | 0;
        arr = [];
        for (
          let dt = initDate(2022, 1, 1);
          dt < initDate(2022, 2, 1);
          opt.utc ? dt.setUTCDate(dt.getUTCDate() + 1) : dt.setDate(dt.getDate() + 1)
        ) {
          arr.push(new Date(dt));
        }
        el.$options.exclude = arr;
        document.body.appendChild(el);
        await h.wait();
        expect(mapContent()).toMatchSnapshot(); // only Feb 2022 must be disabled

        // again but init month is different
        el.remove();
        el.$initValue = undefined;
        el.$value = undefined;
        el.$options.startWith = "2035-01";
        el.$options.exclude = arr;
        document.body.appendChild(el);
        await h.wait();
        expect(el.querySelector("[disabled]")).toBeFalsy();

        // checking daypicker when the whole month is disabled
        el.remove();
        el.$initValue = initDate(2022, 1, 1);
        el.$options.startWith = PickersEnum.Day | 0;
        document.body.appendChild(el);
        await h.wait();
        expect(mapContent()).toMatchSnapshot(); // expected all days beside prev/ntext are disabled

        // checking dayPicker when no excluded for current month
        el.remove();
        el.$options.startWith = PickersEnum.Day | 0;
        el.$options.exclude = [initDate(2021, 0, 1)];
        document.body.appendChild(el);
        await h.wait();
        expect(el.querySelector("[disabled]")).toBeFalsy(); // expected no disabled
      });
    });
  };

  goTest({ utc: true });
  goTest({ utc: false });

  return daysSet;
}
