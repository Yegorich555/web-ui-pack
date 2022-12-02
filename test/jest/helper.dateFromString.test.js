/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
// import dateFromString from "../../src/helpers/dateFromString";
import dateFromString from "web-ui-pack/helpers/dateFromString";

describe("helper.dateToString", () => {
  const obj = {
    "YYYY-MM-DD": [
      { v: new Date("2022-01-02 00:00"), txt: "2022-01-02" },
      { v: new Date("2022-07-02 00:00"), txt: "2022-07-02" },
      { v: new Date("2022-11-24 00:00"), txt: "2022-11-24" },
    ],
    "yyyy-MM-dd": [
      { v: new Date("2022-01-02 00:00"), txt: "2022-01-02" },
      { v: new Date("2022-07-02 00:00"), txt: "2022-07-02" },
      { v: new Date("2022-11-24 00:00"), txt: "2022-11-24" },
    ],
    "MM-DD-YYYY": [
      { v: new Date("2022-01-02 00:00"), txt: "01-02-2022" },
      { v: new Date("2022-07-02 00:00"), txt: "07-02-2022" },
      { v: new Date("2022-11-24 00:00"), txt: "11-24-2022" },
    ],
    "YYYY-M-D": [
      { v: new Date("2022-01-02 00:00"), txt: "2022-1-2" },
      { v: new Date("2022-07-02 00:00"), txt: "2022-7-2" },
      { v: new Date("2022-11-24 00:00"), txt: "2022-11-24" },
    ],
    "DD/MM YYYY": [
      { v: new Date("2022-01-02 00:00"), txt: "02/01 2022" },
      { v: new Date("2022-07-02 00:00"), txt: "02/07 2022" },
      { v: new Date("2022-11-24 00:00"), txt: "24/11 2022" },
    ],
    "D/M YYYY": [
      { v: new Date("2022-01-02 00:00"), txt: "2/1 2022" },
      { v: new Date("2022-07-02 00:00"), txt: "2/7 2022" },
      { v: new Date("2022-11-24 00:00"), txt: "24/11 2022" },
    ],
    "D/M YYYYZ": [
      { v: new Date("2022-01-02"), txt: "2/1 2022" },
      { v: new Date("2022-07-02"), txt: "2/7 2022" },
      { v: new Date("2022-11-24"), txt: "24/11 2022" },
    ],
    "YYYY-MM-DD hh:mm:ss": [
      { v: new Date("2022-01-02 11:23:45"), txt: "2022-01-02 11:23:45" },
      { v: new Date("2022-11-29 01:02:03"), txt: "2022-11-29 01:02:03" },
    ],
    "YYYY-MM-DD hh:mm:ss.fff": [
      { v: new Date("2022-01-02 11:23:45.567"), txt: "2022-01-02 11:23:45.567" },
      { v: new Date("2022-11-29 01:02:03.321"), txt: "2022-11-29 01:02:03.321" },
    ],
    "YYYY-MM-DD hh:mm:ss.fff a": [
      { v: new Date("2022-01-02 16:23:45.567"), txt: "2022-01-02 04:23:45.567 pm" },
      { v: new Date("2022-11-29 01:02:03.679"), txt: "2022-11-29 01:02:03.679 am" },
      { v: new Date("2022-11-29 00:00:00.000"), txt: "2022-11-29 12:00:00.000 am" },
    ],
    "YYYY-MM-DD hh:mm:ss.fffa": [
      { v: new Date("2022-01-02 16:23:45.567"), txt: "2022-01-02 04:23:45.567pm" },
      { v: new Date("2022-11-29 01:02:03.679"), txt: "2022-11-29 01:02:03.679am" },
    ],
    "YYYY-MM-DD HH:mm:SS.FFF aZ": [
      { v: new Date("2022-01-02 16:23:45.567Z"), txt: "2022-01-02 04:23:45.567 pm" },
      { v: new Date("2022-11-29 01:02:03.567Z"), txt: "2022-11-29 01:02:03.567 am" },
    ],
    "yyyy-MM-ddThh:mm:ss.fffZ": [
      { v: new Date("2022-01-02T16:23:45.567Z"), txt: "2022-01-02T16:23:45.567Z" },
      { v: new Date("2022-11-29T01:02:03.567Z"), txt: "2022-11-29T01:02:03.567Z" },
    ],
  };

  Object.keys(obj).forEach((k) => {
    const tsts = obj[k];
    test(`${k} (strict:true)`, () => {
      tsts.forEach((t) => {
        expect(dateFromString(t.txt, `${k}`, { strict: true })).toStrictEqual(t.v);
      });
    });
    test(`${k} (strict:false)`, () => {
      tsts.forEach((t) => {
        expect(dateFromString(t.txt, `${k}`, { strict: false })).toStrictEqual(t.v);
      });
    });
  });

  test("invalid date", () => {
    expect(dateFromString(null)).toBe(null);
    expect(dateFromString("", "YYYY-MM-DD")).toBe(null);
    expect(dateFromString("202A-BB-DD", "YYYY-MM-DD")).toBe(null);

    expect(dateFromString("22", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022-3", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022-03-0", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022-03-5", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022-03-512:36", "yyyy-MM-dd hh:mm")).toBe(null);
    expect(dateFromString("20-03-05", "yyyy-MM-dd")).toBe(null);
    expect(() => dateFromString("2022-03-50", "yyyy-MM-dd")).toThrow();
    expect(() => dateFromString("2022-30-50", "yyyy-MM-dd")).toThrow();
    expect(dateFromString("2022-30-50", "yyyy-MM-dd", { throwOutOfRange: false })).toBe(null);
    expect(dateFromString("2022-03-103", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022-11-29 01:02:03.679", "YYYY-MM-DD hh:mm:ss.fff a", { strict: false })).toBe(null); // with out am/pm it's wrong
  });

  test("option [strict]", () => {
    expect(dateFromString("2022", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022", "yyyy-MM-dd", { strict: false })).toStrictEqual(new Date("2022-01-01 00:00"));

    expect(dateFromString("2022-03", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022-03", "yyyy-MM-dd", { strict: false })).toStrictEqual(new Date("2022-03-01 00:00"));

    expect(dateFromString("2022-03-103", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022-03-103", "yyyy-MM-dd", { strict: false })).toStrictEqual(new Date("2022-03-10 00:00"));

    expect(dateFromString("2022-03-10 23:40", "yyyy-MM-dd")).toBe(null);
    expect(dateFromString("2022-03-10 23:40", "yyyy-MM-dd", { strict: false })).toStrictEqual(
      new Date("2022-03-10 00:00")
    );

    expect(dateFromString("2022-03-10", "yyyy-MM-dd hh:mm:ss.fff")).toBe(null);
    expect(dateFromString("2022-03-10", "yyyy-MM-dd hh:mm:ss.fff", { strict: false })).toStrictEqual(
      new Date("2022-03-10 00:00")
    );

    expect(dateFromString("2022-03-10 23:40", "yyyy-MM-dd hh:mm:ss.fff")).toBe(null);
    expect(dateFromString("2022-03-10 23:40", "yyyy-MM-dd hh:mm:ss.fff", { strict: false })).toStrictEqual(
      new Date("2022-03-10 23:40")
    );

    expect(dateFromString("2022-03-10 23:40", "yyyy-MM-dd hh:mm:ss.fffZ", { strict: false })).toStrictEqual(
      new Date(Date.UTC(2022, 3 - 1, 10, 23, 40))
    );
  });

  test("isOutOfRange", () => {
    const getOutOfRange = (v = "2022", format = "yyyy") =>
      dateFromString(v, format, { strict: true, throwOutOfRange: false }) == null;

    expect(getOutOfRange("2022-12-20", "yyyy-MM-dd")).toBe(false);
    expect(getOutOfRange("2022-00-20", "yyyy-MM-dd")).toBe(true);
    expect(getOutOfRange("2022-05-00", "yyyy-MM-dd")).toBe(true);
    expect(getOutOfRange("2022-12-50", "yyyy-MM-dd")).toBe(true);
    expect(getOutOfRange("2022-13-20", "yyyy-MM-dd")).toBe(true);
    expect(getOutOfRange("2022-11-31", "yyyy-MM-dd")).toBe(true); // 31 Nov 2022 doesn't exist
    expect(getOutOfRange("2022-11-30 23:59:59.999", "yyyy-MM-dd hh:mm:ss.fff")).toBe(false);
    expect(getOutOfRange("2022-11-30 24:59:59.999", "yyyy-MM-dd hh:mm:ss.fff")).toBe(true);
    expect(getOutOfRange("2022-11-30 23:60:59.999", "yyyy-MM-dd hh:mm:ss.fff")).toBe(true);
    expect(getOutOfRange("2022-11-30 23:59:60.999", "yyyy-MM-dd hh:mm:ss.fff")).toBe(true);
    expect(getOutOfRange("2022-11-30 23:59:59.000", "yyyy-MM-dd hh:mm:ss.fff")).toBe(false);

    // NiceToHave:
    // expect(getOutOfRange("20", "yyyy-MM-dd")).toBe(false);
    // expect(getOutOfRange("2022", "yyyy-MM-dd")).toBe(false);
    // expect(getOutOfRange("2022-0", "yyyy-MM-dd")).toBe(false);
    // expect(getOutOfRange("2022-09", "yyyy-MM-dd")).toBe(false);
    // expect(getOutOfRange("2022-2", "yyyy-MM-dd")).toBe(false);
  });
});
