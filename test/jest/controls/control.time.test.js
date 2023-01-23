/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPTimeControl, WUPTimeObject } from "web-ui-pack";
// import { localeInfo } from "web-ui-pack/indexHelpers";
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
// todo init tests here
/** @type WUPTimeControl */
let el;
initTestBaseControl({
  type: WUPTimeControl,
  htmlTag: "wup-time",
  onInit: (e) => {
    jest.setSystemTime(new Date("2022-10-18T12:23:00.000Z")); // 18 Oct 2022 12:00 UTC
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
      { attrValue: "02:28", value: new WUPTimeObject("02:28") },
      { attrValue: "23:16", value: new WUPTimeObject("23:16") },
      { attrValue: "12:20", value: new WUPTimeObject("12:20") },
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
      min: { value: "02:28" },
      max: { value: "23:15" },
      step: { onRemove: true },
      exclude: { refGlobal: { test: (v) => v.valueOf() === new WUPTimeObject("15:40").valueOf() } },
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
      expect(el.$options.format).toBe("hh:mm A");
      expect(el.$options.mask).toBe("00:00 //[AP]//M");
      expect(el.$options.maskholder).toBe("hh:mm *M");

      el.$options.format = "h-m";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("#0-#0");
      expect(el.$options.maskholder).toBe("hh-mm");

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
      el.focus();
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
      el.focus();
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
    el.focus();
    const onParse = jest.spyOn(el, "parseInput");
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);

    expect(el.$options.format).toBe("hh:mm A");
    await h.userTypeText(el.$refInput, "0123a");
    await h.wait(150);
    expect(el.$isOpen).toBe(true);
    expect(el.$refInput.value).toBe("01:23 AM"); // because mask is applied
    expect(el.$isValid).toBe(true);
    expect(el.$refError).toBe(undefined);
    // el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(onChange).toBeCalledTimes(1);
    expect(onParse).toBeCalled();
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value changed without key "Enter" because user completed input
    expect(el.$isOpen).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
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
    expect(el.$isOpen).toBe(false); // menu must stay closed

    h.mockConsoleWarn();
    await h.userTypeText(el.$refInput, "92A", { clearPrevious: false });
    h.unMockConsoleWarn();
    expect(el.$refInput.value).toBe("01:92 AM");
    await h.wait(1);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test:</span><span>Invalid value</span>"`
    );
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value the same
    expect(el.$isOpen).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value the same
    expect(el.$isOpen).toBe(false);
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
  });

  // test("menu navigation", async () => {
  //   const form = document.body.appendChild(document.createElement("wup-form"));
  //   form.appendChild(el);
  //   const onSubmit = jest.fn();
  //   form.$onSubmit = onSubmit;
  //   el.$options.name = "testDate";
  //   el.$initValue = new Date("2022-10-12T13:45:59.000Z");
  //   await h.wait(1);
  //   const onChanged = jest.fn();
  //   el.addEventListener("$change", onChanged);
  //   el.focus();
  //   await h.wait();
  //   expect(h.getInputCursor(el.$refInput)).toBe("|2022-10-12|");
  //   expect(el.querySelector("[calendar='year']")).toBeTruthy();
  //   expect(el.$refPopup.firstChild.$refCalenarTitle.textContent).toBe("2018 ... 2033");
  //   const isPressKeyPrevented = (key = "Arrow", opts = { shiftKey: false, ctrlKey: false }) => {
  //     const isPrevented = !el.$refInput.dispatchEvent(
  //       new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...opts })
  //     );
  //     return isPrevented;
  //   };
  //   expect(isPressKeyPrevented("ArrowRight")).toBe(true);
  //   expect(el.querySelector("[focused]")?.textContent).toBe("2022"); // start with current year
  //   expect(isPressKeyPrevented("ArrowRight")).toBe(true);
  //   expect(el.querySelector("[focused]")?.textContent).toBe("2023");
  //   expect(isPressKeyPrevented("ArrowDown")).toBe(true);
  //   expect(el.querySelector("[focused]")?.textContent).toBe("2027");
  //   expect(isPressKeyPrevented("ArrowLeft")).toBe(true);
  //   expect(el.querySelector("[focused]")?.textContent).toBe("2026");
  //   expect(isPressKeyPrevented("Home")).toBe(true);
  //   expect(el.querySelector("[focused]")?.textContent).toBe("2018");
  //   expect(isPressKeyPrevented("End")).toBe(true);
  //   expect(el.querySelector("[focused]")?.textContent).toBe("2033");
  //   // expect(h.getInputCursor(el.$refInput)).toBe("|2022-10-12|"); // WARN: in jsdom it doesn't work use e2e insted
  //   // these keys don't affects on calendar but works for input
  //   expect(isPressKeyPrevented("Home", { shiftKey: true })).toBe(false);
  //   expect(isPressKeyPrevented("End", { shiftKey: true })).toBe(false);
  //   expect(isPressKeyPrevented("Home", { ctrlKey: true })).toBe(false);
  //   expect(isPressKeyPrevented("End", { ctrlKey: true })).toBe(false);
  //   expect(isPressKeyPrevented(" ")).toBe(false);
  //   expect(el.querySelector("[focused]")?.textContent).toBe("2033");
  //   expect(isPressKeyPrevented("Enter")).toBe(true);
  //   await h.wait();
  //   expect(el.querySelector("[calendar='month']")).toBeTruthy();
  //   expect(el.$refPopup.firstChild.$refCalenarTitle.textContent).toBe("2033");
  //   expect(el.querySelector("[focused]")?.textContent).toBe("Jan");
  //   expect(isPressKeyPrevented("Enter")).toBe(true);
  //   await h.wait();
  //   expect(el.querySelector("[calendar='day']")).toBeTruthy();
  //   expect(el.$refPopup.firstChild.$refCalenarTitle.textContent).toBe("January 2033");
  //   expect(el.querySelector("[focused]")?.textContent).toBe("1");
  //   expect(isPressKeyPrevented("Enter")).toBe(true);
  //   await h.wait();
  //   expect(el.$value?.toISOString()).toBe("2033-01-01T13:45:59.000Z"); // it's must store hours
  //   expect(onChanged).toBeCalledTimes(1);
  //   expect(onSubmit).toBeCalledTimes(0);
  //   expect(el.$isValid).toBe(true);
  //   expect(isPressKeyPrevented("Enter")).toBe(true);
  //   await h.wait(1);
  //   expect(onSubmit).toBeCalledTimes(1);
  //   // checking if user can use mouse properly
  //   onChanged.mockClear();
  //   expect(el.$isOpen).toBe(false);
  //   expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   expect(el.querySelector("[calendar='day']")).toBeTruthy(); // dayPicker because it was stored previously by calendar
  //   // force to remove calendar (to startWith year again)
  //   el.blur();
  //   await h.wait(1);
  //   el.focus();
  //   await h.wait();
  //   expect(el.querySelector("[calendar='year']")).toBeTruthy();
  //   await h.userClick(el.$refPopup.firstChild.$refCalenarItems.firstElementChild); // click on 2018
  //   await h.wait();
  //   expect(el.querySelector("[calendar='month']")).toBeTruthy();
  //   await h.userClick(el.$refPopup.firstChild.$refCalenarItems.children[1]); // click on Feb
  //   await h.wait();
  //   expect(el.querySelector("[calendar='day']")).toBeTruthy();
  //   expect(el.$refPopup.firstChild.$refCalenarTitle.textContent).toBe("February 2018");
  //   await h.userClick(el.$refPopup.firstChild.$refCalenarItems.children[6]); // click on 4 February 2018
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(el.$value?.toISOString()).toBe("2018-02-04T13:45:59.000Z"); // it's must store hours
  //   expect(onChanged).toBeCalledTimes(1);
  //   expect(isPressKeyPrevented("Home")).toBe(false); // keys must works only for input when is closed
  // });

  test("value change not affects on popup", async () => {
    el.focus();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    el.$value = new WUPTimeObject(12, 56);
    await h.wait();
    expect(el.$isOpen).toBe(true);
  });
});
