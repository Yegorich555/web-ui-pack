/**
 * @jest-environment jsdom
 */
import detectFocusLeft from "web-ui-pack/helpers/detectFocusLeft";

jest.useFakeTimers();

let el = document.createElement("input");
let other = document.createElement("input");
beforeAll(() => {
  el = document.createElement("input");
  el.id = 1;
  document.body.appendChild(el);

  other = document.createElement("input");
  other.id = 2;
  document.body.appendChild(other);
});

afterAll(() => {
  el.remove();
  el = null;
  other.remove();
  other = null;
  jest.clearAllTimers();
});

describe("helper.detectFocusLeft", () => {
  it("ordinary browser behavior", () => {
    const spyAddEvent = jest.spyOn(el, "addEventListener");
    const spyRemoveEvent = jest.spyOn(el, "removeEventListener");

    el.focus();
    expect(document.activeElement).toBe(el);

    const fn = jest.fn();
    // firing other.focus() is not required because detectFocusLeft should be inside onBlur event
    detectFocusLeft(el, fn);
    expect(setTimeout).toBeCalledTimes(1);
    expect(fn).not.toBeCalled();

    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
    // check if element-events destroyed
    expect(spyAddEvent.mock.calls.length).toBe(spyRemoveEvent.mock.calls.length);

    // mouse integration // the main part of it placed in e2e test /browser/detectFocusLeft.test.js
    jest.clearAllMocks();
    expect(document.activeElement.id).not.toBe(other.id);
    other.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    detectFocusLeft(el, fn);
    expect(fn).not.toBeCalled();
    other.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    expect(setTimeout).toBeCalledTimes(1);
    expect(fn).not.toBeCalled();
    // it requires, because jsdom doesn't contain click-focus behavior
    other.focus();
    expect(document.activeElement.id).toBe(other.id);
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);

    // noFocusLeft event if focusin is fired
    fn.mockClear();
    el.focus();
    detectFocusLeft(el, fn);
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    jest.advanceTimersToNextTimer();
    expect(fn).not.toBeCalled();
  });
});
