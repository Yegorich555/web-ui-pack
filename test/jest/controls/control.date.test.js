/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPDateControl } from "web-ui-pack";
import { PickersEnum } from "web-ui-pack/controls/calendar";
import { MenuOpenCases } from "web-ui-pack/controls/baseCombo";
// import { localeInfo } from "web-ui-pack/indexHelpers";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

beforeAll(() => {
  // localeInfo.refresh("en-US"); // setup "en-US" locale
  // localeInfo.date = "yyyy-MM-dd"; // set defaults
  // localeInfo.time = "hh:mm:ss.fff a";
  // localeInfo.dateTime = `${localeInfo.date} ${localeInfo.time}`;
  if (new Date().getTimezoneOffset() !== 0) {
    throw new Error(
      `\nMissed timezone 'UTC'.
      new Date().getTimezoneOffset() is ${new Date().getTimezoneOffset()}.
      Expected NodeJS >= v16.2.0 or 17.2.0 & process.env.TZ='UTC'`
      // related issue: https://github.com/nodejs/node/issues/4230#issuecomment-163688700
    );
  }
});

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
});

/** @type WUPDateControl */
let el;
initTestBaseControl({
  type: WUPDateControl,
  htmlTag: "wup-date",
  onInit: (e) => {
    jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
    el = e;
    el.$options.openCase |= MenuOpenCases.onFocusAuto; // without this impossible to test with manual triggering focus()

    const height = 50;
    const width = 100;
    const x = 140;
    const y = 100;
    jest.spyOn(el, "getBoundingClientRect").mockReturnValue({
      x,
      left: x,
      y,
      top: y,
      bottom: y + height,
      right: x + width,
      height,
      width,
      toJSON: () => "",
    });
  },
});

