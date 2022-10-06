/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPCalendarControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import calendarTZtest from "./control.calendar.TZ";

beforeAll(() => {
  jest.useFakeTimers();
  if (new Date().getTimezoneOffset() !== 0) {
    throw new Error(
      `
      Missed timezone 'UTC'.
      new Date().getTimezoneOffset() is ${new Date().getTimezoneOffset()}.
      Expected NodeJS >= v16.2.0 or 17.2.0 & process.env.TZ='UTC'`
      // related issue: https://github.com/nodejs/node/issues/4230#issuecomment-163688700
    );
  }
});

/** @type WUPCalendarControl */
let el;
initTestBaseControl({ type: WUPCalendarControl, htmlTag: "wup-calendar", onInit: (e) => (el = e) });

describe("control.calendar", () => {
  // todo implement basic tests
  // testBaseControl({
  //   // noInputSelection: true,
  //   initValues: [
  //     { attrValue: "2022-02-28", value: new Date("2022-02-28") },
  //     { attrValue: "2022-03-16", value: new Date("2022-02-28") },
  //     { attrValue: "2022-03-18", value: new Date("2022-03-18") },
  //   ],
  //   validations: {},
  //   // attrs: { items: { skip: true } },
  //   // $options: { items: { skip: true } },
  // });
  test("no isChanged on the same date", () => {
    el.$initValue = new Date(2022, 10, 1);
    el.$value = new Date(2022, 10, 1);
    expect(el.$value !== el.$initValue).toBe(true);
    expect(el.$isChanged).toBe(false);
    el.$value = new Date(2022, 10, 2);
    expect(el.$isChanged).toBe(true);
  });

  calendarTZtest();
});
