import { WUPPopupElement } from "web-ui-pack";
import { ShowCases } from "web-ui-pack/popup/popupElement.types";
import PopupListener from "web-ui-pack/popup/popupListener";
import * as h from "../testHelper";

/** @type HTMLInputElement */
let trg;
/** @type HTMLDivElement */
let el;
let isShown = false;
let onShow = jest.fn();
let onHide = jest.fn();
/** @type PopupListener */
let ref;

!WUPPopupElement && console.error("!");

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  trg = document.body.appendChild(document.createElement("input"));
  onShow = jest.fn().mockImplementation(() => {
    isShown = true;
    if (!el) {
      el = document.body.appendChild(document.createElement("span"));
    }
    return el;
  });
  onHide = jest.fn().mockImplementation(() => {
    isShown = false;
    return true;
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  el = null;
  isShown = false;
  ref?.stopListen();
});

describe("popupListener", () => {
  test("default behavior", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, showCase: ShowCases.onClick }, onShow, onHide);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    expect(isShown).toBe(true);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    expect(isShown).toBe(false);
    ref.stopListen();
    spy.check();
  });

  test("memory leak", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, showCase: ShowCases.onClick }, onShow, onHide);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait();
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    ref.stopListen();
    spy.check();
  });

  test("open/show outside listener", async () => {
    ref = new PopupListener({ target: trg, showCase: ShowCases.onClick }, onShow, onHide);
    // checking self-call show
    const origShow = onShow.getMockImplementation();

    const goShow = () => {
      const r = origShow();
      ref.show(); // checking if self-call doesn't produce stackOverflow
      return r;
    };
    onShow.mockImplementation(goShow);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(isShown).toBe(true);

    ref.show(); // call it manually to check if it works as expected
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    expect(isShown).toBe(true);

    // checking self-call hide
    jest.clearAllMocks();
    const origHide = onHide.getMockImplementation();
    onHide.mockImplementation(() => {
      const r = origHide();
      ref.hide(); // checking if self-call doesn't produce stackOverflow
      return r;
    });

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onHide).toBeCalledTimes(1);
    expect(isShown).toBe(false);

    ref.hide();
    await h.wait();
    expect(onHide).toBeCalledTimes(1);
    expect(isShown).toBe(false);

    ref.show();
    await h.wait();
    expect(isShown).toBe(true);

    ref.hide();
    await h.wait();
    expect(isShown).toBe(false);

    // jest.clearAllMocks();
    // onShow();
    // await h.wait();
    // expect(onShow).toBeCalledTimes(1); // it's produce 2 calls !!!
  });

  test("open/show takes time (for animation)", async () => {
    ref = new PopupListener({ target: trg, showCase: ShowCases.onClick }, onShow, onHide);
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
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // show
    await h.wait(1);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    await h.wait(101);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    expect(isShown).toBe(true);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait(1);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    await h.wait(101);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    expect(isShown).toBe(false);

    // user calls show & hide immediately
    jest.clearAllMocks();
    ref.show();
    await h.wait(1);
    ref.hide();
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    expect(isShown).toBe(false);

    jest.clearAllMocks();
    ref.show();
    await h.wait(1);
    ref.hide();
    await h.wait(1);
    ref.show();
    await h.wait();
    expect(onShow).toBeCalledTimes(2);
    expect(onHide).toBeCalledTimes(1);
    expect(isShown).toBe(true);
  });

  test("show/hide is prevented", async () => {
    ref = new PopupListener({ target: trg, showCase: ShowCases.onClick }, onShow, onHide);

    onShow.mockImplementationOnce(() => null);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // show
    await h.wait(1);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // show
    await h.wait(1);
    expect(onShow).toBeCalledTimes(2);
    expect(onHide).not.toBeCalled();
    expect(isShown).toBe(true);

    jest.clearAllMocks();
    onHide.mockImplementationOnce(() => false);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait(1);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait(1);
    expect(onShow).not.toBeCalled();
    expect(onHide).toBeCalledTimes(2);
    expect(isShown).toBe(false);
  });

  test("hide waits for show end", async () => {
    ref = new PopupListener({ target: trg, showCase: ShowCases }, onShow, onHide);
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

  test("hidding by click twice", async () => {
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$options.showCase = 0;

    document.body.appendChild(el);
    ref = new PopupListener(
      { target: trg, showCase: 1 << 2 }, // onClick
      () => {
        el.$show();
        return el;
      },
      () => el.$hide()
    );

    // simulate defaults
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        /** @type CSSStyleDeclaration */
        return { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
      }
      return orig(elem);
    });

    el.$hide(); // showCase opens popup by default
    await h.wait();
    expect(el.$isShown).toBe(false);
    // open
    trg.click();
    await h.wait(); // wait for changes
    expect(el.$isShown).toBe(true);

    // hide
    document.body.click();
    await h.wait(100); // wait for partially hidden
    expect(el.$isShown).toBe(true);
    expect(() => document.body.click()).not.toThrow(); // error here because openedEl is null in eventListener on 2nd call
    await h.wait();
    expect(el.$isShown).toBe(false);
  });

  test("show 1st time", async () => {
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$options.showCase = 0;

    document.body.appendChild(el);
    const refs = new PopupListener(
      { target: trg, showCase: 1 << 2 }, // onClick
      () => {
        el.$show();
        return el;
      },
      () => el.$hide()
    );

    // cover case when openedEl hasn't been defined yet
    refs.show(0);
    await h.wait();
    expect(el.$isShown).toBe(true);
  });

  /* test("double-click filter", async () => {
    await el.$hide();
    el.$options.showCase = 1 << 2; // click
    await h.wait();
    expect(el.$isShown).toBe(false);
    // double-click simulation
    const doubleClick = async (htmlEl) => {
      let e = new MouseEvent("click", { bubbles: true });
      jest.spyOn(e, "detail", "get").mockReturnValue(1);
      htmlEl.dispatchEvent(e);
      await h.wait(100);
      e = new MouseEvent("click", { bubbles: true });
      jest.spyOn(e, "detail", "get").mockReturnValue(2);
      htmlEl.dispatchEvent(e);
      htmlEl.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    };
    await doubleClick(trg);
    await h.wait(100);
    expect(el.$isShown).toBe(true); // because 2nd click is filtered
  }); */

  test("handle error on show", async () => {
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$options.showCase = 0;
    let cnt = 0;
    ref = new PopupListener(
      { target: trg, showCase: 1 << 2 }, // onClick
      () => {
        ++cnt;
        throw new Error("TestCase Impossible to show");
      },
      () => el.$hide()
    );

    h.handleRejection();
    trg.click();
    await h.wait();
    expect(cnt).toBe(1);

    trg.click();
    await h.wait();
    expect(cnt).toBe(2); // checking if possible again
  });

  test("right-click filter", async () => {
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.showCase = ShowCases.onClick;
    await h.wait();

    await h.userClick(trg);
    await h.wait();
    expect(el.$isShown).toBe(true);

    await h.userClick(trg, { button: 1 });
    await h.wait();
    expect(el.$isShown).toBe(true); // because right-button

    await h.userClick(trg, { button: 0 });
    await h.wait();
    expect(el.$isShown).toBe(false); // because left-button
  });
});