describe("control.date", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "2022-02-28", value: new Date("2022-02-28"), urlValue: "2022-02-28" },
      { attrValue: "2022-03-16", value: new Date("2022-03-16"), urlValue: "2022-03-16" },
      { attrValue: "2022-05-20", value: new Date("2022-05-20"), urlValue: "2022-05-20" },
    ],
    validations: {
      min: { set: new Date("2022-05-20"), failValue: new Date("2022-04-01"), trueValue: new Date("2022-06-01") },
      max: { set: new Date("2022-10-28"), failValue: new Date("2022-10-29"), trueValue: new Date("2022-09-20") },
      exclude: { set: [new Date("2022-07-15")], failValue: new Date("2022-07-15"), trueValue: new Date("2022-07-16") },
    },
    attrs: {
      "w-prefix": { value: "$" },
      "w-postfix": { value: "USD" },
      "w-clearbutton": { value: true },
      "w-debouncems": { value: 5 },
      "w-selectonfocus": { value: true },
      "w-readonlyinput": { value: true },
      "w-popupoffsetfitelement": { value: [2, 3] },
      "w-popupminwidthbytarget": { value: true },
      "w-opencase": { value: 1 },
      "w-menuescrollback": { value: true },

      "w-mask": { value: "#0-#0-0000", nullValue: "0000-00-00" },
      "w-maskholder": { value: "dd-mm-yyyy", nullValue: "YYYY-MM-DD" },
      "w-format": { value: "dd-mm-yyyy", nullValue: "yyyy-mm-dd" },

      "w-utc": { value: true },
      "w-min": { value: "2022-05-20", parsedValue: new Date("2022-05-20") },
      "w-max": { value: "2022-05-21", parsedValue: new Date("2022-05-21") },
      "w-exclude": { value: [new Date("2009-02-06")] },
      "w-startwith": { skip: true }, // tested manually
      "w-endwith": { skip: true }, // tested manually
      "w-firstweekday": { value: 1 },
      "w-sync": { skip: true }, // tested manually
      "w-multiple": { value: true },
    },
    validationsSkip: ["_parse", "_mask"],
  });

  describe("extra options", () => {
    test("format", async () => {
      await h.wait(1);
      expect(el.$options.format).toBe("yyyy-mm-dd");
      expect(el.$options.mask).toBe("0000-00-00");
      expect(el.$options.maskholder).toBe("yyyy-mm-dd");

      el.$options.format = "YYYY-MM-DD";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("0000-00-00");
      expect(el.$options.maskholder).toBe("YYYY-MM-DD");

      el.$options.format = "M/D/YYYY";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("#0/#0/0000");
      expect(el.$options.maskholder).toBe("MM/DD/YYYY");

      // user can override defaults
      el.$options.mask = "00-00-0000";
      await h.wait(1);
      expect(el.$options.mask).toBe("00-00-0000");
      expect(el.$options.maskholder).toBe("MM/DD/YYYY");

      el.$options.maskholder = "mm/dd/yyyy";
      await h.wait(1);
      expect(el.$options.maskholder).toBe("mm/dd/yyyy");

      const onErr = jest.spyOn(el, "throwError").mockImplementationOnce(() => {});
      el.$options.format = "MMM-DD/YYYY";
      await h.wait(1);
      expect(el.$options.format).toBe("YYYY-MM-DD"); // it rollbacks to default because was not supported format
      expect(onErr).toBeCalledTimes(1);
      expect(onErr.mock.lastCall[0]).toMatchInlineSnapshot(`"'MMM' in format isn't supported"`);
    });

    test("attr [startWith]", async () => {
      const set = async (s) => {
        el.remove();
        el.setAttribute("w-startwith", s);
        document.body.appendChild(el);
        await h.wait(1);
        HTMLInputElement.prototype.focus.call(el.$refInput);
        await h.wait();
      };

      await set("day");
      expect(el.$options.startWith).toBe(PickersEnum.Day);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Day);

      await set("month");
      expect(el.$options.startWith).toBe(PickersEnum.Month);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Month);

      await set("year");
      expect(el.$options.startWith).toBe(PickersEnum.Year);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Year);

      await set("");
      expect(el.$options.startWith).toBeFalsy();

      el.$options.startWith = PickersEnum.Month;
      el.blur();
      await h.wait(1);
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$options.startWith).toBe(PickersEnum.Month);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Month);
    });

    test("min/max/exclude affects on validations", async () => {
      // el.$options.utc = true
      expect(el.validations).toBeTruthy(); // for coverage when el.$options.validations = undefined;

      el.$options.min = new Date("2022-02-01T00:00:00.000Z");
      expect(el.validations.min.valueOf()).toBe(new Date("2022-02-01T00:00:00.000Z").valueOf());
      el.$value = new Date("2022-01-31T23:15:00.000Z");
      expect(el.$validate()).toBe("Min value is 2022-02-01");
      el.$value = new Date("2022-02-01T00:00:00.000Z");
      expect(el.$validate()).toBeFalsy();

      el.$options.max = new Date("2023-10-15T00:00:00.000Z");
      expect(el.validations.max.valueOf()).toBe(new Date("2023-10-15T00:00:00.000Z").valueOf());
      el.$value = new Date("2023-10-16T00:00:00.000Z");
      expect(el.$validate()).toBe("Max value is 2023-10-15");
      el.$value = new Date("2023-10-14T00:00:00.000Z");
      expect(el.$validate()).toBeFalsy();
      el.$value = new Date("2023-10-15T00:00:00.000Z");
      expect(el.$validate()).toBeFalsy();
      el.$value = new Date("2023-10-15T23:15:00.000Z");
      expect(el.$validate()).toBeFalsy();

      el.$options.exclude = [new Date("2022-07-12T00:00:00.000Z")];
      expect(el.validations.exclude).toEqual([new Date("2022-07-12T00:00:00.000Z")]);
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

      await h.wait(1);
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      const clnd = el.$refPopup.firstChild;
      expect(clnd.$options.min).toBe(el.$options.min);
      expect(clnd.$options.max).toBe(el.$options.max);
      expect(clnd.$options.exclude).toBe(el.$options.exclude);
    });

    test("utc", async () => {
      expect(el.$options.utc).toBe(true);
      el.setAttribute("w-min", "2022-10-15");
      el.$options.utc = false;
      await h.wait(1);
      expect(el.$options.min.valueOf()).toBe(new Date("2022-10-15T00:00").valueOf()); // parse must be in local time

      el.$value = new Date("2022-10-15T12:40:59.000Z"); // utc
      expect(el.$refInput.value).toBe("2022-10-15"); // just for coverage

      const prev = el.$options.min;
      el.setAttribute("w-min", "abc");
      expect(() => jest.advanceTimersByTime(1)).toThrow();
      await h.wait(1);
      expect(el.$options.min).toBe(prev);

      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$refPopup.firstChild.$options.utc).toBe(false);
      el.blur();
      await h.wait();

      el.$options.utc = true;
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$refPopup.firstChild.$options.utc).toBe(true);
    });

    test("endWith based on format", async () => {
      const reopen = async () => {
        el.blur();
        await h.wait();
        HTMLInputElement.prototype.focus.call(el.$refInput);
        await h.wait();
        return el.$refPopup.firstChild;
      };

      el.$options.format = "yyyy-mm";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      el.$initValue = new Date("2022-05-20T23:50:00.000Z");
      await h.wait(1);
      expect(el.$options.mask).toBe("0000-00");
      expect(el.$options.maskholder).toBe("yyyy-mm");
      expect(el.$refInput.value).toBe("2022-05");

      let clnd = await reopen();
      expect(clnd.$options.endWith).toBe(PickersEnum.Month);
      expect(el.querySelector("[calendar='month']")).toBeTruthy();
      expect(el.querySelector("[aria-selected]")?.textContent).toBe("May");
      await h.userClick(clnd.$refCalendarItems.children[6]); // Jul
      await h.wait();
      expect(el.$isOpened).toBe(false);
      expect(el.$value?.toISOString()).toBe("2022-07-01T23:50:00.000Z"); // 1st day of month with saved hours
      expect(el.$refInput.value).toBe("2022-07");

      // user types value
      expect(await h.userTypeText(el.$refInput, "202208")).toBe("2022-08|");
      await h.wait(150);
      expect(el.$value?.toISOString()).toBe("2022-08-01T23:50:00.000Z");
      expect(el.$isValid).toBe(true);

      // min/max/exclude are compared by month
      el.$options.min = new Date("2022-05-20");
      el.$options.max = new Date("2022-10-10");
      el.$options.exclude = [new Date("2022-09-15")];
      el.$value = new Date("2022-05-01");
      expect(el.$validate()).toBeFalsy();
      el.$value = new Date("2022-04-30");
      expect(el.$validate()).toBe("Min value is 2022-05");
      el.$value = new Date("2022-10-31");
      expect(el.$validate()).toBeFalsy();
      el.$value = new Date("2022-11-01");
      expect(el.$validate()).toBe("Max value is 2022-10");
      el.$value = new Date("2022-09-01");
      expect(el.$validate()).toBe("This value is disabled");
      el.$value = new Date("2022-08-01");
      expect(el.$validate()).toBeFalsy();

      // format with year only
      el.$options.format = "yyyy";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("0000");
      expect(el.$validate()).toBe("This value is disabled"); // because excluded 2022-09-15 is in the same year
      el.$options.exclude = undefined;
      el.$value = new Date("2023-01-01");
      expect(el.$validate()).toBe("Max value is 2022");
      el.$value = new Date("2021-12-31");
      expect(el.$validate()).toBe("Min value is 2022");
      el.$options.min = undefined;
      el.$options.max = undefined;

      clnd = await reopen();
      expect(clnd.$options.endWith).toBe(PickersEnum.Year);
      expect(el.querySelector("[calendar='year']")).toBeTruthy();
      await h.userClick(clnd.$refCalendarItems.children[1]); // 2019
      await h.wait();
      expect(el.$isOpened).toBe(false);
      expect(el.$value?.toISOString()).toBe("2019-01-01T00:00:00.000Z");
      expect(el.$refInput.value).toBe("2019");

      // without utc
      el.$options.utc = false;
      el.$options.validations = { max: new Date(2022, 5, 15) };
      el.$value = new Date(2023, 0, 1);
      expect(el.$validate()).toBe("Max value is 2022");
      el.$value = new Date(2022, 11, 31, 23, 50);
      expect(el.$validate()).toBeFalsy();
      el.$options.utc = true;

      // option has higher priority than format
      el.$options.endWith = PickersEnum.Day;
      el.$value = new Date("2019-05-20");
      el.$options.validations = { min: new Date("2019-05-21") };
      expect(el.$validate()).toBe("Min value is 2019"); // compared by day
      clnd = await reopen();
      expect(clnd.$options.endWith).toBe(PickersEnum.Day);
      expect(el.querySelector("[calendar='day']")).toBeTruthy();
    });
  });

  test("user inputs value", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    el.$options.name = "testDate";
    h.setupLayout(el, { h: 20, w: 100 });
    await h.wait(1);

    HTMLInputElement.prototype.focus.call(el.$refInput);
    const onParse = jest.spyOn(el, "parseInput");
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);
    await h.userTypeText(el.$refInput, "20221030");
    await h.wait(150);
    expect(el.$isOpened).toBe(true);
    expect(el.$refInput.value).toBe("2022-10-30"); // because mask is applied
    expect(el.$isValid).toBe(true);
    expect(el.$refError).toBe(undefined);
    // el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(onChange).toBeCalledTimes(1);
    expect(onParse).toBeCalled();
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value changed without key "Enter" because user completed input
    expect(el.$isOpened).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(onSubmit).toBeCalledTimes(0); // 1st Enter only hides popup

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1); // 2st Enter sumbits
    onSubmit.mockClear();

    expect(await h.userRemove(el.$refInput)).toBe("2022-10-3|");
    await h.wait(); // wait for validation.debounce
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test Date:</span><span>Incomplete value</span>"`
    );
    expect(el.$isOpened).toBe(false); // menu must stay closed

    h.mockConsoleWarn();
    await h.userTypeText(el.$refInput, "9", { clearPrevious: false });
    h.unMockConsoleWarn();
    expect(el.$refInput.value).toBe("2022-10-39");
    await h.wait(1);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test Date:</span><span>Invalid value</span>"`
    );
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value the same
    expect(el.$isOpened).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value the same
    expect(el.$isOpened).toBe(false);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test Date:</span><span>Invalid value</span>"`
    ); // value lefts the same
    expect(el.$isValid).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    // check if changing saves hours
    el.$value = new Date("2022-10-16T13:45:56.000Z");
    await h.wait(1);
    onChange.mockClear();
    expect(el.$refInput.value).toBe("2022-10-16");
    h.setInputCursor(el.$refInput, "2022-10-16|");
    await h.userRemove(el.$refInput);
    await h.userTypeText(el.$refInput, "6", { clearPrevious: false });
    await h.wait();
    expect(el.$value?.toISOString()).toBe("2022-10-16T13:45:56.000Z");
    expect(onChange).toBeCalledTimes(0); // no change because value the same

    await h.userRemove(el.$refInput);
    await h.userTypeText(el.$refInput, "5", { clearPrevious: false });
    await h.wait();
    expect(el.$value?.toISOString()).toBe("2022-10-15T13:45:56.000Z");
    expect(onChange).toBeCalledTimes(1);

    // removing all
    while (el.$refInput.value) {
      await h.userRemove(el.$refInput);
    }
    expect(el.$refError).toBe(undefined);
    expect(el.$value).toBe(undefined);
    expect(el.$refPopup.querySelector("[aria-selected=true]")).toBeFalsy();
    // just for coverage (cases impossible in ordinary flow)
    expect(el.parseInput("b022-10-16")).toBe(undefined);
    el.$options.utc = false;
    expect(el.parseInput("2022-10-16").toISOString()).toBe(new Date("2022-10-16").toISOString());

    // user types invalid text
    h.mockConsoleWarn();
    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.validations = { required: true };
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "99999999")).toBe("9999-99-99|");
    expect(el.$isOpened).toBe(true);

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Invalid value</span>"`
    );

    // checking for correct re-validation (possible that 'required' will be here)
    el.blur();
    await h.wait(10);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Invalid value</span>"`
    );

    h.unMockConsoleWarn();

    // user types incomplete text (msg: Incomplete value)
    el = document.body.appendChild(document.createElement(el.tagName));
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "99")).toBe("99|");
    expect(el.$isOpened).toBe(true);
    expect(el.$refError?.innerHTML).toBeFalsy();

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Incomplete value</span>"`
    );
    expect(el.$refInput.value).toBe("99");
  });

  test("menu navigation", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    el.$options.name = "testDate";
    el.$initValue = new Date("2022-10-12T13:45:59.000Z");
    el.$options.startWith = PickersEnum.Year;
    el.$options.selectOnFocus = true;
    await h.wait(1);

    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(h.getInputCursor(el.$refInput)).toBe("|2022-10-12|");
    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    expect(el.$refPopup.firstChild.$refCalendarTitle.textContent).toBe("2018 ... 2033");

    const isPressKeyPrevented = (key = "Arrow", opts = { shiftKey: false, ctrlKey: false }) => {
      const isPrevented = !el.$refInput.dispatchEvent(
        new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...opts })
      );
      return isPrevented;
    };

    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("2022"); // start with current year
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("2023");
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("2027");
    expect(isPressKeyPrevented("ArrowLeft")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("2026");
    expect(isPressKeyPrevented("Home")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("2018");
    expect(isPressKeyPrevented("End")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("2033");
    // expect(h.getInputCursor(el.$refInput)).toBe("|2022-10-12|"); // WARN: in jsdom it doesn't work use e2e insted

    // these keys don't affects on calendar but works for input
    expect(isPressKeyPrevented("Home", { shiftKey: true })).toBe(false);
    expect(isPressKeyPrevented("End", { shiftKey: true })).toBe(false);
    expect(isPressKeyPrevented("Home", { ctrlKey: true })).toBe(false);
    expect(isPressKeyPrevented("End", { ctrlKey: true })).toBe(false);
    expect(isPressKeyPrevented(" ")).toBe(false);

    expect(el.querySelector("[focused]")?.textContent).toBe("2033");
    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait();
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(el.$refPopup.firstChild.$refCalendarTitle.textContent).toBe("2033");
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");

    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait();
    expect(el.querySelector("[calendar='day']")).toBeTruthy();
    expect(el.$refPopup.firstChild.$refCalendarTitle.textContent).toBe("January 2033");
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait();
    expect(el.$value?.toISOString()).toBe("2033-01-01T13:45:59.000Z"); // it's must store hours
    expect(onChanged).toBeCalledTimes(1);
    expect(onSubmit).toBeCalledTimes(0);
    expect(el.$isValid).toBe(true);

    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1);

    // checking if user can use mouse properly
    onChanged.mockClear();
    expect(el.$isOpened).toBe(false);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(el.querySelector("[calendar='day']")).toBeTruthy(); // dayPicker because it was stored previously by calendar

    // force to remove calendar (to startWith year again)
    el.blur();
    await h.wait(1);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();

    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    await h.userClick(el.$refPopup.firstChild.$refCalendarItems.firstElementChild); // click on 2018
    await h.wait();
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    await h.userClick(el.$refPopup.firstChild.$refCalendarItems.children[1]); // click on Feb
    await h.wait();
    expect(el.querySelector("[calendar='day']")).toBeTruthy();
    expect(el.$refPopup.firstChild.$refCalendarTitle.textContent).toBe("February 2018");
    await h.userClick(el.$refPopup.firstChild.$refCalendarItems.children[6]); // click on 4 February 2018
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$value?.toISOString()).toBe("2018-02-04T13:45:59.000Z"); // it's must store hours
    expect(onChanged).toBeCalledTimes(1);

    expect(isPressKeyPrevented("Home")).toBe(false); // keys must works only for input when is closed
  });

  describe("option multiple", () => {
    /** Returns text of selected items in opened calendar */
    const getSelected = () => Array.from(el.$refPopup.querySelectorAll("[aria-selected]")).map((li) => li.textContent);
    /** Returns item of the current month in opened calendar */
    const getDay = (day) =>
      Array.from(el.$refPopup.firstChild.$refCalendarItems.children).find(
        (li) => li.textContent === `${day}` && !li.hasAttribute("prev") && !li.hasAttribute("next")
      );
    const pressKey = (key, opts) =>
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...opts }));

    test("select via calendar", async () => {
      const onChange = jest.fn();
      el.addEventListener("$change", onChange);
      el.$options.multiple = true;
      el.$initValue = [new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-25")];
      await h.wait(1);
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-25");
      expect(el.$refInput.readOnly).toBe(false); // user can type the next date
      expect(el.$options.mask).toBe("0000-00-00"); // it's applied only to the date that user types

      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$isOpened).toBe(true);
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-25, "); // delimiter to type the next date
      const clnd = el.$refPopup.firstChild;
      expect(clnd.$options.multiple).toBe(true);
      expect(clnd.$refCalendarItems.getAttribute("aria-multiselectable")).toBe("true");
      expect(clnd.$refCalendarTitle.textContent).toBe("October 2022"); // picker of the 1st selected date
      expect(getSelected()).toEqual(["5", "25"]);

      // click on date adds it & menu stays opened
      await h.userClick(getDay(15));
      await h.wait();
      expect(el.$isOpened).toBe(true);
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-25"), new Date("2022-10-15")]); // added at the end; time isn't copied
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-25, 2022-10-15, ");
      expect(getSelected()).toEqual(["5", "15", "25"]);
      expect(onChange).toBeCalledTimes(1);
      expect(el.$isChanged).toBe(true);

      // click on selected date removes it
      await h.userClick(getDay(5));
      await h.wait();
      expect(el.$isOpened).toBe(true);
      expect(el.$value).toEqual([new Date("2022-10-25"), new Date("2022-10-15")]);
      expect(el.$refInput.value).toBe("2022-10-25, 2022-10-15, ");
      expect(getSelected()).toEqual(["15", "25"]);
      expect(onChange).toBeCalledTimes(2);

      // selected dates are shown on other months
      clnd.showNext(true);
      await h.wait();
      expect(clnd.$refCalendarTitle.textContent).toBe("November 2022");
      expect(getSelected()).toEqual([]);
      await h.userClick(getDay(2));
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-10-25"), new Date("2022-10-15"), new Date("2022-11-02")]);
      expect(getSelected()).toEqual(["2"]);
      clnd.showNext(false);
      await h.wait();
      expect(getSelected()).toEqual(["15", "25", "2"]); // [next] placeholder of November is selected also

      // keyboard: Enter selects/removes focused date
      expect(pressKey("ArrowRight")).toBe(false); // prevented
      expect(el.querySelector("[focused]")?.textContent).toBe("15"); // starts from the 1st selected
      pressKey("ArrowRight");
      expect(el.querySelector("[focused]")?.textContent).toBe("16");
      pressKey("Enter");
      await h.wait();
      expect(el.$isOpened).toBe(true);
      expect(el.$value).toEqual([
        new Date("2022-10-25"),
        new Date("2022-10-15"),
        new Date("2022-11-02"),
        new Date("2022-10-16"),
      ]);
      pressKey("Enter");
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-10-25"), new Date("2022-10-15"), new Date("2022-11-02")]);
      expect(onChange).toBeCalledTimes(5);

      // removing all dates makes value empty
      await h.userClick(getDay(15));
      await h.userClick(getDay(25));
      await h.userClick(clnd.$refCalendarItems.querySelector("[next][aria-selected]")); // 2 November
      await h.wait();
      expect(el.$value).toBe(undefined);
      expect(el.$refInput.value).toBe("");
      expect(getSelected()).toEqual([]);

      // Enter without focused item closes menu
      el.focusMenuItem(null);
      pressKey("Enter");
      await h.wait();
      expect(el.$isOpened).toBe(false);
    });

    test("user selection keeps order of dates", async () => {
      el.$options.multiple = true;
      const init = [new Date("2022-10-25"), new Date("2022-10-05"), new Date("2022-10-15")];
      el.$initValue = init;
      await h.wait(1);
      expect(el.$refInput.value).toBe("2022-10-25, 2022-10-05, 2022-10-15");

      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      await h.userClick(getDay(15)); // remove
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-10-25"), new Date("2022-10-05")]);
      expect(el.$refInput.value).toBe("2022-10-25, 2022-10-05, ");
      expect(init).toEqual([new Date("2022-10-25"), new Date("2022-10-05"), new Date("2022-10-15")]); // not mutated

      await h.userClick(getDay(10)); // add
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-10-25"), new Date("2022-10-05"), new Date("2022-10-10")]);
      expect(el.$refInput.value).toBe("2022-10-25, 2022-10-05, 2022-10-10, ");
    });

    test("type dates", async () => {
      const onChange = jest.fn();
      el.$onChange = onChange;
      el.$options.multiple = true;
      el.$initValue = [new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-25")];
      await h.wait(1);
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(h.getInputCursor(el.$refInput)).toBe("2022-10-05, 2022-10-25, |");
      expect(el.$refMaskholder.textContent).toBe("2022-10-05, 2022-10-25, yyyy-mm-dd"); // maskholder after selected dates

      // completed date is added at the end; time of other dates isn't lost
      expect(await h.userTypeText(el.$refInput, "20221015", { clearPrevious: false })).toBe(
        "2022-10-05, 2022-10-25, 2022-10-15, |"
      );
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-25"), new Date("2022-10-15")]);
      expect(onChange).toBeCalledTimes(1);
      expect(getSelected()).toEqual(["5", "15", "25"]);

      // not completed date: error & it's kept on focus lost
      await h.userTypeText(el.$refInput, "20221", { clearPrevious: false });
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-25, 2022-10-15, 2022-1");
      expect(el.$validate()).toBe("Incomplete value");
      el.blur();
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-25, 2022-10-15, 2022-1");
      expect(el.$value).toHaveLength(3);
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(await h.userTypeText(el.$refInput, "028", { clearPrevious: false })).toBe(
        "2022-10-05, 2022-10-25, 2022-10-15, 2022-10-28, |"
      );
      expect(el.$value).toHaveLength(4);
      expect(el.$validate()).toBe(false);

      // already selected date is ignored & removed on typing the next one
      onChange.mockClear();
      expect(await h.userTypeText(el.$refInput, "20221015", { clearPrevious: false })).toBe(
        "2022-10-05, 2022-10-25, 2022-10-15, 2022-10-28, 2022-10-15|"
      );
      expect(onChange).not.toBeCalled();
      expect(await h.userTypeText(el.$refInput, "2", { clearPrevious: false })).toBe(
        "2022-10-05, 2022-10-25, 2022-10-15, 2022-10-28, 2|"
      );

      // Backspace removes char of date that user types & then the whole selected date
      expect(await h.userRemove(el.$refInput)).toBe("2022-10-05, 2022-10-25, 2022-10-15, 2022-10-28, |");
      expect(await h.userRemove(el.$refInput)).toBe("2022-10-05, 2022-10-25, 2022-10-15, |");
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-25"), new Date("2022-10-15")]);
      h.setInputCursor(el.$refInput, "2022-10-05, 2022-1|0-25, 2022-10-15, ", { skipEvent: true });
      expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("2022-10-05, |2022-10-15, ");
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-15")]);
      expect(onChange).toBeCalledTimes(2);

      // typing in the middle goes to the end
      h.setInputCursor(el.$refInput, "2022-10-|05, 2022-10-15, ", { skipEvent: true });
      expect(await h.userTypeText(el.$refInput, "20221101", { clearPrevious: false })).toBe(
        "2022-10-05, 2022-10-15, 2022-11-01, |"
      );

      // paste several dates
      await h.userInsertText(el.$refInput, "2022-10-20, 2022-10-21");
      expect(h.getInputCursor(el.$refInput)).toBe("2022-10-05, 2022-10-15, 2022-11-01, 2022-10-20, 2022-10-21, |");
      expect(el.$value).toHaveLength(5);

      // invalid date
      h.mockConsoleWarn();
      await h.userTypeText(el.$refInput, "20221345", { clearPrevious: false });
      h.unMockConsoleWarn();
      expect(el.$validate()).toBe("Invalid value");
      expect(el.$value).toHaveLength(5);
      el.blur();
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-15, 2022-11-01, 2022-10-20, 2022-10-21, 2022-13-45");
      expect(() => el.parseInput("2022-10-05, 1x, 2022-10-22")).toThrow("Impossible to parse date from '1x'");
    });

    test("type the 1st date & remove dates", async () => {
      el.$options.multiple = true;
      await h.wait(1);
      expect(await h.userTypeText(el.$refInput, "20221")).toBe("2022-1|");
      expect(el.$value).toBe(undefined);
      expect(await h.userTypeText(el.$refInput, "005", { clearPrevious: false })).toBe("2022-10-05, |");
      expect(el.$value).toEqual([new Date("2022-10-05")]);
      await h.userInsertText(el.$refInput, ", 2022-10-15, 2022-10-25"); // extra delimiter is ignored
      expect(h.getInputCursor(el.$refInput)).toBe("2022-10-05, 2022-10-15, 2022-10-25, |");

      // Backspace in the 1st date removes it
      h.setInputCursor(el.$refInput, "2022-1|0-05, 2022-10-15, 2022-10-25, ", { skipEvent: true });
      expect(await h.userRemove(el.$refInput)).toBe("|2022-10-15, 2022-10-25, ");
      // all dates touched by selection are removed
      h.setInputCursor(el.$refInput, "2022-10-1|5, 2022-1|0-25, ", { skipEvent: true });
      expect(await h.userRemove(el.$refInput)).toBe("|");
      expect(el.$value).toBe(undefined);
      // selection till the end
      el.$value = [new Date("2022-10-05")];
      await h.userTypeText(el.$refInput, "20221", { clearPrevious: false });
      h.setInputCursor(el.$refInput, "|2022-10-05, 2022-1|", { skipEvent: true });
      expect(await h.userRemove(el.$refInput)).toBe("|");
      expect(el.$value).toBe(undefined);

      // delimiter is removed on focus lost
      el.$value = [new Date("2022-10-05")];
      expect(el.$refInput.value).toBe("2022-10-05, ");
      el.blur();
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05");
    });

    test("undo typed date", async () => {
      el.$options.multiple = true;
      el.$initValue = [new Date("2022-10-05T13:40:00.000Z")];
      await h.wait(1);
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(await h.userTypeText(el.$refInput, "20221015", { clearPrevious: false })).toBe(
        "2022-10-05, 2022-10-15, |"
      );
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-15")]);

      // the 1st undo removes the added date, next ones remove typed chars
      await h.userUndo(el.$refInput);
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-1");
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z")]);
      await h.userUndo(el.$refInput);
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-");
      await h.userRedo(el.$refInput);
      await h.userRedo(el.$refInput);
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-15, ");
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-15")]);
    });

    test("attributes & storage", async () => {
      // dates in [initvalue] are separated by comma; [min], [max] are single dates
      el = document.createElement("wup-date");
      el.setAttribute("w-multiple", "");
      el.setAttribute("w-min", "2022-10-02");
      el.setAttribute("w-max", "2022-10-28 13:40");
      el.setAttribute("w-initvalue", "2022-10-05, 2022-10-25 13:40");
      document.body.appendChild(el);
      await h.wait(1);
      expect(el.$options.multiple).toBe(true);
      expect(el.$options.min).toEqual(new Date("2022-10-02"));
      expect(el.$options.max).toEqual(new Date("2022-10-28T13:40:00.000Z"));
      expect(el.$initValue).toEqual([new Date("2022-10-05"), new Date("2022-10-25T13:40:00.000Z")]);
      expect(el.$value).toBe(el.$initValue);
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-25");
      expect(el.$refInput.readOnly).toBe(false);
      h.mockConsoleWarn();
      el.setAttribute("w-initvalue", "2022-10-05, 2022-13"); // wrong date
      expect(() => jest.advanceTimersByTime(1)).toThrow();
      h.unMockConsoleWarn();
      expect(el.$initValue).toEqual([new Date("2022-10-05"), new Date("2022-10-25T13:40:00.000Z")]);

      // the same dates in another order are equal
      el.$value = [new Date("2022-10-25T13:40:00.000Z"), new Date("2022-10-05")];
      expect(el.$isChanged).toBe(false);
      el.$value = [new Date("2022-10-25T13:40:00.000Z")];
      expect(el.$isChanged).toBe(true);
      el.$value = [];
      expect(el.$isEmpty).toBe(true);

      // storage: dates are joined by '_'
      el.$options.storage = "url";
      el.$options.storageKey = "dates";
      el.$value = [new Date("2022-10-05"), new Date("2022-10-25T13:40:00.000Z")];
      await h.wait(1);
      expect(new URLSearchParams(window.location.search).get("dates")).toBe("2022-10-05_2022-10-25");
      const el2 = document.body.appendChild(document.createElement("wup-date"));
      el2.$options.multiple = true;
      el2.$options.storage = "url";
      el2.$options.storageKey = "dates";
      await h.wait(1);
      expect(el2.$value).toEqual([new Date("2022-10-05"), new Date("2022-10-25")]);
      expect(el2.$refInput.value).toBe("2022-10-05, 2022-10-25");
      el.$value = undefined;
      await h.wait(1);
      expect(new URLSearchParams(window.location.search).get("dates")).toBe(null);
      expect(el2.$value).toBe(undefined); // synced
    });

    test("validations", async () => {
      el.$options.multiple = true;
      el.$options.min = new Date("2022-10-02");
      el.$options.max = new Date("2022-10-28");
      el.$options.exclude = [new Date("2022-10-15")];
      el.$options.validations = { required: true };
      await h.wait(1);

      el.$value = [new Date("2022-10-05"), new Date("2022-10-25")];
      expect(el.$validate()).toBe(false);
      el.$value = [new Date("2022-10-05"), new Date("2022-10-01")];
      expect(el.$validate()).toBe("Min value is 2022-10-02");
      el.$value = [new Date("2022-10-29"), new Date("2022-10-25")];
      expect(el.$validate()).toBe("Max value is 2022-10-28");
      el.$value = [new Date("2022-10-05"), new Date("2022-10-15T13:40:00.000Z")];
      expect(el.$validate()).toBe("This value is disabled");
      el.$value = [];
      expect(el.$validate()).toBe("This field is required");
      el.$value = undefined;
      expect(el.$validate()).toBe("This field is required");

      // excluded dates aren't selectable
      el.$options.startWith = "2022-10-01";
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      await h.userClick(getDay(15));
      await h.userClick(getDay(1)); // less than min
      await h.wait();
      expect(el.$value).toBe(undefined);
      await h.userClick(getDay(14));
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-10-14")]);
      expect(el.$isValid).toBe(true);
    });

    test("option sync is ignored", async () => {
      const elTime = document.body.appendChild(document.createElement("wup-time"));
      el.$options.sync = elTime;
      el.$options.multiple = true;
      el.$initValue = [new Date("2022-10-05T13:40:00.000Z")];
      await h.wait(1);
      expect(el.refTime).toBe(null);
      expect(elTime.$initValue).toBe(undefined);

      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      await h.userClick(getDay(6));
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-06")]);
      expect(elTime.$value).toBe(undefined);
    });

    test("undo & rollback by Escape", async () => {
      el.$options.multiple = true;
      el.$options.menuEscRollback = true;
      el.$initValue = [new Date("2022-10-05T13:40:00.000Z")];
      await h.wait(1);
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      await h.userClick(getDay(6));
      await h.userClick(getDay(7));
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-06, 2022-10-07, ");

      // Ctrl+Z returns previous selection & time isn't lost
      await h.userUndo(el.$refInput);
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-06, ");
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-06")]);
      expect(getSelected()).toEqual(["5", "6"]);
      expect(el.$isOpened).toBe(true);
      await h.userUndo(el.$refInput);
      await h.wait();
      expect(el.$refInput.value).toBe("2022-10-05, ");
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z")]);
      expect(el.$isChanged).toBe(false);
      await h.userRedo(el.$refInput);
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z"), new Date("2022-10-06")]);

      // Escape rollbacks value that was before menu opened
      pressKey("Escape");
      await h.wait();
      expect(el.$isOpened).toBe(false);
      expect(el.$value).toEqual([new Date("2022-10-05T13:40:00.000Z")]);
      expect(el.$refInput.value).toBe("2022-10-05, ");
    });

    test("only month", async () => {
      el.$options.multiple = true;
      el.$options.format = "yyyy-mm";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      el.$initValue = [new Date("2022-05-20T23:50:00.000Z")];
      await h.wait(1);
      expect(el.$refInput.value).toBe("2022-05");

      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      const clnd = el.$refPopup.firstChild;
      expect(el.querySelector("[calendar='month']")).toBeTruthy();
      expect(getSelected()).toEqual(["May"]);
      await h.userClick(clnd.$refCalendarItems.children[6]); // Jul
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-05-20T23:50:00.000Z"), new Date("2022-07-01")]);
      expect(getSelected()).toEqual(["May", "Jul"]);
      await h.userClick(clnd.$refCalendarItems.children[4]); // May: compared by month
      await h.wait();
      expect(el.$value).toEqual([new Date("2022-07-01")]);
      expect(el.$refInput.value).toBe("2022-07, ");
    });

    test("changing option", async () => {
      el.$value = new Date("2022-10-05");
      await h.wait(1);
      expect(el.$refInput.value).toBe("2022-10-05");
      expect(el.$refInput.readOnly).toBe(false);

      el.$options.multiple = true;
      el.$value = [new Date("2022-10-05"), new Date("2022-10-25")];
      await h.wait(1);
      expect(el.$refInput.value).toBe("2022-10-05, 2022-10-25"); // mask is applied only to the date that user types
      expect(el.$refInput.readOnly).toBe(false);

      el.$options.multiple = false;
      el.$value = new Date("2022-10-07");
      await h.wait(1);
      expect(el.$options.mask).toBe("0000-00-00");
      expect(el.$options.maskholder).toBe("yyyy-mm-dd");
      expect(el.$refInput.value).toBe("2022-10-07");
      expect(el.$refInput.readOnly).toBe(false);
    });
  });

  test("value change not affects on popup", async () => {
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$isOpened).toBe(true);

    el.$value = new Date("2015-09-26");
    await h.wait();
    expect(el.$isOpened).toBe(true);

    el.blur();
    await h.wait();
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    const cur = el.$refPopup.querySelector("[aria-selected]");
    expect(cur).toBeDefined();
    await h.userClick(cur);
    await h.wait();
    expect(el.$isOpened).toBe(false); // click on the same date must hide popup
  });
});
