import { onFocusLost } from "web-ui-pack";

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

describe("helper.onFocusLost", () => {
  test("memory leaking", () => {
    const fn = jest.fn();
    const spyOn = jest.spyOn(document, "addEventListener");
    const spyOff = jest.spyOn(document, "removeEventListener");
    const spyOnEl = jest.spyOn(el, "addEventListener");
    const spyOffEl = jest.spyOn(el, "removeEventListener");
    const remove = onFocusLost(el, fn);

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
    onFocusLost(el, fn, { once: true, debounceMs: 1 });

    el.focus();
    other.dispatchEvent(new Event("mousedown", { bubbles: true }));
    el.blur();
    other.dispatchEvent(new Event("mouseup", { bubbles: true }));
    other.dispatchEvent(new Event("click", { bubbles: true }));
    other.focus();
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);

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
    const remove = onFocusLost(el, fn);

    el.focus();
    expect(document.activeElement).toBe(el);
    expect(fn).not.toBeCalled();
    other.focus();
    expect(fn).toBeCalledTimes(1);
    el.focus();
    expect(fn).toBeCalledTimes(1);
    other.focus();
    expect(fn).toBeCalledTimes(2);

    document.body.appendChild(document.createElement("input")).focus();
    expect(document.activeElement).not.toBe(el);
    expect(document.activeElement).not.toBe(other);
    fn.mockClear();
    const fn2 = jest.fn();
    const remove2 = onFocusLost(other, fn2);
    el.focus();
    expect(fn).not.toBeCalled();
    other.focus();
    expect(fn).toBeCalledTimes(1);
    el.focus();
    expect(fn2).toBeCalledTimes(1);

    remove();
    remove2();

    // testing removing
    fn.mockClear();
    fn2.mockClear();
    other.focus();
    el.focus();
    other.focus();
    expect(fn).not.toBeCalled();
    expect(fn2).not.toBeCalled();
    // other complex click-focus tests see in ./browser/helper.onFocusLost.test
  });

  // case possible when user moves focus into dev-console
  test("focusout but activeElement stay", () => {
    const in1 = document.body.appendChild(document.createElement("input"));
    in1.focus();
    expect(document.activeElement).toBe(in1);

    const fn = jest.fn();
    const remove = onFocusLost(in1, fn);
    // hook for simulation case when activeElement is not changed
    jest.spyOn(document, "activeElement", "get").mockImplementation(() => in1);
    in1.blur();
    expect(document.activeElement).toBe(in1);
    expect(fn).not.toBeCalled();
    remove();
  });

  test("focus on div with 2 inputs", () => {
    const div = document.body.appendChild(document.createElement("div"));
    const in1 = div.appendChild(document.createElement("input"));
    const in2 = div.appendChild(document.createElement("input"));
    const fn = jest.fn();
    const remove = onFocusLost(div, fn);

    in1.focus();
    expect(document.activeElement).toBe(in1);
    in2.focus();
    expect(document.activeElement).toBe(in2);
    expect(fn).not.toBeCalled();
    el.focus();
    expect(document.activeElement).not.toBe(in2);
    expect(fn).toBeCalledTimes(1);

    in1.focus();
    expect(document.activeElement).toBe(in1);
    in1.blur();
    expect(document.activeElement).not.toBe(in1);
    expect(fn).toBeCalledTimes(2);

    remove();
  });

  test("simulate mouseDown > mouseUp", () => {
    const fn = jest.fn();
    const remove = onFocusLost(el, fn, { debounceMs: 50 });

    el.focus();
    other.dispatchEvent(new Event("mousedown", { bubbles: true }));
    el.blur();
    expect(document.activeElement).not.toBe(el);
    expect(fn).not.toBeCalled();
    other.dispatchEvent(new Event("mouseup", { bubbles: true }));
    other.dispatchEvent(new Event("click", { bubbles: true }));
    other.focus();
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalled();

    remove();
  });
});
