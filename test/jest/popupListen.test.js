import { WUPPopup } from "web-ui-pack/popup/popupElement.types";
import popupListen from "web-ui-pack/popup/popupListen";
import * as h from "../testHelper";

/** @type HTMLInputElement */
let target;
/** @type HTMLDivElement */
let popup;
let isOpen = false;
let onShow = jest.fn();
let onHide = jest.fn();
/** @type ReturnType<typeof popupListen> */
let ref;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  target = document.body.appendChild(document.createElement("input"));
  onShow = jest.fn().mockImplementation(() => {
    isOpen = true;
    if (!popup) {
      popup = document.body.appendChild(document.createElement("div"));
    }
    return popup;
  });
  onHide = jest.fn().mockImplementation(() => {
    isOpen = false;
    return true;
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  popup = null;
  isOpen = false;
  ref?.stopListen();
});

describe("popupListen", () => {
  test("default behavior", async () => {
    const spy = h.spyEventListeners();
    ref = popupListen({ target, showCase: WUPPopup.ShowCases.onClick }, onShow, onHide);

    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    expect(isOpen).toBe(true);

    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    expect(isOpen).toBe(false);
    ref.stopListen();
    spy.check();
  });

  test("memory leak", async () => {
    const spy = h.spyEventListeners();
    ref = popupListen({ target, showCase: WUPPopup.ShowCases.onClick }, onShow, onHide);

    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    ref.stopListen();
    spy.check();
  });

  test("open/show outside listener", async () => {
    ref = popupListen({ target, showCase: WUPPopup.ShowCases.onClick }, onShow, onHide);
    // checking self-call show
    const origShow = onShow.getMockImplementation();

    const goShow = () => {
      const r = origShow();
      ref.show(); // checking if self-call doesn't produce stackOverflow
      return r;
    };
    onShow.mockImplementation(goShow);

    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(isOpen).toBe(true);

    ref.show(); // call it manually to check if it works as expected
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    expect(isOpen).toBe(true);

    // checking self-call hide
    jest.clearAllMocks();
    const origHide = onHide.getMockImplementation();
    onHide.mockImplementation(() => {
      const r = origHide();
      ref.hide(); // checking if self-call doesn't produce stackOverflow
      return r;
    });

    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onHide).toBeCalledTimes(1);
    expect(isOpen).toBe(false);

    ref.hide();
    await h.wait();
    expect(onHide).toBeCalledTimes(1);
    expect(isOpen).toBe(false);

    ref.show();
    await h.wait();
    expect(isOpen).toBe(true);

    ref.hide();
    await h.wait();
    expect(isOpen).toBe(false);

    // jest.clearAllMocks();
    // onShow();
    // await h.wait();
    // expect(onShow).toBeCalledTimes(1); // it's produce 2 calls !!!
  });

  test("open/show takes time (for animation)", async () => {
    ref = popupListen({ target, showCase: WUPPopup.ShowCases.onClick }, onShow, onHide);
    // WARN it's very important to provide element for onShow without awaiting (to allow hiding as fast as possible)
    const origHide = onHide.getMockImplementation();
    onHide.mockImplementation(() => {
      ref.hide(); // checking if self-call doesn't produce stackOverflow
      const r = origHide();
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve(r);
        }, 100)
      );
    });

    // ordinary behavior when user waits for comletely show/close
    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // show
    await h.wait(1);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    await h.wait(101);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    expect(isOpen).toBe(true);

    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait(1);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    await h.wait(101);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    expect(isOpen).toBe(false);

    // user calls show & hide immediately
    jest.clearAllMocks();
    ref.show();
    await h.wait(1);
    ref.hide();
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    expect(isOpen).toBe(false);

    jest.clearAllMocks();
    ref.show();
    await h.wait(1);
    ref.hide();
    await h.wait(1);
    ref.show();
    await h.wait();
    expect(onShow).toBeCalledTimes(2);
    expect(onHide).toBeCalledTimes(1);
    expect(isOpen).toBe(true);
  });

  test("show/hide is prevented", async () => {
    ref = popupListen({ target, showCase: WUPPopup.ShowCases.onClick }, onShow, onHide);

    onShow.mockImplementationOnce(() => null);
    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // show
    await h.wait(1);
    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // show
    await h.wait(1);
    expect(onShow).toBeCalledTimes(2);
    expect(onHide).not.toBeCalled();
    expect(isOpen).toBe(true);

    jest.clearAllMocks();
    onHide.mockImplementationOnce(() => false);
    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait(1);
    target.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait(1);
    expect(onShow).not.toBeCalled();
    expect(onHide).toBeCalledTimes(2);
    expect(isOpen).toBe(false);
  });

  test("hide waits for show end", async () => {
    ref = popupListen({ target, showCase: WUPPopup.ShowCases.onClick }, onShow, onHide);
    const origShow = onShow.getMockImplementation();
    onShow.mockImplementation(() => {
      const r = origShow();
      return new Promise((resolve) => setTimeout(() => resolve(r), 100));
    });

    const origHide = onHide.getMockImplementation();
    onHide.mockImplementation(() => {
      const r = origHide();
      return new Promise((resolve) => setTimeout(() => resolve(r), 100));
    });

    ref.show();
    await h.wait(20);
    ref.hide();
    await h.wait(20);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();

    await h.wait(100);
    expect(onHide).toBeCalledTimes(1);
  });
});
