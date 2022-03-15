import { WUPPopupElement } from "web-ui-pack";
import all from "web-ui-pack/popupElement.types";
import * as h from "../testHelper";

jest.useFakeTimers();
/** @type WUPPopupElement */
let el;
/** @type HTMLElement */
let trg; // target for popup

// simulate layout
beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.clearAllTimers();

  jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 400,
    height: 400,
    width: 600,
    right: 600,
    toJSON: () => "",
  });
  jest.spyOn(document.body, "clientHeight", "get").mockReturnValue(400);
  jest.spyOn(document.body, "clientWidth", "get").mockReturnValue(600);

  trg = document.body.appendChild(document.createElement("div"));
  trg.append("some text");
  trg.setAttribute("id", "targetId");

  // simulate layout
  const height = 50;
  const width = 100;
  const x = 140;
  const y = 100;
  jest.spyOn(trg, "getBoundingClientRect").mockReturnValue({
    x,
    left: x,
    y,
    top: y,
    bottom: y + height,
    right: x + width,
    height,
    width,
    toJSON: () => "",
  });

  el = document.createElement("wup-popup");
  el.$options.showCase = 0; // always
  document.body.appendChild(el);
  jest.advanceTimersToNextTimer(); // gotReady has timeout
});

afterEach(() => {
  el.remove();
  trg.remove();
  h.unMockConsoleError();
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
    expect(all).toBeUndefined(); // just for coverage

    Object.keys(el.$options).forEach((k) => {
      if (typeof el.$options[k] !== "object" || el.$options[k] instanceof Element) {
        el.$options[k] = 1234;
      }
    });
    const affected = Object.keys(WUPPopupElement.$defaults) //
      .filter((k) => el.$options[k] === WUPPopupElement.$defaults[k]);
    expect(affected).toHaveLength(0);
  });

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
    const show = jest.spyOn(a, "goShow");
    const onShow = jest.fn();
    const onHide = jest.fn();
    const onWillShow = jest.fn();
    const onWillHide = jest.fn();
    a.addEventListener("$show", onShow);
    a.addEventListener("$hide", onHide);
    a.addEventListener("$willShow", onWillShow);
    a.addEventListener("$willHide", onWillHide);

    expect(gotReady).toBeCalledTimes(0);
    expect(init).toBeCalledTimes(0);
    expect(show).toBeCalledTimes(0);
    expect(a.$isOpened).toBeFalsy();
    expect(onShow).toBeCalledTimes(0);
    expect(onWillShow).toBeCalledTimes(0);

    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(gotReady).toBeCalledTimes(1);
    expect(init).toBeCalledTimes(1);
    expect(show).toBeCalledTimes(1); // showCase = always so expected element to show
    expect(a.$isOpened).toBeTruthy();
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onWillShow).toBeCalledTimes(1);
    expect(onWillShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onHide).not.toBeCalled();
    expect(onWillHide).not.toBeCalled();

    // testing events
    a.$hide();
    expect(a.$isOpened).toBeFalsy();
    jest.advanceTimersByTime(1);
    expect(onHide).toBeCalledTimes(1);
    expect(onWillHide).toBeCalledTimes(1);

    jest.clearAllMocks();
    const r = (e) => e.preventDefault();
    a.addEventListener("$willShow", r);
    a.$show();
    jest.advanceTimersByTime(1);
    expect(onWillShow).toBeCalledTimes(1);
    expect(a.$isOpened).toBeFalsy(); // because of prevented
    expect(onShow).not.toBeCalled();
    a.removeEventListener("$willShow", r); // remove event
    a.$show();
    jest.advanceTimersByTime(1);
    expect(a.$isOpened).toBeTruthy();
    expect(onShow).toBeCalled();

    a.addEventListener("$willHide", r);
    jest.clearAllMocks();
    a.$hide();
    jest.advanceTimersByTime(1);
    expect(onWillHide).toBeCalledTimes(1);
    expect(a.$isOpened).toBeTruthy(); // because of prevented
    expect(onHide).not.toBeCalled();
    a.removeEventListener("$willHide", r); // remove event
    a.$hide();
    jest.advanceTimersByTime(1);
    expect(a.$isOpened).toBeFalsy();
    expect(onHide).toBeCalledTimes(1);

    // coverage for initTimer
    jest.clearAllMocks();
    jest.clearAllTimers();
    /** @type typeof el */
    const a2 = document.createElement(el.tagName);
    a2.$options.showCase = 1 << 2; // click
    const init2 = jest.spyOn(a2, "init");
    document.body.prepend(a2);
    jest.advanceTimersToNextTimer(); // wait for ready
    expect(init2).toBeCalledTimes(1);
    expect(jest.advanceTimersToNextTimer).toThrow(); // wait for error by timeout
    expect(a2.$options.target == null).toBeTruthy();
    expect(a2.$isOpened).toBeFalsy();

    // applyShowCase after timer
    // a2.remove();
    // document.body.prepend(a2);
    // a2.$options.target = null;
    // jest.advanceTimersByTime(2); // wait for ready and applyShowCase-timer-start
    // a2.$options.target = trg;
    // jest.advanceTimersToNextTimer();
    // trg.click();
    // expect(a2.$isOpened).toBeTruthy();
  });

  test("$options.target", () => {
    /** @type typeof el */
    let a = document.createElement(el.tagName);
    a.$options.showCase = 0; // always
    const onShow = jest.fn();
    const onHide = jest.fn();
    a.addEventListener("$show", onShow);
    a.addEventListener("$hide", onHide);

    document.body.appendChild(a); // event gotReady here
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(a.$options.target).toBeDefined(); // target wasn't pointed but defined as previousSibling
    expect(a.$isOpened).toBeTruthy();
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(a.$isOpened).toBeTruthy();
    expect(onHide).not.toBeCalled();

    a.$options.target = null;
    a.remove();
    onShow.mockClear();
    document.body.prepend(a); // prepend to previousElementSibling = null
    expect(a.previousElementSibling).toBeNull();
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // onReady has timeout and it throws exception
    expect(onShow).not.toBeCalled(); // because target is null

    // onHide expected by $show-success > $show-failed
    h.handleRejection(); // target is not defined and in this case observer gets exception from callback
    a.$options.target = trg;
    a.$show();
    expect(a.$isOpened).toBeTruthy();
    onHide.mockClear();
    a.$options.target = null;
    const spyShow = jest.spyOn(a, "goShow").mockClear();
    expect(a.$show).toThrow(); // to apply options - throw error because target is not defined
    expect(spyShow).toBeCalledTimes(1);
    expect(a.$isOpened).toBeFalsy(); // because target is not defined
    jest.advanceTimersToNextTimer(); // onHide has timeout
    expect(onHide).toBeCalledTimes(1); // because it was shown with target and hidden with the next show without target

    // try createElement when target is null by init
    a.removeEventListener("$show", onShow);
    onShow.mockClear();
    /** @type typeof el */
    a = document.createElement(el.tagName);
    a.addEventListener("$show", onShow);
    a.$options.showCase = 0;
    document.body.prepend(a); // prepend to previousElementSibling = null
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // onReady has timeout; throw error because target is not defined
    expect(onShow).not.toBeCalled(); // because target is null

    // check if changing on the fly >>> reinit event
    a.$options.target = trg;
    jest.advanceTimersToNextTimer(); // $options.onChanged has timeout
    expect(a.$isOpened).toBeTruthy();
    a.$options.showCase = 1 << 2; // onClick
    jest.advanceTimersToNextTimer(); // $options.onChanged has timeout
    expect(a.$isOpened).toBeFalsy(); // because option changed
    trg.click(); // checking if new showCase works
    expect(a.$isOpened).toBeTruthy();
  });

  test("$options.showCase", () => {
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.target = trg;

    const spyShow = jest.spyOn(a, "goShow");
    const spyHide = jest.spyOn(a, "goHide");

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

    // when showCase = focus. need to show() if target isAlreadyFocused
    a.remove();
    trg.setAttribute("tabindex", "0");
    trg.focus();
    expect(document.activeElement.id).toBe("targetId");
    document.body.appendChild(a);
    a.$options.showCase = 1 << 1; // onFocus
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpened).toBeTruthy(); // because of trg is alreadyFocused
    trg.removeAttribute("tabindex");

    // focus moves to element inside popup > no-hide
    /** @type typeof el */
    let a2 = document.body.appendChild(document.createElement(el.tagName));
    const a2Input = a2.appendChild(document.createElement("input"));
    a2.$options.showCase = 1 << 1;
    a2.$options.target = trgInput;
    jest.advanceTimersToNextTimer();
    trgInput.focus();
    expect(a2.$isOpened).toBeTruthy();
    let f = jest.spyOn(document, "activeElement", "get").mockReturnValue(null);
    a2Input.focus();
    jest.advanceTimersToNextTimer(); // focusLost has debounce
    expect(a2.$isOpened).toBeTruthy();
    f.mockRestore();

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

    // check focus on target on hide
    document.activeElement.blur();
    f = jest.spyOn(document, "activeElement", "get").mockReturnValue(null);
    /** @type typeof el */
    a2 = document.body.appendChild(document.createElement(el.tagName));
    a2.$options.showCase = 1 << 2;
    a2.$options.target = trgInput;
    jest.advanceTimersToNextTimer();
    trgInput.click();
    expect(a2.$isOpened).toBeTruthy();
    const onFocus = jest.spyOn(trgInput, "focus");
    a2.click();
    expect(a2.$isOpened).toBeFalsy();
    expect(onFocus).toBeCalled();
    f.mockRestore();
    a2.remove();

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
    const ev = new MouseEvent("click", { bubbles: true });
    ev.pageX = 20; // required otherwise it's filtered from synthetic events
    trgInput.dispatchEvent(ev);
    jest.advanceTimersByTime(50);
    expect(a.$isOpened).toBeTruthy(); // stay opened because wasOpened by focus from click)

    // simulate mouse-click again
    trgInput.dispatchEvent(new Event("mousedown", { bubbles: true }));
    trgInput.dispatchEvent(new Event("mouseup", { bubbles: true }));
    trgInput.dispatchEvent(ev);
    jest.advanceTimersByTime(50);
    expect(a.$isOpened).toBeFalsy(); // 2nd click will close (but if click is fired without mousedown it doesn't work)
    expect(spyHide).lastCalledWith(1 << 1, 6);
  });

  test("$options.minWidthByTarget/minHeightByTarget", () => {
    // just for coverage
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0; // always
    a.$options.minWidthByTarget = true;
    a.$options.minHeightByTarget = true;
    document.body.append(a);
    jest.advanceTimersToNextTimer(); // wait for ready/init
    // WARN: layout impossible to test with unit; all layout tests see in e2e
    expect(a.style.minWidth).toBeDefined();
    expect(a.style.minHeight).toBeDefined();

    jest.clearAllTimers();
    const a2 = document.createElement(el.tagName);
    a2.$options.showCase = 0; // always
    a2.style.minWidth = `${1}px`;
    a2.style.minHeight = `${2}px`;
    a2.$options.toFitElement = null;
    document.body.append(a2);
    jest.advanceTimersToNextTimer(); // wait for ready/init
    expect(a.style.minWidth).toBeDefined();
    expect(a.style.minHeight).toBeDefined();
    jest.clearAllTimers();
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

    // check when showCase != 0
    jest.clearAllTimers();
    el.$options.showCase = 1 << 2; // onClick
    document.body.append(el);
    jest.advanceTimersToNextTimer(); // wait for ready
    trg.click();
    expect(el.$isOpened).toBeTruthy(); // checking if click-listener works
    el.$show();

    el.$show();
    trg.click();
    expect(el.$isOpened).toBeTruthy(); // checking if click-listener is off because was opened by manual $show
    el.$hide();
    expect(el.$isOpened).toBeFalsy(); // checking if click-listener is off because was opened by manual $show
    trg.click();
    expect(el.$isOpened).toBeTruthy(); // checking if events works again

    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0;
    document.body.append(a);
    expect(a.$isReady).toBeFalsy();
    expect(a.$hide).not.toThrow();
    jest.advanceTimersByTime(1);

    // test timeouts inside $show
    a.remove();
    expect(a.$show).not.toThrow();
    expect(() => jest.advanceTimersByTime(1)).toThrow(); // because isReady still false
    a.$show();
    document.body.append(a);
    expect(() => jest.advanceTimersByTime(1)).not.toThrow(); // because isReady true
    expect(a.$isOpened).toBeTruthy();

    // checking canHide method
    a.canHide = () => false;
    a.$hide();
    expect(a.$isOpened).toBeTruthy();
    a.canHide = () => true;
    a.$hide();
    expect(a.$isOpened).toBeFalsy();

    a.canShow = () => false;
    a.$show();
    expect(a.$isOpened).toBeFalsy();
    a.canShow = () => true;
    a.$show();
    expect(a.$isOpened).toBeTruthy();

    // other cases in test(`options.$target`) and test(`remove`)
  });

  test("attrs", () => {
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0;
    document.body.prepend(a);
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because of target not defined
    jest.clearAllMocks();
    expect(a.$isOpened).toBeFalsy();
    expect(a.$options.target == null).toBeTruthy();

    // attr 'target'
    a.setAttribute("target", `#${trg.getAttribute("id")}`);
    a.setAttribute("placement", "top-start");
    jest.advanceTimersToNextTimer();
    expect(a.$options.target).toBeDefined();
    expect(a.$isOpened).toBeTruthy();

    const svg = document.body.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    svg.setAttribute("id", "svgId");
    a.setAttribute("target", "#svgId");
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because of target is defined but not HTMLELement
  });

  test("remove", () => {
    const dispose = jest.spyOn(el, "dispose");
    expect(el.$isOpened).toBeTruthy();
    el.remove();
    expect(dispose).toBeCalledTimes(1);
    expect(el.$isOpened).toBeFalsy();
    expect(el.$isReady).toBeFalsy();

    // try to open when element not appended
    expect(el.$show).not.toThrow();
    expect(el.$isOpened).toBeFalsy(); // because $show() is async method
    expect(jest.advanceTimersToNextTimer).toThrow(); // wait for tryShow
    expect(el.$isReady).toBeFalsy();
    expect(el.$isOpened).toBeFalsy(); // because $show() is async method

    // try to append and open
    document.body.appendChild(el);
    jest.advanceTimersToNextTimer();
    expect(el.$show).not.toThrow();
    expect(el.$isOpened).toBeTruthy();

    // coverage: check if initTimer is destroyed
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    document.body.prepend(a);
    jest.advanceTimersToNextTimer(); // wait for ready
    a.$options.target = trg;
    jest.advanceTimersByTime(1); // wait for #initTimer to be defined
    a.remove();
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

    const called = spy.map((v) => v.on.mock.calls[0]).filter((v) => v);
    expect(called).not.toHaveLength(0); // test if event listeners were added

    trg.click(); // it will add extra events
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

  test("position", async () => {
    expect(el.$isOpened).toBeTruthy(); // checking prev-state

    el.$options.placement = [WUPPopupElement.$placements.$top.$start.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 100px); display: block;\\"></wup-popup>"`
    );

    el.$options.placement = [WUPPopupElement.$placements.$top.$middle.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$top.$end.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 100px); display: block;\\"></wup-popup>"`
    );

    el.$options.placement = [WUPPopupElement.$placements.$bottom.$start.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 150px); display: block;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$bottom.$middle.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 150px); display: block;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$bottom.$end.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 150px); display: block;\\"></wup-popup>"`
    );

    el.$options.placement = [WUPPopupElement.$placements.$left.$start.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 100px); display: block;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$left.$middle.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 125px); display: block;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$left.$end.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 150px); display: block;\\"></wup-popup>"`
    );

    el.$options.placement = [WUPPopupElement.$placements.$right.$start.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 100px); display: block;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$right.$middle.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 125px); display: block;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$right.$end.$adjust];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 150px); display: block;\\"></wup-popup>"`
    );

    // checking if $placements.$right == $placements.$right.middle etc.
    el.$options.placement = [WUPPopupElement.$placements.$right];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 125px); display: block;\\"></wup-popup>"`
    );

    el.$options.placement = [];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\"></wup-popup>"`
    );
  });

  test("position alt", () => {
    // checking alt when no space
    expect(el.$isOpened).toBeTruthy(); // checking prev-state

    const height = 50;
    const width = 100;
    let x = 140;
    let y = 0;
    const trgRect = { x, left: x, y, top: y, bottom: y + height, right: x + width, height, width, toJSON: () => "" };
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValue(trgRect);

    el.$options.placement = [
      WUPPopupElement.$placements.$top.$start, //
      WUPPopupElement.$placements.$bottom.$start,
    ];
    jest.advanceTimersByTime(10);
    // no place at the top so at the bottom is expected
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 50px); display: block;\\"></wup-popup>"`
    );

    // just for coverage: tesing ignoreAlign in popupAdjustInternal()
    el.$options.placement = [WUPPopupElement.$placements.$top.$start];
    // el.style.minHeight = "10px"; // watchfix: https://github.com/jsdom/jsdom/issues/2986
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return { minWidth: "10px", minHeight: "10px" };
      }
      return orig(elem);
    });

    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 50px); display: block;\\"></wup-popup>"`
    );

    // cover calc maxHeight by freeHeight in popupAdjustInternal()
    y = 11; // so freeH < me.H but freeH > minHeight
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y + 1);
    trgRect.y = y;
    trgRect.top = y;
    trgRect.bottom = height + y;
    el.$options.placement = [WUPPopupElement.$placements.$top.$start.$adjust];
    // expected bottom.middle position because at left/top not enough space
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 61px); display: block;\\"></wup-popup>"`
    );

    // checking $resizeHeight
    el.$options.placement = [WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight];
    // expected $top.$start with maxHeight
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 0px); display: block; max-height: 11px;\\"></wup-popup>"`
    );
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y);
    el.$options.placement = [WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight];
    // expected $top.$start without maxHeight because height == freeH
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 0px); display: block;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$top.$start.$resizeHeight];
    // expected $top.$start with maxHeight
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 0px); display: block;\\"></wup-popup>"`
    );

    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y + 1);
    // cover calc maxWidth by freeWidth in popupAdjustInternal()
    x = 12; // so freeW < me.W but freeW > minWidth
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(x + 1);
    trgRect.x = x;
    trgRect.left = x;
    trgRect.right = width + x;
    el.$options.placement = [WUPPopupElement.$placements.$left.$start.$adjust];
    // expected bottom.middle position because at left/top not enough space
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(55.5px, 61px); display: block;\\"></wup-popup>"`
    );

    // checking $resizeWidth
    el.$options.placement = [WUPPopupElement.$placements.$left.$start.$adjust.$resizeWidth];
    // expected left.start with maxWidth
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(0px, 11px); display: block; max-width: 12px;\\"></wup-popup>"`
    );
    el.$options.placement = [WUPPopupElement.$placements.$left.$start.$resizeWidth];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(0px, 11px); display: block; max-width: 12px;\\"></wup-popup>"`
    );

    // cover case when maxWidth affects on height
    jest.spyOn(el, "offsetHeight", "get").mockImplementation(() => {
      if (el.style.maxWidth) {
        return document.body.clientHeight;
      }
      return y + 1;
    });
    el.$options.placement = [WUPPopupElement.$placements.$left.$start.$resizeWidth];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(55.5px, 61px); display: block;\\"></wup-popup>"`
    );

    // test case when not enough space
    const fn = h.mockConsoleError();
    jest.clearAllTimers();
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(1000);
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(1000);
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return { minWidth: "1000px", minHeight: "1000px" };
      }
      return orig(elem);
    });
    el.$options.placement = [WUPPopupElement.$placements.$left.$start];

    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(112px, 0px); display: block;\\"></wup-popup>"`
    );
    expect(fn).toBeCalledTimes(1);
    h.unMockConsoleError();
  });

  test("position with scroll", () => {
    // make body as scrollable
    const dy = 10;
    const dx = 5;
    jest.spyOn(document.body, "scrollWidth", "get").mockReturnValue(document.body.clientWidth + dx);
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      const o = orig(elem);
      if (elem === document.body) {
        o.overflowX = "auto";
      }
      return o;
    });

    const rectBody = document.body.getBoundingClientRect();
    jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
      ...rectBody,
      x: dx,
      y: dy,
      top: dy,
      left: dx,
      bottom: rectBody.height + dy,
      right: rectBody.width + dx,
    });

    const trgRect = {
      ...trg.getBoundingClientRect(),
      x: 0,
      left: 0,
      y: 0,
      top: 0,
      bottom: trg.getBoundingClientRect().height,
      right: trg.getBoundingClientRect().width,
    };
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValue(trgRect);

    // check with overflowX
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    // no place at the top
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(52.5px, 50px); display: block;\\"></wup-popup>"`
    );

    // check with overflowY
    jest.spyOn(document.body, "scrollHeight", "get").mockReturnValue(document.body.clientHeight + dy);
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      const o = orig(elem);
      if (elem === document.body) {
        o.overflowY = "auto";
      }
      return o;
    });

    // cover case when target is partiallyHidden by scrollable parent
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    // no place at the top
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(52.5px, 50px); display: block;\\"></wup-popup>"`
    );

    jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
      ...rectBody,
      height: trgRect.height,
      bottom: trgRect.height - dy,
    });
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    // no place at the bottom
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(52.5px, 10px); display: block;\\"></wup-popup>"`
    );

    jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
      ...rectBody,
      x: dx,
      left: dx,
    });
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    // no place at the left
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(52.5px, 10px); display: block;\\"></wup-popup>"`
    );

    jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
      ...rectBody,
      width: trgRect.width,
      right: trgRect.width - dx,
    });
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    // no place at the right
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(52.5px, 10px); display: block;\\"></wup-popup>"`
    );

    // checking hidden by scroll > popup also hidden
    // target hidden at the top of scrollable content
    jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
      ...rectBody,
      height: trgRect.height * 4,
      top: trgRect.bottom,
    });
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    // target hidden > popup hidden
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(52.5px, 10px);\\"></wup-popup>"`
    );
    el.$options.arrowEnable = true; // checking if arrow is hidden also
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(52.5px, 10px);\\"></wup-popup><wup-popup-arrow style=\\"display: none;\\"></wup-popup-arrow></body>"`
    );
    el.$options.arrowEnable = false;

    // target is partially hidden at the bottom of scrollable content
    jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
      ...rectBody,
      height: trgRect.height,
    });
    jest.spyOn(document.body, "clientHeight", "get").mockReturnValue(trgRect.height);
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValue({
      ...trgRect,
      y: trgRect.height / 2,
      top: trgRect.height / 2,
      bottom: trgRect.height + trgRect.height / 2,
    });

    el.$options.placement = [WUPPopupElement.$placements.$bottom.$middle];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(52.5px, 20px); display: block;\\"></wup-popup>"`
    );

    // target is partially hidden at the right of scrollable content
    jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
      ...rectBody,
      width: trgRect.width,
    });
    jest.spyOn(document.body, "clientWidth", "get").mockReturnValue(trgRect.width);
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValue({
      ...trgRect,
      x: trgRect.width / 2,
      left: trgRect.width / 2,
      right: trgRect.width + trgRect.width / 2,
    });
    el.$options.placement = [WUPPopupElement.$placements.$right.$middle];
    jest.advanceTimersByTime(10);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(71.25px, 10px); display: block;\\"></wup-popup>"`
    );
  });

  test("arrow", () => {
    expect(el.$isOpened).toBeTruthy(); // checking prev-state
    expect(el.$arrowElement).toBeNull();
    el.$options.arrowEnable = true;

    const orig = document.createElement;
    jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      const elArr = orig.call(document, tagName);
      if (tagName === "wup-popup-arrow") {
        jest.spyOn(elArr, "offsetWidth", "get").mockReturnValue(20);
        jest.spyOn(elArr, "offsetHeight", "get").mockReturnValue(10);
      }
      return elArr;
    });
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(40);
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(20);

    const expectIt = (placement) => {
      el.$options.placement = [placement];
      jest.advanceTimersByTime(10);
      return expect(document.body.outerHTML);
    };

    expectIt(WUPPopupElement.$placements.$top.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(140px, 70px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(154px, 89.5px) rotate(0deg);\\"></wup-popup-arrow></body>"`
    );
    expect(el.$arrowElement).toBeDefined();

    expectIt(WUPPopupElement.$placements.$top.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(170px, 70px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(180px, 89.5px) rotate(0deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(200px, 70px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(206px, 89.5px) rotate(0deg);\\"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$bottom.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(140px, 160px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(154px, 150.5px) rotate(180deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(170px, 160px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(180px, 150.5px) rotate(180deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(200px, 160px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(206px, 150.5px) rotate(180deg);\\"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$left.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(96px, 100px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(133.5px, 108px) rotate(-90deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(96px, 115px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(133.5px, 123px) rotate(-90deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(96px, 130px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(133.5px, 138px) rotate(-90deg);\\"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$right.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 100px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(238.5px, 108px) rotate(90deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 115px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(238.5px, 123px) rotate(90deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 130px); display: block;\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(238.5px, 138px) rotate(90deg);\\"></wup-popup-arrow></body>"`
    );

    el.$options.arrowClass = "my-arrow";
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 130px); display: block;\\"></wup-popup><wup-popup-arrow class=\\"my-arrow\\" style=\\"width: 8px; height: 4px; transform: translate(238.5px, 138px) rotate(90deg);\\"></wup-popup-arrow></body>"`
    );
  });
});
