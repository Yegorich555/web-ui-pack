/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPCalendarControl } from "web-ui-pack";
import { PickersEnum } from "web-ui-pack/controls/calendar";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import calendarTZtest from "./control.calendar.TZ";
import * as h from "../../testHelper";

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

/** @type () => Promise<void> */
let nextFrame;
beforeEach(() => {
  jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
  nextFrame = h.useFakeAnimation().nextFrame;
});

/** @type WUPCalendarControl */
let el;
initTestBaseControl({
  type: WUPCalendarControl,
  htmlTag: "wup-calendar",
  onInit: (e) => {
    jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
    el = e;
  },
});

describe("control.calendar", () => {
  testBaseControl({
    initValues: [
      { attrValue: "2022-02-28", value: new Date("2022-02-28"), urlValue: "2022-02-28" },
      { attrValue: "2022-03-16", value: new Date("2022-03-16"), urlValue: "2022-03-16" },
      { attrValue: "2022-05-20", value: new Date("2022-05-20"), urlValue: "2022-05-20" },
    ],
    validations: {},
    attrs: {
      "w-utc": { value: true },
      "w-min": { value: "2022-05-20", parsedValue: new Date("2022-05-20") },
      "w-max": { value: "2022-05-21", parsedValue: new Date("2022-05-21") },
      "w-exclude": { value: [new Date("2009-02-06")] },
      "w-startwith": { skip: true }, // tested manually
      "w-endwith": { skip: true }, // tested manually
      "w-firstweekday": { value: 1 },
    },
    $options: { readOnly: { ignoreInput: true } },
  });
  const daysSet = calendarTZtest();

  test("attr [startWith]", async () => {
    const set = async (s) => {
      el.remove();
      el.setAttribute("w-startwith", s);
      document.body.appendChild(el);
      await h.wait();
    };

    await set("day");
    expect(el.$options.startWith).toBe(PickersEnum.Day);
    expect(el.$refCalendarTitle.textContent).toBe("October 2022");

    await set("month");
    expect(el.$options.startWith).toBe(PickersEnum.Month);
    expect(el.$refCalendarTitle.textContent).toBe("2022");

    await set("year");
    expect(el.$options.startWith).toBe(PickersEnum.Year);
    expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");

    await set("");
    expect(el.$options.startWith).toBeFalsy();
  });

  test("option endWith", async () => {
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);
    const getDisabled = () => Array.from(el.querySelectorAll("li[disabled]")).map((li) => li.textContent);
    const pressKey = (key) =>
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true }));
    const setAttr = async (s) => {
      el.setAttribute("w-endwith", s);
      await h.wait();
    };

    // attr [endWith]
    await setAttr("month");
    expect(el.$options.endWith).toBe(PickersEnum.Month);
    expect(el.querySelector("[calendar='year']")).toBeTruthy(); // because $value is empty
    await setAttr("Year");
    expect(el.$options.endWith).toBe(PickersEnum.Year);
    await setAttr("day");
    expect(el.$options.endWith).toBe(PickersEnum.Day);
    await setAttr("");
    expect(el.$options.endWith).toBe(null);
    await setAttr("wrong");
    expect(el.$options.endWith).toBe(null);
    el.removeAttribute("w-endwith");

    // endWith: month
    el.remove();
    el.$options.endWith = PickersEnum.Month;
    el.$options.startWith = PickersEnum.Day; // ignored because it's lower than endWith
    el.$initValue = new Date("2022-05-20T23:50:00.000Z");
    document.body.appendChild(el);
    await h.wait();
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(el.$refCalendarTitle.textContent).toBe("2022");
    expect(el.querySelector("[aria-selected]")?.textContent).toBe("May");
    expect(el.$refInput.value).toBe("May 2022");

    // click on month selects value instead of showing day picker
    await h.userClick(el.$refCalendarItems.children.item(6)); // Jul
    await h.wait();
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(el.querySelector("[aria-selected]")?.textContent).toBe("Jul");
    expect(onChange).toBeCalledTimes(1);
    expect(el.$value?.toISOString()).toBe("2022-07-01T23:50:00.000Z"); // 1st day of month with saved hours
    expect(el.$refInput.value).toBe("July 2022");

    // click on year shows month picker
    await h.userClick(el.$refCalendarTitle);
    await h.wait();
    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    await h.userClick(el.$refCalendarItems.children.item(2)); // 2020
    await h.wait();
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(el.$refCalendarTitle.textContent).toBe("2020");
    expect(onChange).toBeCalledTimes(1);

    // keyboard
    el.focus();
    pressKey("ArrowRight");
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");
    pressKey("ArrowDown");
    expect(el.querySelector("[focused]")?.textContent).toBe("May");
    pressKey("Enter");
    await h.wait();
    expect(onChange).toBeCalledTimes(2);
    expect(el.$value?.toISOString()).toBe("2020-05-01T23:50:00.000Z");
    expect(el.querySelector("[calendar='month']")).toBeTruthy();

    // any excluded day disables the whole month
    el.$options.exclude = [new Date("2020-02-10"), new Date("2020-02-11"), new Date("2021-07-01")];
    await h.wait();
    expect(getDisabled()).toEqual(["Feb"]);

    // endWith: year
    onChange.mockClear();
    el.$options.endWith = PickersEnum.Year;
    await h.wait();
    expect(el.querySelector("[calendar='year']")).toBeTruthy(); // lower picker is changed to allowed
    expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");
    expect(getDisabled()).toEqual(["2020", "2021"]); // any excluded day disables the whole year
    expect(el.$refInput.value).toBe("2020");
    await h.userClick(el.$refCalendarItems.children.item(1)); // 2019
    await h.wait();
    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    expect(el.querySelector("[aria-selected]")?.textContent).toBe("2019");
    expect(onChange).toBeCalledTimes(1);
    expect(el.$value?.toISOString()).toBe("2019-01-01T23:50:00.000Z"); // 1st January with saved hours
    expect(el.$refInput.value).toBe("2019");
    await h.userClick(el.$refCalendarItems.children.item(2)); // 2020 is disabled
    await h.wait();
    expect(onChange).toBeCalledTimes(1);

    // without value it starts with year picker
    el.remove();
    el.$options.endWith = PickersEnum.Month;
    el.$options.startWith = null;
    el.$options.exclude = null;
    el.$initValue = undefined;
    el.$value = undefined;
    document.body.appendChild(el);
    await h.wait();
    expect(el.querySelector("[calendar='year']")).toBeTruthy();

    // changing endWith on day picker
    el.remove();
    el.$options.endWith = null;
    el.$value = new Date("2022-05-20");
    document.body.appendChild(el);
    await h.wait();
    expect(el.querySelector("[calendar='day']")).toBeTruthy();
    el.$options.endWith = PickersEnum.Month;
    await h.wait();
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(el.querySelector("[aria-selected]")?.textContent).toBe("May");
  });

  test("option starWith based on value", async () => {
    expect(el.$options.startWith).toBeFalsy();
    expect(el.$initValue).toBeFalsy();
    expect(el.querySelector("[calendar='year']")).toBeTruthy();

    el.$initValue = new Date(Date.UTC(2022, 10, 1));
    el.remove();
    document.body.appendChild(el);
    await h.wait();
    expect(el.querySelector("[calendar='day']")).toBeTruthy();
  });

  test("no isChanged on the same date", () => {
    el.$initValue = new Date(2022, 10, 1);
    el.$value = new Date(2022, 10, 1);
    expect(el.$value !== el.$initValue).toBe(true);
    expect(el.$isChanged).toBe(false);
    el.$value = new Date(2022, 10, 2);
    expect(el.$isChanged).toBe(true);
  });

  test("browser autofill", async () => {
    el.focus();
    await h.wait();
    el.$refInput.value = "2022-10-30";
    el.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(el.$value).toStrictEqual(new Date("2022-10-30"));
  });

  test("clicks handled properly", async () => {
    jest.setSystemTime(new Date(2022, 10, 16, 23, 49));
    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    const span = document.createElement("span");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.focus();

    el.$refCalendarItems.firstElementChild.appendChild(span);
    el.$refCalendarTitle.appendChild(svg);
    let ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(() => el.$refCalendarItems.dispatchEvent(ev)).not.toThrow(); // click outside li-item, but directly on parent
    await h.wait();
    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    expect(ev.defaultPrevented).toBe(false);

    el.$refCalendarItems.firstElementChild.appendChild(span);
    el.$refCalendarTitle.appendChild(svg);
    ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(() => span.dispatchEvent(ev)).not.toThrow();
    await h.wait(); // click on span inside first li-item
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(ev.defaultPrevented).toBe(true);

    el.$refCalendarItems.firstElementChild.appendChild(span);
    el.$refCalendarTitle.appendChild(svg);
    ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(() => svg.dispatchEvent(ev)).not.toThrow();
    await h.wait(); // click on svg inside button-title
    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    expect(ev.defaultPrevented).toBe(true);

    el.$refCalendarItems.firstElementChild.appendChild(span);
    el.$refCalendarTitle.appendChild(svg);
    ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.$refCalendarItems.firstElementChild.dispatchEvent(ev);
    await h.wait(); // click on first li-item
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(ev.defaultPrevented).toBe(true);

    // click with right-button must be ignored
    const was = el.outerHTML;
    ev = new MouseEvent("click", { bubbles: true, cancelable: true, button: 1 });
    el.$refCalendarItems.firstElementChild.dispatchEvent(ev);
    await h.wait();
    expect(ev.defaultPrevented).toBe(false);
    expect(el.outerHTML).toBe(was);
    // again on title
    ev = new MouseEvent("click", { bubbles: true, cancelable: true, button: 1 });
    el.$refCalendarTitle.dispatchEvent(ev);
    await h.wait();
    expect(ev.defaultPrevented).toBe(false);
    expect(el.outerHTML).toBe(was);

    // click between items
    await expect(h.userClick(el.$refCalendarItems.parentElement)).resolves.not.toThrow();
  });

  test("scrolling", async () => {
    const mapContent = () => {
      const arr = new Array(el.$refCalendarItems.children.length);
      for (let i = 0; i < arr.length; ++i) {
        arr[i] = el.$refCalendarItems.children.item(i).textContent;
      }
      return arr;
    };

    const scrollNext = async (isNext) => {
      await nextFrame();
      el.$refCalendarItems.dispatchEvent(
        new WheelEvent("wheel", { cancelable: true, bubbles: true, deltaY: isNext ? 100 : -100 })
      );
      await nextFrame();
      await nextFrame();
      await nextFrame();
      // jest.advanceTimersByTime(1);
      await h.wait(100);
    };

    el.remove();
    el.$options.utc = true;
    el.$initValue = new Date("2022-01-31");
    document.body.appendChild(el);
    await h.wait();

    const arr = daysSet[0].days;
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    // day picker
    for (let i = 0; i < arr.length; ++i) {
      expect(el.$refCalendarTitle.textContent).toBe(`${months[i]} 2022`);
      expect(el.$refCalendarItems.children.length).toBe(42);
      expect(`${el.$refCalendarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
      await scrollNext(true);
    }
    for (let i = arr.length - 1; i !== 0; --i) {
      await scrollNext(false);
      expect(el.$refCalendarTitle.textContent).toBe(`${months[i]} 2022`);
      expect(el.$refCalendarItems.children.length).toBe(42);
      expect(`${el.$refCalendarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    }

    // check if selectBy clicks works after scrolling
    let item = el.$refCalendarItems.children.item(2);
    expect(item?.textContent).toBe("2");
    await h.userClick(item);
    expect(el.$value).toEqual(new Date("2022-02-02"));

    // month picker
    await h.userClick(el.$refCalendarTitle);
    await h.wait();
    for (let i = 0; i < 4; ++i) {
      expect(`${el.$refCalendarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
      await scrollNext(true);
    }
    for (let i = 4; i !== 0; --i) {
      await scrollNext(false);
      expect(`${el.$refCalendarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    }

    // year picker
    await h.userClick(el.$refCalendarTitle);
    await h.wait();
    for (let i = 0; i < 4; ++i) {
      expect(`${el.$refCalendarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
      await scrollNext(true);
    }
    for (let i = 4; i !== 0; --i) {
      await scrollNext(false);
      expect(`${el.$refCalendarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    }

    // test if after scrolling selection works fine
    item = el.$refCalendarItems.children.item(2);
    expect(item.textContent).toBe("2020");
    await h.userClick(item);
    await h.wait();
    item = el.$refCalendarItems.children.item(2);
    expect(item.textContent).toBe("Mar");
    await h.userClick(item);
    await h.wait();
    item = el.$refCalendarItems.children.item(7);
    expect(item.textContent).toBe("2");
    await h.userClick(item);
    await h.wait();
    expect(el.$value.toISOString()).toBe("2020-03-02T00:00:00.000Z");

    // test manual showNext
    el.showNext(true);
    await h.wait();
    expect(`${el.$refCalendarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    el.showNext(false);
    await h.wait();
    expect(`${el.$refCalendarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    // cover case when #showNext not ready
    el = document.createElement("wup-calendar");
    expect(() => el.showNext()).not.toThrow();

    // detailed scroll-tests in helper.scrollCarousel.test.js
  });

  test("keyboard", async () => {
    jest.setSystemTime(new Date("2022-03-20"));
    el.remove();
    el.$options.utc = true;
    el.$initValue = new Date("2022-03-15");
    document.body.appendChild(el);
    await h.wait();
    el.focus();
    let isPrevented = false;
    document.body.addEventListener("keydown", (e) => (isPrevented = e.defaultPrevented));

    expect(el.querySelector("[calendar='day']")).toBeTruthy();
    expect(el.$refCalendarTitle.textContent).toBe("March 2022");

    // checking logic of focusItem() before
    el.$options.min = new Date("2022-03-01");
    await h.wait();
    let item = el.$refCalendarItems.children[0];
    expect(item.hasAttribute("disabled")).toBe(true);
    el.focusItem(el.$refCalendarItems.children[0]);
    expect(el.$refInput).toMatchSnapshot();
    expect(item).toMatchSnapshot();
    await h.wait();
    expect(item).toMatchSnapshot();
    const prevItem = item;
    item = el.$refCalendarItems.children[el.$refCalendarItems.children.length - 1];
    el.focusItem(item);
    await h.wait();
    expect(el.$refInput).toMatchSnapshot();
    expect(item).toMatchSnapshot();
    expect(prevItem).toMatchSnapshot();
    el.blur();
    await h.wait(); // focus
    expect(el.querySelector("[focused]")).toBeFalsy();
    expect(el.$refInput).toMatchSnapshot();
    expect(item).toMatchSnapshot();

    // checking dayPicker
    el.$options.min = new Date("2022-01-01");
    el.$options.max = new Date("2023-03-29");
    el.focus();
    await h.wait();
    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(false); // because no selected item
    expect(el.querySelector("[focused]")).toBeFalsy();

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("15"); // must be on initValue at first

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("16");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("15");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("14");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("21");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("14");

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("7");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("28");
    expect(el.$refCalendarTitle.textContent).toBe("February 2022");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("27");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("1");
    expect(el.$refCalendarTitle.textContent).toBe("March 2022");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("February 2022");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("27");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "End", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("28");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("1");
    expect(el.$refCalendarTitle.textContent).toBe("January 2022");

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("1");
    expect(el.$refCalendarTitle.textContent).toBe("January 2022"); // stay the same because nextPage not allowed due to min/max
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.$refCalendarTitle.textContent).toBe("February 2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    // PageDown + Shift => change year
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("March 2022");
    el.$refInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "PageDown", shiftKey: true, cancelable: true, bubbles: true })
    );
    expect(el.$refCalendarTitle.textContent).toBe("March 2023");
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("March 2023"); // stay the same because nextPage not allowed due to min/max
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "End", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("March 2023");
    expect(el.querySelector("[focused]")?.textContent).toBe("31"); // allowed to go to 31 despite on March 29 is max

    isPrevented = null;
    expect(el.querySelector("[focused]")?.hasAttribute("disabled")).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: " ", cancelable: true, bubbles: true }));
    expect(el.$value.toISOString()).not.toBe("2023-03-31T00:00:00.000Z"); // because focused is disabled

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", cancelable: true, bubbles: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: " ", cancelable: true, bubbles: true }));
    await h.wait(1);
    expect(el.$value.toISOString()).toBe("2023-03-01T00:00:00.000Z");
    expect(isPrevented).toBe(true);

    // PageDown + Shift => change year
    el.$refInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "PageUp", shiftKey: true, cancelable: true, bubbles: true })
    );
    expect(el.$refCalendarTitle.textContent).toBe("March 2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true, bubbles: true }));
    await h.wait(1);
    expect(el.$value.toISOString()).toBe("2022-03-01T00:00:00.000Z");
    expect(isPrevented).toBe(true);

    // monthPicker
    el.$options.min = new Date("2021-02-15");
    await h.wait();
    await h.userClick(el.$refCalendarTitle);
    await h.wait();
    expect(el.$refCalendarTitle.textContent).toBe("2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("Mar");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("Feb");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("Jun");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("Feb");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("2021");
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "End", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("Dec");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");

    // yearPicker
    el.$options.min = new Date("2002-02-15");
    await h.wait();
    await h.userClick(el.$refCalendarTitle);
    await h.wait();
    expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");
    expect(el.querySelector("[focused]")?.textContent).toBe("2018");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2020");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2019");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2023");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2019");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("2002 ... 2017");
    expect(el.querySelector("[focused]")?.textContent).toBe("2002");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");
    expect(el.querySelector("[focused]")?.textContent).toBe("2018");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "End", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2033");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2018");

    // skip when user clicks alt
    expect(el.querySelector("[focused]")?.textContent).toBe("2018");
    isPrevented = null;
    el.$refInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true, cancelable: true, bubbles: true })
    );
    expect(isPrevented).toBe(false);
    expect(el.querySelector("[focused]")?.textContent).toBe("2018");

    // just for coverage => any other key
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "S", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2018");

    // checking focusFirst
    jest.setSystemTime(new Date("2022-03-20"));
    el.remove();
    el.$options.startWith = PickersEnum.Day;
    el.$initValue = undefined;
    el.$value = undefined;
    document.body.appendChild(el);
    await h.wait();
    el.focus();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("20"); // it takes aria-current if aria-selected not defined

    el.focusItem(null);
    el.showNext(false);
    await h.wait();
    expect(el.$refCalendarTitle.textContent).toBe("February 2022");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("1"); // it takes first of month if no aria-selected and aria-current

    // checking when no prevSibling
    el.remove();
    el.$initValue = new Date("2022-08-01");
    document.body.appendChild(el);
    await h.wait();
    expect(el.$refCalendarItems.firstElementChild.textContent).toBe("1");
    el.focus();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("1");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.$refCalendarTitle.textContent).toBe("July 2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("31");

    el.$options.disabled = true;
    await h.wait();
    expect(el.querySelector("[focused]")).toBeFalsy();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")).toBeFalsy();
    await h.userClick(el.$refCalendarTitle);
    await h.wait();
    expect(el.$refCalendarTitle.textContent).toBe("July 2022");

    el.$options.disabled = false;
    el.$options.readOnly = true;
    await h.wait();
    expect(el.querySelector("[focused]")).toBeFalsy();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")).toBeFalsy();
    await h.userClick(el.$refCalendarTitle);
    await h.wait();
    expect(el.$refCalendarTitle.textContent).toBe("July 2022");
  });

  test("clear by Esc", async () => {
    el.remove();
    el.$initValue = new Date();
    document.body.appendChild(el);
    await h.wait();
    expect(el.$value).toBeTruthy();
    expect(el.querySelector("[aria-selected]")).toBeTruthy();
    el.focus();

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true }));
    jest.advanceTimersByTime(1);
    expect(el.$value).toBe(undefined);
    expect(el.querySelector("[aria-selected]")).toBeFalsy();

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true }));
    jest.advanceTimersByTime(1);
    expect(el.querySelector("[aria-selected]")).toBeTruthy();
    expect(el.$value).toStrictEqual(el.$initValue);
  });

  test("animation", async () => {
    el.remove();
    el.$options.startWith = PickersEnum.Day;
    document.body.appendChild(el);
    await h.wait();

    const animEl = el.$refCalendar.children[1].children[0];
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (animEl === elem) {
        return { animationDuration: "0.3s" };
      }
      return orig(elem);
    });

    expect(el.$refCalendarTitle.textContent).toBe("October 2022");
    await h.userClick(el.$refCalendarTitle);
    expect(animEl.getAttribute("zoom")).toBe("out");
    await h.wait(300); // cases when events not fired
    expect(animEl.getAttribute("zoom")).toBe("out2");
    animEl.dispatchEvent(new Event("animationstart"));
    animEl.dispatchEvent(new Event("animationend"));
    await Promise.resolve();
    expect(animEl.getAttribute("zoom")).toBe(null);
    await h.wait();

    expect(el.$refCalendarTitle.textContent).toBe("2022");
    await h.userClick(el.$refCalendarTitle);
    expect(animEl.getAttribute("zoom")).toBe("out");
    await h.wait(300); // cases when events not fired
    expect(animEl.getAttribute("zoom")).toBe("out2");
    animEl.dispatchEvent(new Event("animationstart"));
    await h.wait(300); // cases when animationend event somehow destroyed
    await Promise.resolve();
    expect(animEl.getAttribute("zoom")).toBe(null);
    await h.wait();

    expect(el.$refCalendarTitle.textContent).toBe("2018 ... 2033");
    await h.userClick(el.$refCalendarItems.firstElementChild);
    expect(animEl.getAttribute("zoom")).toBe("in");
    await h.wait(300);
    expect(animEl.getAttribute("zoom")).toBe("in2");
    await h.wait(300);
    expect(animEl.getAttribute("zoom")).toBe(null);
    await h.wait();

    expect(el.$refCalendarTitle.textContent).toBe("2018");
    await h.userClick(el.$refCalendarItems.firstElementChild);
    expect(animEl.getAttribute("zoom")).toBe("in");
    await h.wait(300);
    expect(animEl.getAttribute("zoom")).toBe("in2");
    await h.wait(300);
    expect(animEl.getAttribute("zoom")).toBe(null);
    await h.wait();
    expect(el.$refCalendarTitle.textContent).toBe("January 2018");
  });

  test("save hh even when no $value but has $initValue", async () => {
    el.remove();
    el.$options.startWith = PickersEnum.Day;
    el.$initValue = new Date("2022-12-13T23:46:57.987Z");
    document.body.appendChild(el);
    await h.wait();
    expect(el.$refCalendarTitle.textContent).toBe("December 2022");
    el.$value = undefined;
    await h.userClick(el.$refCalendarItems.children[6]);
    await h.wait();
    expect(el.$value?.toISOString()).toBe("2022-12-04T23:46:57.987Z");
  });
});
