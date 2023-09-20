/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPTimeControl, WUPTimeObject } from "web-ui-pack";
// import { localeInfo } from "web-ui-pack/indexHelpers";
import { ShowCases } from "web-ui-pack/controls/baseCombo";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

beforeAll(() => {
  // localeInfo.refresh("en-US"); // setup "en-US" locale
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
  jest.setSystemTime(new Date("2022-10-18T12:23:00.000Z")); // 18 Oct 2022 12:00 UTC
});

/** @type WUPTimeControl */
let el;
initTestBaseControl({
  type: WUPTimeControl,
  htmlTag: "wup-time",
  onInit: (e) => {
    jest.setSystemTime(new Date("2022-10-18T12:23:00.000Z")); // 18 Oct 2022 12:00 UTC
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

const isPressKeyPrevented = (key = "Arrow", opts = { shiftKey: false, ctrlKey: false }) => {
  const isPrevented = !el.$refInput.dispatchEvent(
    new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...opts })
  );
  return isPrevented;
};

describe("control.time", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "02:28", value: new WUPTimeObject("02:28"), urlValue: "02-28" },
      { attrValue: "23:16", value: new WUPTimeObject("23:16"), urlValue: "23-16" },
      { attrValue: "12:20", value: new WUPTimeObject("12:20"), urlValue: "12-20" },
    ],
    validations: {
      min: {
        set: new WUPTimeObject("02:28"),
        failValue: new WUPTimeObject("02:27"),
        trueValue: new WUPTimeObject("02:29"),
      },
      max: {
        set: new WUPTimeObject("23:15"),
        failValue: new WUPTimeObject("23:16"),
        trueValue: new WUPTimeObject("23:14"),
      },
      exclude: {
        set: { test: (v) => v.valueOf() === new WUPTimeObject("15:40").valueOf() },
        failValue: new WUPTimeObject("15:40"),
        trueValue: new WUPTimeObject("19:00"),
      },
    },
    attrs: {
      "w-prefix": { value: "$" },
      "w-postfix": { value: "USD" },
      "w-clearbutton": { value: true },
      "w-debouncems": { value: 5 },
      "w-selectonfocus": { value: true },
      "w-readonlyinput": { value: true },
      "w-showcase": { value: 1 },
      "w-menubuttonsoff": { value: true },

      "w-mask": { value: "00:00 am", nullValue: "00:00 //[AP]//M" },
      "w-maskholder": { value: "00:00 am", nullValue: "hh:mm *M" },
      "w-format": { value: "hh:mm a", nullValue: "hh:mm A" },

      "w-min": { value: "02:28", parsedValue: new WUPTimeObject(2, 28) },
      "w-max": { value: "23:15", parsedValue: new WUPTimeObject(23, 15) },
      "w-step": { value: 5 },
      "w-exclude": { value: { test: (v) => v.valueOf() === new WUPTimeObject("15:40").valueOf() } },
    },
    validationsSkip: ["_parse", "_mask"],
  });

  describe("extra", () => {
    test("format", async () => {
      await h.wait(1);
      expect(el.$options.format).toBe("hh:mm A");
      expect(el.$options.mask).toBe("00:00 //[AP]//M");
      expect(el.$options.maskholder).toBe("hh:mm *M");
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
        [
          "<li>10</li><li>11</li><li aria-selected="true">12</li><li>01</li><li>02</li>",
          "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
          "<li aria-hidden="true">PM</li><li aria-selected="true">AM</li><li>PM</li>",
        ]
      `);
      await h.wait();

      el.blur();
      await h.wait();
      el.$options.format = "hh:mm a";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("00:00 //[ap]//m");
      expect(el.$options.maskholder).toBe("hh:mm *m");
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
        [
          "<li>10</li><li>11</li><li aria-selected="true">12</li><li>01</li><li>02</li>",
          "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
          "<li aria-hidden="true">pm</li><li aria-selected="true">am</li><li>pm</li>",
        ]
      `);
      await h.wait();

      el.blur();
      await h.wait();
      el.$value = new WUPTimeObject(23, 0);
      el.$options.format = "h-m";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("#0-#0");
      expect(el.$options.maskholder).toBe("hh-mm");
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();

      expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
        [
          "<li>21</li><li>22</li><li aria-selected="true">23</li><li>0</li><li>1</li>",
          "<li>58</li><li>59</li><li aria-selected="true">0</li><li>1</li><li>2</li>",
        ]
      `);

      // user can override defaults
      el.$options.mask = "00:00";
      await h.wait(1);
      expect(el.$options.mask).toBe("00:00");
      expect(el.$options.maskholder).toBe("hh-mm");
      el.$options.maskholder = "HH MM";
      await h.wait(1);
      expect(el.$options.maskholder).toBe("HH MM");
    });

    test("min/max/exclude affects on validations", async () => {
      expect(el.validations).toBeTruthy(); // for coverage when el.$options.validations = undefined;
      el.$options.min = new WUPTimeObject("02:49");
      expect(el.validations.min).toEqual(new WUPTimeObject("02:49"));
      el.$options.max = new WUPTimeObject("15:00");
      expect(el.validations.max).toEqual(new WUPTimeObject("15:00"));

      el.$options.exclude = { test: (v) => v.valueOf() === new WUPTimeObject("13:10").valueOf() };
      expect(el.validations.exclude).toBe(el.$options.exclude);
    });

    test("step", async () => {
      expect(el.$options.step).toBe(1);
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$refMenuLists[1].innerHTML).toMatchInlineSnapshot(
        `"<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>"`
      );

      // hide & remove popup
      el.$hideMenu();
      await h.wait();
      document.activeElement.blur();
      await h.wait();
      expect(el.$refMenuLists).not.toBeDefined();

      el.$options.step = 5;
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$options.step).toBe(5);
      // WARN: if step == 5 & user can type 15:23 -  25 minutes will be selected in this case
      expect(el.$refMenuLists[1].innerHTML).toMatchInlineSnapshot(
        `"<li>15</li><li>20</li><li aria-selected="true">25</li><li>30</li><li>35</li>"`
      );
    });
  });

  test("user inputs value", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    el.$options.name = "test";
    await h.wait(1);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    const onParse = jest.spyOn(el, "parseInput");
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);

    expect(el.$options.format).toBe("hh:mm A");
    expect(await h.userTypeText(el.$refInput, "0123a")).toBe("01:23 A|M");
    await h.wait(150);
    expect(el.$isShown).toBe(true);
    expect(el.$refInput.value).toBe("01:23 AM"); // because mask is applied
    expect(el.$isValid).toBe(true);
    expect(el.$refError).toBe(undefined);
    // el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(onChange).toBeCalledTimes(1);
    expect(onParse).toBeCalled();
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value changed without key "Enter" because user completed input
    expect(el.$isShown).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(onSubmit).toBeCalledTimes(0); // 1st Enter only hides popup
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1); // 2st Enter sumbits
    onSubmit.mockClear();
    expect(await h.userRemove(el.$refInput)).toBe("01:23 |");
    expect(await h.userRemove(el.$refInput)).toBe("01:2|");
    expect(await h.userRemove(el.$refInput)).toBe("01:|");
    await h.wait(); // wait for validation.debounce
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test:</span><span>Incomplete value</span>"`
    );
    expect(el.$isShown).toBe(false); // menu must stay closed

    h.mockConsoleWarn();
    await h.userTypeText(el.$refInput, "92A", { clearPrevious: false });
    h.unMockConsoleWarn();
    expect(el.$refInput.value).toBe("01:92 AM");
    await h.wait(1);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test:</span><span>Invalid value</span>"`
    );
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value the same
    expect(el.$isShown).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value the same
    expect(el.$isShown).toBe(false);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test:</span><span>Invalid value</span>"`
    ); // value lefts the same
    expect(el.$isValid).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    // removing all
    while (el.$refInput.value) {
      await h.userRemove(el.$refInput);
    }
    expect(el.$refError).toBe(undefined);
    expect(el.$value).toBe(undefined);

    // h:m - try to input 01:23 => expected 1:23
    el.blur();
    el.$options.format = "h:mm";
    el.$options.mask = undefined;
    el.$options.maskholder = undefined;
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "0136", { clearPrevious: false })).toBe("01:36|");
    expect(el.$value).toEqual(new WUPTimeObject(1, 36));
    el.blur();
    expect(el.$refInput.value).toBe("1:36");
    await h.wait();
  });

  test("user updates input", async () => {
    const onChanged = jest.fn();
    el.$onChange = onChanged;

    expect(await h.userTypeText(el.$refInput, "11:50 a")).toBe("11:50 A|M");
    h.setInputCursor(el.$refInput, "11:|50 AM");
    h.mockConsoleWarn();
    onChanged.mockClear();

    // parse error
    expect(await h.userTypeText(el.$refInput, "9", { clearPrevious: false })).toBe("11:9|50 AM");
    h.unMockConsoleWarn();
    await h.wait();
    expect(el.$refInput.value).toBe("11:95 AM");
    expect(onChanged).toBeCalledTimes(0);
    expect(el.$value).toEqual(new WUPTimeObject(11, 50)); // previous value because no changes
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Invalid value</span>"`
    );
    expect(el.$isValid).toBe(false);

    // decline/shift + change to valid value
    h.setInputCursor(el.$refInput, "11:|95 AM");
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    await h.wait();
    expect(el.$refInput.value).toBe("11:29 AM");
    expect(onChanged).toBeCalledTimes(1);
    expect(el.$value).toEqual(new WUPTimeObject(11, 29));
    expect(el.$refError).toBeFalsy();
    expect(el.$isValid).toBe(true);

    // mask-error
    onChanged.mockClear();
    h.setInputCursor(el.$refInput, "11:29 AM|");
    expect(await h.userRemove(el.$refInput, { removeCount: 2 })).toBe("11:2|");
    await h.wait();
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Incomplete value</span>"`
    );
    expect(onChanged).toBeCalledTimes(0);
    expect(el.$isValid).toBe(false);

    // error same when user leaves control
    el.blur();
    await h.wait();
    expect(el.$refInput.value).toBe("11:2"); // AM missed here
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Incomplete value</span>"`
    );
    expect(el.$isValid).toBe(false);
    expect(onChanged).toBeCalledTimes(0);
    expect(el.$value).toEqual(new WUPTimeObject(11, 29)); // value last parsed
  });

  test("menu", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    el.$options.selectOnFocus = true;
    el.$options.name = "test";
    el.$initValue = new WUPTimeObject(12, 59);
    await h.wait(1);
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(h.getInputCursor(el.$refInput)).toBe("|12:59 PM|");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<div id="txt2" role="application"><ul aria-label="Hours" style="overflow: hidden;"><li>10</li><li>11</li><li aria-selected="true">12</li><li>01</li><li>02</li></ul><ul aria-label="Minutes" style="overflow: hidden;"><li>57</li><li>58</li><li aria-selected="true">59</li><li>00</li><li>01</li></ul><ul aria-label="AM PM" style="overflow: hidden;"><li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li></ul><mark aria-hidden="true">:</mark></div><div group=""><button type="button" aria-label="Ok" tabindex="-1"></button><button type="button" aria-label="Cancel" tabindex="-1"></button></div>"`
    );

    const { nextFrame } = h.useFakeAnimation();

    // hours
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("12");

    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("01");
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="true" aria-label="01:59 PM" id="txt4" focused="">01</li><li>02</li><li>03</li>",
        "<li>57</li><li>58</li><li aria-selected="true">59</li><li>00</li><li>01</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);

    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("11");
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" aria-label="11:59 PM" id="txt5" focused="">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li>",
        "<li>57</li><li>58</li><li aria-selected="true">59</li><li>00</li><li>01</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);

    // minutes
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("59");

    expect(isPressKeyPrevented("ArrowRight", { ctrlKey: true })).toBe(false);
    expect(isPressKeyPrevented("ArrowRight", { altKey: true })).toBe(false);
    expect(isPressKeyPrevented("ArrowRight", { shiftKey: true })).toBe(false);

    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("00");
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li>",
        "<li>58</li><li aria-selected="false" id="txt6">59</li><li aria-selected="true" aria-label="11:00 PM" id="txt7" focused="">00</li><li>01</li><li>02</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("58");
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li>",
        "<li>56</li><li>57</li><li aria-selected="true" aria-label="11:58 PM" id="txt8" focused="">58</li><li aria-selected="false" id="txt6">59</li><li aria-selected="false" id="txt7">00</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);

    // AM/PM
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("PM");
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("PM"); // no horizontal cycling

    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("AM");
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li>",
        "<li>56</li><li>57</li><li aria-selected="true" id="txt8">58</li><li aria-selected="false" id="txt6">59</li><li aria-selected="false" id="txt7">00</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="true" aria-label="11:58 AM" id="txt10" focused="">AM</li><li aria-selected="false" id="txt9">PM</li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("PM");
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li>",
        "<li>56</li><li>57</li><li aria-selected="true" id="txt8">58</li><li aria-selected="false" id="txt6">59</li><li aria-selected="false" id="txt7">00</li>",
        "<li aria-selected="false" id="txt10">AM</li><li aria-selected="true" id="txt9" aria-label="11:58 PM" focused="">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("AM");

    // go to Hours
    expect(isPressKeyPrevented("ArrowLeft")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("58");
    expect(isPressKeyPrevented("ArrowLeft")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("11");
    expect(isPressKeyPrevented("ArrowLeft")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("11"); // no horizontal cycling

    // submit by Enter
    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait();
    expect(el.$value).toEqual(new WUPTimeObject(11, 58));
    expect(el.$refInput.value).toBe("11:58 AM");
    expect(onChanged).toBeCalledTimes(1);
    expect(onSubmit).toBeCalledTimes(0);
    expect(el.$isValid).toBe(true);
    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1);
    expect(el.$isShown).toBe(false);

    // changing value to check if menu is refreshed according to ones
    el.$value = undefined;
    await h.wait(1);
    await h.userTypeText(el.$refInput, "05:37 PM");
    expect(el.$value).toEqual(new WUPTimeObject(17, 37));

    // checking if user can use mouse properly
    await nextFrame(5);
    await h.wait();
    onChanged.mockClear();
    expect(el.$isShown).toBe(false);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>03</li><li>04</li><li aria-selected="true" aria-label="05:37 PM" id="txt12" focused="">05</li><li>06</li><li>07</li>",
        "<li>35</li><li>36</li><li aria-selected="true">37</li><li>38</li><li>39</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);

    await h.userClick(el.$refMenuLists[0].firstElementChild);
    await h.wait();
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>01</li><li>02</li><li aria-selected="true" aria-label="03:37 PM" id="txt14" focused="">03</li><li aria-selected="false" id="txt13">04</li><li aria-selected="false" id="txt12">05</li>",
        "<li>35</li><li>36</li><li aria-selected="true">37</li><li>38</li><li>39</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);

    await h.userClick(el.$refMenuLists[1].lastElementChild);
    await h.wait();
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>01</li><li>02</li><li aria-selected="true" id="txt14">03</li><li aria-selected="false" id="txt13">04</li><li aria-selected="false" id="txt12">05</li>",
        "<li aria-selected="false">37</li><li aria-selected="false" id="txt15">38</li><li aria-selected="true" aria-label="03:39 PM" id="txt16" focused="">39</li><li>40</li><li>41</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);

    await h.userClick(el.$refMenuLists[2].lastElementChild);
    await h.wait();
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>01</li><li>02</li><li aria-selected="true" id="txt14">03</li><li aria-selected="false" id="txt13">04</li><li aria-selected="false" id="txt12">05</li>",
        "<li aria-selected="false">37</li><li aria-selected="false" id="txt15">38</li><li aria-selected="true" aria-label="03:39 PM" id="txt16" focused="">39</li><li>40</li><li>41</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);

    // click on btnOk
    await h.userClick(el.$refButtonOk.parentElement); // outside click - just for coverage
    await h.userClick(el.$refButtonOk);
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toEqual(new WUPTimeObject(15, 39));
    expect(onChanged).toBeCalledTimes(1);

    // click on btnCancel
    onChanged.mockClear();
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    expect(el.$isShown).toBe(true);
    await h.wait();
    await h.userClick(el.$refMenuLists[0].firstElementChild);
    await h.wait();
    await h.userClick(el.$refButtonCancel);
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toEqual(new WUPTimeObject(15, 39)); // no changes because popup is closed by cancelling
    expect(onChanged).toBeCalledTimes(0);

    el.$value = new WUPTimeObject(0, 0);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    await h.wait();
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true" aria-label="12:00 AM" id="txt19" focused="">12</li><li>01</li><li>02</li>",
        "<li>58</li><li>59</li><li aria-selected="true">00</li><li>01</li><li>02</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="true">AM</li><li aria-selected="false">PM</li>",
      ]
    `);
    el.$refMenuLists[0].dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    el.$refMenuLists[1].dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    el.$refMenuLists[2].dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    await h.wait();
    await nextFrame(5);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt20">11</li><li aria-selected="false" id="txt19">12</li><li>01</li>",
        "<li>57</li><li>58</li><li aria-selected="true" aria-label="11:59 AM" id="txt21" focused="">59</li><li aria-selected="false">00</li><li>01</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="true">AM</li><li aria-selected="false">PM</li>",
      ]
    `);

    expect(el.$isShown).toBe(true);
    expect(() => el.$showMenu()).not.toThrow(); // just for coverage
  });

  test("menu in 1 row", async () => {
    const orig = el.renderMenu;
    el.renderMenu = function renderMenu(popup, menuId, rows) {
      rows = 1;
      orig.call(el, popup, menuId, rows);
    };

    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();

    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li aria-selected="true">12</li>",
        "<li aria-selected="true">23</li>",
        "<li aria-selected="true">AM</li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // 12 hh
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // 01 hh

    expect(isPressKeyPrevented("ArrowRight")).toBe(true); // 23 mm
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // 24 mm

    expect(isPressKeyPrevented("ArrowRight")).toBe(true); // AM
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // PM
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li aria-selected="true" id="txt4">01</li>",
        "<li aria-selected="true" id="txt6">24</li>",
        "<li aria-selected="true" aria-label="01:24 PM" id="txt8" focused="">PM</li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(el.$refMenuLists[2].innerHTML).toMatchInlineSnapshot(
      `"<li aria-selected="true" aria-label="01:24 AM" id="txt9" focused="">AM</li><li aria-selected="false" id="txt8">PM</li>"`
    );
  });

  test("value change not affects on menu", async () => {
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$isShown).toBe(true);

    el.$value = new WUPTimeObject(12, 56);
    await h.wait();
    expect(el.$isShown).toBe(true);
  });

  test("menu with options min/max/exclude", async () => {
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);
    el.$options.min = new WUPTimeObject(3, 50);
    el.$options.max = new WUPTimeObject(23, 50);
    el.$options.exclude = { test: (v) => v === new WUPTimeObject(14, 0).valueOf() };
    await h.wait(1);

    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true" disabled="">12</li><li disabled="">01</li><li disabled="">02</li>",
        "<li disabled="">21</li><li disabled="">22</li><li aria-selected="true" disabled="">23</li><li disabled="">24</li><li disabled="">25</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="true">AM</li><li>PM</li>",
      ]
    `);
    expect(el.$refButtonOk.parentElement.outerHTML).toMatchInlineSnapshot(
      `"<div group=""><button type="button" aria-label="Ok" tabindex="-1" disabled=""></button><button type="button" aria-label="Cancel" tabindex="-1"></button></div>"`
    );
    expect(el.$refButtonOk.disabled).toBe(true);
    const isPrevented = !el.$refInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(isPrevented).toBe(true);
    expect(onChange).toBeCalledTimes(0); // because selected value is not allowed

    await h.userClick(el.$refMenuLists[0].firstElementChild);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>08</li><li>09</li><li aria-selected="true">10</li><li aria-selected="false">11</li><li aria-selected="false" disabled="">12</li>",
        "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="true">AM</li><li>PM</li>",
      ]
    `);
    expect(el.$refButtonOk.disabled).toBe(false);

    // PM must be disabled
    el.blur();
    await h.wait();
    el.$options.max = new WUPTimeObject(11, 50);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true" disabled="">12</li><li disabled="">01</li><li disabled="">02</li>",
        "<li disabled="">21</li><li disabled="">22</li><li aria-selected="true" disabled="">23</li><li disabled="">24</li><li disabled="">25</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="true">AM</li><li disabled="">PM</li>",
      ]
    `);

    // again with 24h format
    await h.wait();
    el.blur();
    await h.wait();
    el.$options.format = "hh:mm";
    await h.wait(1);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true" disabled="">12</li><li disabled="">13</li><li disabled="">14</li>",
        "<li disabled="">21</li><li disabled="">22</li><li aria-selected="true" disabled="">23</li><li disabled="">24</li><li disabled="">25</li>",
      ]
    `);

    // just for coverage
    await h.wait();
    el.blur();
    await h.wait();
    jest.spyOn(el, "canShowMenu").mockReturnValueOnce(false);
    expect(() => HTMLInputElement.prototype.focus.call(el.$refInput)).not.toThrow();
    await h.wait();
    expect(el.$isShown).toBe(false);

    // only min
    el.blur();
    await h.wait();
    el.$options.max = null;
    el.$options.min = new WUPTimeObject(11, 22);
    el.$options.exclude = null;
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li disabled="">10</li><li>11</li><li aria-selected="true">12</li><li>13</li><li>14</li>",
        "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
      ]
    `);

    // only max
    el.blur();
    await h.wait();
    el.$options.min = null;
    el.$options.max = new WUPTimeObject(13, 23);
    el.$options.exclude = null;
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true">12</li><li>13</li><li disabled="">14</li>",
        "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
      ]
    `);

    // only exclude
    el.blur();
    await h.wait();
    el.$options.min = null;
    el.$options.max = null;
    el.$options.exclude = { test: (v) => v.hours === 12 && v.minutes === 22 };
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true">12</li><li>13</li><li>14</li>",
        "<li>21</li><li disabled="">22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
      ]
    `);
  });

  test("option: menuButtonsOff", async () => {
    el.$options.menuButtonsOff = true;
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true">12</li><li>01</li><li>02</li>",
        "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="true">AM</li><li>PM</li>",
      ]
    `);

    const onChange = jest.fn();
    el.$onChange = onChange;
    // Date.now is "2022-10-18T12:23:00.000Z"
    jest.clearAllMocks();
    // hh
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // 1st time focus & setValue if isEmpty
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(1);
    expect(el.$value).toEqual(new WUPTimeObject("0:23"));
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(2);
    expect(el.$value).toEqual(new WUPTimeObject("1:23"));
    // mm
    jest.clearAllMocks();
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(0);
    expect(el.$value).toEqual(new WUPTimeObject("1:23"));
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(1);
    expect(el.$value).toEqual(new WUPTimeObject("1:22"));
    // am/pm
    jest.clearAllMocks();
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(0);
    expect(el.$value).toEqual(new WUPTimeObject("1:22"));
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(1);
    expect(el.$value).toEqual(new WUPTimeObject("13:22"));
    // value same on blur
    el.blur();
    await h.wait();
    expect(el.$value).toEqual(new WUPTimeObject("13:22"));
    expect(el.$isShown).toBe(false);

    // select by Enter - no extra events
    jest.clearAllMocks();
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // 1st time focus
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(0);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(1);
    expect(el.$value).toEqual(new WUPTimeObject("14:22"));
    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait();
    expect(el.$onChange).toBeCalledTimes(1);
    expect(el.$value).toEqual(new WUPTimeObject("14:22"));
    expect(el.$isShown).toBe(false);

    // clear to previous by Escape + close
    jest.clearAllMocks();
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // 1st time focus
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(0);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    await h.wait(1);
    expect(el.$onChange).toBeCalledTimes(1);
    expect(el.$value).toEqual(new WUPTimeObject("15:22"));
    expect(isPressKeyPrevented("Escape")).toBe(true);
    await h.wait();
    expect(el.$onChange).toBeCalledTimes(2);
    expect(el.$value).toEqual(new WUPTimeObject("14:22"));
    expect(el.$isShown).toBe(false);

    // click on centered items must provide change event
    el.blur();
    el.$initValue = undefined;
    el.$value = undefined;
    await h.wait(1);
    jest.clearAllMocks();
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true">12</li><li>01</li><li>02</li>",
        "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="true">AM</li><li>PM</li>",
      ]
    `);
    expect(el.$refInput.value).toBe("");
    await h.userClick(el.$refPopup.querySelectorAll("[aria-selected]")[0]);
    expect(el.$value).toEqual(new WUPTimeObject("12:23 am"));

    el.$value = undefined;
    await h.userClick(el.$refPopup.querySelectorAll("[aria-selected]")[1]);
    expect(el.$value).toEqual(new WUPTimeObject("12:23 am"));

    el.$value = undefined;
    await h.userClick(el.$refPopup.querySelectorAll("[aria-selected]")[2]);
    expect(el.$value).toEqual(new WUPTimeObject("12:23 am"));

    // closeMenu>type>openMenu => menu must be selected according to input-value
    el.blur();
    el.$initValue = undefined;
    el.$value = undefined;
    await h.wait();
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$isShown).toBe(true);
    await h.userClick(el.$refLabel);
    expect(el.$isShown).toBe(false);
    expect(await h.userTypeText(el.$refInput, "0105p")).toBe("01:05 P|M");
    expect(el.$value).toStrictEqual(new WUPTimeObject("01:05 pm"));
    // open and check menu
    await h.userClick(el.$refLabel);
    expect(el.$isShown).toBe(true);
    expect(el.$refInput.value).toBe("01:05 PM");
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>11</li><li>12</li><li aria-selected="true">01</li><li>02</li><li>03</li>",
        "<li>03</li><li>04</li><li aria-selected="true">05</li><li>06</li><li>07</li>",
        "<li aria-hidden="true">PM</li><li aria-selected="false">AM</li><li aria-selected="true">PM</li><li aria-hidden="true">AM</li>",
      ]
    `);
  });

  test("option [min] vs [validations.min]", async () => {
    el.$options.min = new WUPTimeObject(10, 20);
    await h.wait();
    expect(el.validations.min).toEqual(new WUPTimeObject(10, 20));
    el.$value = new WUPTimeObject(10, 20);
    expect(el.$validate()).toBe(false);
    el.$value = new WUPTimeObject(10, 19);
    expect(el.$validate()).toBe("Min value is 10:20 AM");

    el.$options.min = undefined;
    await h.wait();
    expect(el.validations.min).toBe(undefined);
    expect(el.$validate()).toBe(false);
  });
});
