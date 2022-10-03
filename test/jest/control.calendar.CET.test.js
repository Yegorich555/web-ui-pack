/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "CET"}
 */
import calendarTZtest from "./control.calendar.TZ";

/** Test calendar with timezone Central European Time */
describe(`control.calendar >> timezone: ${window.TZ}, offset: ${new Date().getTimezoneOffset()}`, () => {
  calendarTZtest();
});
