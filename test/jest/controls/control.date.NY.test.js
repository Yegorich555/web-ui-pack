/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
import { WUPDateControl } from "web-ui-pack";
import * as h from "../../testHelper";

WUPDateControl.$use();

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
    el.$options.validations = { min: new Date("2022-02-01T00:00:00.000Z") };
    el.$value = new Date("2022-01-31T23:15:00.000Z");
    expect(el.$validate()).toBe("Min value is 2022-02-01");
    el.$value = new Date("2022-02-01T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();

    el.$options.validations = { max: new Date("2023-10-15T00:00:00.000Z") };
    el.$value = new Date("2023-10-16T00:00:00.000Z");
    expect(el.$validate()).toBe("Max value is 2023-10-15");
    el.$value = new Date("2023-10-14T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();
    el.$value = new Date("2023-10-15T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();
    el.$value = new Date("2023-10-15T23:15:00.000Z");
    expect(el.$validate()).toBeFalsy();

    el.$options.validations = { exclude: [new Date("2022-07-12T00:00:00.000Z")] };
    el.$value = new Date("2022-07-12T00:00:00.000Z");
    expect(el.$validate()).toBe("This value is disabled");
    el.$value = new Date("2022-07-12T23:16:00.000Z");
    expect(el.$validate()).toBe("This value is disabled");
    el.$value = new Date("2022-07-11T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();
    el.$value = new Date("2022-07-11T23:15:00.000Z");
    expect(el.$validate()).toBeFalsy();
    el.$value = new Date("2022-07-13T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();

    // without utc
    el.$options.utc = false;
    await h.wait(1);
    el.$options.validations = { min: new Date(2022, 1, 1) };
    el.$value = new Date(2022, 0, 31, 23, 15); // "2022-01-31T23:15:00.000Z");
    expect(el.$validate()).toBe("Min value is 2022-02-01");
    el.$value = new Date(2022, 1, 1); // "2022-02-01T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();

    el.$options.validations = { max: new Date(2023, 9, 15) /* "2023-10-15T00:00:00.000Z") */ };
    el.$value = new Date(2023, 9, 16); // "2023-10-16T00:00:00.000Z");
    expect(el.$validate()).toBe("Max value is 2023-10-15");
    el.$value = new Date(2023, 9, 14); // "2023-10-14T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();
    el.$value = new Date(2023, 9, 15); // "2023-10-15T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();
    el.$value = new Date(2023, 9, 15, 23, 15); // "2023-10-15T23:15:00.000Z");
    expect(el.$validate()).toBeFalsy();

    el.$options.validations = { exclude: [new Date(2022, 6, 12 /* "2022-07-12T00:00:00.000Z" */)] };
    el.$value = new Date(2022, 6, 12); // "2022-07-12T00:00:00.000Z");
    expect(el.$validate()).toBe("This value is disabled");
    el.$value = new Date(2022, 6, 12, 23, 16); // "2022-07-12T23:16:00.000Z");
    expect(el.$validate()).toBe("This value is disabled");
    el.$value = new Date(2022, 6, 11); // "2022-07-11T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();
    el.$value = new Date(2022, 6, 11, 23, 15); // "2022-07-11T23:15:00.000Z");
    expect(el.$validate()).toBeFalsy();
    el.$value = new Date(2022, 6, 13); // "2022-07-13T00:00:00.000Z");
    expect(el.$validate()).toBeFalsy();
  });

  test("storageURL", () => {
    // el.$options.utc = true;
    expect(el.valueToStorage(new Date("1990-02-10T00:00:00.000Z"))).toBe("1990-02-10");
    expect(el.valueFromStorage("1990-02-10")).toEqual(new Date("1990-02-10T00:00:00.000Z"));
    el.$options.utc = false;
    expect(el.valueToStorage(new Date(1990, 1, 10))).toBe("1990-02-10");
    expect(el.valueFromStorage("1990-02-10")).toEqual(new Date(1990, 1, 10));
  });
});
