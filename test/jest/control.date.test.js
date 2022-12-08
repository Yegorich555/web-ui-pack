/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPDateControl } from "web-ui-pack";
import { PickersEnum } from "web-ui-pack/controls/calendar";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../testHelper";

beforeAll(() => {
  jest.useFakeTimers();
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
    el = e;

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
      { attrValue: "2022-02-28", value: new Date("2022-02-28") },
      { attrValue: "2022-03-16", value: new Date("2022-03-16") },
      { attrValue: "2022-05-20", value: new Date("2022-05-20") },
    ],
    validations: {
      min: { set: new Date("2022-05-20"), failValue: new Date("2022-04-01"), trueValue: new Date("2022-06-01") },
      max: { set: new Date("2022-10-28"), failValue: new Date("2022-10-29"), trueValue: new Date("2022-09-20") },
      exclude: { set: [new Date("2022-07-15")], failValue: new Date("2022-07-15"), trueValue: new Date("2022-07-16") },
    },
    attrs: {
      min: { value: "2022-05-20" },
      max: { value: "2022-05-21" },
      exclude: { refGlobal: [new Date("2009-02-06")] },
      mask: { skip: true },
      maskholder: { skip: true },
      format: { skip: true },
    },
    $options: {
      mask: { skip: true },
      maskholder: { skip: true },
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
    });

    test("attr [startWith]", async () => {
      const set = async (s) => {
        el.remove();
        el.setAttribute("startwith", s);
        document.body.appendChild(el);
        await h.wait(1);
        el.focus();
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
      el.focus();
      await h.wait();
      expect(el.$options.startWith).toBe(PickersEnum.Month);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Month);
    });

    test("min/max/exclude affects on validations", async () => {
      expect(el.validations).toBeTruthy(); // for coverage when el.$options.validations = undefined;

      el.$options.min = new Date("2022-01-01");
      expect(el.validations.min.valueOf()).toBe(new Date("2022-01-01").valueOf());

      el.$options.max = new Date("2023-10-15");
      expect(el.validations.max.valueOf()).toBe(new Date("2023-10-15").valueOf());

      el.$options.exclude = [new Date("2022-07-12")];
      expect(el.validations.exclude).toMatchInlineSnapshot(`
        [
          "2022-07-12T00:00:00.000Z",
        ]
      `);
      await h.wait(1);
      el.focus();
      await h.wait();
      const clnd = el.$refPopup.firstChild;
      expect(clnd.$options.min).toBe(el.$options.min);
      expect(clnd.$options.max).toBe(el.$options.max);
      expect(clnd.$options.exclude).toBe(el.$options.exclude);
    });

    test("utc", async () => {
      expect(el.$options.utc).toBe(true);
      el.setAttribute("min", "2022-10-15");
      el.$options.utc = false;
      await h.wait(1);
      expect(el.$options.min.valueOf()).toBe(new Date("2022-10-15T00:00").valueOf()); // parse must be in local time

      el.$value = new Date("2022-10-15T12:40:59.000Z"); // utc
      expect(el.$refInput.value).toBe("2022-10-15"); // just for coverage

      el.setAttribute("min", "abc");
      await h.wait(1);
      expect(el.$options.min).toBe(undefined);

      el.focus();
      await h.wait();
      expect(el.$refPopup.firstChild.$options.utc).toBe(false);
      el.blur();
      await h.wait();

      el.$options.utc = true;
      el.focus();
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

    el.focus();
    const onParse = jest.spyOn(el, "parse");
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);
    await h.userTypeText(el.$refInput, "20221030");
    await h.wait(150);
    expect(el.$isOpen).toBe(true);
    expect(el.$refInput.value).toBe("2022-10-30"); // becahuse mask is applied
    expect(el.$isValid).toBe(true);
    expect(el.$refError).toBe(undefined);
    // el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(onChange).toBeCalledTimes(1);
    expect(onParse).toBeCalled();
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value changed without key "Enter" because user completed input
    expect(el.$isOpen).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
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
    expect(el.$isOpen).toBe(false); // menu must stay closed

    h.mockConsoleWarn();
    await h.userTypeText(el.$refInput, "9", { clearPrevious: false });
    h.unMockConsoleWarn();
    expect(el.$refInput.value).toBe("2022-10-39");
    await h.wait(1);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test Date:</span><span>Invalid value</span>"`
    );
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value the same
    expect(el.$isOpen).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value?.toISOString()).toBe("2022-10-30T00:00:00.000Z"); // value the same
    expect(el.$isOpen).toBe(false);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test Date:</span><span>Invalid value</span>"`
    ); // value lefts the same
    expect(el.$isValid).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    // check if changing saves hours
    onChange.mockClear();
    el.$value = new Date("2022-10-16T13:45:56.000Z");
    await h.wait(1);
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
    expect(onChange).toBeCalledTimes(0); // no change because value the same
  });

  test("menu navigation", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    el.$options.name = "testDate";
    el.$initValue = new Date("2022-10-12T13:45:59.000Z");
    el.$options.startWith = PickersEnum.Year;
    await h.wait(1);

    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    el.focus();
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
    expect(el.$isOpen).toBe(false);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.querySelector("[calendar='day']")).toBeTruthy(); // dayPicker because it was stored previously by calendar

    // force to remove calendar (to startWith year again)
    el.blur();
    await h.wait(1);
    el.focus();
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
    expect(el.$isOpen).toBe(false);
    expect(el.$value?.toISOString()).toBe("2018-02-04T13:45:59.000Z"); // it's must store hours
    expect(onChanged).toBeCalledTimes(1);
  });

  test("value change not affects on popup", async () => {
    el.focus();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    el.$value = new Date("2015-09-26");
    await h.wait();
    expect(el.$isOpen).toBe(true);
  });
});