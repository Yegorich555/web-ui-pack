import { WUPPopupElement } from "web-ui-pack";
import { PopupOpenCases } from "web-ui-pack/popup/popupElement.types";
import PopupListener from "web-ui-pack/popup/popupListener";
import * as h from "../testHelper";

/** @type HTMLInputElement */
let trg;
/** @type HTMLSpanElement */
let el;
let isOpened = false;
let onOpen = jest.fn();
let onClose = jest.fn();
/** @type PopupListener */
let ref;

WUPPopupElement.$use();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  trg = document.body.appendChild(document.createElement("input"));
  onOpen = jest.fn().mockImplementation(() => {
    isOpened = true;
    if (!el) {
      el = document.body.appendChild(document.createElement("span"));
    }
    return el;
  });
  onClose = jest.fn().mockImplementation(() => {
    isOpened = false;
    return true;
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  el = null;
  isOpened = false;
  ref?.stopListen();
});

describe("popupListener", () => {
  test("openCase.onClick", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onClick }, onOpen, onClose);

    await h.userClick(trg);
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(onOpen.mock.calls[0]).toMatchInlineSnapshot(`
      [
        8,
        MouseEvent {
          "isTrusted": false,
          "pageX": 1,
          "pageY": 1,
        },
      ]
    `); // onTargetClick
    expect(onClose).not.toBeCalled();
    expect(isOpened).toBe(true);

    await h.userClick(trg);
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);
    expect(onClose.mock.calls[0]).toMatchInlineSnapshot(`
      [
        5,
        MouseEvent {
          "isTrusted": false,
          "pageX": 1,
          "pageY": 1,
        },
      ]
    `); // onTargetClick
    expect(isOpened).toBe(false);
    // open again
    document.body.innerHTML = "<div id='trg'><button></button><span id='popup'></span></div>";
    trg = document.getElementById("trg");
    el = document.getElementById("popup");
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onClick }, onOpen, onClose);
    jest.clearAllMocks();
    await h.userClick(trg);
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).not.toBeCalled();
    expect(isOpened).toBe(true);
    // close by popup click
    await h.userClick(el);
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);
    expect(onClose.mock.calls[0][0]).toBe(4); // onPopupClick
    expect(isOpened).toBe(false);

    ref.stopListen();
    spy.check();
  });

  test("openCase.onHover", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onHover }, onOpen, onClose);

    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(isOpened).toBe(false);
    await h.wait(ref.options.hoverOpenTimeout); // event listener has timeout
    expect(isOpened).toBe(true);
    expect(onOpen.mock.calls[0]).toMatchInlineSnapshot(`
      [
        2,
        MouseEvent {
          "isTrusted": false,
        },
      ]
    `);

    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(isOpened).toBe(true);
    await h.wait(ref.options.hoverCloseTimeout); // event listener has timeout
    expect(isOpened).toBe(false);
    expect(onClose.mock.calls[0]).toMatchInlineSnapshot(`
      [
        1,
        MouseEvent {
          "isTrusted": false,
        },
      ]
    `);

    // checking debounce
    jest.clearAllMocks();
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(10);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(10);
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(10);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(false);
    expect(onOpen).toBeCalledTimes(0);
    // hover on popup - no close event
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(true);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(true); // no close if hover on popup
    // close by mouseleave
    el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(false);

    ref.stopListen();
    spy.check();

    // case when content inside target
    jest.clearAllMocks();
    document.body.innerHTML = "<div id='trg'><button></button><span id='popup'></span></div>";
    trg = document.getElementById("trg");
    el = document.getElementById("popup");
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onHover }, onOpen, onClose);
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(true);
    trg.firstElementChild.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();

    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    trg.remove();
    jest.advanceTimersByTime(ref.options.hoverOpenTimeout + ref.options.hoverCloseTimeout); // event listener has timeout
    expect(isOpened).toBe(false); // because removed
    document.body.appendChild(trg);
    await h.wait();

    // cover #openedByHover
    jest.clearAllMocks();
    onOpen.mockImplementationOnce(() => null);
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(ref.options.hoverOpenTimeout + 10); // #openedByHover: true
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true })); // simulate child inside
    await h.wait(ref.options.hoverOpenTimeout + 10); // clear previous #openedByHover
    expect(isOpened).toBe(true);
    expect(onOpen).toBeCalledTimes(2);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(false);
    // close
    jest.clearAllMocks();
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(ref.options.hoverOpenTimeout + 10); // #openedByHover: true
    expect(isOpened).toBe(true);
    ref.options.hoverCloseTimeout = 10; // must be less 3#openedByHover=300ms
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(ref.options.hoverCloseTimeout + 10); // clear previous #openedByHover
    expect(onClose).toBeCalledTimes(1);
    expect(isOpened).toBe(false);
  });

  test("openCase.focus", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onFocus }, onOpen, onClose);

    trg.dispatchEvent(new Event("focusin", { bubbles: true }));
    await h.wait(1);
    expect(isOpened).toBe(true);
    expect(onOpen.mock.calls[0]).toMatchInlineSnapshot(`
      [
        4,
        Event {
          "isTrusted": false,
        },
      ]
    `);

    trg.dispatchEvent(new Event("focusout", { bubbles: true }));
    await h.wait(1);
    expect(isOpened).toBe(false);
    expect(onClose.mock.calls[0]).toMatchInlineSnapshot(`
      [
        2,
        Event {
          "isTrusted": false,
        },
      ]
    `);

    jest.clearAllMocks();
    trg.dispatchEvent(new Event("focusin", { bubbles: true }));
    trg.dispatchEvent(new Event("focusout", { bubbles: true }));
    el.dispatchEvent(new Event("focusin", { bubbles: true }));
    el.dispatchEvent(new Event("focusin", { bubbles: true })); // simulate children event
    await h.wait();
    expect(isOpened).toBe(true);
    expect(onOpen).toBeCalledTimes(1);

    el.dispatchEvent(new Event("focusout", { bubbles: true }));
    el.dispatchEvent(new Event("focusout", { bubbles: true })); // simulate children event
    await h.wait(1);
    expect(isOpened).toBe(false);
    expect(onClose).toBeCalledTimes(1);

    ref.stopListen();
    spy.check();
  });

  test("openCase.all", async () => {
    ref = new PopupListener(
      { target: trg, openCase: PopupOpenCases.onClick | PopupOpenCases.onFocus | PopupOpenCases.onHover },
      onOpen,
      onClose
    );

    // full simulation of hover>click>hoverPopup>clickPopup
    onOpen.mockImplementationOnce(
      () =>
        new Promise((res) =>
          setTimeout(() => {
            isOpened = true;
            el = document.body.appendChild(document.createElement("span"));
            res(el);
          }, 300)
        )
    );
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(10);
    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);
    expect(document.activeElement).toBe(trg);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(10);
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(10);
    await h.userClick(el);
    el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(false);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);

    // user clicks on target when it shows by hover
    document.activeElement.blur();
    jest.clearAllMocks();
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(ref.options.hoverOpenTimeout + 10);
    await h.userClick(trg); // despite on huge timeout - no close because debounce 300ms
    await h.wait();
    expect(isOpened).toBe(true);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(false);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);

    // the same without click
    jest.clearAllMocks();
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(true);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(10);
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(10);
    el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(false);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);

    // user opens by focus
    document.activeElement.blur();
    await h.wait();
    jest.clearAllMocks();
    // open by focus
    await h.userPressTab(trg);
    expect(isOpened).toBe(true);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);
    await h.userPressTab(el); // focus inside popup - no changes
    expect(isOpened).toBe(true);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);
    // close by click outside
    await h.userClick(document.body);
    await h.wait();
    expect(isOpened).toBe(false);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);

    // close by Escape
    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true);
    await h.userPressKey(trg, { key: "Escape" });
    expect(isOpened).toBe(false);

    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true);
    trg.onkeydown = (e) => e.preventDefault();
    await h.userPressKey(trg, { key: "Escape" });
    expect(isOpened).toBe(true); // because prevented

    await h.wait();
    trg.addEventListener("click", (e) => e.preventDefault(), { capture: true });
    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true); // because prevented
  });

  test("memory leak", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onClick }, onOpen, onClose);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // close
    await h.wait();
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    ref.stopListen();
    spy.check();

    ref = new PopupListener(
      { target: trg, openCase: PopupOpenCases.onClick | PopupOpenCases.onFocus | PopupOpenCases.onHover },
      onOpen,
      onClose
    );
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // close
    await h.wait();
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    ref.stopListen();
    spy.check();
  });

  test("open/open outside listener", async () => {
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onClick }, onOpen, onClose);
    // checking self-call open
    const origShow = onOpen.getMockImplementation();

    const goOpen = () => {
      const r = origShow();
      ref.open(); // checking if self-call doesn't produce stackOverflow
      return r;
    };
    onOpen.mockImplementation(goOpen);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(isOpened).toBe(true);

    ref.open(); // call it manually to check if it works as expected
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).not.toBeCalled();
    expect(isOpened).toBe(true);

    // checking self-call close
    jest.clearAllMocks();
    const origHide = onClose.getMockImplementation();
    onClose.mockImplementation(() => {
      const r = origHide();
      ref.close(); // checking if self-call doesn't produce stackOverflow
      return r;
    });

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(onClose).toBeCalledTimes(1);
    expect(isOpened).toBe(false);

    ref.close();
    await h.wait();
    expect(onClose).toBeCalledTimes(1);
    expect(isOpened).toBe(false);

    ref.open();
    await h.wait();
    expect(isOpened).toBe(true);

    ref.close();
    await h.wait();
    expect(isOpened).toBe(false);

    // jest.clearAllMocks();
    // onShow();
    // await h.wait();
    // expect(onShow).toBeCalledTimes(1); // it's produce 2 calls !!!
  });

  test("open/open takes time (for animation)", async () => {
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onClick }, onOpen, onClose);
    // WARN it's very important to provide element for onShow without awaiting (to allow hiding as fast as possible)
    const origHide = onClose.getMockImplementation();
    onClose.mockImplementation(() => {
      ref.close(); // checking if self-call doesn't produce stackOverflow
      const r = origHide();
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve(r);
        }, 100)
      );
    });

    // ordinary behavior when user waits for comletely open/close
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait(1);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).not.toBeCalled();
    await h.wait(101);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).not.toBeCalled();
    expect(isOpened).toBe(true);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // close
    await h.wait(1);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);
    await h.wait(101);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);
    expect(isOpened).toBe(false);

    // user calls open & close immediately
    jest.clearAllMocks();
    ref.open();
    await h.wait(1);
    ref.close();
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);
    expect(isOpened).toBe(false);

    jest.clearAllMocks();
    ref.open();
    await h.wait(1);
    ref.close();
    await h.wait(1);
    ref.open();
    await h.wait();
    expect(onOpen).toBeCalledTimes(2);
    expect(onClose).toBeCalledTimes(1);
    expect(isOpened).toBe(true);
  });

  test("open/close is prevented", async () => {
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onClick }, onOpen, onClose);

    onOpen.mockImplementationOnce(() => null);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait(1);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait(1);
    expect(onOpen).toBeCalledTimes(2);
    expect(onClose).not.toBeCalled();
    expect(isOpened).toBe(true);

    jest.clearAllMocks();
    onClose.mockImplementationOnce(() => false);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // close
    await h.wait(1);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // close
    await h.wait(1);
    expect(onOpen).not.toBeCalled();
    expect(onClose).toBeCalledTimes(2);
    expect(isOpened).toBe(false);
  });

  test("close waits for open end", async () => {
    ref = new PopupListener({ target: trg, openCase: 0 }, onOpen, onClose);
    const origShow = onOpen.getMockImplementation();
    onOpen.mockImplementation(() => {
      const r = origShow();
      return new Promise((resolve) => setTimeout(() => resolve(r), 100));
    });

    const origHide = onClose.getMockImplementation();
    onClose.mockImplementation(() => {
      const r = origHide();
      return new Promise((resolve) => setTimeout(() => resolve(r), 100));
    });

    ref.open();
    await h.wait(20);
    ref.close();
    await h.wait(20);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).not.toBeCalled();

    await h.wait(100);
    expect(onClose).toBeCalledTimes(1);
  });

  test("hiding by click twice", async () => {
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$options.openCase = 0;

    document.body.appendChild(el);
    ref = new PopupListener(
      { target: trg, openCase: PopupOpenCases.onClick }, // onClick
      () => {
        el.$open();
        return el;
      },
      () => el.$close()
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

    el.$close(); // openCase opens popup by default
    await h.wait();
    expect(el.$isOpened).toBe(false);
    // open
    trg.click();
    await h.wait(); // wait for changes
    expect(el.$isOpened).toBe(true);

    // close
    document.body.click();
    await h.wait(100); // wait for partially hidden
    expect(el.$isOpened).toBe(true);
    expect(() => document.body.click()).not.toThrow(); // error here because openedEl is null in eventListener on 2nd call
    await h.wait();
    expect(el.$isOpened).toBe(false);
  });

  test("open 1st time", async () => {
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$options.openCase = 0;

    document.body.appendChild(el);
    const refs = new PopupListener(
      { target: trg, openCase: PopupOpenCases.onClick }, // onClick
      () => {
        el.$open();
        return el;
      },
      () => el.$close()
    );

    // cover case when openedEl hasn't been defined yet
    refs.open(0);
    await h.wait();
    expect(el.$isOpened).toBe(true);

    expect(isOpened).toBe(false);
    expect(() => new PopupListener({ target: undefined }, onOpen, onClose)).toThrow();
    expect(() => new PopupListener({ target: document.createElement("div") }, onOpen, onClose)).toThrow();
    ref = new PopupListener({ target: trg }, onOpen, () => {
      throw new Error("hello");
    });
    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true);
    await h.userClick(trg); // no error because handled by try
    // await h.wait();
  });

  /* test("double-click filter", async () => {
    await el.$close();
    el.$options.openCase =PopupOpenCases.onClick; // click
    await h.wait();
    expect(el.$isOpened).toBe(false);
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
    expect(el.$isOpened).toBe(true); // because 2nd click is filtered
  }); */

  test("handle errors", async () => {
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$options.openCase = 0;
    let cnt = 0;
    ref = new PopupListener(
      { target: trg, openCase: PopupOpenCases.onClick }, // onClick
      () => {
        ++cnt;
        throw new Error("TestCase Impossible to open");
      },
      () => el.$close()
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
    el.$options.openCase = PopupOpenCases.onClick;
    await h.wait();

    await h.userClick(trg);
    await h.wait();
    expect(el.$isOpened).toBe(true);

    await h.userClick(trg, { button: 1 });
    await h.wait();
    expect(el.$isOpened).toBe(true); // because right-button

    await h.userClick(trg, { button: 0 });
    await h.wait();
    expect(el.$isOpened).toBe(false); // because left-button
  });

  test("focus behavior", async () => {
    ref = new PopupListener(
      { target: trg, openCase: PopupOpenCases.onClick | PopupOpenCases.onFocus },
      onOpen,
      onClose
    );
    // focus target by close
    trg.focus();
    await h.wait();
    expect(document.activeElement).toBe(trg);
    expect(isOpened).toBe(true);
    const btnInside = el.appendChild(document.createElement("button"));
    await h.userClick(btnInside);
    expect(isOpened).toBe(false);
    expect(document.activeElement).toBe(trg); // after click inside popup focus goes to target

    // hideByBlur must allow focus next without forcing focus target
    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true);
    expect(document.activeElement).toBe(trg);
    const next = document.body.appendChild(document.createElement("button"));
    await h.userPressTab(next); // simulate Tab + focusNext
    expect(document.activeElement).toBe(next);
    expect(isOpened).toBe(false);

    // focus into popup don't close popup
    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true);
    await h.userPressTab(btnInside); // simulate Tab + focus to element inside popup
    expect(isOpened).toBe(true);
    await h.userPressTab(trg); // simulate Tab + focus to target back
    expect(isOpened).toBe(true);
    await h.userPressTab(next); // simulate Tab + focusNext
    expect(document.activeElement).toBe(next);
    expect(isOpened).toBe(false); // focus from popup to outside must close popup

    // target already focused when applied listener
    trg = document.body.appendChild(document.createElement(trg.tagName));
    trg.focus();
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onFocus }, onOpen, onClose);
    await h.wait();
    expect(isOpened).toBe(true);
    // focusout to body (when no relatedTarget)
    // await h.userPressTab(null); // simulate Tab + focusNext
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: undefined }));
    document.activeElement.blur();
    expect(isOpened).toBe(false);

    // cover case when popupOpened by click and focus changed inside target: by closing focus >> return focus to target
    trg = document.body.appendChild(document.createElement("div"));
    const tin1 = trg.appendChild(document.createElement("button"));
    const tin2 = trg.appendChild(document.createElement("input"));
    ref = new PopupListener({ target: trg, openCase: PopupOpenCases.onClick }, onOpen, onClose);
    await h.userClick(tin1);
    await h.wait();
    expect(isOpened).toBe(true);
    await h.userPressTab(tin2);
    expect(isOpened).toBe(true);
    await h.userClick(btnInside);
    await h.wait();
    expect(isOpened).toBe(false);
    expect(document.activeElement).toBe(tin2);

    // cover case when click on popup moves focus to body because popup don't haven tabindex
    await h.userClick(tin1);
    await h.wait();
    expect(isOpened).toBe(true);
    await h.userClick(el);
    await h.wait();
    expect(isOpened).toBe(false);
    expect(document.activeElement).toBe(tin1);

    // checking case when document.activeElement is null/not-null (possible on Firefox/Safari)
    tin1.blur();
    await h.userClick(tin1);
    await h.wait();
    expect(isOpened).toBe(true);
    const f0 = jest.spyOn(document, "activeElement", "get").mockReturnValue(null); // just for coverage
    await h.userClick(el);
    await h.wait();
    expect(isOpened).toBe(false);
    f0.mockRestore();

    // special case when popup can be opened again
    expect(document.activeElement).not.toBe(trg);
    ref = new PopupListener(
      { target: trg, openCase: PopupOpenCases.onClick | PopupOpenCases.onFocus | PopupOpenCases.onHover },
      onOpen,
      onClose
    );
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true);
    const btn = el.appendChild(document.createElement("button"));
    await h.userPressTab(btn);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isOpened).toBe(false);
    expect(document.activeElement).toBe(tin1);

    // popup focusing during the hiding is prevented
    await h.userClick(trg);
    await h.wait();
    expect(isOpened).toBe(true);
    onClose.mockImplementationOnce(
      () =>
        new Promise((res) =>
          setTimeout(() => {
            res(true);
            isOpened = false;
          }, 400)
        )
    );
    await h.userClick(trg);
    expect(isOpened).toBe(true); // because closing takes time
    await h.userPressTab(el);
    expect(document.activeElement).toBe(tin1);
    await h.wait();
    expect(isOpened).toBe(false);
  });
});
