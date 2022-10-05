/* eslint-disable jest/no-export */
import { WUPCalendarControl } from "web-ui-pack";
import { PickersEnum } from "web-ui-pack/controls/calendar";
import { initTestBaseControl } from "./baseControlTest";
import * as h from "../testHelper";

let el: WUPCalendarControl;
initTestBaseControl({ type: WUPCalendarControl, htmlTag: "wup-calendar", onInit: (e) => (el = e) });

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

  describe("$daysOfMonth", () => {
    daysSet.forEach((ds) => {
      test(`2022..2023 firstOfWeek: ${ds.label}`, () => {
        ds.days.forEach((d, i) => {
          expect(WUPCalendarControl.$daysOfMonth(2022, i, ds.startOfWeek)).toEqual(d);
        });
      });
    });
  });

  describe("day picker", () => {
    daysSet.forEach((ds) => {
      const goTest = async (opt: { utc: boolean }) => {
        const initDate = (y: number, m: number, d: number | string, hh = 0, mm = 0) =>
          opt.utc ? new Date(Date.UTC(y, m, +d, hh, mm)) : new Date(y, m, +d, hh, mm);

        test(`firstOfWeek: ${ds.label}, utc=${opt.utc}`, async () => {
          el.$options.utc = opt.utc;

          const curMonth = 11; // December WARN: it's important to test with December to check DST
          jest.setSystemTime(initDate(2022, curMonth, 16));
          el.remove(); // otherwise option startWith doesn't work
          el.$options.firstDayOfWeek = ds.startOfWeek as any;
          el.$options.startWith = PickersEnum.Day | 0;
          el.$initValue = initDate(2022, curMonth, 5);
          document.body.appendChild(el);
          await h.wait();

          expect(el.$refCalenarItems.children.length).toBe(42);
          expect(el.$refCalenarItems.firstElementChild!.textContent).toBe(`${ds.days[curMonth].prev?.from ?? 1}`);
          expect(el.$refCalenarItems.lastElementChild!.textContent).toBe(`${ds.days[curMonth].nextTo}`);
          expect(el.querySelector("[aria-current]")?.textContent).toBe("16");
          expect(el.querySelector("[aria-selected]")?.textContent).toBe("5");
          expect(el.$refCalenarItems).toMatchSnapshot();

          el.$initValue = initDate(2022, curMonth, 10);
          expect(el.querySelector("[aria-selected]")?.textContent).toBe("10");
          el.$initValue = initDate(2022, curMonth - 2, 5);
          expect(el.querySelector("[aria-selected]")).toBeFalsy();

          // testing click
          const onChange = jest.fn();
          el.addEventListener("$change", onChange);

          let item = el.$refCalenarItems.children.item(15) as HTMLElement;
          await h.userClick(item);
          expect(item.getAttribute("aria-selected")).toBe("true");
          expect(el.querySelectorAll("[aria-selected]").length).toBe(1);
          expect(onChange).toBeCalledTimes(1);
          expect(el.$value).toEqual(initDate(2022, curMonth, item.textContent!));
          expect(el.$isChanged).toBe(true);

          // click again on the same shouldn't change anything
          await h.userClick(item);
          expect(onChange).toBeCalledTimes(1);
          expect(item.getAttribute("aria-selected")).toBe("true");
          expect(el.querySelectorAll("[aria-selected]").length).toBe(1);

          // click on the first
          onChange.mockClear();
          item = el.$refCalenarItems.firstElementChild as HTMLElement;
          await h.userClick(item);
          expect(item.getAttribute("aria-selected")).toBe("true");
          expect(el.querySelectorAll("[aria-selected]").length).toBe(1);
          expect(onChange).toBeCalledTimes(1);
          const selectedM = ds.days[curMonth].prev?.from ? curMonth - 1 : curMonth;
          expect(el.$value).toEqual(initDate(2022, selectedM, item.textContent!));
          expect(el.$isChanged).toBe(true);

          // click on the last
          onChange.mockClear();
          item = el.$refCalenarItems.lastElementChild as HTMLElement;
          await h.userClick(item);
          expect(item.getAttribute("aria-selected")).toBe("true");
          expect(el.querySelectorAll("[aria-selected]").length).toBe(1);
          expect(onChange).toBeCalledTimes(1);
          expect(el.$value).toEqual(initDate(2022, curMonth + 1, item.textContent!));
          expect(el.$isChanged).toBe(true);

          // test when initValue with time
          // for US: DST Nov 6..7, Mar 13..14
          el.$value = initDate(2022, 10, 1, 23, 50); // 2022-Nov-01
          el.remove();
          document.body.appendChild(el);
          await h.wait();
          expect(el.$refCalenarItems.children.length).toBe(42);
          expect(el.querySelector("[aria-selected]")?.textContent).toBe("1");
          item = el.$refCalenarItems.lastElementChild as HTMLElement;
          await h.userClick(item);
          expect(item.getAttribute("aria-selected")).toBe("true");
          expect(el.$value).toEqual(initDate(2022, 11, item.textContent!, 23, 50));

          el.$value = initDate(2022, 4, 2, 23, 50); // 2022-Mar-02
          el.remove();
          document.body.appendChild(el);
          await h.wait();
          expect(el.querySelector("[aria-selected]")?.textContent).toBe("2");
          item = el.$refCalenarItems.lastElementChild as HTMLElement;
          await h.userClick(item);
          expect(item.getAttribute("aria-selected")).toBe("true");
          expect(el.$value).toEqual(initDate(2022, 5, item.textContent!, 23, 50));

          // todo test scroll here
          // todo test keyboard here
        });
      };

      goTest({ utc: true });
      goTest({ utc: false });
    });
  });
}
