import { WUPTextControl } from "web-ui-pack";
import * as h from "../testHelper";

/** @type WUPTextControl */
let el;
!WUPTextControl && console.error("missed");

beforeEach(() => {
  jest.useFakeTimers();
  el = document.createElement("wup-text");
  document.body.appendChild(el);
  jest.advanceTimersByTime(1); // wait for ready
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("control.text", () => {
  h.baseTestComponent(() => document.createElement("wup-text"), { attrs: { initvalue: { skip: true } } });

  test("attr [initvalue] >> $initValue", () => {
    expect(el.$isReady).toBeTruthy();
    el.setAttribute("initvalue", "123");
    expect(el.getAttribute("initValue")).toBe("123");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe("123");

    el.$initValue = "some txt";
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe("some txt");
    expect(el.getAttribute("initvalue")).toBe(null);

    el.setAttribute("initvalue", "34");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe("34");
    expect(el.getAttribute("initvalue")).toBe("34");

    el.removeAttribute("initvalue");
    jest.advanceTimersByTime(1);
    expect(el.getAttribute("initvalue")).toBe(null);
    expect(el.$initValue).toBe(undefined);
  });
});
