/* eslint-disable jest/no-export */
import { WUPCalendarControl } from "web-ui-pack";

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

    // todo add other week-tests
  });
}
