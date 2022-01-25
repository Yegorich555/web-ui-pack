import WUPPopupElement from "web-ui-pack/popupElement";
import * as h from "../testHelper";

jest.useFakeTimers();
/** @type WUPPopupElement */
let el;
/** @type HTMLElement */
let trg; // target for popup
beforeAll(() => {
  // todo it doesn't work
  // h.mockConsoleWarn();
});

afterAll(() => {
  // h.unMockConsoleWarn();
});

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
    const a = document.createElement(el.tagName);
    const skipped = Object.keys(a.$options) //
      .filter((k) => a.$options[k] !== defVal && !(a.$options[k]?.length === 1 && a.$options[k][0] === 3456));
    expect(skipped).toHaveLength(0);

    // rollback
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
    // other cases in test(`options.$target`) and test(`remove`)
  });

  // todo implement
  // test("$options.showCase", () => {});

  test("remove", () => {
    // todo check if all events are destroyed for different cases

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

  // todo implement
  // test("attr `target`", () => {});
});
