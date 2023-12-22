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
          <wup-date w-name="sch" w-sync="next"></wup-date>
          <wup-time></wup-time>
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

    // with initValue
    document.body.innerHTML = `<wup-date w-name="sch" w-sync="next" w-initvalue="2022-11-15 12:46"></wup-date>`;
    elDate = document.querySelector("wup-date");
    elDate.$initValue = new Date(Date.UTC(2022, 10, 15, 12, 46));
    document.body.appendChild(document.createElement("wup-time"));
    elTime = document.querySelector("wup-time");
    await h.wait();
    expect(elDate.$initValue).toEqual(new Date(Date.UTC(2022, 10, 15, 12, 46)));
    expect(elTime.$initValue).toEqual(new WUPTimeObject(12, 46));

    // without UTC
    document.body.innerHTML = `
        <wup-form>
          <wup-date w-name="sch" w-utc='false' w-sync="next"></wup-date>
          <wup-time></wup-time>
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

    // validations min/max/exclude
    document.body.innerHTML = `
        <wup-form>
          <wup-date w-name="sch" w-sync="next"></wup-date>
          <wup-time></wup-time>
        </wup-form>`;
    elDate = document.body.querySelector("wup-date");
    elTime = document.body.querySelector("wup-time");
    form = document.body.querySelector("wup-form");

    elDate.$options.min = new Date(Date.UTC(2022, 9, 15, 2, 36));
    elDate.$options.max = new Date(Date.UTC(2022, 9, 18, 17, 39));
    await h.wait();
    expect(elTime.$options.min).toBeFalsy();
    expect(elTime.$options.max).toBeFalsy();
    await h.userTypeText(elDate.$refInput, "20221014");
    expect(elDate.$value).toEqual(new Date(Date.UTC(2022, 9, 14, 0, 0)));
    expect(elTime.$value).toBe(undefined);
    expect(elTime.$options.min).toBeFalsy();
    expect(elTime.$options.max).toBeFalsy();
    await h.userTypeText(elDate.$refInput, "20221015");
    expect(elDate.$value).toEqual(new Date(Date.UTC(2022, 9, 15, 0, 0)));
    expect(elTime.$value).toBe(undefined);
    expect(elTime.$options.max).toBeFalsy();
    expect(elTime.$options.min).toEqual(new WUPTimeObject(2, 36));
    await h.userTypeText(elDate.$refInput, "20221016");
    expect(elDate.$value).toEqual(new Date(Date.UTC(2022, 9, 16, 0, 0)));
    expect(elTime.$options.min).toBeFalsy();
    // again with value change
    elDate.$value = new Date(Date.UTC(2022, 9, 18, 0, 0));
    await h.wait();
    expect(elTime.$options.min).toBeFalsy();
    expect(elTime.$options.max).toEqual(new WUPTimeObject(17, 39));

    // when time previously selected need to trigger validation
    document.body.innerHTML = `
        <wup-form>
          <wup-date w-sync="next" w-name="sch" w-min='2016-01-02 12:40'></wup-date>
          <wup-time></wup-time>
        </wup-form>`;
    elDate = document.body.querySelector("wup-date");
    elTime = document.body.querySelector("wup-time");
    form = document.body.querySelector("wup-form");
    elTime.$value = new WUPTimeObject(11, 34);
    expect(elDate.$options.min).toBeTruthy();
    await h.userTypeText(elDate.$refInput, "20160102");
    expect(elDate.$refError).toBeFalsy();
    expect(elTime.$refError).toBeTruthy();
    // again when time value is empty
    document.body.innerHTML = `
        <wup-form>
          <wup-date w-sync="next" w-name="sch" w-min='2016-01-02 12:40'></wup-date>
          <wup-time></wup-time>
        </wup-form>`;
    elDate = document.body.querySelector("wup-date");
    elTime = document.body.querySelector("wup-time");
    form = document.body.querySelector("wup-form");
    // elTime.$value = new WUPTimeObject(11, 34);
    expect(elDate.$options.min).toBeTruthy();
    await h.userTypeText(elDate.$refInput, "20160102");
    expect(elDate.$refError).toBeFalsy();
    expect(elTime.$refError).toBeFalsy(); // because value is empty

    // when validations instead of direct options
    document.body.innerHTML = `
          <wup-date w-sync="next"></wup-date>
          <wup-time></wup-time>`;
    elDate = document.body.querySelector("wup-date");
    elTime = document.body.querySelector("wup-time");
    elDate.$options.validations = { max: new Date(Date.UTC(2022, 10, 15, 12, 46)) };
    elDate.$value = new Date(Date.UTC(2022, 10, 15));
    expect(elTime.$options.max).toEqual(new WUPTimeObject(12, 46));
    // time validations must be changed by date
    elTime.$options.validations = { max: new WUPTimeObject(20, 14) };
    elDate.$value = undefined;
    elDate.$value = new Date(Date.UTC(2022, 10, 15));
    expect(elTime.$options.validations.max).not.toEqual(new WUPTimeObject(20, 14));

    // when validation is function
    elDate.$options.validations = { max: () => false };
    elDate.$value = new Date(Date.UTC(1985, 10, 15));
    expect(() => jest.advanceTimersByTime()).toThrow(); // because vld is function and impossible to assign to timeControl
    // todo validations exclude
  });
});
