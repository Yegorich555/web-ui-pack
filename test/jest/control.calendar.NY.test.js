/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
import calendarTZtest from "./control.calendar.TZ";

/** Test calendar with timezone America/New_York */
describe(`control.calendar >> timezone: ${window.TZ}, offset: ${new Date().getTimezoneOffset()}`, () => {
  calendarTZtest();
});
