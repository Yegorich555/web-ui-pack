/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPDateControl } from "web-ui-pack";
import { PickersEnum } from "web-ui-pack/controls/calendar";
import { ShowCases } from "web-ui-pack/controls/baseCombo";
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
    el.$options.showCase |= ShowCases.onFocusAuto; // without this impossible to test with manual triggering focus()

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
      "w-showcase": { value: 1 },

      "w-mask": { value: "#0-#0-0000", nullValue: "0000-00-00" },
      "w-maskholder": { value: "dd-mm-yyyy", nullValue: "YYYY-MM-DD" },
      "w-format": { value: "dd-mm-yyyy", nullValue: "yyyy-mm-dd" },

      "w-utc": { value: true },
      "w-min": { value: "2022-05-20", parsedValue: new Date("2022-05-20") },
      "w-max": { value: "2022-05-21", parsedValue: new Date("2022-05-21") },
      "w-exclude": { value: [new Date("2009-02-06")] },
      "w-startwith": { skip: true }, // tested manually
      "w-firstweekday": { value: 1 },
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
  });

  test("user inputs value", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    el.$options.name = "testDate";
    await h.wait(1);

    HTMLInputElement.prototype.focus.call(el.$refInput);
    const onParse = jest.spyOn(el, "parseInput");
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);
    await h.userTypeText(el.$refInput, "20221030");
    await h.wait(150);
    expect(el.$isShown).toBe(true);
    expect(el.$refInput.value).toBe("2022-10-30"); // becahuse mask is applied
    expect(el.$isValid).toBe(true);
    expect(el.$refError).toBe(undefined);
    // el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(onChange).toBeCalledTimes(1);
    expect(onParse).toBeCalled();
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value changed without key "Enter" because user completed input
    expect(el.$isShown).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
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
    expect(el.$isShown).toBe(false); // menu must stay closed

    h.mockConsoleWarn();
    await h.userTypeText(el.$refInput, "9", { clearPrevious: false });
    h.unMockConsoleWarn();
    expect(el.$refInput.value).toBe("2022-10-39");
    await h.wait(1);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test Date:</span><span>Invalid value</span>"`
    );
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value the same
    expect(el.$isShown).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value the same
    expect(el.$isShown).toBe(false);
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
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "99999999")).toBe("9999-99-99|");
    expect(el.$isShown).toBe(true);

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Invalid value</span>"`
    );
    h.unMockConsoleWarn();

    // user types incomplete text (msg: Incomplete value)
    el = document.body.appendChild(document.createElement(el.tagName));
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "99")).toBe("99|");
    expect(el.$isShown).toBe(true);
    expect(el.$refError?.innerHTML).toBeFalsy();

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
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
    expect(el.$refPopup.firstChild.$refCalenarTitle.textContent).toBe("2018 ... 2033");

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
    expect(el.$refPopup.firstChild.$refCalenarTitle.textContent).toBe("2033");
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");

    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait();
    expect(el.querySelector("[calendar='day']")).toBeTruthy();
    expect(el.$refPopup.firstChild.$refCalenarTitle.textContent).toBe("January 2033");
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
    expect(el.$isShown).toBe(false);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.querySelector("[calendar='day']")).toBeTruthy(); // dayPicker because it was stored previously by calendar

    // force to remove calendar (to startWith year again)
    el.blur();
    await h.wait(1);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();

    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    await h.userClick(el.$refPopup.firstChild.$refCalenarItems.firstElementChild); // click on 2018
    await h.wait();
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    await h.userClick(el.$refPopup.firstChild.$refCalenarItems.children[1]); // click on Feb
    await h.wait();
    expect(el.querySelector("[calendar='day']")).toBeTruthy();
    expect(el.$refPopup.firstChild.$refCalenarTitle.textContent).toBe("February 2018");
    await h.userClick(el.$refPopup.firstChild.$refCalenarItems.children[6]); // click on 4 February 2018
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value?.toISOString()).toBe("2018-02-04T13:45:59.000Z"); // it's must store hours
    expect(onChanged).toBeCalledTimes(1);

    expect(isPressKeyPrevented("Home")).toBe(false); // keys must works only for input when is closed
  });

  test("value change not affects on popup", async () => {
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$isShown).toBe(true);

    el.$value = new Date("2015-09-26");
    await h.wait();
    expect(el.$isShown).toBe(true);

    el.blur();
    await h.wait();
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    const cur = el.$refPopup.querySelector("[aria-selected]");
    expect(cur).toBeDefined();
    await h.userClick(cur);
    await h.wait();
    expect(el.$isShown).toBe(false); // click on the same date must hide popup
  });
});
