/* eslint-disable prefer-rest-params */
import { WUPPopupElement } from "web-ui-pack";
import popupListen from "web-ui-pack/popup/popupListen";
import { Animations, ShowCases } from "web-ui-pack/popup/popupElement.types";
import * as h from "../testHelper";
import { TestMouseMoveEvent } from "../testHelper";

/** @type WUPPopupElement */
let el;
/** @type HTMLElement */
let trg; // target for popup

/** Returns whether top & left are int or float values */
function positionIsInteger() {
  const rectEl = el.getBoundingClientRect();
  return { left: Number.isInteger(rectEl.left) ? "int" : "float", top: Number.isInteger(rectEl.top) ? "int" : "float" };
}

// simulate layout
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(document.body, "scrollTop", "set").mockImplementation(() => 0);
  jest.spyOn(document.body.parentElement, "scrollTop", "set").mockImplementation(() => 0);
  jest.spyOn(document.body, "scrollLeft", "set").mockImplementation(() => 0);
  jest.spyOn(document.body.parentElement, "scrollLeft", "set").mockImplementation(() => 0);

  // fix case when popup rect must be changed according to transform
  function mockPopupRect() {
    /** @type WUPPopupElement */
    const a = this;
    const tr = /translate\(([^)]+)\)/.exec(a.style.transform);
    const [x, y] = tr ? tr[1].split(",").map((s) => Number.parseFloat(s.trim())) : [0, 0];
    return {
      x,
      y,
      top: y,
      left: x,
      bottom: 0,
      height: a.offsetHeight,
      width: a.offsetWidth,
      right: 0,
      toJSON: () => "",
    };
  }
  jest.spyOn(WUPPopupElement.prototype, "getBoundingClientRect").mockImplementation(mockPopupRect);

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
  el.$options.offset = [0, 0];
  el.$options.arrowOffset = [0, 0];
  document.body.appendChild(el);
  jest.advanceTimersToNextTimer(); // gotReady has timeout
});

