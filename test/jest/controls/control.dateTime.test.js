/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
import { WUPDateControl, WUPTimeControl, WUPTimeObject } from "web-ui-pack";
import * as h from "../../testHelper";

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("control.dateTime", () => {
  test("date + time", async () => {
    WUPDateControl.$use();
    WUPTimeControl.$use();
    document.body.innerHTML = `
        <wup-form>
          <wup-date w-name="sch"></wup-date>
          <wup-time w-name=""></wup-time>
        </wup-form>`;
    let elDate = document.body.querySelector("wup-date");
    let elTime = document.body.querySelector("wup-time");
    let form = document.body.querySelector("wup-form");

    // form initModel
    form.$initModel = { sch: new Date(Date.UTC(2022, 10, 15, 12, 46)) };
    await h.wait();
    expect(elDate.$initValue).toEqual(new Date(Date.UTC(2022, 10, 15, 12, 46)));
    expect(elTime.$initValue).toEqual(new WUPTimeObject(12, 46));

    // form model
    form.$model = { sch: new Date(Date.UTC(2077, 2, 24, 5, 59)) };
    await h.wait();
    expect(elDate.$value).toEqual(new Date(Date.UTC(2077, 2, 24, 5, 59)));
    expect(elTime.$value).toEqual(new WUPTimeObject(5, 59));

    // date initValue: init changed => update initValue even no value change
    elDate.$initValue = new Date(Date.UTC(2022, 10, 15, 23, 58));
    expect(elTime.$value).toEqual(new WUPTimeObject(5, 59)); // value must be previous here
    expect(elTime.$initValue).toEqual(new WUPTimeObject(23, 58));

    // date value
    elDate.$value = new Date(Date.UTC(2053, 1, 23, 6, 47));
    expect(elDate.$value).toEqual(new Date(Date.UTC(2053, 1, 23, 6, 47)));
    expect(elTime.$value).toEqual(new WUPTimeObject(6, 47));
    await h.wait();

    // time value
    elTime.$value = new WUPTimeObject(21, 34);
    expect(elDate.$value).toEqual(new Date(Date.UTC(2053, 1, 23, 21, 34)));

    // time clear
    elTime.$value = undefined;
    expect(elDate.$value).toEqual(new Date(Date.UTC(2053, 1, 23, 0, 0)));

    // date clear
    elTime.$value = new WUPTimeObject(21, 34);
    elDate.$value = undefined;
    await h.wait();
    expect(elDate.$value).toBe(undefined);
    expect(elTime.$value).toBe(undefined);

    // date input
    elDate.$initValue = undefined;
    await h.userTypeText(elDate.$refInput, "20221030");
    await h.wait();
    expect(elDate.$refInput.value).toBe("2022-10-30"); // because mask is applied
    expect(elDate.$value).toEqual(new Date(Date.UTC(2022, 9, 30, 0, 0)));
    expect(elTime.$value).toBe(undefined);

    // time input
    await h.userTypeText(elTime.$refInput, "0136a");
    await h.wait();
    expect(elTime.$refInput.value).toBe("01:36 AM"); // because mask is applied
    expect(elTime.$value).toEqual(new WUPTimeObject(1, 36));
    expect(elDate.$value).toEqual(new Date(Date.UTC(2022, 9, 30, 1, 36)));

    // time select => skip date because date is empty
    elDate.$value = undefined;
    elTime.$value = new WUPTimeObject(2, 47);
    await h.wait();
    expect(elDate.$value).toBe(undefined);
    expect(elTime.$value).toEqual(new WUPTimeObject(2, 47));
    // date input - copy time part from timeControl
    await h.userTypeText(elDate.$refInput, "20221030");
    await h.wait();
    expect(elTime.$value).toEqual(new WUPTimeObject(2, 47));
    expect(elDate.$value).toEqual(new Date(Date.UTC(2022, 9, 30, 2, 47)));

    // without UTC
    document.body.innerHTML = `
        <wup-form>
          <wup-date w-name="sch" w-utc='false'></wup-date>
          <wup-time w-name=""></wup-time>
        </wup-form>`;
    elDate = document.body.querySelector("wup-date");
    elTime = document.body.querySelector("wup-time");
    form = document.body.querySelector("wup-form");
    form.$initModel = { sch: new Date(2022, 10, 15, 12, 46) };
    await h.wait();
    expect(elDate.$initValue).toEqual(new Date(2022, 10, 15, 12, 46));
    expect(elTime.$initValue).toEqual(new WUPTimeObject(12, 46));

    // date select => skip because expected same logic
    // time select => skip because expected same logic
  });
});
