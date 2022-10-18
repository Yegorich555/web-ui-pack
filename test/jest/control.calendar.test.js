/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPCalendarControl } from "web-ui-pack";
import { PickersEnum } from "web-ui-pack/controls/calendar";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import calendarTZtest from "./control.calendar.TZ";
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

/** @type WUPCalendarControl */
let el;
initTestBaseControl({ type: WUPCalendarControl, htmlTag: "wup-calendar", onInit: (e) => (el = e) });

/** @type () => Promise<void> */
let nextFrame;
beforeEach(() => {
  nextFrame = h.useFakeAnimation().nextFrame;
  jest.setSystemTime(new Date("2022-10-18T12:00:00.000Z")); // 18 Oct 2022 12:00 UTC
});

describe("control.calendar", () => {
  testBaseControl({
    initValues: [
      { attrValue: "2022-02-28", value: new Date("2022-02-28") },
      { attrValue: "2022-03-16", value: new Date("2022-03-16") },
      { attrValue: "2022-05-20", value: new Date("2022-05-20") },
    ],
    validations: {},
    attrs: {
      min: { value: "2022-05-20" },
      max: { value: "2022-05-21" },
      exclude: { refGlobal: [new Date("2009-02-06")] },
    },
    $options: { readOnly: { ignoreInput: true } },
  });
  const daysSet = calendarTZtest();

  test("attr [startWith]", async () => {
    const set = async (s) => {
      el.remove();
      el.setAttribute("startwith", s);
      document.body.appendChild(el);
      await h.wait();
    };

    await set("day");
    expect(el.$options.startWith).toBe(PickersEnum.Day);
    expect(el.$refCalenarTitle.textContent).toBe("October 2022");

    await set("month");
    expect(el.$options.startWith).toBe(PickersEnum.Month);
    expect(el.$refCalenarTitle.textContent).toBe("2022");

    await set("year");
    expect(el.$options.startWith).toBe(PickersEnum.Year);
    expect(el.$refCalenarTitle.textContent).toBe("2018 ... 2033");

    await set("");
    expect(el.$options.startWith).toBeFalsy();
  });

  test("option starWith based on value", async () => {
    expect(el.$options.startWith).toBeUndefined();
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

    el.$refCalenarItems.firstElementChild.appendChild(span);
    el.$refCalenarTitle.appendChild(svg);
    let ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(() => el.$refCalenarItems.dispatchEvent(ev)).not.toThrow(); // click outside li-item, but directly on parent
    await h.wait();
    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    expect(ev.defaultPrevented).toBe(false);

    el.$refCalenarItems.firstElementChild.appendChild(span);
    el.$refCalenarTitle.appendChild(svg);
    ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(() => span.dispatchEvent(ev)).not.toThrow();
    await h.wait(); // click on span inside first li-item
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(ev.defaultPrevented).toBe(true);

    el.$refCalenarItems.firstElementChild.appendChild(span);
    el.$refCalenarTitle.appendChild(svg);
    ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(() => svg.dispatchEvent(ev)).not.toThrow();
    await h.wait(); // click on svg inside button-title
    expect(el.querySelector("[calendar='year']")).toBeTruthy();
    expect(ev.defaultPrevented).toBe(true);

    el.$refCalenarItems.firstElementChild.appendChild(span);
    el.$refCalenarTitle.appendChild(svg);
    ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.$refCalenarItems.firstElementChild.dispatchEvent(ev);
    await h.wait(); // click on first li-item
    expect(el.querySelector("[calendar='month']")).toBeTruthy();
    expect(ev.defaultPrevented).toBe(true);

    // click with right-button must be ignored
    const was = el.outerHTML;
    ev = new MouseEvent("click", { bubbles: true, cancelable: true, button: 1 });
    el.$refCalenarItems.firstElementChild.dispatchEvent(ev);
    await h.wait();
    expect(ev.defaultPrevented).toBe(false);
    expect(el.outerHTML).toBe(was);
    // again on title
    ev = new MouseEvent("click", { bubbles: true, cancelable: true, button: 1 });
    el.$refCalenarTitle.dispatchEvent(ev);
    await h.wait();
    expect(ev.defaultPrevented).toBe(false);
    expect(el.outerHTML).toBe(was);
  });

  test("scrolling", async () => {
    const mapContent = () => {
      const arr = new Array(el.$refCalenarItems.children.length);
      for (let i = 0; i < arr.length; ++i) {
        arr[i] = el.$refCalenarItems.children.item(i).textContent;
      }
      return arr;
    };

    const scrollNext = async (isNext) => {
      await nextFrame();
      el.$refCalenarItems.dispatchEvent(
        new WheelEvent("wheel", { cancelable: true, bubbles: true, deltaY: isNext ? 100 : -100 })
      );
      await nextFrame();
      await nextFrame();
      await nextFrame();
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
      expect(el.$refCalenarTitle.textContent).toBe(`${months[i]} 2022`);
      expect(el.$refCalenarItems.children.length).toBe(42);
      expect(`${el.$refCalenarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
      await scrollNext(true);
    }
    for (let i = arr.length - 1; i !== 0; --i) {
      await scrollNext(false);
      expect(el.$refCalenarTitle.textContent).toBe(`${months[i]} 2022`);
      expect(el.$refCalenarItems.children.length).toBe(42);
      expect(`${el.$refCalenarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    }

    // check if selectBy clicks works after scrolling
    let item = el.$refCalenarItems.children.item(2);
    expect(item?.textContent).toBe("2");
    await h.userClick(item);
    expect(el.$value).toEqual(new Date("2022-02-02"));

    // month picker
    await h.userClick(el.$refCalenarTitle);
    await h.wait();
    for (let i = 0; i < 4; ++i) {
      expect(`${el.$refCalenarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
      await scrollNext(true);
    }
    for (let i = 4; i !== 0; --i) {
      await scrollNext(false);
      expect(`${el.$refCalenarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    }

    // year picker
    await h.userClick(el.$refCalenarTitle);
    await h.wait();
    for (let i = 0; i < 4; ++i) {
      expect(`${el.$refCalenarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
      await scrollNext(true);
    }
    for (let i = 4; i !== 0; --i) {
      await scrollNext(false);
      expect(`${el.$refCalenarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    }

    // test if after scrolling selection works fine
    item = el.$refCalenarItems.children.item(2);
    expect(item.textContent).toBe("2020");
    await h.userClick(item);
    await h.wait();
    item = el.$refCalenarItems.children.item(2);
    expect(item.textContent).toBe("Mar");
    await h.userClick(item);
    await h.wait();
    item = el.$refCalenarItems.children.item(7);
    expect(item.textContent).toBe("2");
    await h.userClick(item);
    await h.wait();
    expect(el.$value.toISOString()).toBe("2020-03-02T00:00:00.000Z");

    // test manual showNext
    el.showNext(true);
    await h.wait();
    expect(`${el.$refCalenarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    el.showNext(false);
    await h.wait();
    expect(`${el.$refCalenarTitle.textContent}: ${mapContent().join(",")}`).toMatchSnapshot();
    // cover case when #showNext not ready
    el = document.createElement("wup-calendar");
    expect(() => el.showNext()).not.toThrow();

    // todo detailed scroll-tests in helper.scroll...test.js
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
    expect(el.$refCalenarTitle.textContent).toBe("March 2022");

    // checking logic of focusItem() before
    el.$options.min = new Date("2022-03-01");
    await h.wait();
    let item = el.$refCalenarItems.children[0];
    expect(item.hasAttribute("disabled")).toBe(true);
    el.focusItem(el.$refCalenarItems.children[0]);
    expect(el.$refInput).toMatchSnapshot();
    expect(item).toMatchSnapshot();
    await h.wait();
    expect(item).toMatchSnapshot();
    const prevItem = item;
    item = el.$refCalenarItems.children[el.$refCalenarItems.children.length - 1];
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
    expect(el.$refCalenarTitle.textContent).toBe("February 2022");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("27");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("1");
    expect(el.$refCalenarTitle.textContent).toBe("March 2022");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.$refCalenarTitle.textContent).toBe("February 2022");
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
    expect(el.$refCalenarTitle.textContent).toBe("January 2022");

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("1");
    expect(el.$refCalenarTitle.textContent).toBe("January 2022"); // stay the same because nextPage not allowed due to min/max
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("2");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    expect(el.$refCalenarTitle.textContent).toBe("February 2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    // PageDown + Shift => change year
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(el.$refCalenarTitle.textContent).toBe("March 2022");
    el.$refInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "PageDown", shiftKey: true, cancelable: true, bubbles: true })
    );
    expect(el.$refCalenarTitle.textContent).toBe("March 2023");
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(el.$refCalenarTitle.textContent).toBe("March 2023"); // stay the same because nextPage not allowed due to min/max
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "End", cancelable: true, bubbles: true }));
    expect(el.$refCalenarTitle.textContent).toBe("March 2023");
    expect(el.querySelector("[focused]")?.textContent).toBe("31"); // allowed to go to 31 despite on March 29 is max

    isPrevented = null;
    expect(el.querySelector("[focused]")?.hasAttribute("disabled")).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: " ", cancelable: true, bubbles: true }));
    expect(el.$value.toISOString()).not.toBe("2023-03-31T00:00:00.000Z"); // because focused is disabled

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", cancelable: true, bubbles: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: " ", cancelable: true, bubbles: true }));
    expect(el.$value.toISOString()).toBe("2023-03-01T00:00:00.000Z");
    expect(isPrevented).toBe(true);

    // PageDown + Shift => change year
    el.$refInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "PageUp", shiftKey: true, cancelable: true, bubbles: true })
    );
    expect(el.$refCalenarTitle.textContent).toBe("March 2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("1");

    isPrevented = null;
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true, bubbles: true }));
    expect(el.$value.toISOString()).toBe("2022-03-01T00:00:00.000Z");
    expect(isPrevented).toBe(true);

    // monthPicker
    el.$options.min = new Date("2021-02-15");
    await h.wait();
    await h.userClick(el.$refCalenarTitle);
    await h.wait();
    expect(el.$refCalenarTitle.textContent).toBe("2022");
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
    expect(el.$refCalenarTitle.textContent).toBe("2021");
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(el.$refCalenarTitle.textContent).toBe("2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "End", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("Dec");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("Jan");

    // yearPicker
    el.$options.min = new Date("2002-02-15");
    await h.wait();
    await h.userClick(el.$refCalenarTitle);
    await h.wait();
    expect(el.$refCalenarTitle.textContent).toBe("2018 ... 2033");
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
    expect(el.$refCalenarTitle.textContent).toBe("2002 ... 2017");
    expect(el.querySelector("[focused]")?.textContent).toBe("2002");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true, bubbles: true }));
    expect(el.$refCalenarTitle.textContent).toBe("2018 ... 2033");
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
    expect(el.$refCalenarTitle.textContent).toBe("February 2022");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("1"); // it takes first of month if no aria-selected and aria-current

    // checking when no prevSibling
    el.remove();
    el.$initValue = new Date("2022-08-01");
    document.body.appendChild(el);
    await h.wait();
    expect(el.$refCalenarItems.firstElementChild.textContent).toBe("1");
    el.focus();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")?.textContent).toBe("1");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.$refCalenarTitle.textContent).toBe("July 2022");
    expect(el.querySelector("[focused]")?.textContent).toBe("31");

    el.$options.disabled = true;
    await h.wait();
    expect(el.querySelector("[focused]")).toBeFalsy();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")).toBeFalsy();
    await h.userClick(el.$refCalenarTitle);
    await h.wait();
    expect(el.$refCalenarTitle.textContent).toBe("July 2022");

    el.$options.disabled = false;
    el.$options.readOnly = true;
    await h.wait();
    expect(el.querySelector("[focused]")).toBeFalsy();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true, bubbles: true }));
    expect(el.querySelector("[focused]")).toBeFalsy();
    await h.userClick(el.$refCalenarTitle);
    await h.wait();
    expect(el.$refCalenarTitle.textContent).toBe("July 2022");
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
    expect(el.$value).toBe(undefined);
    expect(el.querySelector("[aria-selected]")).toBeFalsy();

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true }));
    expect(el.querySelector("[aria-selected]")).toBeTruthy();
    expect(el.$value).toStrictEqual(el.$initValue);
  });
});

// todo e2e testcase: dayPickerSize === monthPickerSize === yearPickerSize