afterEach(() => {
  el.remove();
  trg.remove();
  h.unMockConsoleError();
  h.unMockConsoleWarn();
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.clearAllTimers();
  // jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("popupElement", () => {
  describe("me", () => {
    h.baseTestComponent(() => document.createElement("wup-popup"), { skipAttrs: true });
  });

  describe("inheritance", () => {
    class TestPopupElement extends WUPPopupElement {}
    customElements.define("test-el", TestPopupElement);
    h.baseTestComponent(() => document.createElement("test-el"), { skipAttrs: true });
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
      .filter((k) => a.$options[k] !== defVal && !(a.$options[k]?.length === 1 && a.$options[k][0] === 3456))
      .filter((k) => a.$options[k] !== undefined);
    expect(skipped).toHaveLength(0);

    // it rollback to previous
    WUPPopupElement.$defaults = prev;
  });

  test("init: methods-chaining", async () => {
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
    expect(a.$isOpen).toBe(false);
    expect(onShow).toBeCalledTimes(0);
    expect(onWillShow).toBeCalledTimes(0);

    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(gotReady).toBeCalledTimes(1);
    expect(init).toBeCalledTimes(1);
    expect(show).toBeCalledTimes(1); // showCase = always so expected element to show
    expect(a.$isOpen).toBe(true);
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onWillShow).toBeCalledTimes(1);
    expect(onWillShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onHide).not.toBeCalled();
    expect(onWillHide).not.toBeCalled();

    // testing events
    a.$hide();
    expect(a.$isOpen).toBe(false);
    jest.advanceTimersByTime(1);
    expect(onHide).toBeCalledTimes(1);
    expect(onWillHide).toBeCalledTimes(1);

    jest.clearAllMocks();
    const r = (e) => e.preventDefault();
    a.addEventListener("$willShow", r);
    a.$show();
    jest.advanceTimersByTime(1);
    expect(onWillShow).toBeCalledTimes(1);
    expect(a.$isOpen).toBe(false); // because of prevented
    expect(onShow).not.toBeCalled();
    a.removeEventListener("$willShow", r); // remove event
    a.$show();
    await h.wait();
    expect(a.$isOpen).toBe(true);
    expect(onShow).toBeCalled();

    a.addEventListener("$willHide", r);
    jest.clearAllMocks();
    a.$hide();
    jest.advanceTimersByTime(1);
    expect(onWillHide).toBeCalledTimes(1);
    expect(a.$isOpen).toBe(true); // because of prevented
    expect(onHide).not.toBeCalled();
    a.removeEventListener("$willHide", r); // remove event
    a.$hide();
    jest.advanceTimersByTime(1);
    expect(a.$isOpen).toBe(false);
    expect(onHide).toBeCalledTimes(1);
  });

  test("$options.target", async () => {
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
    expect(a.$isOpen).toBe(true);
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(a.$isOpen).toBe(true);
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
    expect(a.$isOpen).toBe(true);
    onHide.mockClear();
    a.$options.target = null;
    const spyShow = jest.spyOn(a, "goShow").mockClear();
    const onErr = jest.fn();
    a.$show().catch(onErr);
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // to apply options - throw error because target is not defined
    expect(spyShow).toBeCalledTimes(1);
    expect(a.$isOpen).toBe(false); // because target is not defined
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
    expect(a.$isOpen).toBe(true);
    a.$options.showCase = 1 << 2; // onClick
    jest.advanceTimersToNextTimer(); // $options.onChanged has timeout
    expect(a.$isOpen).toBe(false); // because option changed
    trg.click(); // checking if new showCase works
    await h.wait();
    expect(a.$isOpen).toBe(true);
  });

  test("$options.showCase", async () => {
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.target = trg;

    const spyShow = jest.spyOn(a, "goShow");
    const spyHide = jest.spyOn(a, "goHide");

    // only hover
    document.body.appendChild(a);
    a.$options.showCase = 1; // onHover
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpen).toBe(false);

    trg.dispatchEvent(new MouseEvent("mouseenter"));
    await h.wait(a.$options.hoverShowTimeout); // event listener has timeout
    expect(spyShow).toBeCalledTimes(1);
    expect(a.$isOpen).toBe(true);
    expect(spyShow).lastCalledWith(1);

    trg.dispatchEvent(new MouseEvent("mouseleave"));
    await h.wait(a.$options.hoverHideTimeout); // event listener has timeout
    expect(a.$isOpen).toBe(false);
    expect(spyHide.mock.calls[spyHide.mock.calls.length - 1][0]).toBe(1);

    jest.clearAllMocks();
    trg.dispatchEvent(new MouseEvent("mouseenter"));
    trg.dispatchEvent(new MouseEvent("mouseleave"));
    trg.dispatchEvent(new MouseEvent("mouseenter"));
    trg.dispatchEvent(new MouseEvent("mouseleave"));
    jest.advanceTimersByTime(a.$options.hoverShowTimeout + a.$options.hoverHideTimeout); // event listener has timeout
    expect(a.$isOpen).toBe(false);
    expect(spyShow).not.toBeCalled();

    trg.dispatchEvent(new MouseEvent("mouseenter"));
    trg.remove();
    jest.advanceTimersByTime(a.$options.hoverShowTimeout + a.$options.hoverHideTimeout); // event listener has timeout
    expect(a.$isOpen).toBe(false); // because removed
    document.body.appendChild(trg);

    // onlyFocus
    a.remove();
    document.body.appendChild(a);
    a.$options.showCase = 1 << 1; // onFocus
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpen).toBe(false);

    trg.dispatchEvent(new Event("focusin"));
    await h.wait(1); // wait for promise onShow is async
    expect(a.$isOpen).toBe(true);
    expect(spyShow).toBeCalledTimes(1);
    expect(spyShow).lastCalledWith(1 << 1);
    trg.dispatchEvent(new Event("focusout"));
    await h.wait(1); // wait for promise onHide is async
    expect(spyShow).toBeCalledTimes(1); // no new triggers because focus stay
    // jest.advanceTimersToNextTimer(); // focusLost has timeout
    expect(a.$isOpen).toBe(false);

    const trgInput = trg.appendChild(document.createElement("input"));
    const trgInput2 = trg.appendChild(document.createElement("input"));
    // checking focusin-throttling
    jest.clearAllMocks();
    trgInput.focus();
    expect(a.$isOpen).toBe(true);
    trgInput2.focus();
    trgInput.focus();
    await h.wait(1); // wait for promise onShow is async

    expect(a.$isOpen).toBe(true);
    expect(spyHide).not.toBeCalled(); // because div haven't been lost focus
    trgInput.blur();
    await h.wait(1); // wait for promise onShow is async
    expect(a.$isOpen).toBe(false);
    expect(spyShow).toBeCalledTimes(1); // checking if throttling-filter works
    expect(spyShow).lastCalledWith(1 << 1); // checking if throttling-filter works
    expect(spyHide.mock.calls[spyHide.mock.calls.length - 1][0]).toBe(2); // because div haven't been lost focus

    // checking case when document.activeElement is null/not-null (possible on Firefox/Safari)
    trgInput.focus();
    await h.wait(1); // wait for promise onShow is async
    expect(a.$isOpen).toBe(true);
    const f0 = jest.spyOn(document, "activeElement", "get").mockReturnValue(null); // just for coverage
    trgInput.blur();
    expect(a.$isOpen).toBe(false);
    f0.mockRestore();

    // when showCase = focus. need to show() if target isAlreadyFocused
    a.remove();
    trg.setAttribute("tabindex", "0");
    trg.focus();
    expect(document.activeElement.id).toBe("targetId");
    document.body.appendChild(a);
    a.$options.showCase = 1 << 1; // onFocus
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpen).toBe(true); // because of trg is alreadyFocused
    trg.removeAttribute("tabindex");

    // focus moves to element inside popup > no-hide
    /** @type typeof el */
    let a2 = document.body.appendChild(document.createElement(el.tagName));
    const a2Input = a2.appendChild(document.createElement("input"));
    a2.$options.showCase = 1 << 1;
    a2.$options.target = trgInput;
    jest.advanceTimersToNextTimer();
    trgInput.focus();
    expect(a2.$isOpen).toBe(true);
    let f = jest.spyOn(document, "activeElement", "get").mockReturnValue(null);
    a2Input.focus();
    jest.advanceTimersToNextTimer(); // focusLost has debounce
    expect(a2.$isOpen).toBe(true);
    f.mockRestore();

    // onlyClick
    jest.clearAllMocks();
    a.remove();
    document.body.appendChild(a);
    a.$options.showCase = 1 << 2; // onClick
    jest.advanceTimersToNextTimer(); // onReady has timeout
    await h.wait();
    expect(a.$isOpen).toBe(false);

    trg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait(0);
    expect(a.$isOpen).toBe(true);
    trg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(a.$isOpen).toBe(true); // because previous event is skipped (due to debounceTimeout)
    expect(spyShow).toBeCalledTimes(1);
    expect(spyShow).lastCalledWith(1 << 2);
    await h.wait(50); // onClick has debounce timeout
    expect(a.$isOpen).toBe(true); // because previous event is skipped (due to debounceTimeout)

    let e = new MouseEvent("click", { bubbles: true });
    trg.dispatchEvent(e);
    await h.wait();
    expect(a.$isOpen).toBe(false);
    expect(spyHide).toBeCalledTimes(1);
    expect(spyHide).lastCalledWith(5);
    await h.wait(50);

    trgInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(a.$isOpen).toBe(true); // click on input inside

    await h.wait();
    e = new MouseEvent("click", { bubbles: true });
    a.dispatchEvent(e);
    await h.wait();
    expect(a.$isOpen).toBe(false); // click onMe == close
    expect(spyHide).lastCalledWith(4);

    trgInput2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(a.$isOpen).toBe(true); // click on input2 inside

    await h.wait();
    e = new MouseEvent("click", { bubbles: true });
    document.body.dispatchEvent(e);
    await h.wait();
    expect(a.$isOpen).toBe(false); // click outside == close
    expect(spyHide).lastCalledWith(3);

    // check focus on target > on hide
    document.activeElement.blur();
    f = jest.spyOn(document, "activeElement", "get").mockReturnValue(null);
    /** @type typeof el */
    a2 = document.body.appendChild(document.createElement(el.tagName));
    a2.$options.showCase = 1 << 2;
    a2.$options.target = trgInput;
    jest.advanceTimersToNextTimer();
    trgInput.click();
    await h.wait();
    expect(a2.$isOpen).toBe(true);
    const onFocus = jest.spyOn(trgInput, "focus");
    a2.click();
    await h.wait();

    expect(a2.$isOpen).toBe(false);
    expect(onFocus).toBeCalled(); // because focus must me moved back
    f.mockRestore();
    a2.remove();

    // test all: onHover | onFocus | onClick
    jest.clearAllTimers();
    jest.clearAllMocks();
    a.remove();
    document.activeElement?.blur();
    document.body.appendChild(a);
    a.$options.showCase = 0b111111111;
    a.$options.target = trgInput; // only for testing
    await h.wait();
    expect(a.$isOpen).toBe(false);

    // open by mouseenter-click-focus
    trgInput.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(a.$options.hoverShowTimeout); // mouseenter has debounce timeout
    expect(a.$isOpen).toBe(true);
    expect(spyShow).lastCalledWith(1);
    trgInput.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    trgInput.focus();
    trgInput.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await h.wait(1); // wait for promise onShow is async
    expect(a.$isOpen).toBe(true); // no changes in state
    trgInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(a.$isOpen).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    await h.wait(1); // wait for promise onShow is async

    // close by blur
    spyHide.mockClear();
    trgInput.blur();
    await h.wait(1); // wait for promise onHide is async
    expect(a.$isOpen).toBe(false); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyHide.mock.calls[0][0]).toBe(2);

    // close by mouseleave
    trgInput.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    await h.wait(a.$options.hoverShowTimeout); // mouseenter has debounce timeout
    expect(a.$isOpen).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    e = new MouseEvent("mouseleave", { bubbles: true });
    trgInput.dispatchEvent(e);
    await h.wait(a.$options.hoverHideTimeout); // mouseenter has debounce timeout
    expect(a.$isOpen).toBe(false); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyHide).lastCalledWith(1);

    // open again by click
    e = new MouseEvent("click", { bubbles: true });
    trgInput.dispatchEvent(e);
    await h.wait();
    expect(a.$isOpen).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyShow).lastCalledWith(1 << 2);

    // close by click again
    e = new MouseEvent("click", { bubbles: true });
    trgInput.dispatchEvent(e);
    await h.wait();
    expect(a.$isOpen).toBe(false);
    expect(spyHide).lastCalledWith(5);
    trgInput.blur();
    spyShow.mockClear();

    // simulate click-focus without mouseenter
    // jest.advanceTimersByTime(el.$options.focusDebounceMs);
    trgInput.dispatchEvent(new Event("touchstart", { bubbles: true })); // just for coverage 100%
    trgInput.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(a.$isOpen).toBe(false);
    trgInput.focus();
    expect(spyShow).lastCalledWith(1 << 1);
    await h.wait(1);
    expect(a.$isOpen).toBe(true); // show by focus
    trgInput.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    let ev = new MouseEvent("click", { bubbles: true });
    ev.pageX = 20; // required otherwise it's filtered from synthetic events
    trgInput.dispatchEvent(ev);
    await h.wait(50);
    expect(a.$isOpen).toBe(true); // stay opened because wasOpened by focus from click

    // simulate mouse-click again
    trgInput.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    trgInput.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    trgInput.dispatchEvent(ev);
    await h.wait(50);
    expect(a.$isOpen).toBe(false); // 2nd click will close (but if click is fired without mousedown it doesn't work)
    expect(spyHide).lastCalledWith(5);

    // checking again when events doesn't propagate to body
    trgInput.blur();
    ev = new MouseEvent("click", { bubbles: false });
    ev.pageX = 20; // required otherwise it's filtered from synthetic events
    await h.wait();
    trgInput.dispatchEvent(new MouseEvent("mousedown", { bubbles: false }));
    trgInput.focus();
    await h.wait(1);
    expect(a.$isOpen).toBe(true); // show by focus
    trgInput.dispatchEvent(new MouseEvent("mouseup", { bubbles: false }));
    trgInput.dispatchEvent(ev);
    await h.wait();
    expect(a.$isOpen).toBe(true); // stay opened because wasOpened by focus from click
    trgInput.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    trgInput.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    trgInput.dispatchEvent(ev);
    await h.wait();
    expect(a.$isOpen).toBe(false); // 2nd click will close (but if click is fired without mousedown it doesn't work)
  });

  test("$options.minWidth/minHeight/maxWidth by target", async () => {
    // just for coverage
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0; // always
    a.$options.minWidthByTarget = true;
    a.$options.minHeightByTarget = true;
    document.body.append(a);
    jest.spyOn(a.previousElementSibling, "getBoundingClientRect").mockReturnValue(trg.getBoundingClientRect());
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
    jest.spyOn(a2.previousElementSibling, "getBoundingClientRect").mockReturnValue(trg.getBoundingClientRect());
    jest.advanceTimersToNextTimer(); // wait for ready/init
    expect(a2.style.minWidth).toBeDefined();
    expect(a2.style.minHeight).toBeDefined();
    jest.clearAllTimers();

    /** @type typeof el */
    const a3 = document.createElement(el.tagName);
    a3.$options.showCase = 0; // always
    a3.$options.maxWidthByTarget = false;
    document.body.append(a3);
    jest.spyOn(a3.previousElementSibling, "getBoundingClientRect").mockReturnValue(trg.getBoundingClientRect());
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onShow/onHide is async
    expect(a3.$isOpen).toBe(true);
    expect(a3.isConnected).toBe(true);
    // WARN: layout impossible to test with unit; all layout tests see in e2e
    expect(a3.style.maxWidth).toBe("");

    a3.$hide();
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onShow/onHide is async
    expect(a3.$isOpen).toBe(false);
    expect(a3.isConnected).toBe(true);
    a3.$options.maxWidthByTarget = true;
    a3.$show();
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onShow/onHide is async
    // WARN: layout impossible to test with unit; all layout tests see in e2e
    expect(a3.style.maxWidth).not.toBe("");
  });

  test("$options.offsetFitElement", async () => {
    el.$options.offsetFitElement = [1, 1];
    el.$show();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    el.$options.offsetFitElement = [2, 3, 4, 8];
    el.$show();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    el.$options.offsetFitElement = undefined;
    el.$show();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    WUPPopupElement.$defaults.offsetFitElement = [2, 2];
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$show();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    WUPPopupElement.$defaults.offset = [1, 1];
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$show();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 99px);" position="top"></wup-popup>"`
    );

    WUPPopupElement.$defaults.offsetFitElement = undefined;
    WUPPopupElement.$defaults.offset = undefined;
  });

  test("$hide()/$show()", async () => {
    el.$options.showCase = 0; // always
    expect(el.$isOpen).toBe(true);
    el.$hide();
    expect(el.$isOpen).toBe(false);
    el.$show();
    expect(el.$isOpen).toBe(true);

    el.remove();
    el.$hide();
    el.$show();
    expect(el.$isOpen).toBe(false);

    // check when showCase != 0
    jest.clearAllTimers();
    el.$options.showCase = 1 << 2; // onClick
    document.body.append(el);
    jest.advanceTimersToNextTimer(); // wait for ready
    trg.click();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onShow is async
    expect(el.$isOpen).toBe(true); // checking if click-listener works
    el.$show();

    el.$show();
    trg.click();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onShow is async
    expect(el.$isOpen).toBe(true); // checking if click-listener is off because was opened by manual $show
    el.$hide();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onShow is async
    jest.advanceTimersByTime(100); // click has debounce filter
    expect(el.$isOpen).toBe(false); // checking if click-listener is off because was opened by manual $show
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter
    await Promise.resolve(); // wait for promise onShow is async
    expect(el.$isOpen).toBe(true); // checking if events works again

    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0;
    document.body.append(a);
    expect(a.$isReady).toBe(false);
    expect(a.$hide).not.toThrow();
    jest.advanceTimersByTime(1);

    // test timeouts inside $show
    a.remove();
    const onErr = jest.fn();
    a.$show().catch(onErr);
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // to apply options - throw error because popup isn't ready
    a.$show();
    document.body.append(a);
    await h.wait();
    expect(a.$isOpen).toBe(true);

    /** @type typeof el */
    const b = document.createElement(el.tagName);
    jest.spyOn(b, "goShow").mockImplementationOnce(() => false);
    b.$options.target = trg;
    document.body.appendChild(b);
    jest.advanceTimersByTime(1);
    trg.click();
    await h.wait();
    expect(b.$isOpen).toBe(false);
    trg.click(); // click again (goShow is once => it's restored to previous)
    await h.wait();
    expect(b.$isOpen).toBe(true);

    expect(() => b.$refresh()).not.toThrow();
    // other cases in test(`options.$target`) and test(`remove`)

    b.$hide();
    await h.wait();
    b.goHide(); // just for coverage
    expect(b.$isOpen).toBe(false);
  });

  test("$options.animation", async () => {
    const { nextFrame } = h.useFakeAnimation();
    el.$options.showCase = 0;
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    el.appendChild(document.createElement("div"));
    el.appendChild(document.createElement("div"));
    const orig = window.getComputedStyle;
    const spyStyle = jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        /** @type CSSStyleDeclaration */
        return { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
      }
      return orig(elem);
    });

    el.$hide();
    expect(el.$isOpen).toBe(true); // because $hide is async
    await h.wait();
    expect(el.$isOpen).toBe(false);
    el.$options.animation = Animations.drawer;
    el.$show();
    expect(el.$isOpen).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px); display: block; animation-name: none;" position="top"><div></div><div></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0); display: block; animation-name: none; transform-origin: bottom;" position="top"><div></div><div></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0.055555555555555566); display: block; animation-name: none; transform-origin: bottom;" position="top"><div style="transform: scaleY(17.999999999999996) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(17.999999999999996) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0.1111111111111111); display: block; animation-name: none; transform-origin: bottom;" position="top"><div style="transform: scaleY(9) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(9) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    el.$hide();
    expect(el.$isOpen).toBe(true); // because $hide is async
    await Promise.resolve();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0.1111111111111111); display: block; animation-name: none; transform-origin: bottom;" position="top" hide=""><div style="transform: scaleY(9) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(9) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    await nextFrame(2);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0.05555555555555553); display: block; animation-name: none; transform-origin: bottom;" position="top" hide=""><div style="transform: scaleY(18.000000000000007) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(18.000000000000007) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px); animation-name: none;" position="top"><div style=""></div><div style=""></div></wup-popup>"`
    );
    await h.wait();
    await nextFrame();
    expect(el.$isOpen).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px); animation-name: none;" position="top"><div style=""></div><div style=""></div></wup-popup>"`
    );

    // animation to another side
    el.$options.placement = [WUPPopupElement.$placements.$bottom.$start.$adjust];
    await h.wait(); // options is async
    expect(el.$isOpen).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 150px); display: block; animation-name: none;" position="bottom"><div style=""></div><div style=""></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 150px) scaleY(0); display: block; animation-name: none; transform-origin: top;" position="bottom"><div style=""></div><div style=""></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 150px) scaleY(0.055555555555555525); display: block; animation-name: none; transform-origin: top;" position="bottom"><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    // checking how it works if options is changed during the animation
    el.$options.placement = [WUPPopupElement.$placements.$top.$start.$adjust];
    await h.wait(); // options is async
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.055555555555555525); transform-origin: bottom; display: block; animation-name: none;" position="top"><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom; display: block; animation-name: none;" position="top"><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );
    el.$hide(); // force to hide during the show-animation
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom; display: block; animation-name: none;" position="top" hide=""><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.05555555555555543); transform-origin: bottom; display: block; animation-name: none;" position="top" hide=""><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );
    el.$show(); // force to show during the hide-animation
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.05555555555555543); transform-origin: bottom; display: block; animation-name: none;" position="top"><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom; display: block; animation-name: none;" position="top"><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    // checking when element is removed
    el.remove();
    await nextFrame();
    // WARN styles haven't been removed because expected that item destroyed
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px); display: block; animation-name: none;" position="top"><div style=""></div><div style=""></div></wup-popup>"`
    );

    // checking error when animTime is missed
    spyStyle.mockRestore();
    document.body.append(el);
    el.$show();
    await h.wait();
    el.$hide();
    await h.wait();
    // checking with default: when browser prefers-reduced-motion = false
    jest.spyOn(window, "matchMedia").mockReturnValueOnce({ matches: true });
    const spyConsole = h.mockConsoleWarn();
    el.$show();
    await h.wait();
    h.unMockConsoleWarn();
    expect(el.$isOpen).toBe(true);
    expect(spyConsole).toBeCalled();
    await nextFrame(); // no-animation expected
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px); display: block;" position="top"><div style=""></div><div style=""></div></wup-popup>"`
    );
  });

  test("attrs", () => {
    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0;
    document.body.prepend(a);
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because of target not defined
    jest.clearAllMocks();
    expect(a.$isOpen).toBe(false);
    expect(a.$options.target == null).toBe(true);

    // attr 'target'
    a.setAttribute("target", `#${trg.getAttribute("id")}`);
    a.setAttribute("placement", "top-start");
    jest.advanceTimersToNextTimer();
    expect(a.$options.target).toBeDefined();
    expect(a.$isOpen).toBe(true);

    const svg = document.body.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    svg.setAttribute("id", "svgId");
    a.setAttribute("target", "#svgId");
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because of target is defined but not HTMLELement
  });

  test("remove", async () => {
    const dispose = jest.spyOn(el, "dispose");
    expect(el.$isOpen).toBe(true);
    el.remove();
    expect(dispose).toBeCalledTimes(1);
    expect(el.$isOpen).toBe(false);
    expect(el.$isReady).toBe(false);

    // try to open when element not appended
    const onErr = jest.fn();
    el.$show().catch(onErr);
    expect(el.$isOpen).toBe(false); // because $show() is async method
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // to apply options - throw error because popup isn't ready
    expect(el.$isReady).toBe(false);
    expect(el.$isOpen).toBe(false); // because $show() is async method

    // try to append and open
    document.body.appendChild(el);
    jest.advanceTimersToNextTimer();
    expect(el.$show).not.toThrow();
    expect(el.$isOpen).toBe(true);
  });

  test("memoryLeak", async () => {
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
    expect(a.$isOpen).toBe(false); // no events from target

    const called = spy.map((v) => v.on.mock.calls[0]).filter((v) => v);
    expect(called).not.toHaveLength(0); // test if event listeners were added

    trg.click(); // it will add extra events
    await h.wait(1);
    expect(a.$isOpen).toBe(true);
    expect(spy[0].on).toBeCalled(); // expected that we have events for document

    // checking if updatePosition was fired
    expect(spyFrame).toBeCalledTimes(1);
    expect(spyTrgRect).toBeCalled();
    spyTrgRect.mockClear();
    spyBodyRect.mockClear();
    animateFrame();
    expect(spyTrgRect).toBeCalledTimes(1);
    expect(spyBodyRect).not.toBeCalled();
    animateFrame();
    expect(spyTrgRect).toBeCalledTimes(2);
    expect(spyBodyRect).not.toBeCalled();

    a.remove();
    expect(a.isConnected).toBe(false);
    expect(a.$isOpen).toBe(false);
    spy.check(); // checking if removed every listener that was added

    // checking target removed > event removed
    jest.clearAllMocks();
    trg.remove();
    document.body.appendChild(a);
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // error: Target must be appended to layout
    trg.click();
    await h.wait();
    expect(a.$isOpen).toBe(false); // because target removed
    expect(() => a.goShow(0)).toThrow(); // error expected
    spy.check(); // checking if removed every listener that was added

    document.body.appendChild(trg);
    trg.click();
    await h.wait();
    expect(a.$isOpen).toBe(false); // because target isn't appened before initPopup
    a.$options.target = null;
    a.$options.target = trg; // reassignTarget
    await h.wait();
    trg.click();
    await h.wait();
    expect(a.$isOpen).toBe(true);

    spyFrameCancel.mockClear();
    // WARN: impossible to detect target removing
    // trg.remove();
    // expect(spyFrameCancel).toBeCalledTimes(1);
    // await h.wait();
    // await h.wait();
    // expect(a.$isOpen).toBe(false);
    // // if target removed - events should be removed
    // spy.check(); // checking if removed every listener that was added

    // try return default behavior
    // document.body.appendChild(trg);
    a.$options.target = null;
    a.$options.target = trg; // required to rebind events
    jest.advanceTimersByTime(1);
    const called2 = spy.map((v) => v.on.mock.calls[0]).filter((v) => v);
    expect(called2).not.toHaveLength(0); // test if event listeners were added
    trg.click();
    await h.wait();
    expect(a.$isOpen).toBe(true);
  });

  test("position", async () => {
    expect(el.$isOpen).toBe(true); // checking prev-state

    const expectIt = (placement) => {
      el.$options.placement = placement ? [placement] : [];
      jest.advanceTimersByTime(10);
      // eslint-disable-next-line jest/valid-expect
      return expect(el.outerHTML);
    };

    expectIt(WUPPopupElement.$placements.$top.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 100px);" position="top"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(240px, 100px);" position="top"></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$bottom.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 150px);" position="bottom"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 150px);" position="bottom"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(240px, 150px);" position="bottom"></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$left.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 100px);" position="left"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 125px);" position="left"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 150px);" position="left"></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$right.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(240px, 100px);" position="right"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(240px, 125px);" position="right"></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(240px, 150px);" position="right"></wup-popup>"`
    );

    // checking if $placements.$right == $placements.$right.middle etc.
    expectIt(WUPPopupElement.$placements.$right).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(240px, 125px);" position="right"></wup-popup>"`
    );

    expectIt().toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );
  });

  test("position alt", async () => {
    // checking alt when no space
    expect(el.$isOpen).toBe(true); // checking prev-state

    const height = 50;
    const width = 100;
    let x = 140;
    let y = 0;
    const trgRect = { x, left: x, y, top: y, bottom: y + height, right: x + width, height, width, toJSON: () => "" };
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValue(trgRect);

    const expectIt = async (placement) => {
      el.$options.placement = placement;
      await h.wait(10);
      await h.wait(10);
      // eslint-disable-next-line jest/valid-expect
      return expect(el.outerHTML);
    };

    // no place at the top so at the bottom is expected
    (
      await expectIt([
        WUPPopupElement.$placements.$top.$start, //
        WUPPopupElement.$placements.$bottom.$start,
      ])
    ).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 50px);" position="bottom"></wup-popup>"`
    );

    // just for coverage: tesing ignoreAlign in popupAdjustInternal()
    // el.style.minHeight = "10px"; // watchfix: https://github.com/jsdom/jsdom/issues/2986
    const orig = window.getComputedStyle;
    let overflowX = "auto";
    let overflowY = "auto";
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return { minWidth: "10px", minHeight: "10px", overflowX, overflowY, animationDuration: "0s" };
      }
      return orig(elem);
    });

    (await expectIt([WUPPopupElement.$placements.$top.$start])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 50px);" position="bottom"></wup-popup>"`
    );

    // cover calc maxHeight by freeHeight in popupAdjustInternal()
    y = 11; // so freeH < me.H but freeH > minHeight
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y + 1);
    trgRect.y = y;
    trgRect.top = y;
    trgRect.bottom = height + y;
    // expected bottom.middle position because at left/top not enough space
    (await expectIt([WUPPopupElement.$placements.$top.$start.$adjust])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 61px);" position="bottom"></wup-popup>"`
    );

    // checking $resizeHeight - expected $top.$start with maxHeight
    (await expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-height: 11px; transform: translate(140px, 0px);" position="top"></wup-popup>"`
    );
    // checking maxHeight inheritance
    const divH = el.appendChild(document.createElement("div"));
    overflowY = "visible";
    (await expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-height: 11px; transform: translate(140px, 0px);" position="top"><div style="max-height: 11px;"></div></wup-popup>"`
    );
    divH.remove();

    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y);
    // expected $top.$start without maxHeight because height == freeH
    (await expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 0px);" position="top"></wup-popup>"`
    );
    // expected $top.$start with maxHeight
    (await expectIt([WUPPopupElement.$placements.$top.$start.$resizeHeight])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 0px);" position="top"></wup-popup>"`
    );

    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y + 1);
    // cover calc maxWidth by freeWidth in popupAdjustInternal()
    x = 12; // so freeW < me.W but freeW > minWidth
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(x + 1);
    trgRect.x = x;
    trgRect.left = x;
    trgRect.right = width + x;
    // expected bottom.middle position because at left/top not enough space
    (await expectIt([WUPPopupElement.$placements.$left.$start.$adjust])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(56px, 61px);" position="bottom"></wup-popup>"`
    );
    expect(positionIsInteger()).toEqual({ left: "int", top: "int" });

    // checking $resizeWidth - expected left.start with maxWidth
    (await expectIt([WUPPopupElement.$placements.$left.$start.$adjust.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 12px; transform: translate(0px, 11px);" position="left"></wup-popup>"`
    );

    // checking maxHeight inheritance
    const divW = el.appendChild(document.createElement("div"));
    overflowX = "visible";
    (await expectIt([WUPPopupElement.$placements.$left.$start.$adjust.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 12px; transform: translate(0px, 11px);" position="left"><div style="max-width: 12px;"></div></wup-popup>"`
    );
    divW.remove();

    (await expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 12px; transform: translate(0px, 11px);" position="left"></wup-popup>"`
    );

    // cover case when maxWidth affects on height
    jest.spyOn(el, "offsetHeight", "get").mockImplementation(() => {
      if (el.style.maxWidth) {
        return document.body.clientHeight;
      }
      return y + 1;
    });
    (await expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(56px, 61px);" position="bottom"></wup-popup>"`
    );
    expect(positionIsInteger()).toEqual({ left: "int", top: "int" });
    // cover case when maxWidthByTarget=true
    el.$options.maxWidthByTarget = true;
    (await expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 100px; transform: translate(112px, 0px);" position="right"></wup-popup>"`
    );
    el.$options.maxWidthByTarget = false;
    (await expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(56px, 61px);" position="bottom"></wup-popup>"`
    );

    // test case when not enough space
    const fn = h.mockConsoleError();
    jest.clearAllTimers();
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(1000);
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(1000);
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return { minWidth: "1000px", minHeight: "1000px", animationDuration: "0s" };
      }
      return orig(elem);
    });
    (await expectIt([WUPPopupElement.$placements.$left.$start])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(112px, 0px);" position="right"></wup-popup>"`
    );
    expect(fn).toBeCalledTimes(1);

    el.$options.offsetFitElement = [2, 3, 4, 8];
    (await expectIt([WUPPopupElement.$placements.$left.$start])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(112px, 2px);" position="right"></wup-popup>"`
    );

    h.unMockConsoleError();
  });

  test("position with scroll", () => {
    // make body as scrollable
    jest.spyOn(document.body, "scrollTop", "set").mockRestore();

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
      jest.advanceTimersByTime(1); // because getBoundingInternalRect is cached
    };

    const expectIt = (placement) => {
      el.$options.placement = [placement];
      jest.advanceTimersByTime(10);
      // eslint-disable-next-line jest/valid-expect
      return expect(el.outerHTML);
    };

    // check with overflowX - no place at the left and top
    moveTo(0, 0);
    expectIt(WUPPopupElement.$placements.$left.$middle).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(50px, 50px);" position="bottom"></wup-popup>"`
    );

    // cover case when target is partiallyHidden by scrollable parent
    // no place at the top
    moveTo(0, bodyRect.top - trgRect.height / 2); // move to top
    expectIt(WUPPopupElement.$placements.$top.$middle).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(50px, 25px);" position="bottom"></wup-popup>"`
    );

    // no place at the bottom
    moveTo(0, bodyRect.bottom - trgRect.height / 2); // move to bottom
    expectIt(WUPPopupElement.$placements.$bottom.$middle).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(50px, 375px);" position="top"></wup-popup>"`
    );

    // no place at the left
    moveTo(bodyRect.left - trgRect.width / 2, 10); // move to left
    expectIt(WUPPopupElement.$placements.$left.$middle).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(25px, 10px);" position="top"></wup-popup>"`
    );

    // no place at the right
    moveTo(bodyRect.right - trgRect.width / 2, 10); // move to right
    expectIt(WUPPopupElement.$placements.$right.$middle).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(575px, 10px);" position="top"></wup-popup>"`
    );

    // target is completely hidden at the top of scrollable content
    trgRect.width = 18;
    trgRect.height = 10;
    moveTo(0, bodyRect.top - trgRect.height);
    expectIt(WUPPopupElement.$placements.$top.$middle).toMatchInlineSnapshot(
      `"<wup-popup style="" position="top"></wup-popup>"`
    );
    el.$options.arrowEnable = true; // checking if arrow is hidden also
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="" position="top"></wup-popup><wup-popup-arrow style="display: none;"></wup-popup-arrow></body>"`
    );
    el.$options.arrowEnable = false;

    // target is completely hidden at the bottom of scrollable content
    moveTo(0, bodyRect.bottom - trgRect.height); // move to bottom/partially
    expectIt(WUPPopupElement.$placements.$bottom.$middle).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(9px, 390px);" position="top"></wup-popup>"`
    );
  });

  test("arrow", () => {
    expect(el.$isOpen).toBe(true); // checking prev-state
    expect(el.$refArrow).toBeNull();
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
      // eslint-disable-next-line jest/valid-expect
      return expect(document.body.outerHTML);
    };

    expectIt(WUPPopupElement.$placements.$top.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(140px, 70px);" position="top"></wup-popup><wup-popup-arrow style="transform: translate(154px, 90px) rotate(0.1deg);"></wup-popup-arrow></body>"`
    );
    expect(el.$refArrow).toBeDefined();

    expectIt(WUPPopupElement.$placements.$top.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(170px, 70px);" position="top"></wup-popup><wup-popup-arrow style="transform: translate(180px, 90px) rotate(0.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(200px, 70px);" position="top"></wup-popup><wup-popup-arrow style="transform: translate(206px, 90px) rotate(0.1deg);"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$bottom.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(140px, 160px);" position="bottom"></wup-popup><wup-popup-arrow style="transform: translate(154px, 150px) rotate(180.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(170px, 160px);" position="bottom"></wup-popup><wup-popup-arrow style="transform: translate(180px, 150px) rotate(180.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(200px, 160px);" position="bottom"></wup-popup><wup-popup-arrow style="transform: translate(206px, 150px) rotate(180.1deg);"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$left.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(96px, 100px);" position="left"></wup-popup><wup-popup-arrow style="width: 8px; height: 4px; transform: translate(134px, 108px) rotate(-90.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(96px, 115px);" position="left"></wup-popup><wup-popup-arrow style="width: 8px; height: 4px; transform: translate(134px, 123px) rotate(-90.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(96px, 130px);" position="left"></wup-popup><wup-popup-arrow style="width: 8px; height: 4px; transform: translate(134px, 138px) rotate(-90.1deg);"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$right.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(244px, 100px);" position="right"></wup-popup><wup-popup-arrow style="width: 8px; height: 4px; transform: translate(238px, 108px) rotate(90.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(244px, 115px);" position="right"></wup-popup><wup-popup-arrow style="width: 8px; height: 4px; transform: translate(238px, 123px) rotate(90.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(244px, 130px);" position="right"></wup-popup><wup-popup-arrow style="width: 8px; height: 4px; transform: translate(238px, 138px) rotate(90.1deg);"></wup-popup-arrow></body>"`
    );

    el.$options.arrowClass = "my-arrow";
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(244px, 130px);" position="right"></wup-popup><wup-popup-arrow class="my-arrow" style="width: 8px; height: 4px; transform: translate(238px, 138px) rotate(90.1deg);"></wup-popup-arrow></body>"`
    );
    // checking with nextSibling
    document.body.appendChild(document.createElement("a"));
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(244px, 130px);" position="right"></wup-popup><wup-popup-arrow class="my-arrow" style="width: 8px; height: 4px; transform: translate(238px, 138px) rotate(90.1deg);"></wup-popup-arrow><a></a></body>"`
    );

    el.$options.arrowOffset = [2, 3];
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(244px, 130px);" position="right"></wup-popup><wup-popup-arrow class="my-arrow" style="width: 8px; height: 4px; transform: translate(241px, 138px) rotate(90.1deg);"></wup-popup-arrow><a></a></body>"`
    );

    WUPPopupElement.$defaults.arrowOffset = [4, 8];
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.arrowEnable = true;
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup style="display: block; transform: translate(244px, 130px);" position="right"></wup-popup><wup-popup-arrow class="my-arrow" style="width: 8px; height: 4px; transform: translate(241px, 138px) rotate(90.1deg);"></wup-popup-arrow><a></a><wup-popup style="opacity: 0;"></wup-popup></body>"`
    );

    WUPPopupElement.$defaults.arrowOffset = undefined;
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
    trg.click(); // to show
    await h.wait(100);
    expect(popup).toBeDefined();
    expect(popup.$options.showCase).toBe(0b111111);
    expect(popup.$options.target).toBe(trg);
    expect(popup.isConnected).toBe(true);
    expect(popup.$isOpen).toBe(true);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup style="display: block; transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );
    expect(cnt).toBe(1);
    expect(spyShow).toBeCalledTimes(1);
    expect(spyHide).toBeCalledTimes(0);

    trg.click(); // to hide
    await h.wait();
    expect(cnt).toBe(1);
    expect(popup.$isOpen).toBe(false);
    expect(popup.isConnected).toBe(false);
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id="targetId">some text</div>"`);
    expect(spyShow).toBeCalledTimes(1);
    expect(spyHide).toBeCalledTimes(1);

    await h.wait();
    trg.click(); // to show again
    await h.wait();
    expect(popup.$isOpen).toBe(true);
    expect(popup.isConnected).toBe(true);
    expect(cnt).toBe(2);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup style="display: block; transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );
    expect(spyShow).toBeCalledTimes(2);
    expect(spyHide).toBeCalledTimes(1);

    detach();
    expect(detach).not.toThrow(); // checking detach again
    expect(popup.$isOpen).toBe(false);
    expect(popup.isConnected).toBe(false);
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id="targetId">some text</div>"`);
    expect(spyShow).toBeCalledTimes(2);
    expect(spyHide).toBeCalledTimes(2);

    spy.check(); // checking memory leak

    // checking when canShow = false > popup.removed
    jest.clearAllMocks();
    jest.spyOn(WUPPopupElement.prototype, "goShow").mockImplementationOnce(() => false);
    detach = WUPPopupElement.$attach({ target: trg, showCase: 0b111111, text: "Me" }); // checking without callback
    trg.click();
    jest.advanceTimersByTime(100); // popup has click-timeouts
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id="targetId">some text</div>"`);
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
    await h.wait();
    // checking if rendered once
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup style="display: block; transform: translate(190px, 100px);" position="top">Me2</wup-popup>"`
    );
    expect(popup).toBeDefined();

    // checking if options that affects on re-init can be changed in callback
    document.body.click();
    trg.blur();
    expect(popup.$isOpen).toBe(false);
    detach();
    detach = WUPPopupElement.$attach({ target: trg, showCase: 1 << 2, text: "Me2", placement: [] }, (popupEl) => {
      popup = popupEl;
    });
    trg.click();
    await h.wait();
    expect(popup.$isOpen).toBe(true);
    expect(popup.getAttribute("position")).not.toBe("bottom");
    jest.advanceTimersByTime(1000);
    popup.$options.placement = [WUPPopupElement.$placements.$bottom.$start.$adjust];
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpen).toBe(false); // changing options hides popup
    trg.click();
    await h.wait();
    expect(popup.$isOpen).toBe(true);
    expect(popup.getAttribute("position")).toBe("bottom");

    // checking changing target
    const divRemove = document.body.appendChild(document.createElement("div"));
    const trg2 = divRemove.appendChild(document.createElement("button"));
    popup.$options.target = trg2;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpen).toBe(false); // changing options hides popup
    trg.click();
    await h.wait();
    expect(popup.$isOpen).toBe(false); // because target changed
    popup.$options.target.click();
    await h.wait();
    expect(popup.$isOpen).toBe(true);

    // set target to null (for coverage)
    popup.$options.target = null;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpen).toBe(false); // changing options hides popup
    expect(popup.$options.target).toBe(trg); // because it returns to previous
    trg2.click();
    await h.wait();
    expect(popup.$isOpen).toBe(false); // because target changed
    trg.click();
    await h.wait();
    expect(popup.$isOpen).toBe(true);

    // checking self-removing opened popup when target turns into removed
    let animateFrame;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => (animateFrame = fn));
    popup.$options.target = trg2;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpen).toBe(false); // because target changed
    trg2.click();
    await h.wait();
    expect(popup.$isOpen).toBe(true);
    divRemove.innerHTML = "";
    expect(trg2.isConnected).toBe(false); // because removed by innerHTML
    animateFrame();
    expect(popup.isConnected).toBe(false); // because target is removed

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

  test("custom animation with transform", async () => {
    el.$hide();
    expect(el.$isOpen).toBe(false);

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
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a2" };
    el.$hide();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top" hide=""></wup-popup>"`
    );
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
    el.$show();
    await h.wait(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    // checking the same with attach
    /** @type WUPPopupElement */
    let popup;
    const detach = WUPPopupElement.$attach({ target: trg, showCase: 0b111111, text: "Me" }, (popupEl) => {
      popup = popupEl;
    });
    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
    trg.click();
    await h.wait();
    expect(popup.$isOpen).toBe(true);
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );

    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a2" };
    trg.click();
    await h.wait(1);
    expect(popup.$isOpen).toBe(true); // because we are waiting for animation
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top" hide="">Me</wup-popup>"`
    );
    await h.wait();
    expect(popup.$isOpen).toBe(false);
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );

    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
    trg.click();
    await h.wait();
    expect(popup.$isOpen).toBe(true);
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );
    detach();

    // checking with custom animation
    let animateFrame;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => (animateFrame = fn));
    objStyle = { animationDuration: "0.2s", animationName: "dropdown" };
    el.$show();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );
    el.$hide(); // cover clearing animationTimer

    el.$show();
    await h.wait(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );
    jest.advanceTimersByTime(200);
    const v = { ...trg.getBoundingClientRect() };
    v.height += 1;
    v.bottom += 1;
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValueOnce(v);
    animateFrame();
    await h.wait(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    // checking with wrong directions
    el.$hide();
    objStyle = { animationDuration: "none", animationName: "test 0" };
    el.$show();
    await h.wait(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    el.remove();
  });

  test("async show/hide on target click", async () => {
    // issue by trg.click() open > hide > open  --- error
    el.$hide();
    el.$options.showCase = 1 << 2; // onlyClick
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // checking ordinary behavior without animation
    trg.click();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    trg.click();
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // simulate defaults
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        /** @type CSSStyleDeclaration */
        return { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
      }
      return orig(elem);
    });

    trg.click();
    await h.wait(50);
    expect(el.$isOpen).toBe(true); // because open is sync method

    // hide
    trg.click();
    expect(el.$isOpen).toBe(true); // because hide is async method
    await h.wait(50); // wait for 50ms
    expect(el.$isOpen).toBe(true); // because hide waits for animation in 300ms

    // open
    trg.click(); // try open again when hide hasn't been finished yet
    expect(el.$isOpen).toBe(true);
    await h.wait(50); // wait for 50ms
    expect(el.$isOpen).toBe(true);

    // hide
    trg.click(); // try again when previous hide hasn't been finished yet but opened again
    expect(el.$isOpen).toBe(true);
    await h.wait(50); // wait for 50ms
    expect(el.$isOpen).toBe(true);
    await h.wait(1000);
    expect(el.$isOpen).toBe(false);

    // checking if it works again
    trg.click(); // try to open again when previous hide hasn't been finished yet but opened again
    await h.wait();
    expect(el.$isOpen).toBe(true);
    trg.click();
    await h.wait();
    expect(el.$isOpen).toBe(false);
  });

  test("popupListen: hidding by click twice", async () => {
    /** @type WUPPopupElement */
    const myel = document.createElement(el.tagName);
    myel.$options.target = trg;
    myel.$options.showCase = 0;

    document.body.appendChild(myel);
    popupListen(
      { target: trg, showCase: 1 << 2 }, // onClick
      () => {
        myel.$show();
        return myel;
      },
      () => myel.$hide()
    );

    // simulate defaults
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === myel) {
        /** @type CSSStyleDeclaration */
        return { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
      }
      return orig(elem);
    });

    myel.$hide(); // showCase opens popup by default
    await h.wait();
    expect(myel.$isOpen).toBe(false);
    // open
    trg.click();
    await h.wait(); // wait for changes
    expect(myel.$isOpen).toBe(true);

    // hide
    document.body.click();
    await h.wait(100); // wait for partially hidden
    expect(myel.$isOpen).toBe(true);
    expect(() => document.body.click()).not.toThrow(); // error here because openedEl is null in eventListener on 2nd call
    await h.wait();
    expect(myel.$isOpen).toBe(false);
  });

  test("popupListen: show 1st time", async () => {
    /** @type WUPPopupElement */
    const myel = document.createElement(el.tagName);
    myel.$options.target = trg;
    myel.$options.showCase = 0;

    document.body.appendChild(myel);
    const refs = popupListen(
      { target: trg, showCase: 1 << 2 }, // onClick
      () => {
        myel.$show();
        return myel;
      },
      () => myel.$hide()
    );

    // cover case when openedEl hasn't been defined yet
    refs.show(0);
    await h.wait();
    expect(myel.$isOpen).toBe(true);
  });

  /* test("double-click filter", async () => {
    await el.$hide();
    el.$options.showCase = 1 << 2; // click
    await h.wait();
    expect(el.$isOpen).toBe(false);
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
    expect(el.$isOpen).toBe(true); // because 2nd click is filtered
  }); */

  test("right-click filter", async () => {
    await el.$hide();
    el.$options.showCase = ShowCases.onClick;
    await h.wait();

    await h.userClick(trg);
    await h.wait();
    expect(el.$isOpen).toBe(true);

    await h.userClick(trg, { button: 1 });
    await h.wait();
    expect(el.$isOpen).toBe(true); // because right-button

    await h.userClick(trg, { button: 0 });
    await h.wait();
    expect(el.$isOpen).toBe(false); // because left-button
  });

  test("target.mousedown > mousemove > body.mouseup", async () => {
    await el.$hide();
    el.$options.showCase = 1 << 2; // click
    await h.wait();
    expect(el.$isOpen).toBe(false);

    trg.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await h.wait(30);
    trg.dispatchEvent(new TestMouseMoveEvent("mousemove", { bubbles: true, movementX: 2, movementY: 0 }));
    await h.wait(100);
    document.body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait(300);
    expect(el.$isOpen).toBe(false); // because click cancelled outside target

    await h.userClick(trg);
    await h.wait();
    expect(el.$isOpen).toBe(true);

    // again when popup is open
    trg.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await h.wait(30);
    trg.dispatchEvent(new TestMouseMoveEvent("mousemove", { bubbles: true, movementX: 0, movementY: 2 }));
    await h.wait(100);
    document.body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait(300);
    expect(el.$isOpen).toBe(true); // because click cancelled outside target

    await h.userClick(trg); // otherwise wasMouseMove isn't cleared
    await h.wait(300);
    expect(el.$isOpen).toBe(false); // because click cancelled outside target

    await h.wait();
    // cover case when browser somehow sends mousemove 0
    trg.dispatchEvent(new TestMouseMoveEvent("mousedown", { bubbles: true }));
    trg.dispatchEvent(new TestMouseMoveEvent("mousemove", { bubbles: true, movementX: 0, movementY: 0 }));
    trg.dispatchEvent(new TestMouseMoveEvent("mouseup", { bubbles: true }));
    trg.dispatchEvent(new TestMouseMoveEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
  });

  test("popupListen: handle error on show", async () => {
    /** @type WUPPopupElement */
    const myel = document.createElement(el.tagName);
    myel.$options.target = trg;
    myel.$options.showCase = 0;

    document.body.appendChild(myel);
    let cnt = 0;
    popupListen(
      { target: trg, showCase: 1 << 2 }, // onClick
      () => {
        ++cnt;
        throw new Error("TestCase Impossible to show");
      },
      () => myel.$hide()
    );

    h.handleRejection();
    trg.click();
    await h.wait();
    expect(cnt).toBe(1);

    trg.click();
    await h.wait();
    expect(cnt).toBe(2); // checking if possible again
  });

  test("popup inside target", async () => {
    el.$options.showCase = 1 << 2;
    trg.appendChild(el);
    await h.wait();

    // click on popup > close popup
    await h.userClick(trg);
    await h.wait();
    expect(el.$isOpen).toBe(true);
    await h.userClick(el);
    await h.wait();
    expect(el.$isOpen).toBe(false);
  });

  test("popup with parent transform.translate", async () => {
    const { nextFrame } = h.useFakeAnimation();
    el.remove();
    el = document.createElement("wup-popup");
    el.$options.showCase = 0; // always
    el.$options.arrowEnable = true;
    el.$options.target = trg;
    document.body.appendChild(el);

    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup style="display: block; transform: translate(190px, 100px);" position="top"></wup-popup><wup-popup-arrow style="transform: translate(184px, 100px) rotate(0.1deg);"></wup-popup-arrow>"`
    );

    trg.parentElement.style.transform = "translate(-50%,-50%)";
    const rect = trg.getBoundingClientRect();
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValue({ ...rect, left: 0, x: 0 });
    const rectEl = el.getBoundingClientRect();
    jest.spyOn(el, "getBoundingClientRect").mockReturnValue({ ...rectEl, left: 19, x: 19 }); // simulate case when parent transform affects on positioning

    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup style="display: block; transform: translate(221px, 100px);" position="top"></wup-popup><wup-popup-arrow style="transform: translate(215px, 100px) rotate(0.1deg);"></wup-popup-arrow>"`
    );
  });
});
