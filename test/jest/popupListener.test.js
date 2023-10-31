import { WUPPopupElement } from "web-ui-pack";
import { PopupOpenCases } from "web-ui-pack/popup/popupElement.types";
import PopupListener from "web-ui-pack/popup/popupListener";
import * as h from "../testHelper";

/** @type HTMLInputElement */
let trg;
/** @type HTMLSpanElement */
let el;
let isShown = false;
let onShow = jest.fn();
let onHide = jest.fn();
/** @type PopupListener */
let ref;

WUPPopupElement.$use();

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
  test("showCase.onClick", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onClick }, onShow, onHide);

    await h.userClick(trg);
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0]).toMatchInlineSnapshot(`
      [
        4,
        MouseEvent {
          "isTrusted": false,
          "pageX": 1,
          "pageY": 1,
        },
      ]
    `); // onTargetClick
    expect(onHide).not.toBeCalled();
    expect(isShown).toBe(true);

    await h.userClick(trg);
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    expect(onHide.mock.calls[0]).toMatchInlineSnapshot(`
      [
        5,
        MouseEvent {
          "isTrusted": false,
          "pageX": 1,
          "pageY": 1,
        },
      ]
    `); // onTargetClick
    expect(isShown).toBe(false);
    // open again
    document.body.innerHTML = "<div id='trg'><button></button><span id='popup'></span></div>";
    trg = document.getElementById("trg");
    el = document.getElementById("popup");
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onClick }, onShow, onHide);
    jest.clearAllMocks();
    await h.userClick(trg);
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).not.toBeCalled();
    expect(isShown).toBe(true);
    // hide by popup click
    await h.userClick(el);
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);
    expect(onHide.mock.calls[0][0]).toBe(4); // onPopupClick
    expect(isShown).toBe(false);

    ref.stopListen();
    spy.check();
  });

  test("showCase.onHover", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onHover }, onShow, onHide);

    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(isShown).toBe(false);
    await h.wait(ref.options.hoverShowTimeout); // event listener has timeout
    expect(isShown).toBe(true);
    expect(onShow.mock.calls[0]).toMatchInlineSnapshot(`
      [
        1,
        MouseEvent {
          "isTrusted": false,
        },
      ]
    `);

    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(isShown).toBe(true);
    await h.wait(ref.options.hoverHideTimeout); // event listener has timeout
    expect(isShown).toBe(false);
    expect(onHide.mock.calls[0]).toMatchInlineSnapshot(`
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
    expect(isShown).toBe(false);
    expect(onShow).toBeCalledTimes(0);
    // hover on popup - no close event
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(true);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(true); // no hide if hover on popup
    // hide by mouseleave
    el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(false);

    ref.stopListen();
    spy.check();

    // case when content inside target
    jest.clearAllMocks();
    document.body.innerHTML = "<div id='trg'><button></button><span id='popup'></span></div>";
    trg = document.getElementById("trg");
    el = document.getElementById("popup");
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onHover }, onShow, onHide);
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(true);
    trg.firstElementChild.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();

    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    trg.remove();
    jest.advanceTimersByTime(ref.options.hoverShowTimeout + ref.options.hoverHideTimeout); // event listener has timeout
    expect(isShown).toBe(false); // because removed
    document.body.appendChild(trg);
    await h.wait();

    // cover #openedByHover
    jest.clearAllMocks();
    onShow.mockImplementationOnce(() => null);
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(ref.options.hoverShowTimeout + 10); // #openedByHover: true
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true })); // simulate child inside
    await h.wait(ref.options.hoverShowTimeout + 10); // clear previous #openedByHover
    expect(isShown).toBe(true);
    expect(onShow).toBeCalledTimes(2);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(false);
    // hide
    jest.clearAllMocks();
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(ref.options.hoverShowTimeout + 10); // #openedByHover: true
    expect(isShown).toBe(true);
    ref.options.hoverHideTimeout = 10; // must be less 3#openedByHover=300ms
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(ref.options.hoverHideTimeout + 10); // clear previous #openedByHover
    expect(onHide).toBeCalledTimes(1);
    expect(isShown).toBe(false);
  });

  test("showCase.focus", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onFocus }, onShow, onHide);

    trg.dispatchEvent(new Event("focusin", { bubbles: true }));
    await h.wait(1);
    expect(isShown).toBe(true);
    expect(onShow.mock.calls[0]).toMatchInlineSnapshot(`
      [
        2,
        Event {
          "isTrusted": false,
        },
      ]
    `);

    trg.dispatchEvent(new Event("focusout", { bubbles: true }));
    await h.wait(1);
    expect(isShown).toBe(false);
    expect(onHide.mock.calls[0]).toMatchInlineSnapshot(`
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
    expect(isShown).toBe(true);
    expect(onShow).toBeCalledTimes(1);

    el.dispatchEvent(new Event("focusout", { bubbles: true }));
    el.dispatchEvent(new Event("focusout", { bubbles: true })); // simulate children event
    await h.wait(1);
    expect(isShown).toBe(false);
    expect(onHide).toBeCalledTimes(1);

    ref.stopListen();
    spy.check();
  });

  test("showCase.all", async () => {
    ref = new PopupListener(
      { target: trg, showCase: PopupOpenCases.onClick | PopupOpenCases.onFocus | PopupOpenCases.onHover },
      onShow,
      onHide
    );

    // full simulation of hover>click>hoverPopup>clickPopup
    onShow.mockImplementationOnce(
      () =>
        new Promise((res) =>
          setTimeout(() => {
            isShown = true;
            el = document.body.appendChild(document.createElement("span"));
            res(el);
          }, 300)
        )
    );
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(10);
    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(0);
    expect(document.activeElement).toBe(trg);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(10);
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(10);
    await h.userClick(el);
    el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(false);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);

    // user clicks on target when it shows by hover
    document.activeElement.blur();
    jest.clearAllMocks();
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(ref.options.hoverShowTimeout + 10);
    await h.userClick(trg); // despite on huge timeout - no close because debounce 300ms
    await h.wait();
    expect(isShown).toBe(true);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(0);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(false);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);

    // the same without click
    jest.clearAllMocks();
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(true);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(0);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(10);
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(10);
    el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(false);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);

    // user opens by focus
    document.activeElement.blur();
    await h.wait();
    jest.clearAllMocks();
    // open by focus
    await h.userPressTab(trg);
    expect(isShown).toBe(true);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(0);
    await h.userPressTab(el); // focus inside popup - no changes
    expect(isShown).toBe(true);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(0);
    // close by click outside
    await h.userClick(document.body);
    await h.wait();
    expect(isShown).toBe(false);
    expect(onShow).toBeCalledTimes(1);
    expect(onHide).toBeCalledTimes(1);

    // close by Escape
    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true);
    await h.userPressKey(trg, { key: "Escape" });
    expect(isShown).toBe(false);

    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true);
    trg.onkeydown = (e) => e.preventDefault();
    await h.userPressKey(trg, { key: "Escape" });
    expect(isShown).toBe(true); // because prevented

    await h.wait();
    trg.addEventListener("click", (e) => e.preventDefault(), { capture: true });
    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true); // because prevented
  });

  test("memory leak", async () => {
    const spy = h.spyEventListeners();
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onClick }, onShow, onHide);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // hide
    await h.wait();
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open
    await h.wait();
    ref.stopListen();
    spy.check();

    ref = new PopupListener(
      { target: trg, showCase: PopupOpenCases.onClick | PopupOpenCases.onFocus | PopupOpenCases.onHover },
      onShow,
      onHide
    );
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
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onClick }, onShow, onHide);
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
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onClick }, onShow, onHide);
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
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onClick }, onShow, onHide);

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
    ref = new PopupListener({ target: trg, showCase: 0 }, onShow, onHide);
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

  test("hiding by click twice", async () => {
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$options.showCase = 0;

    document.body.appendChild(el);
    ref = new PopupListener(
      { target: trg, showCase: 1 << 2 }, // onClick
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

    el.$close(); // showCase opens popup by default
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
        el.$open();
        return el;
      },
      () => el.$close()
    );

    // cover case when openedEl hasn't been defined yet
    refs.show(0);
    await h.wait();
    expect(el.$isShown).toBe(true);

    expect(isShown).toBe(false);
    expect(() => new PopupListener({ target: undefined }, onShow, onHide)).toThrow();
    expect(() => new PopupListener({ target: document.createElement("div") }, onShow, onHide)).toThrow();
    ref = new PopupListener({ target: trg }, onShow, () => {
      throw new Error("hello");
    });
    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true);
    await h.userClick(trg); // no error because handled by try
    // await h.wait();
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

  test("handle errors", async () => {
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
    el.$options.showCase = PopupOpenCases.onClick;
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

  test("focus behavior", async () => {
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onClick | PopupOpenCases.onFocus }, onShow, onHide);
    // focus target by hide
    trg.focus();
    await h.wait();
    expect(document.activeElement).toBe(trg);
    expect(isShown).toBe(true);
    const btnInside = el.appendChild(document.createElement("button"));
    await h.userClick(btnInside);
    expect(isShown).toBe(false);
    expect(document.activeElement).toBe(trg); // after click inside popup focus goes to target

    // hideByBlur must allow focus next without forcing focus target
    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true);
    expect(document.activeElement).toBe(trg);
    const next = document.body.appendChild(document.createElement("button"));
    await h.userPressTab(next); // simulate Tab + focusNext
    expect(document.activeElement).toBe(next);
    expect(isShown).toBe(false);

    // focus into popup don't close popup
    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true);
    await h.userPressTab(btnInside); // simulate Tab + focus to element inside popup
    expect(isShown).toBe(true);
    await h.userPressTab(trg); // simulate Tab + focus to target back
    expect(isShown).toBe(true);
    await h.userPressTab(next); // simulate Tab + focusNext
    expect(document.activeElement).toBe(next);
    expect(isShown).toBe(false); // focus from popup to outside must close popup

    // target already focused when applied listener
    trg = document.body.appendChild(document.createElement(trg.tagName));
    trg.focus();
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onFocus }, onShow, onHide);
    await h.wait();
    expect(isShown).toBe(true);
    // focusout to body (when no relatedTarget)
    // await h.userPressTab(null); // simulate Tab + focusNext
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: undefined }));
    document.activeElement.blur();
    expect(isShown).toBe(false);

    // cover case when popupOpened by click and focus changed inside target: by closing focus >> return focus to target
    trg = document.body.appendChild(document.createElement("div"));
    const tin1 = trg.appendChild(document.createElement("button"));
    const tin2 = trg.appendChild(document.createElement("input"));
    ref = new PopupListener({ target: trg, showCase: PopupOpenCases.onClick }, onShow, onHide);
    await h.userClick(tin1);
    await h.wait();
    expect(isShown).toBe(true);
    await h.userPressTab(tin2);
    expect(isShown).toBe(true);
    await h.userClick(btnInside);
    await h.wait();
    expect(isShown).toBe(false);
    expect(document.activeElement).toBe(tin2);

    // cover case when click on popup moves focus to body because popup don't haven tabindex
    await h.userClick(tin1);
    await h.wait();
    expect(isShown).toBe(true);
    await h.userClick(el);
    await h.wait();
    expect(isShown).toBe(false);
    expect(document.activeElement).toBe(tin1);

    // checking case when document.activeElement is null/not-null (possible on Firefox/Safari)
    tin1.blur();
    await h.userClick(tin1);
    await h.wait();
    expect(isShown).toBe(true);
    const f0 = jest.spyOn(document, "activeElement", "get").mockReturnValue(null); // just for coverage
    await h.userClick(el);
    await h.wait();
    expect(isShown).toBe(false);
    f0.mockRestore();

    // special case when popup can be opened again
    expect(document.activeElement).not.toBe(trg);
    ref = new PopupListener(
      { target: trg, showCase: PopupOpenCases.onClick | PopupOpenCases.onFocus | PopupOpenCases.onHover },
      onShow,
      onHide
    );
    trg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true);
    const btn = el.appendChild(document.createElement("button"));
    await h.userPressTab(btn);
    trg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait();
    expect(isShown).toBe(false);
    expect(document.activeElement).toBe(tin1);

    // popup focusing during the hiding is prevented
    await h.userClick(trg);
    await h.wait();
    expect(isShown).toBe(true);
    onHide.mockImplementationOnce(
      () =>
        new Promise((res) =>
          setTimeout(() => {
            res(true);
            isShown = false;
          }, 400)
        )
    );
    await h.userClick(trg);
    expect(isShown).toBe(true); // because closing takes time
    await h.userPressTab(el);
    expect(document.activeElement).toBe(tin1);
    await h.wait();
    expect(isShown).toBe(false);
  });
});
