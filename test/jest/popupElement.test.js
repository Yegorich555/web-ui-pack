/* eslint-disable prefer-rest-params */
import { WUPPopupElement } from "web-ui-pack";
import * as all from "web-ui-pack/popup/popupElement.types";
import { WUPPopup } from "web-ui-pack/popup/popupElement";
import * as all2 from "web-ui-pack/popup/popupElement";

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
    test("re-import", () => {
      // just for coverage
      expect(all).toBeTruthy();
      expect(all2).toBeTruthy();
      expect(Object.keys(all2).length > 0).toBe(true);
      expect(WUPPopup).toBeTruthy();
      expect(WUPPopup.ShowCases).toBeTruthy();
      expect(WUPPopup.ShowCases.always).toBeDefined();
      expect(WUPPopup.HideCases).toBeTruthy();
      expect(WUPPopup.HideCases.onFireHide).toBeDefined();
      expect(Object.keys(WUPPopup).length > 0).toBe(true);
    });
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
    expect(a.$isOpen).toBeFalsy();
    expect(onShow).toBeCalledTimes(0);
    expect(onWillShow).toBeCalledTimes(0);

    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(gotReady).toBeCalledTimes(1);
    expect(init).toBeCalledTimes(1);
    expect(show).toBeCalledTimes(1); // showCase = always so expected element to show
    expect(a.$isOpen).toBeTruthy();
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onWillShow).toBeCalledTimes(1);
    expect(onWillShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onHide).not.toBeCalled();
    expect(onWillHide).not.toBeCalled();

    // testing events
    a.$hide();
    expect(a.$isOpen).toBeFalsy();
    jest.advanceTimersByTime(1);
    expect(onHide).toBeCalledTimes(1);
    expect(onWillHide).toBeCalledTimes(1);

    jest.clearAllMocks();
    const r = (e) => e.preventDefault();
    a.addEventListener("$willShow", r);
    a.$show();
    jest.advanceTimersByTime(1);
    expect(onWillShow).toBeCalledTimes(1);
    expect(a.$isOpen).toBeFalsy(); // because of prevented
    expect(onShow).not.toBeCalled();
    a.removeEventListener("$willShow", r); // remove event
    a.$show();
    jest.advanceTimersByTime(1);
    expect(a.$isOpen).toBeTruthy();
    expect(onShow).toBeCalled();

    a.addEventListener("$willHide", r);
    jest.clearAllMocks();
    a.$hide();
    jest.advanceTimersByTime(1);
    expect(onWillHide).toBeCalledTimes(1);
    expect(a.$isOpen).toBeTruthy(); // because of prevented
    expect(onHide).not.toBeCalled();
    a.removeEventListener("$willHide", r); // remove event
    a.$hide();
    jest.advanceTimersByTime(1);
    expect(a.$isOpen).toBeFalsy();
    expect(onHide).toBeCalledTimes(1);
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
    expect(a.$isOpen).toBeTruthy();
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    jest.advanceTimersToNextTimer(); // for listenerCallback withTimeout
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(a.$isOpen).toBeTruthy();
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
    expect(a.$isOpen).toBeTruthy();
    onHide.mockClear();
    a.$options.target = null;
    const spyShow = jest.spyOn(a, "goShow").mockClear();
    expect(a.$show).toThrow(); // to apply options - throw error because target is not defined
    expect(spyShow).toBeCalledTimes(1);
    expect(a.$isOpen).toBeFalsy(); // because target is not defined
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
    expect(a.$isOpen).toBeTruthy();
    a.$options.showCase = 1 << 2; // onClick
    jest.advanceTimersToNextTimer(); // $options.onChanged has timeout
    expect(a.$isOpen).toBeFalsy(); // because option changed
    trg.click(); // checking if new showCase works
    expect(a.$isOpen).toBeTruthy();
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
    expect(a.$isOpen).toBeFalsy();

    trg.dispatchEvent(new Event("mouseenter"));
    jest.advanceTimersByTime(a.$options.hoverShowTimeout); // event listener has timeout
    expect(spyShow).toBeCalledTimes(1);
    expect(a.$isOpen).toBeTruthy();
    expect(spyShow).toHaveBeenLastCalledWith(1);

    trg.dispatchEvent(new Event("mouseleave"));
    jest.advanceTimersByTime(a.$options.hoverHideTimeout); // event listener has timeout
    expect(a.$isOpen).toBeFalsy();
    expect(spyHide).toHaveBeenLastCalledWith(2);

    jest.clearAllMocks();
    trg.dispatchEvent(new Event("mouseenter"));
    trg.dispatchEvent(new Event("mouseleave"));
    trg.dispatchEvent(new Event("mouseenter"));
    trg.dispatchEvent(new Event("mouseleave"));
    jest.advanceTimersByTime(a.$options.hoverShowTimeout + a.$options.hoverHideTimeout); // event listener has timeout
    expect(a.$isOpen).toBeFalsy();
    expect(spyShow).not.toBeCalled();

    trg.dispatchEvent(new Event("mouseenter"));
    trg.remove();
    jest.advanceTimersByTime(a.$options.hoverShowTimeout + a.$options.hoverHideTimeout); // event listener has timeout
    expect(a.$isOpen).toBeFalsy(); // because removed
    document.body.appendChild(trg);

    // onlyFocus
    a.remove();
    document.body.appendChild(a);
    a.$options.showCase = 1 << 1; // onFocus
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpen).toBeFalsy();

    trg.dispatchEvent(new Event("focusin"));
    expect(a.$isOpen).toBeTruthy();
    expect(spyShow).toBeCalledTimes(1);
    expect(spyShow).lastCalledWith(1 << 1);
    trg.dispatchEvent(new Event("focusout"));
    expect(spyShow).toBeCalledTimes(1); // no new triggers because focus stay
    // jest.advanceTimersToNextTimer(); // focusLost has timeout
    expect(a.$isOpen).toBeFalsy();

    const trgInput = trg.appendChild(document.createElement("input"));
    const trgInput2 = trg.appendChild(document.createElement("input"));
    // checking focusin-throttling
    jest.clearAllMocks();
    trgInput.focus();
    expect(a.$isOpen).toBeTruthy();
    trgInput2.focus();
    trgInput.focus();
    expect(a.$isOpen).toBeTruthy();
    expect(spyHide).not.toBeCalled(); // because div haven't been lost focus
    trgInput.blur();
    expect(a.$isOpen).toBeFalsy();
    expect(spyShow).toBeCalledTimes(1); // checking if throttling-filter works
    expect(spyShow).lastCalledWith(1 << 1); // checking if throttling-filter works
    expect(spyHide).lastCalledWith(3); // because div haven't been lost focus

    // when showCase = focus. need to show() if target isAlreadyFocused
    a.remove();
    trg.setAttribute("tabindex", "0");
    trg.focus();
    expect(document.activeElement.id).toBe("targetId");
    document.body.appendChild(a);
    a.$options.showCase = 1 << 1; // onFocus
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpen).toBeTruthy(); // because of trg is alreadyFocused
    trg.removeAttribute("tabindex");

    // focus moves to element inside popup > no-hide
    /** @type typeof el */
    let a2 = document.body.appendChild(document.createElement(el.tagName));
    const a2Input = a2.appendChild(document.createElement("input"));
    a2.$options.showCase = 1 << 1;
    a2.$options.target = trgInput;
    jest.advanceTimersToNextTimer();
    trgInput.focus();
    expect(a2.$isOpen).toBeTruthy();
    let f = jest.spyOn(document, "activeElement", "get").mockReturnValue(null);
    a2Input.focus();
    jest.advanceTimersToNextTimer(); // focusLost has debounce
    expect(a2.$isOpen).toBeTruthy();
    f.mockRestore();

    // onlyClick
    jest.clearAllMocks();
    a.remove();
    document.body.appendChild(a);
    a.$options.showCase = 1 << 2; // onClick
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpen).toBeFalsy();

    trg.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpen).toBeTruthy();
    trg.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpen).toBeTruthy(); // because previous event is skipped (due to debounceTimeout)
    expect(spyShow).toHaveBeenCalledTimes(1);
    expect(spyShow).lastCalledWith(1 << 2);
    jest.advanceTimersByTime(50); // onClick has debounce timeout

    trg.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpen).toBeFalsy();
    expect(spyHide).toHaveBeenCalledTimes(1);
    expect(spyHide).lastCalledWith(6);
    jest.advanceTimersByTime(50); // onClick has debounce timeout

    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpen).toBeTruthy(); // click on input inside
    jest.advanceTimersByTime(50); // onClick has debounce timeout

    a.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpen).toBeFalsy(); // click onMe == close
    expect(spyHide).lastCalledWith(5);

    trgInput2.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpen).toBeTruthy(); // click on input2 inside
    jest.advanceTimersByTime(50); // onClick has debounce timeout

    document.body.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpen).toBeFalsy(); // click outside == close
    expect(spyHide).lastCalledWith(4);

    // check focus on target on hide
    document.activeElement.blur();
    f = jest.spyOn(document, "activeElement", "get").mockReturnValue(null);
    /** @type typeof el */
    a2 = document.body.appendChild(document.createElement(el.tagName));
    a2.$options.showCase = 1 << 2;
    a2.$options.target = trgInput;
    jest.advanceTimersToNextTimer();
    trgInput.click();
    expect(a2.$isOpen).toBeTruthy();
    const onFocus = jest.spyOn(trgInput, "focus");
    a2.click();
    expect(a2.$isOpen).toBeFalsy();
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
    expect(a.$isOpen).toBeFalsy();

    // open by mouseenter-click-focus
    trgInput.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    jest.advanceTimersByTime(a.$options.hoverShowTimeout); // mouseenter has debounce timeout
    expect(a.$isOpen).toBeTruthy();
    expect(spyShow).lastCalledWith(1);
    trgInput.dispatchEvent(new Event("mousedown", { bubbles: true }));
    trgInput.focus();
    trgInput.dispatchEvent(new Event("mouseup", { bubbles: true }));
    expect(a.$isOpen).toBeTruthy(); // no changes in state
    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    expect(a.$isOpen).toBeTruthy(); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    // close by blur
    trgInput.blur();
    expect(a.$isOpen).toBeFalsy(); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyHide).lastCalledWith(3);

    // close by mouseleave
    trgInput.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    jest.advanceTimersByTime(a.$options.hoverShowTimeout); // mouseenter has debounce timeout
    trgInput.dispatchEvent(new Event("mouseleave", { bubbles: true }));
    jest.advanceTimersByTime(a.$options.hoverHideTimeout); // mouseenter has debounce timeout
    expect(a.$isOpen).toBeFalsy(); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyHide).lastCalledWith(2);

    // open again by click
    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    jest.advanceTimersByTime(50); // click has debounce timeout
    expect(a.$isOpen).toBeTruthy(); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyShow).lastCalledWith(1 << 2);

    // close by click again
    trgInput.dispatchEvent(new Event("click", { bubbles: true }));
    jest.advanceTimersByTime(50);
    expect(a.$isOpen).toBeFalsy();
    expect(spyHide).lastCalledWith(6);
    trgInput.blur();
    spyShow.mockClear();

    // simulate click-focus without mouseenter
    // jest.advanceTimersByTime(el.$options.focusDebounceMs);
    trgInput.dispatchEvent(new Event("touchstart", { bubbles: true })); // just for coverage 100%
    trgInput.dispatchEvent(new Event("mousedown", { bubbles: true }));
    expect(a.$isOpen).toBeFalsy();
    trgInput.focus();
    expect(spyShow).lastCalledWith(1 << 1);
    expect(a.$isOpen).toBeTruthy(); // show by focus
    trgInput.dispatchEvent(new Event("mouseup", { bubbles: true }));
    const ev = new MouseEvent("click", { bubbles: true });
    ev.pageX = 20; // required otherwise it's filtered from synthetic events
    trgInput.dispatchEvent(ev);
    jest.advanceTimersByTime(50);
    expect(a.$isOpen).toBeTruthy(); // stay opened because wasOpened by focus from click)

    // simulate mouse-click again
    trgInput.dispatchEvent(new Event("mousedown", { bubbles: true }));
    trgInput.dispatchEvent(new Event("mouseup", { bubbles: true }));
    trgInput.dispatchEvent(ev);
    jest.advanceTimersByTime(50);
    expect(a.$isOpen).toBeFalsy(); // 2nd click will close (but if click is fired without mousedown it doesn't work)
    expect(spyHide).lastCalledWith(6);
  });

  test("$options.minWidth/minHeight/maxWidth by target", () => {
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

    /** @type typeof el */
    const a3 = document.createElement(el.tagName);
    a3.$options.showCase = 0; // always
    a3.$options.maxWidthByTarget = true;
    document.body.append(a);
    jest.advanceTimersToNextTimer(); // wait for ready/init
    // WARN: layout impossible to test with unit; all layout tests see in e2e
    expect(a3.style.maxWidth).toBeDefined();
  });

  test("$hide()/$show()", () => {
    el.$options.showCase = 0; // always
    expect(el.$isOpen).toBeTruthy();
    el.$hide();
    expect(el.$isOpen).toBeFalsy();
    el.$show();
    expect(el.$isOpen).toBeTruthy();

    el.remove();
    el.$hide();
    el.$show();
    expect(el.$isOpen).toBeFalsy();

    // check when showCase != 0
    jest.clearAllTimers();
    el.$options.showCase = 1 << 2; // onClick
    document.body.append(el);
    jest.advanceTimersToNextTimer(); // wait for ready
    trg.click();
    expect(el.$isOpen).toBeTruthy(); // checking if click-listener works
    el.$show();

    el.$show();
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter
    expect(el.$isOpen).toBeTruthy(); // checking if click-listener is off because was opened by manual $show
    el.$hide();
    expect(el.$isOpen).toBeFalsy(); // checking if click-listener is off because was opened by manual $show
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter

    expect(el.$isOpen).toBeTruthy(); // checking if events works again

    // checking canShow/canHide with popupListenTarget
    el.canHide = () => false;
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter
    expect(el.$isOpen).toBeTruthy();
    el.canHide = () => true;
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter
    expect(el.$isOpen).toBeFalsy();

    el.canShow = () => false;
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter
    expect(el.$isOpen).toBeFalsy();
    el.canShow = () => true;
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter
    expect(el.$isOpen).toBeTruthy();

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
    expect(a.$isOpen).toBeTruthy();

    // checking canHide method
    a.canHide = () => false;
    a.$hide();
    expect(a.$isOpen).toBeTruthy();
    a.canHide = () => true;
    a.$hide();
    expect(a.$isOpen).toBeFalsy();

    a.canShow = () => false;
    a.$show();
    expect(a.$isOpen).toBeFalsy();
    a.canShow = () => true;
    a.$show();
    expect(a.$isOpen).toBeTruthy();

    // other cases in test(`options.$target`) and test(`remove`)
  });

  test("attrs", () => {
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0;
    document.body.prepend(a);
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because of target not defined
    jest.clearAllMocks();
    expect(a.$isOpen).toBeFalsy();
    expect(a.$options.target == null).toBeTruthy();

    // attr 'target'
    a.setAttribute("target", `#${trg.getAttribute("id")}`);
    a.setAttribute("placement", "top-start");
    jest.advanceTimersToNextTimer();
    expect(a.$options.target).toBeDefined();
    expect(a.$isOpen).toBeTruthy();

    const svg = document.body.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    svg.setAttribute("id", "svgId");
    a.setAttribute("target", "#svgId");
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because of target is defined but not HTMLELement
  });

  test("remove", () => {
    const dispose = jest.spyOn(el, "dispose");
    expect(el.$isOpen).toBeTruthy();
    el.remove();
    expect(dispose).toBeCalledTimes(1);
    expect(el.$isOpen).toBeFalsy();
    expect(el.$isReady).toBeFalsy();

    // try to open when element not appended
    expect(el.$show).not.toThrow();
    expect(el.$isOpen).toBeFalsy(); // because $show() is async method
    expect(jest.advanceTimersToNextTimer).toThrow(); // wait for tryShow
    expect(el.$isReady).toBeFalsy();
    expect(el.$isOpen).toBeFalsy(); // because $show() is async method

    // try to append and open
    document.body.appendChild(el);
    jest.advanceTimersToNextTimer();
    expect(el.$show).not.toThrow();
    expect(el.$isOpen).toBeTruthy();
  });

  test("memoryLeak", () => {
    const spy = h.spyEventListeners([trg]);

    let animateFrame;
    const spyFrame = jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => (animateFrame = fn));
    const spyFrameCancel = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => (animateFrame = null));
    const spyTrgRect = jest.spyOn(trg, "getBoundingClientRect");
    const spyBodyRect = jest.spyOn(document.body, "getBoundingClientRect");

    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.target = trg;
    a.$options.showCase = 0b11111111; // all
    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpen).toBeFalsy(); // no events from target

    const called = spy.map((v) => v.on.mock.calls[0]).filter((v) => v);
    expect(called).not.toHaveLength(0); // test if event listeners were added

    trg.click(); // it will add extra events
    expect(a.$isOpen).toBeTruthy();
    expect(spy[0].on).toBeCalled(); // expected that we have events for document

    // checking if updatePosition was fired
    expect(spyFrame).toBeCalledTimes(1);
    expect(spyTrgRect).toBeCalled();
    expect(spyBodyRect).toBeCalled();
    spyTrgRect.mockClear();
    spyBodyRect.mockClear();
    animateFrame();
    expect(spyTrgRect).toBeCalledTimes(1);
    expect(spyBodyRect).not.toBeCalled();
    animateFrame();
    expect(spyTrgRect).toBeCalledTimes(2);
    expect(spyBodyRect).not.toBeCalled();

    a.remove();
    expect(a.isConnected).toBeFalsy();
    expect(a.$isOpen).toBeFalsy();
    spy.check(); // checking if removed every listener that was added

    // checking target removed > event removed
    jest.clearAllMocks();
    trg.remove();
    document.body.appendChild(a);
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // error: Target must be appended to layout
    trg.click();
    expect(a.$isOpen).toBeFalsy();
    expect(a.goShow).toThrow(); // error expected

    document.body.appendChild(trg);
    trg.click();
    expect(a.$isOpen).toBeFalsy(); // because target isn't appened before initPopup
    a.$options.target = null;
    a.$options.target = trg; // reassignTarget
    jest.advanceTimersByTime(1);
    trg.click();
    expect(a.$isOpen).toBeTruthy();

    spyFrameCancel.mockClear();
    trg.remove();
    expect(spyFrameCancel).toBeCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(a.$isOpen).toBeFalsy();
    // if target removed - events should be removed
    spy.check(); // checking if removed every listener that was added

    // try return default behavior
    document.body.appendChild(trg);
    a.$options.target = null;
    a.$options.target = trg; // required to rebind events
    jest.advanceTimersByTime(1);
    const called2 = spy.map((v) => v.on.mock.calls[0]).filter((v) => v);
    expect(called2).not.toHaveLength(0); // test if event listeners were added
    trg.click();
    expect(a.$isOpen).toBeTruthy();
  });

  test("position", async () => {
    expect(el.$isOpen).toBeTruthy(); // checking prev-state

    const expectIt = (placement) => {
      el.$options.placement = placement ? [placement] : [];
      jest.advanceTimersByTime(10);
      return expect(el.outerHTML);
    };

    expectIt(WUPPopupElement.$placements.$top.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 100px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 100px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$bottom.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 150px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 150px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 150px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$left.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 100px); display: block;\\" position=\\"left\\"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 125px); display: block;\\" position=\\"left\\"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 150px); display: block;\\" position=\\"left\\"></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$right.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 100px); display: block;\\" position=\\"right\\"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 125px); display: block;\\" position=\\"right\\"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 150px); display: block;\\" position=\\"right\\"></wup-popup>"`
    );

    // checking if $placements.$right == $placements.$right.middle etc.
    expectIt(WUPPopupElement.$placements.$right).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(240px, 125px); display: block;\\" position=\\"right\\"></wup-popup>"`
    );

    expectIt().toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );
  });

  test("position alt", () => {
    // checking alt when no space
    expect(el.$isOpen).toBeTruthy(); // checking prev-state

    const height = 50;
    const width = 100;
    let x = 140;
    let y = 0;
    const trgRect = { x, left: x, y, top: y, bottom: y + height, right: x + width, height, width, toJSON: () => "" };
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValue(trgRect);

    const expectIt = (placement) => {
      el.$options.placement = placement;
      jest.advanceTimersByTime(10);
      return expect(el.outerHTML);
    };

    // no place at the top so at the bottom is expected
    expectIt([
      WUPPopupElement.$placements.$top.$start, //
      WUPPopupElement.$placements.$bottom.$start,
    ]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 50px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
    );

    // just for coverage: tesing ignoreAlign in popupAdjustInternal()
    // el.style.minHeight = "10px"; // watchfix: https://github.com/jsdom/jsdom/issues/2986
    const orig = window.getComputedStyle;
    let overflowX = "auto";
    let overflowY = "auto";
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return { minWidth: "10px", minHeight: "10px", overflowX, overflowY };
      }
      return orig(elem);
    });
    expectIt([WUPPopupElement.$placements.$top.$start]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 50px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
    );

    // cover calc maxHeight by freeHeight in popupAdjustInternal()
    y = 11; // so freeH < me.H but freeH > minHeight
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y + 1);
    trgRect.y = y;
    trgRect.top = y;
    trgRect.bottom = height + y;
    // expected bottom.middle position because at left/top not enough space
    expectIt([WUPPopupElement.$placements.$top.$start.$adjust]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 61px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
    );

    // checking $resizeHeight - expected $top.$start with maxHeight
    expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 0px); display: block; max-height: 11px;\\" position=\\"top\\"></wup-popup>"`
    );
    // checking maxHeight inheritance
    const divH = el.appendChild(document.createElement("div"));
    overflowY = "visible";
    expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 0px); display: block; max-height: 11px;\\" position=\\"top\\"><div style=\\"max-height: 11px;\\"></div></wup-popup>"`
    );
    divH.remove();

    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y);
    // expected $top.$start without maxHeight because height == freeH
    expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 0px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );
    // expected $top.$start with maxHeight
    expectIt([WUPPopupElement.$placements.$top.$start.$resizeHeight]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(140px, 0px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );

    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y + 1);
    // cover calc maxWidth by freeWidth in popupAdjustInternal()
    x = 12; // so freeW < me.W but freeW > minWidth
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(x + 1);
    trgRect.x = x;
    trgRect.left = x;
    trgRect.right = width + x;
    // expected bottom.middle position because at left/top not enough space
    expectIt([WUPPopupElement.$placements.$left.$start.$adjust]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(55.5px, 61px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
    );

    // checking $resizeWidth - expected left.start with maxWidth
    expectIt([WUPPopupElement.$placements.$left.$start.$adjust.$resizeWidth]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(0px, 11px); display: block; max-width: 12px;\\" position=\\"left\\"></wup-popup>"`
    );

    // checking maxHeight inheritance
    const divW = el.appendChild(document.createElement("div"));
    overflowX = "visible";
    expectIt([WUPPopupElement.$placements.$left.$start.$adjust.$resizeWidth]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(0px, 11px); display: block; max-width: 12px;\\" position=\\"left\\"><div style=\\"max-width: 12px;\\"></div></wup-popup>"`
    );
    divW.remove();

    expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(0px, 11px); display: block; max-width: 12px;\\" position=\\"left\\"></wup-popup>"`
    );

    // cover case when maxWidth affects on height
    jest.spyOn(el, "offsetHeight", "get").mockImplementation(() => {
      if (el.style.maxWidth) {
        return document.body.clientHeight;
      }
      return y + 1;
    });
    expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(55.5px, 61px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
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
    expectIt([WUPPopupElement.$placements.$left.$start]).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(112px, 0px); display: block;\\" position=\\"right\\"></wup-popup>"`
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

    const bodyRect = { ...document.body.getBoundingClientRect() };
    const trgRect = { ...trg.getBoundingClientRect() };
    jest.spyOn(trg, "getBoundingClientRect").mockImplementation(() => ({ ...trgRect }));
    const moveTo = (x, y) => {
      trgRect.x = x;
      trgRect.y = y;
      trgRect.left = x;
      trgRect.top = y;
      trgRect.right = trgRect.left + trgRect.width;
      trgRect.bottom = trgRect.top + trgRect.height;
    };

    const expectIt = (placement) => {
      el.$options.placement = [placement];
      jest.advanceTimersByTime(10);
      return expect(el.outerHTML);
    };

    // check with overflowX - no place at the left and top
    moveTo(0, 0);
    expectIt(WUPPopupElement.$placements.$left.$middle).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(50px, 50px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
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
    // no place at the top
    moveTo(0, bodyRect.top - trgRect.height / 2); // move to top
    expectIt(WUPPopupElement.$placements.$top.$middle).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(50px, 25px); display: block;\\" position=\\"bottom\\"></wup-popup>"`
    );

    // no place at the bottom
    moveTo(0, bodyRect.bottom - trgRect.height / 2); // move to bottom
    expectIt(WUPPopupElement.$placements.$bottom.$middle).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(50px, 375px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );

    // no place at the left
    moveTo(bodyRect.left - trgRect.width / 2, 10); // move to left
    expectIt(WUPPopupElement.$placements.$left.$middle).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(25px, 10px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );

    // no place at the right
    moveTo(bodyRect.right - trgRect.width / 2, 10); // move to right
    expectIt(WUPPopupElement.$placements.$right.$middle).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(575px, 10px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );

    // target is completely hidden at the top of scrollable content
    trgRect.width = 18;
    trgRect.height = 10;
    moveTo(0, bodyRect.top - trgRect.height);
    expectIt(WUPPopupElement.$placements.$top.$middle).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(575px, 10px);\\" position=\\"top\\"></wup-popup>"`
    );
    el.$options.arrowEnable = true; // checking if arrow is hidden also
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(575px, 10px);\\" position=\\"top\\"></wup-popup><wup-popup-arrow style=\\"display: none;\\"></wup-popup-arrow></body>"`
    );
    el.$options.arrowEnable = false;

    // target is completely hidden at the bottom of scrollable content
    moveTo(0, bodyRect.bottom - trgRect.height); // move to bottom/partially
    expectIt(WUPPopupElement.$placements.$bottom.$middle).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(9px, 390px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );
  });

  test("arrow", () => {
    expect(el.$isOpen).toBeTruthy(); // checking prev-state
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
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(140px, 70px); display: block;\\" position=\\"top\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(154px, 90px) rotate(0deg);\\"></wup-popup-arrow></body>"`
    );
    expect(el.$arrowElement).toBeDefined();

    expectIt(WUPPopupElement.$placements.$top.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(170px, 70px); display: block;\\" position=\\"top\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(180px, 90px) rotate(0deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(200px, 70px); display: block;\\" position=\\"top\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(206px, 90px) rotate(0deg);\\"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$bottom.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(140px, 160px); display: block;\\" position=\\"bottom\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(154px, 150px) rotate(180deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(170px, 160px); display: block;\\" position=\\"bottom\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(180px, 150px) rotate(180deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(200px, 160px); display: block;\\" position=\\"bottom\\"></wup-popup><wup-popup-arrow style=\\"transform: translate(206px, 150px) rotate(180deg);\\"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$left.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(96px, 100px); display: block;\\" position=\\"left\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(134px, 108px) rotate(-90deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(96px, 115px); display: block;\\" position=\\"left\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(134px, 123px) rotate(-90deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(96px, 130px); display: block;\\" position=\\"left\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(134px, 138px) rotate(-90deg);\\"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$right.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 100px); display: block;\\" position=\\"right\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(238px, 108px) rotate(90deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 115px); display: block;\\" position=\\"right\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(238px, 123px) rotate(90deg);\\"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 130px); display: block;\\" position=\\"right\\"></wup-popup><wup-popup-arrow style=\\"width: 8px; height: 4px; transform: translate(238px, 138px) rotate(90deg);\\"></wup-popup-arrow></body>"`
    );

    el.$options.arrowClass = "my-arrow";
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 130px); display: block;\\" position=\\"right\\"></wup-popup><wup-popup-arrow class=\\"my-arrow\\" style=\\"width: 8px; height: 4px; transform: translate(238px, 138px) rotate(90deg);\\"></wup-popup-arrow></body>"`
    );
    // checking with nextSibling
    document.body.appendChild(document.createElement("a"));
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id=\\"targetId\\">some text</div><wup-popup style=\\"transform: translate(244px, 130px); display: block;\\" position=\\"right\\"></wup-popup><wup-popup-arrow class=\\"my-arrow\\" style=\\"width: 8px; height: 4px; transform: translate(238px, 138px) rotate(90deg);\\"></wup-popup-arrow><a></a></body>"`
    );
  });

  test("static.$attach", async () => {
    trg.remove();
    document.body.innerHTML = "";
    document.body.appendChild(trg);

    const spy = h.spyEventListeners();
    /** @type WUPPopupElement */
    let popup = null;
    let cnt = 0;
    const spyHide = jest.spyOn(WUPPopupElement.prototype, "goHide");
    const spyShow = jest.spyOn(WUPPopupElement.prototype, "goShow");

    let detach = WUPPopupElement.$attach({ target: trg, showCase: 0b111111, text: "Me" }, (popupEl) => {
      popup = popupEl;
      ++cnt;
    });

    expect(popup).toBeNull();
    trg.click();
    expect(popup).toBeDefined();
    expect(popup.$options.showCase).toBe(0b111111);
    expect(popup.$options.target).toBe(trg);
    jest.advanceTimersByTime(100); // popup has click-timeouts
    expect(popup.isConnected).toBeTruthy();
    expect(popup.$isOpen).toBeTruthy();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id=\\"targetId\\">some text</div><wup-popup style=\\"display: block; transform: translate(190px, 100px);\\" position=\\"top\\">Me</wup-popup>"`
    );
    expect(cnt).toBe(1);
    expect(spyShow).toBeCalledTimes(1);
    expect(spyHide).toBeCalledTimes(0);

    trg.click();
    expect(cnt).toBe(1);
    jest.advanceTimersByTime(100); // popup has click-timeouts and animation timeouts
    await Promise.resolve(); // popup has hide animation
    expect(popup.$isOpen).toBeFalsy();
    expect(popup.isConnected).toBeFalsy();
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id=\\"targetId\\">some text</div>"`);
    expect(spyShow).toBeCalledTimes(1);
    expect(spyHide).toBeCalledTimes(1);

    trg.click();
    expect(cnt).toBe(2);
    jest.advanceTimersByTime(100); // popup has click-timeouts
    expect(popup.$isOpen).toBeTruthy();
    expect(popup.isConnected).toBeTruthy();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id=\\"targetId\\">some text</div><wup-popup style=\\"display: block; transform: translate(190px, 100px);\\" position=\\"top\\">Me</wup-popup>"`
    );
    expect(spyShow).toBeCalledTimes(2);
    expect(spyHide).toBeCalledTimes(1);

    detach();
    expect(detach).not.toThrow(); // checking detach again
    expect(popup.$isOpen).toBeFalsy();
    expect(popup.isConnected).toBeFalsy();
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id=\\"targetId\\">some text</div>"`);
    expect(spyShow).toBeCalledTimes(2);
    expect(spyHide).toBeCalledTimes(2);

    spy.check(); // checking memory leak

    // checking when canShow = false > popup.removed
    jest.clearAllMocks();
    const spyCanShow = jest.spyOn(WUPPopupElement.prototype, "canShow").mockImplementation(() => false);
    detach = WUPPopupElement.$attach({ target: trg, showCase: 0b111111, text: "Me" }); // checking without callback
    trg.click();
    jest.advanceTimersByTime(100); // popup has click-timeouts
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id=\\"targetId\\">some text</div>"`);
    spyCanShow.mockRestore();

    detach();
    spy.check(); // checking memory leak

    // checking several attach() on the same target
    popup = undefined;
    detach = WUPPopupElement.$attach({ target: trg, showCase: 0b111111, text: "Me" });
    const warn = h.wrapConsoleWarn(
      () =>
        (detach = WUPPopupElement.$attach({ target: trg, showCase: 1 << 2, text: "Me2" }, (popupEl) => {
          popup = popupEl;
        }))
    );
    expect(warn).toBeCalledTimes(1);
    trg.click();
    // checking if rendered once
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id=\\"targetId\\">some text</div><wup-popup style=\\"display: block; transform: translate(190px, 100px);\\" position=\\"top\\">Me2</wup-popup>"`
    );
    expect(popup).toBeDefined();

    // checking if options that affects on re-init can be changed in callback
    document.body.click();
    trg.blur();
    expect(popup.$isOpen).toBeFalsy();
    detach();
    detach = WUPPopupElement.$attach({ target: trg, showCase: 1 << 2, text: "Me2", placement: [] }, (popupEl) => {
      popup = popupEl;
    });
    trg.click();
    expect(popup.$isOpen).toBeTruthy();
    expect(popup.getAttribute("position")).not.toBe("bottom");
    jest.advanceTimersByTime(1000);
    popup.$options.placement = [WUPPopupElement.$placements.$bottom.$start.$adjust];
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpen).toBeFalsy(); // changing options hides popup
    trg.click();
    expect(popup.$isOpen).toBeTruthy();
    expect(popup.getAttribute("position")).toBe("bottom");

    // checking changing target
    const divRemove = document.body.appendChild(document.createElement("div"));
    const trg2 = divRemove.appendChild(document.createElement("button"));
    popup.$options.target = trg2;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpen).toBeFalsy(); // changing options hides popup
    trg.click();
    expect(popup.$isOpen).toBeFalsy(); // because target changed
    popup.$options.target.click();
    expect(popup.$isOpen).toBeTruthy();

    // set target to null (for coverage)
    popup.$options.target = null;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpen).toBeFalsy(); // changing options hides popup
    expect(popup.$options.target).toBe(trg); // because it returns to previous
    trg2.click();
    expect(popup.$isOpen).toBeFalsy(); // because target changed
    trg.click();
    expect(popup.$isOpen).toBeTruthy();

    // checking self-removing opened popup when target turns into removed
    let animateFrame;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => (animateFrame = fn));
    popup.$options.target = trg2;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpen).toBeFalsy(); // because target changed
    trg2.click();
    expect(popup.$isOpen).toBeTruthy();
    divRemove.innerHTML = "";
    expect(trg2.isConnected).toBeFalsy(); // because removed by innerHTML
    animateFrame();
    expect(popup.isConnected).toBeFalsy(); // because target is removed

    // attach without target
    expect(() => {
      WUPPopupElement.$attach({ text: "Me" }, (popupEl) => {
        popup = popupEl;
        ++cnt;
      });
    }).toThrow(); // error: Target is required

    detach();
    spy.check(); // checking memory leak
  });

  test("custom animation with transform", () => {
    el.$hide();
    expect(el.$isOpen).toBeFalsy();

    const orig = window.getComputedStyle;
    /** @type CSSStyleDeclaration */
    let objStyle = {};
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem instanceof WUPPopupElement) {
        return objStyle;
      }
      return orig(elem);
    });

    // checking with defaults
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
    el.$show();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a2" };
    el.$hide();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\" position=\\"top\\" hide=\\"\\"></wup-popup>"`
    );
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
    el.$show();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );

    // checking the same with attach
    /** @type WUPPopupElement */
    let popup;
    const detach = WUPPopupElement.$attach({ target: trg, showCase: 0b111111, text: "Me" }, (popupEl) => {
      popup = popupEl;
    });
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
    trg.click();
    expect(popup.$isOpen).toBeTruthy();
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"display: block; transform: translate(190px, 100px);\\" position=\\"top\\">Me</wup-popup>"`
    );

    jest.advanceTimersByTime(100); // click has debounce-filter
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a2" };
    trg.click();
    expect(popup.$isOpen).toBeTruthy(); // because we are waiting for animation
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"display: block; transform: translate(190px, 100px);\\" position=\\"top\\" hide=\\"\\">Me</wup-popup>"`
    );
    jest.advanceTimersByTime(301); // click has debounce-filter
    expect(popup.$isOpen).toBeFalsy();
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px);\\" position=\\"top\\">Me</wup-popup>"`
    );

    jest.advanceTimersByTime(100); //  click has debounce-filter
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
    trg.click();
    expect(popup.$isOpen).toBeTruthy();
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\" position=\\"top\\">Me</wup-popup>"`
    );
    detach();

    // checking with custom animation
    let animateFrame;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => (animateFrame = fn));
    objStyle = { animationDuration: "0.2s", animationName: "dropdown" };
    el.$show();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"display: block; left: 190px; top: 100px;\\" position=\\"top\\"></wup-popup>"`
    );
    el.$hide(); // cover clearing animationTimer

    el.$show();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"left: 190px; top: 100px; display: block;\\" position=\\"top\\"></wup-popup>"`
    );
    jest.advanceTimersByTime(200);
    const v = { ...trg.getBoundingClientRect() };
    v.height += 1;
    v.bottom += 1;
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValueOnce(v);
    animateFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"display: block; transform: translate(190px, 100px);\\" position=\\"top\\"></wup-popup>"`
    );

    // checking with wrong durections
    el.$hide();
    objStyle = { animationDuration: "none", animationName: "test 0" };
    el.$show();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style=\\"transform: translate(190px, 100px); display: block;\\" position=\\"top\\"></wup-popup>"`
    );

    el.remove();
  });
});
