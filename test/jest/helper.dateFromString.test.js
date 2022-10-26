/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
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
    test(`${k}`, () => {
      tsts.forEach((t) => {
        expect(dateFromString(t.txt, `${k}`)).toStrictEqual(t.v);
      });
    });
  });

  test("invalid date", () => {
    expect(dateFromString(null)).toBe(null);
    expect(dateFromString("", "YYYY-MM-DD")).toBe(null);
    expect(dateFromString("202A-BB-DD", "YYYY-MM-DD")).toBe(null);
  });
});
