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
  calendarTZtest();

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
});
