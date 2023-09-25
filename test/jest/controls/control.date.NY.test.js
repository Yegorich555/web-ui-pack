/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
import { WUPDateControl } from "web-ui-pack";
import * as h from "../../testHelper";

!WUPDateControl && console.error("missed");

/** @type WUPDateControl */
let el;
beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
  el = document.body.appendChild(document.createElement("wup-date"));
  jest.advanceTimersByTime(1);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("control.date.NY", () => {
  test("validations min & max", async () => {
    // el.$options.utc = true;
    el.$options.validations = { min: new Date("2022-01-01T00:00:00.000Z"), max: new Date("2023-10-15T00:00:00.000Z") };
    el.$value = new Date("1990-05-06");
    false && (await h.wait(1));
    expect(el.$validate()).toBe("Min value is 2022-01-01");

    el.$value = new Date("2100-02-03");
    expect(el.$validate()).toBe("Max value is 2023-10-15");

    el.$options.utc = false;
    await h.wait();
    el.$options.validations = { min: new Date(2022, 0, 10), max: new Date(2023, 9, 23) };
    el.$value = new Date("1990-05-06");
    expect(el.$validate()).toBe("Min value is 2022-01-10");
    el.$value = new Date("2100-02-03");
    expect(el.$validate()).toBe("Max value is 2023-10-23");
  });

  test("storageURL", () => {
    // el.$options.utc = true;
    expect(el.valueToUrl(new Date("1990-02-10T00:00:00.000Z"))).toBe("1990-02-10");
    expect(el.valueFromUrl("1990-02-10")).toEqual(new Date("1990-02-10T00:00:00.000Z"));
    el.$options.utc = false;
    expect(el.valueToUrl(new Date(1990, 1, 10))).toBe("1990-02-10");
    expect(el.valueFromUrl("1990-02-10")).toEqual(new Date(1990, 1, 10));
  });
});
