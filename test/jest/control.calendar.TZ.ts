/* eslint-disable jest/no-export */
import { WUPCalendarControl } from "web-ui-pack";

/** Test function for different timezones */
export default function calendarTZtest() {
  // describe(`timezone: ${(window as any).TZ as string}, offset: ${new Date().getTimezoneOffset()}`, () => {
  describe("$daysOfMonth", () => {
    const days2022 = [
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
    ];
    test("2022..2023 fisrtOfWeek: monday", () => {
      for (let i = 0; i < 12; ++i) {
        expect(WUPCalendarControl.$daysOfMonth(2022, i, 1)).toEqual(days2022[i]);
      }
    });
  });
  // });
}
