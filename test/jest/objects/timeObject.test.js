/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPTimeObject } from "web-ui-pack";
import localeInfo from "web-ui-pack/objects/localeInfo";
import * as h from "../../testHelper";

describe("timeObject", () => {
  test("constructor", () => {
    expect(new WUPTimeObject()).toEqual({ hours: 0, minutes: 0 });
    expect(new WUPTimeObject(23, 15)).toEqual({ hours: 23, minutes: 15 });
    expect(new WUPTimeObject(123)).toEqual({ hours: 2, minutes: 3 });
    expect(new WUPTimeObject("12:46")).toEqual({ hours: 12, minutes: 46 });
    expect(new WUPTimeObject("02:09")).toEqual({ hours: 2, minutes: 9 });

    h.mockConsoleWarn();
    expect(() => new WUPTimeObject(24, 0)).toThrow();
    expect(() => new WUPTimeObject(-1, 0)).toThrow();
    expect(() => new WUPTimeObject(0, -1)).toThrow();
    expect(() => new WUPTimeObject(0, 60)).toThrow();
    h.unMockConsoleWarn();

    expect(new WUPTimeObject("12/46")).toEqual({ hours: 12, minutes: 46 });
    expect(new WUPTimeObject("12/46 PM")).toEqual({ hours: 12, minutes: 46 });
    expect(new WUPTimeObject("2-35 AM")).toEqual({ hours: 2, minutes: 35 });
    expect(new WUPTimeObject("12:10 AM")).toEqual({ hours: 0, minutes: 10 });
    expect(new WUPTimeObject("12:10 PM")).toEqual({ hours: 12, minutes: 10 });
    expect(new WUPTimeObject("2:10 PM")).toEqual({ hours: 14, minutes: 10 });
    expect(new WUPTimeObject("2:35:10.105 AM")).toEqual({ hours: 2, minutes: 35 });
    expect(new WUPTimeObject("2:35:10.105 am")).toEqual({ hours: 2, minutes: 35 });
  });

  test("toString()", () => {
    expect(new WUPTimeObject().toString()).toBe("00:00");
    expect(new WUPTimeObject(3, 6).toString()).toBe("03:06");
    expect(new WUPTimeObject(23, 5).toString()).toBe("23:05");
    expect(new WUPTimeObject(5, 23).toString()).toBe("05:23");

    expect(new WUPTimeObject().toJSON()).toBe("0:0");
    expect(new WUPTimeObject(3, 6).toJSON()).toBe("3:6");
    expect(new WUPTimeObject(23, 5).toJSON()).toBe("23:5");
    expect(new WUPTimeObject(5, 23).toJSON()).toBe("5:23");

    expect(new WUPTimeObject(3, 6).format("hh:mm")).toBe("03:06");
    expect(new WUPTimeObject(3, 6).format("h:mm")).toBe("3:06");
    expect(new WUPTimeObject(3, 6).format("hh:m")).toBe("03:6");
    expect(new WUPTimeObject(23, 46).format("h:m")).toBe("23:46");
    expect(new WUPTimeObject(23, 46).format("h:m A")).toBe("11:46 PM");
    expect(new WUPTimeObject(23, 46).format("h:m a")).toBe("11:46 pm");

    expect(localeInfo.time).toBe("hh:mm:ss A");
    expect(new WUPTimeObject().toLocaleString()).toBe("12:00 AM");
    localeInfo.time = "hh:mm:ss";
    expect(new WUPTimeObject().toLocaleString()).toBe("00:00");
  });

  test("valueOf", () => {
    expect(new WUPTimeObject(10, 46) > new WUPTimeObject(10, 45)).toBe(true);
    expect(new WUPTimeObject(10, 46) < new WUPTimeObject(10, 47)).toBe(true);
  });

  test("copyToDate", () => {
    const dt = new Date(2022, 0, 23, 0, 0, 59, 999);
    const time = new WUPTimeObject(15, 46);
    time.copyToDate(dt);
    expect(dt.toISOString()).toBe("2022-01-23T15:46:00.000Z");

    time.hours = 7;
    time.minutes = 48;
    time.copyToDate(dt, true);
    expect(dt.toISOString()).toBe("2022-01-23T07:48:00.000Z");
  });
});
