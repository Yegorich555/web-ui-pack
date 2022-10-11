/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPCalendarControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import calendarTZtest from "./control.calendar.TZ";
import * as h from "../testHelper";

beforeAll(() => {
  jest.useFakeTimers();
  if (new Date().getTimezoneOffset() !== 0) {
    throw new Error(
      `
      Missed timezone 'UTC'.
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
});

describe("control.calendar", () => {
  // todo implement basic tests
  // testBaseControl({
  //   // noInputSelection: true,
  //   initValues: [
  //     { attrValue: "2022-02-28", value: new Date("2022-02-28") },
  //     { attrValue: "2022-03-16", value: new Date("2022-02-28") },
  //     { attrValue: "2022-03-18", value: new Date("2022-03-18") },
  //   ],
  //   validations: {},
  //   // attrs: { items: { skip: true } },
  //   // $options: { items: { skip: true } },
  // });
  const daysSet = calendarTZtest();

  test("no isChanged on the same date", () => {
    el.$initValue = new Date(2022, 10, 1);
    el.$value = new Date(2022, 10, 1);
    expect(el.$value !== el.$initValue).toBe(true);
    expect(el.$isChanged).toBe(false);
    el.$value = new Date(2022, 10, 2);
    expect(el.$isChanged).toBe(true);
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
});
