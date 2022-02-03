import { WUPPopupElement } from "web-ui-pack";
import * as h from "../testHelper";

jest.useFakeTimers();
/** @type WUPPopupElement */
let el;
/** @type HTMLElement */
let trg; // target for popup

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  trg = document.body.appendChild(document.createElement("div"));
  trg.append("some text");
  trg.setAttribute("id", "targetId");
  el = document.createElement("wup-popup");
  el.$options.showCase = 0; // always
  document.body.appendChild(el);
  jest.advanceTimersToNextTimer(); // gotReady has timeout
});

afterEach(() => {
  el.remove();
  trg.remove();
  h.unMockConsoleWarn();
  h.unMockConsoleWarn();
  document.body.innerHTML = "";
});

describe("popupElement", () => {
  describe("me", () => {
    h.testComponentFuncBind(document.createElement("wup-popup"));
  });
  describe("inheritance", () => {
    class TestPopupElement extends WUPPopupElement {}
    customElements.define("test-el", TestPopupElement);
    h.testComponentFuncBind(document.createElement("test-el"));
  });

  // WARN: after this method static $defaults can be changed
  test("changing $options != changing static.$defaults", () => {
    Object.keys(el.$options).forEach((k) => {
      if (typeof el.$options[k] !== "object" || el.$options[k] instanceof Element) {
        el.$options[k] = 1234;
      }
    });
    const affected = Object.keys(WUPPopupElement.$defaults) //
      .filter((k) => el.$options[k] === WUPPopupElement.$defaults[k]);
    expect(affected).toHaveLength(0);
  });

  // todo check static inherritance
  test("static.$defaults === $options", () => {
    const defVal = [3456];
    const prev = WUPPopupElement.$defaults;
    WUPPopupElement.$defaults = {};
    Object.keys(prev).forEach((k) => {
      WUPPopupElement.$defaults[k] = defVal;
    });
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    const skipped = Object.keys(a.$options) //
      .filter((k) => a.$options[k] !== defVal && !(a.$options[k]?.length === 1 && a.$options[k][0] === 3456));
    expect(skipped).toHaveLength(0);

    // it rollback to previous
    WUPPopupElement.$defaults = prev;
  });

  test("init: methods-chaining", () => {
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0; // always
    a.$options.target = trg;

    const gotReady = jest.spyOn(a, "gotReady");
    const init = jest.spyOn(a, "init");
    const show = jest.spyOn(a, "show");
    const onShow = jest.fn();
    const onHide = jest.fn();
    a.addEventListener("$show", onShow);
    a.addEventListener("$hide", onHide);

    expect(gotReady).toBeCalledTimes(0);
    expect(init).toBeCalledTimes(0);
    expect(show).toBeCalledTimes(0);
    expect(a.$isOpened).toBeFalsy();
    expect(onShow).toBeCalledTimes(0);

    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(gotReady).toBeCalledTimes(1);
    expect(init).toBeCalledTimes(1);
    expect(show).toBeCalledTimes(1); // showCase = always so expected element to show
    expect(a.$isOpened).toBeTruthy();
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
  });

  test("$options.target", () => {
    const err = h.mockConsoleError();
    let a = document.createElement(el.tagName);
    a.$options.showCase = 0; // always
    const onShow = jest.fn();
    const onHide = jest.fn();
    a.addEventListener("$show", onShow);
    a.addEventListener("$hide", onHide);

    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(a.$options.target).toBeDefined(); // target wasn't pointed but defined as previousSibling
    expect(a.$isOpened).toBeTruthy();
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onHide).not.toBeCalled();

    a.$options.target = null;
    a.remove();
    onShow.mockClear();
    expect(err).not.toBeCalled();
    document.body.prepend(a); // prepend to previousElementSibling = null
    expect(a.previousElementSibling).toBeNull();
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(onShow).not.toBeCalled(); // because target is null
    expect(err).toBeCalledTimes(1); // expected that user will be notified

    // onHide expected by $show-success > $show-failed
    a.$options.target = trg;
    a.$show();
    expect(a.$isOpened).toBeTruthy();
    onHide.mockClear();
    a.$options.target = null;
    const spyShow = jest.spyOn(a, "show").mockClear();
    a.$show(); // to apply options
    expect(spyShow).toBeCalledTimes(1);
    expect(a.$isOpened).toBeFalsy(); // because target is not defined
    jest.advanceTimersToNextTimer(); // onHide has timeout
    expect(onHide).toBeCalledTimes(1); // because it was shown with target and hidden with the next show without target

    // try createElement when target is null by init
    err.mockClear();
    onShow.mockClear();
    a = document.createElement(el.tagName);
    a.$options.showCase = 0;
    document.body.prepend(a); // prepend to previousElementSibling = null
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(onShow).not.toBeCalled(); // because target is null
    expect(err).toBeCalledTimes(1); // no target byOpen > console.warn
  });

  test("$options.showCase", () => {
    const a = document.createElement(el.tagName);
    a.$options.target = trg;

    const spyShow = jest.spyOn(a, "show");
    const spyHide = jest.spyOn(a, "hide");

    // only hover
    document.body.appendChild(a);
    a.$options.showCase = 1; // onHover
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpened).toBeFalsy();

    trg.dispatchEvent(new Event("mouseenter"));
    jest.advanceTimersByTime(a.$options.hoverShowTimeout); // event listener has timeout
    expect(spyShow).toBeCalledTimes(1);
    expect(a.$isOpened).toBeTruthy();
    expect(spyShow).toHaveBeenLastCalledWith(1);

    trg.dispatchEvent(new Event("mouseleave"));
    jest.advanceTimersByTime(a.$options.hoverHideTimeout); // event listener has timeout
    expect(a.$isOpened).toBeFalsy();
    expect(spyHide).toHaveBeenLastCalledWith(1, 2);

    jest.clearAllMocks();
    trg.dispatchEvent(new Event("mouseenter"));
    trg.dispatchEvent(new Event("mouseleave"));
    trg.dispatchEvent(new Event("mouseenter"));
    trg.dispatchEvent(new Event("mouseleave"));
    jest.advanceTimersToNextTimer(a.$options.hoverShowTimeout + a.$options.hoverHideTimeout); // event listener has timeout
    expect(a.$isOpened).toBeFalsy();
    expect(spyShow).not.toBeCalled();

    // onlyFocus
    a.remove();
    document.body.appendChild(a);
    a.$options.showCase = 1 << 1; // onFocus
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpened).toBeFalsy();

    trg.dispatchEvent(new Event("focusin"));
    const trgInput = trg.appendChild(document.createElement("input"));
    const trgInput2 = trg.appendChild(document.createElement("input"));
    expect(a.$isOpened).toBeTruthy();
    expect(spyShow).toBeCalledTimes(1);
    expect(spyShow).lastCalledWith(1 << 1);
    trg.dispatchEvent(new Event("focusout"));
    expect(spyShow).toBeCalledTimes(1); // no new triggers because focus stay
    // jest.advanceTimersToNextTimer(); // focusLost has timeout
    expect(a.$isOpened).toBeFalsy();

    // checking focusin-throttling
    jest.clearAllMocks();
    trgInput.focus();
    expect(a.$isOpened).toBeTruthy();
    trgInput2.focus();
    trgInput.focus();
    expect(a.$isOpened).toBeTruthy();
    expect(spyHide).not.toBeCalled(); // because div haven't been lost focus
    trgInput.blur();
    expect(a.$isOpened).toBeFalsy();
    expect(spyShow).toBeCalledTimes(1); // checking if throttling-filter works
    expect(spyShow).lastCalledWith(1 << 1); // checking if throttling-filter works
    expect(spyHide).lastCalledWith(1 << 1, 3); // because div haven't been lost focus

    // onlyClick
    jest.clearAllMocks();
    a.remove();
    document.body.appendChild(a);
    a.$options.showCase = 1 << 2; // onClick
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpened).toBeFalsy();

    trg.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpened).toBeTruthy();
    trg.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpened).toBeTruthy(); // because previous event is skipped (due to debounceTimeout)
    expect(spyShow).toHaveBeenCalledTimes(1);
    expect(spyShow).lastCalledWith(1 << 2);
    jest.advanceTimersByTime(50); // onClick has debounce timeout

    trg.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpened).toBeFalsy();
    expect(spyHide).toHaveBeenCalledTimes(1);
    expect(spyHide).lastCalledWith(1 << 2, 6);
    jest.advanceTimersByTime(50); // onClick has debounce timeout

    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpened).toBeTruthy(); // click on input inside
    jest.advanceTimersByTime(50); // onClick has debounce timeout

    a.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpened).toBeFalsy(); // click onMe == close
    expect(spyHide).lastCalledWith(1 << 2, 5);

    trgInput2.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpened).toBeTruthy(); // click on input2 inside
    jest.advanceTimersByTime(50); // onClick has debounce timeout

    document.body.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpened).toBeFalsy(); // click outside == close
    expect(spyHide).lastCalledWith(1 << 2, 4);

    // test all: onHover | onFocus | onClick
    jest.clearAllTimers();
    jest.clearAllMocks();
    a.remove();
    document.activeElement?.blur();
    document.body.appendChild(a);
    a.$options.showCase = 0b111111111;
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpened).toBeFalsy();

    // open by mouseenter-click-focus
    trgInput.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    jest.advanceTimersByTime(a.$options.hoverShowTimeout); // mouseenter has debounce timeout
    expect(a.$isOpened).toBeTruthy();
    expect(spyShow).lastCalledWith(1);
    trgInput.dispatchEvent(new Event("mousedown", { bubbles: true }));
    trgInput.focus();
    trgInput.dispatchEvent(new Event("mouseup", { bubbles: true }));
    expect(a.$isOpened).toBeTruthy(); // no changes in state
    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpened).toBeTruthy(); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    // close by blur
    trgInput.blur();
    expect(a.$isOpened).toBeFalsy(); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyHide).lastCalledWith(1, 3);

    // close by mouseleave
    trgInput.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    jest.advanceTimersByTime(a.$options.hoverShowTimeout); // mouseenter has debounce timeout
    trgInput.dispatchEvent(new Event("mouseleave", { bubbles: true }));
    jest.advanceTimersByTime(a.$options.hoverHideTimeout); // mouseenter has debounce timeout
    expect(a.$isOpened).toBeFalsy(); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyHide).lastCalledWith(1, 2);

    // open again by click
    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    jest.advanceTimersByTime(50); // click has debounce timeout
    expect(a.$isOpened).toBeTruthy(); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyShow).lastCalledWith(1 << 2);

    // close by click again
    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    jest.advanceTimersByTime(50);
    expect(a.$isOpened).toBeFalsy();
    expect(spyHide).lastCalledWith(1 << 2, 6);
    trgInput.blur();
    spyShow.mockClear();

    // simulate click-focus without mouseenter
    // jest.advanceTimersByTime(el.$options.focusDebounceMs);
    trgInput.dispatchEvent(new Event("touchstart", { bubbles: true })); // just for coverage 100%
    trgInput.dispatchEvent(new Event("mousedown", { bubbles: true }));
    expect(a.$isOpened).toBeFalsy();
    trgInput.focus();
    expect(spyShow).lastCalledWith(1 << 1);
    expect(a.$isOpened).toBeTruthy(); // show by focus
    trgInput.dispatchEvent(new Event("mouseup", { bubbles: true }));
    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    jest.advanceTimersByTime(50);
    expect(a.$isOpened).toBeTruthy(); // stay opened because wasOpened by focus from click)

    // simulate mouse-click again
    trgInput.dispatchEvent(new Event("mousedown", { bubbles: true }));
    trgInput.dispatchEvent(new Event("mouseup", { bubbles: true }));
    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    jest.advanceTimersByTime(50);
    expect(a.$isOpened).toBeFalsy(); // 2nd click will close (but if click is fired without mousedown it doesn't work)
    expect(spyHide).lastCalledWith(1 << 1, 6);
  });

  // todo e2e cases: clickOnLabel with input - single event

  // todo check all options

  test("$hide()/$show()", () => {
    el.$options.showCase = 0; // always
    expect(el.$isOpened).toBeTruthy();
    el.$hide();
    expect(el.$isOpened).toBeFalsy();
    el.$show();
    expect(el.$isOpened).toBeTruthy();

    el.remove();
    el.$hide();
    el.$show();
    expect(el.$isOpened).toBeFalsy();
    // todo check private methods canShow, canHide

    // other cases in test(`options.$target`) and test(`remove`)
  });

  test("remove", () => {
    const dispose = jest.spyOn(el, "dispose");
    expect(el.$isOpened).toBeTruthy();
    el.remove();
    expect(dispose).toBeCalledTimes(1);
    expect(el.$isOpened).toBeFalsy();
    expect(el.$isReady).toBeFalsy();

    // try to open when element not appended
    const err = h.mockConsoleError();
    expect(el.$show).not.toThrow();
    expect(el.$isOpened).toBeFalsy(); // because $show() is async method
    expect(jest.advanceTimersToNextTimer).not.toThrow(); // wait for tryShow
    expect(el.$isReady).toBeFalsy();
    expect(err).toBeCalledTimes(1); // because still isNotReady
    expect(el.$isOpened).toBeFalsy(); // because $show() is async method

    // try to append and open
    err.mockClear();
    document.body.appendChild(el);
    jest.advanceTimersToNextTimer();
    expect(el.$show).not.toThrow();
    expect(el.$isOpened).toBeTruthy();
  });

  test("memoryLeaking", () => {
    const spy = [document, document.body, HTMLElement.prototype, trg].map((s) => {
      const me = {
        on: jest.spyOn(s, "addEventListener"),
        off: jest.spyOn(s, "removeEventListener"),
        itemName: s.toString(),
      };
      return me;
    });

    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.target = trg;
    a.$options.showCase = 0b11111111; // all
    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpened).toBeFalsy(); // no events from target

    const called = spy.filter((v) => v.on.mock.calls.length).map((v) => v.on.mock.calls[0]);
    expect(called).not.toHaveLength(0); // test if event listeners were added

    a.$show(); // it will add extra events
    expect(a.$isOpened).toBeTruthy();
    expect(spy[0].on).toBeCalled(); // expected that we have events for document

    a.remove();
    spy.forEach((s) => {
      // checking if removed every listener that was added
      const onCalls = s.on.mock.calls.map((c, i) => `${c[0]} ${s.on.mock.instances[i] || s.itemName}`);
      const offCalls = s.off.mock.calls.map((c, i) => `${c[0]} ${s.off.mock.instances[i] || s.itemName}`);
      expect(onCalls).toEqual(offCalls);
    });
  });

  // todo implement
  // test("attr `target`", () => {});
});
