/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
// import dateToString from "../../src/helpers/dateToString";
import dateToString from "web-ui-pack/helpers/dateToString";

describe("helper.dateToString", () => {
  const obj = {
    "YYYY-MM-DD": [
      { v: "2022-01-02 11:23:45", txt: "2022-01-02" },
      { v: "2022-07-02 11:23:45", txt: "2022-07-02" },
      { v: "2022-11-24 11:23:45", txt: "2022-11-24" },
    ],
    "yyyy-MM-dd": [
      { v: "2022-01-02 11:23:45", txt: "2022-01-02" },
      { v: "2022-07-02 11:23:45", txt: "2022-07-02" },
      { v: "2022-11-24 11:23:45", txt: "2022-11-24" },
    ],
    "MM-DD-YYYY": [
      { v: "2022-01-02 11:23:45", txt: "01-02-2022" },
      { v: "2022-07-02 11:23:45", txt: "07-02-2022" },
      { v: "2022-11-24 11:23:45", txt: "11-24-2022" },
    ],
    "YYYY-M-D": [
      { v: "2022-01-02 11:23:45", txt: "2022-1-2" },
      { v: "2022-11-02 11:23:45", txt: "2022-11-2" },
      { v: "2022-04-24 11:23:45", txt: "2022-4-24" },
    ],
    "DD/MM YYYY": [
      { v: "2022-01-02 11:23:45", txt: "02/01 2022" },
      { v: "2022-07-02 11:23:45", txt: "02/07 2022" },
      { v: "2022-11-24 11:23:45", txt: "24/11 2022" },
    ],
    "D/M YYYY": [
      { v: "2022-01-02 11:23:45", txt: "2/1 2022" },
      { v: "2022-07-02 11:23:45", txt: "2/7 2022" },
      { v: "2022-11-24 11:23:45", txt: "24/11 2022" },
    ],
    "D/M YYYYZ": [
      { v: "2022-01-02T00:00:00.000Z", txt: "2/1 2022" },
      { v: "2022-07-02T00:00:00.000Z", txt: "2/7 2022" },
      { v: "2022-11-24T00:00:00.000Z", txt: "24/11 2022" },
    ],
    "D/M YYYY Z": [
      { v: "2022-01-02T00:00:00.000Z", txt: "2/1 2022 " },
      { v: "2022-07-02T00:00:00.000Z", txt: "2/7 2022 " },
      { v: "2022-11-24T00:00:00.000Z", txt: "24/11 2022 " },
    ],
    D: [
      { v: "2022-01-02 00:00", txt: "2" },
      { v: "2022-07-23 00:00", txt: "23" },
    ],
    DD: [
      { v: "2022-01-02 00:00", txt: "02" },
      { v: "2022-07-23 00:00", txt: "23" },
    ],
    M: [
      { v: "2022-01-02 00:00", txt: "1" },
      { v: "2022-11-23 00:00", txt: "11" },
    ],
    MM: [
      { v: "2022-01-02 00:00", txt: "01" },
      { v: "2022-11-23 00:00", txt: "11" },
    ],
    "hh:mm:ss": [
      { v: "2022-01-02 16:23:45", txt: "16:23:45" },
      { v: "2022-07-02 00:00:00", txt: "00:00:00" },
    ],
    "hh:mm:ssZ": [
      { v: "2022-01-02T16:23:45.000Z", txt: "16:23:45" },
      { v: "2022-07-02T00:00:00.000Z", txt: "00:00:00" },
    ],
    "hh..mm": [
      { v: "2022-01-02 16:23:45", txt: "16..23" },
      { v: "2022-07-02 00:00:00", txt: "00..00" },
    ],
    "mm:ss": [
      { v: "2022-01-02 16:23:45", txt: "23:45" },
      { v: "2022-07-02 00:01:00", txt: "01:00" },
    ],
    "h:m:s": [
      { v: "2022-01-02 01:23:45", txt: "1:23:45" },
      { v: "2022-01-02 16:05:46", txt: "16:5:46" },
      { v: "2022-01-02 16:15:06", txt: "16:15:6" },
      { v: "2022-07-02 00:00:00", txt: "0:0:0" },
    ],
    h: [
      { v: "2022-01-02 01:23:45", txt: "1" },
      { v: "2022-01-02 16:05:46", txt: "16" },
    ],
    hh: [
      { v: "2022-01-02 01:23:45", txt: "01" },
      { v: "2022-01-02 16:05:46", txt: "16" },
    ],
    m: [
      { v: "2022-01-02 01:23:45", txt: "23" },
      { v: "2022-01-02 16:05:46", txt: "5" },
    ],
    mm: [
      { v: "2022-01-02 01:23:45", txt: "23" },
      { v: "2022-01-02 16:05:46", txt: "05" },
    ],
    "hh:mm a": [
      { v: "2022-01-02 01:23:45", txt: "01:23 am" },
      { v: "2022-01-02 16:05:46", txt: "04:05 pm" },
      { v: "2022-01-02 00:02:00", txt: "12:02 am" },
    ],
    "hh:mm A": [
      { v: "2022-01-02 01:23:45", txt: "01:23 AM" },
      { v: "2022-01-02 16:05:46", txt: "04:05 PM" },
    ],
    "h:mA": [
      { v: "2022-01-02 01:23:45", txt: "1:23AM" },
      { v: "2022-01-02 16:05:46", txt: "4:5PM" },
    ],
    "mm:ss.fff": [
      { v: "2022-01-02 09:23:45.005", txt: "23:45.005" },
      { v: "2022-01-02 09:23:45.912", txt: "23:45.912" },
    ],
    "mm:ss.f": [
      { v: "2022-01-02 09:23:45.005", txt: "23:45.5" },
      { v: "2022-01-02 09:23:45.912", txt: "23:45.912" },
    ],
    "YYYY-MM-DD hh:mm:ss": [
      { v: "2022-01-02 11:23:45", txt: "2022-01-02 11:23:45" },
      { v: "2022-11-29 01:02:03", txt: "2022-11-29 01:02:03" },
    ],
    "YYYY-MM-DD hh:mm:ss.fff": [
      { v: "2022-01-02 11:23:45.567", txt: "2022-01-02 11:23:45.567" },
      { v: "2022-11-29 01:02:03.567", txt: "2022-11-29 01:02:03.567" },
    ],
    "YYYY-MM-DD hh:mm:ss.fff a": [
      { v: "2022-01-02 16:23:45.567", txt: "2022-01-02 04:23:45.567 pm" },
      { v: "2022-11-29 01:02:03.567", txt: "2022-11-29 01:02:03.567 am" },
    ],
    "YYYY-MM-DD hh:mm:ss.fff aZ": [
      { v: "2022-01-02T16:23:45.567Z", txt: "2022-01-02 04:23:45.567 pm" },
      { v: "2022-11-29T01:02:03.567Z", txt: "2022-11-29 01:02:03.567 am" },
    ],
    "YY-MM-DD": [
      { v: "2022-01-02 16:23:45.567", txt: "22-01-02" },
      { v: "2023-11-29 01:02:03.567", txt: "23-11-29" },
    ],
    "MMM d, hh:mm A": [
      { v: "2022-04-23 16:09:12", txt: "Apr 23, 04:09 PM" }, //
    ],
  };

  Object.keys(obj).forEach((k) => {
    const tsts = obj[k];
    test(`${k}`, () => {
      tsts.forEach((t) => {
        expect(dateToString(new Date(t.v), `${k}`)).toBe(t.txt);
      });
    });
  });

  test("Date is NaN", () => {
    expect(dateToString(new Date("sss"), "YYYY-MM-DD hh:mm:ss.fff a")).toBe("NaN");
  });
});
