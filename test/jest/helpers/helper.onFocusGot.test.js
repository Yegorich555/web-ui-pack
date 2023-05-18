import onFocusGot from "web-ui-pack/helpers/onFocusGot";
import { userPressTab } from "../../testHelper";

jest.useFakeTimers();

let el = document.createElement("input");
let other = document.createElement("input");
beforeEach(() => {
  el = document.body.appendChild(document.createElement("input"));
  other = document.body.appendChild(document.createElement("input"));
});

afterEach(() => {
  el.remove();
  el = null;
  other.remove();
  other = null;
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("helper.onFocusGot", () => {
  test("memory leaking", () => {
    const fn = jest.fn();
    const spyOn = jest.spyOn(document, "addEventListener");
    const spyOff = jest.spyOn(document, "removeEventListener");
    const spyOnEl = jest.spyOn(el, "addEventListener");
    const spyOffEl = jest.spyOn(el, "removeEventListener");
    const remove = onFocusGot(el, fn);

    el.focus();
    other.dispatchEvent(new Event("mousedown", { bubbles: true }));
    el.blur();
    other.dispatchEvent(new Event("mouseup", { bubbles: true }));
    other.dispatchEvent(new Event("click", { bubbles: true }));
    other.focus();
    remove();

    expect(spyOn).toBeCalled();
    expect(spyOnEl).toBeCalled();
    expect(spyOn).toBeCalledTimes(spyOff.mock.calls.length);
    expect(spyOnEl).toBeCalledTimes(spyOffEl.mock.calls.length);

    remove(); // check if it's possible again

    // checking self-removing with once: true
    fn.mockClear();
    spyOn.mockClear();
    spyOff.mockClear();
    spyOnEl.mockClear();
    spyOffEl.mockClear();
    onFocusGot(el, fn, { once: true });

    el.focus();
    other.dispatchEvent(new Event("mousedown", { bubbles: true }));
    el.blur();
    other.dispatchEvent(new Event("mouseup", { bubbles: true }));
    other.dispatchEvent(new Event("click", { bubbles: true }));
    other.focus();

    expect(spyOn).toBeCalled();
    expect(spyOnEl).toBeCalled();
    expect(spyOn).toBeCalledTimes(spyOff.mock.calls.length);
    expect(spyOnEl).toBeCalledTimes(spyOffEl.mock.calls.length);

    // check if self-removing works
    fn.mockClear();
    other.focus();
    el.focus();
    other.focus();
    expect(fn).not.toBeCalled();
  });

  test("ordinary behavior", () => {
    const fn = jest.fn();
    const remove = onFocusGot(el, fn);

    // checking first case
    el.focus();
    expect(document.activeElement).toBe(el);
    el.blur();
    expect(document.activeElement).not.toBe(el);
    expect(fn).toBeCalledTimes(1);

    // checking again
    el.focus();
    expect(document.activeElement).toBe(el);
    other.focus();
    expect(document.activeElement).not.toBe(el);
    expect(fn).toBeCalledTimes(2);

    // checking if remove works
    remove();
    fn.mockClear();
    el.focus();
    other.focus();
    expect(fn).not.toBeCalled();

    // checking options once
    onFocusGot(el, fn, { once: true });
    el.focus();
    other.focus();
    expect(fn).toBeCalledTimes(1);
    fn.mockClear();
    el.focus();
    other.focus();
    expect(fn).not.toBeCalled();

    // other complex click-focus tests see in ./browser/helper.onFocusGot.test
  });

  // case possible when user moves focus into dev-console
  test("focusout but activeElement stay", async () => {
    const div = document.body.appendChild(document.createElement("div"));
    const in1 = div.appendChild(document.createElement("input"));
    const in2 = div.appendChild(document.createElement("input"));

    const fn = jest.fn();
    let remove = onFocusGot(div, fn);

    in1.focus();
    fn.mockClear();
    // hook for simulation case when activeElement is not changed
    const r = jest.spyOn(document, "activeElement", "get").mockImplementation(() => in1);
    in1.blur();
    expect(document.activeElement).toBe(in1);
    r.mockRestore();
    in1.focus();
    expect(document.activeElement).toBe(in1);
    expect(fn).not.toBeCalled(); // onFocusGot isn't fired because activeElement isn't changed so focus wasn't lost previously

    // try again
    in2.focus();
    expect(document.activeElement).toBe(in2);
    expect(fn).not.toBeCalled();

    const btn = document.body.appendChild(document.createElement("button"));
    await userPressTab(btn);
    expect(fn).not.toBeCalled();

    in1.focus();
    expect(fn).toBeCalledTimes(1);
    remove();

    // case when previously was focused
    fn.mockClear();
    expect(document.activeElement).toBe(in1);
    remove = onFocusGot(div, fn);
    in2.focus();
    expect(fn).not.toBeCalled(); // because focus for <div/> not changed
  });

  test("remove before event fired", () => {
    const fn = jest.fn();
    const remove = onFocusGot(el, fn);
    remove();
  });
});
