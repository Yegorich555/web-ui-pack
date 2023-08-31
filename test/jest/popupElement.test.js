import { WUPPopupElement } from "web-ui-pack";
import { Animations, ShowCases } from "web-ui-pack/popup/popupElement.types";
import * as h from "../testHelper";

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
  h.setupLayout(document.body, { x: 0, y: 0, h: 400, w: 600 });

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

  trg = document.body.appendChild(document.createElement("div"));
  trg.append("some text");
  trg.setAttribute("id", "targetId");
  h.setupLayout(trg, { x: 140, y: 100, h: 50, w: 100 });

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
    h.baseTestComponent(() => document.createElement("wup-popup"), {
      attrs: {
        animation: { /* value: "drawer", parsedValue: 1, */ skip: true },
        placement: { value: "top-start", parsedValue: WUPPopupElement.$placementAttrs("top-start") },
        target: { /* value: "body", parsedValue: document.body, */ skip: true },
      },
    });
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

    a.$onShow = jest.fn();
    a.$onHide = jest.fn();
    a.$onWillShow = jest.fn();
    a.$onWillHide = jest.fn();

    expect(gotReady).toBeCalledTimes(0);
    expect(init).toBeCalledTimes(0);
    expect(show).toBeCalledTimes(0);
    expect(a.$isShown).toBe(false);
    expect(onShow).toBeCalledTimes(0);
    expect(onWillShow).toBeCalledTimes(0);

    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(gotReady).toBeCalledTimes(1);
    expect(init).toBeCalledTimes(1);
    expect(show).toBeCalledTimes(1); // showCase = always so expected element to show
    expect(a.$isShown).toBe(true);
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(a.$onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onWillShow).toBeCalledTimes(1);
    expect(a.$onWillShow).toBeCalledTimes(1);
    expect(onWillShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onHide).not.toBeCalled();
    expect(onWillHide).not.toBeCalled();

    // testing events
    a.$hide();
    expect(a.$isShown).toBe(false);
    jest.advanceTimersByTime(1);
    expect(onHide).toBeCalledTimes(1);
    expect(a.$onHide).toBeCalledTimes(1);
    expect(onWillHide).toBeCalledTimes(1);
    expect(a.$onWillHide).toBeCalledTimes(1);

    jest.clearAllMocks();
    const r = (e) => e.preventDefault();
    a.addEventListener("$willShow", r);
    a.$show();
    jest.advanceTimersByTime(1);
    expect(onWillShow).toBeCalledTimes(1);
    expect(a.$isShown).toBe(false); // because of prevented
    expect(onShow).not.toBeCalled();
    a.removeEventListener("$willShow", r); // remove event
    a.$show();
    await h.wait();
    expect(a.$isShown).toBe(true);
    expect(onShow).toBeCalled();

    a.addEventListener("$willHide", r);
    jest.clearAllMocks();
    a.$hide();
    jest.advanceTimersByTime(1);
    expect(onWillHide).toBeCalledTimes(1);
    expect(a.$isShown).toBe(true); // because of prevented
    expect(onHide).not.toBeCalled();
    a.removeEventListener("$willHide", r); // remove event
    a.$hide();
    jest.advanceTimersByTime(1);
    expect(a.$isShown).toBe(false);
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
    expect(a.$isShown).toBe(true);
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
    expect(onShow.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(a.$isShown).toBe(true);
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
    expect(a.$isShown).toBe(true);
    expect(a.$isShowing).toBe(false);
    a.$hide();
    expect(a.$isHidden).toBe(true);
    expect(a.$isHiding).toBe(false);
    onHide.mockClear();
    a.$options.target = null;
    const spyShow = jest.spyOn(a, "goShow").mockClear();
    const onErr = jest.fn();
    a.$show().catch(onErr);
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // to apply options - throw error because target is not defined
    expect(spyShow).toBeCalledTimes(2);
    expect(a.$isShown).toBe(false); // because target is not defined
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
    expect(a.$isShown).toBe(true);
    a.$options.showCase = 1 << 2; // onClick
    jest.advanceTimersToNextTimer(); // $options.onChanged has timeout
    expect(a.$isShown).toBe(false); // because option changed
    trg.click(); // checking if new showCase works
    await h.wait();
    expect(a.$isShown).toBe(true);
  });

  test("$options.showCase", async () => {
    /** @type typeof el */
    el = document.createElement(el.tagName);
    const spyShow = jest.spyOn(el, "goShow");
    const spyHide = jest.spyOn(el, "goHide");
    const trgInput = trg.appendChild(document.createElement("input"));

    document.body.appendChild(el);
    el.$options.showCase = 0b111111111;
    el.$options.target = trgInput; // only for testing
    await h.wait();
    expect(el.$isShown).toBe(false);

    // open by mouseenter-click-focus
    let ev = new MouseEvent("mouseenter", { bubbles: true });
    trgInput.dispatchEvent(ev);
    await h.wait(el.$options.hoverShowTimeout); // mouseenter has debounce timeout
    expect(el.$isShown).toBe(true);
    expect(spyShow).lastCalledWith(1, ev);
    trgInput.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    trgInput.focus();
    trgInput.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await h.wait(1); // wait for promise onShow is async
    expect(el.$isShown).toBe(true); // no changes in state
    trgInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.$isShown).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    await h.wait(1); // wait for promise onShow is async

    // close by blur
    spyHide.mockClear();
    trgInput.blur();
    await h.wait(1); // wait for promise onHide is async
    expect(el.$isShown).toBe(false); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyHide.mock.calls[0][0]).toBe(2);

    // close by mouseleave
    trgInput.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    await h.wait(el.$options.hoverShowTimeout); // mouseenter has debounce timeout
    expect(el.$isShown).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    ev = new MouseEvent("mouseleave", { bubbles: true });
    trgInput.dispatchEvent(ev);
    await h.wait(el.$options.hoverHideTimeout); // mouseenter has debounce timeout
    expect(el.$isShown).toBe(false); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyHide).lastCalledWith(1, ev);

    // open again by click
    ev = new MouseEvent("click", { bubbles: true });
    trgInput.dispatchEvent(ev);
    await h.wait();
    expect(el.$isShown).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyShow).lastCalledWith(1 << 2, ev);

    // close by click again
    await h.userClick(trgInput);
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(spyHide.mock.lastCall[0]).toBe(5);
    trgInput.blur();
    spyShow.mockClear();

    // for coverage
    el.$options.hoverHideTimeout = 10; // WARN: this time must be less 300ms (debounce for hover-click)
    el.init();
    trgInput.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(el.$options.hoverShowTimeout);
    trgInput.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(50);
    expect(el.$isShown).toBe(false);
    expect(el.$isOpen).toBe(false); // deprecate it

    el.remove();
    el.$hide();
    await h.wait();
    expect(el.$isShown).toBe(false); // because remmoved

    // alwaysOff
    document.body.innerHTML = "";
    el = document.createElement(el.tagName);
    document.body.appendChild(el);
    document.body.appendChild(trg);
    el.$options.showCase = ShowCases.alwaysOff;
    el.$options.target = trg;
    await h.wait();
    expect(el.$isShown).toBe(false);
    el.$show();
    await h.wait();
    expect(el.$isShown).toBe(true);
    el.$hide();
    await h.wait();
    expect(el.$isShown).toBe(false);
    // always
    el.$options.showCase = ShowCases.always;
    await h.wait();
    expect(el.$isShown).toBe(true);
    el.$hide();
    await h.wait();
    expect(el.$isShown).toBe(false);
    // alwaysOff & target missed
    el.$options.showCase = ShowCases.alwaysOff;
    el.$options.target = null;
    await h.wait();
    expect(el.$isShown).toBe(false);
    const onErr = jest.fn();
    el.$show().catch(onErr);
    await h.wait();
    expect(el.$options.target).toBeFalsy();
    expect(onErr).toBeCalledTimes(1);
    expect(el.$isShown).toBe(false);
  });

  test("$options.minWidth/minHeight/maxWidth by target", async () => {
    // just for coverage
    el = document.createElement(el.tagName);
    el.$options.showCase = 0; // always
    el.$options.minWidthByTarget = true;
    el.$options.minHeightByTarget = true;
    document.body.append(el);
    jest.spyOn(el.previousElementSibling, "getBoundingClientRect").mockReturnValue(trg.getBoundingClientRect());
    await h.wait();
    expect(el.style.minWidth).toBeTruthy();
    expect(el.style.minHeight).toBeTruthy();

    jest.clearAllTimers();
    const { nextFrame } = h.useFakeAnimation();
    el = document.createElement(el.tagName);
    el.$options.showCase = 0; // always
    el.style.minWidth = "1px";
    el.style.minHeight = "2px";
    el.$options.toFitElement = null;
    document.body.append(el);
    jest.spyOn(el.previousElementSibling, "getBoundingClientRect").mockReturnValue(trg.getBoundingClientRect());
    await h.wait();
    expect(el.style.minWidth).toBeFalsy(); // it's cleared because by default inline width not allowed
    expect(el.style.minHeight).toBeFalsy();
    // cover case when minWidth & minHeight is set previously by rule
    el.$refresh();
    el.style.minWidth = "1px";
    el.style.minHeight = "2px";
    await nextFrame();
    expect(el.style.minWidth).toBeFalsy();
    expect(el.style.minHeight).toBeFalsy();
    jest.clearAllTimers();

    el = document.createElement(el.tagName);
    el.$options.showCase = 0; // always
    el.$options.maxWidthByTarget = false;
    document.body.append(el);
    jest.spyOn(el.previousElementSibling, "getBoundingClientRect").mockReturnValue(trg.getBoundingClientRect());
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onShow/onHide is async
    expect(el.$isShown).toBe(true);
    expect(el.isConnected).toBe(true);
    // WARN: layout impossible to test with unit; all layout tests see in e2e
    expect(el.style.maxWidth).toBe("");

    el.$hide();
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onShow/onHide is async
    expect(el.$isShown).toBe(false);
    expect(el.isConnected).toBe(true);
    el.$options.maxWidthByTarget = true;
    el.$show();
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onShow/onHide is async
    // WARN: layout impossible to test with unit; all layout tests see in e2e
    expect(el.style.maxWidth).not.toBe("");
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
    el.$hide();
    await h.wait();

    el.$options.offset = (r) => [-r.height / 2, -r.height / 2]; // around center of target
    el.$show();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 125px);" position="top"></wup-popup>"`
    );

    WUPPopupElement.$defaults.offsetFitElement = undefined;
    WUPPopupElement.$defaults.offset = undefined;
  });

  test("$hide()/$show()", async () => {
    expect(el.$isShown).toBe(true);
    expect(el.$isHidden).toBe(false);

    el.$hide();
    expect(el.$isShown).toBe(false);
    expect(el.$isHidden).toBe(true);
    expect(el.$isShowing).toBe(false);
    expect(el.$isHiding).toBe(false);

    el.$show();
    expect(el.$isShown).toBe(true);
    expect(el.$isHidden).toBe(false);
    expect(el.$isShowing).toBe(false);
    expect(el.$isHiding).toBe(false);

    el.remove();
    el.$hide();
    el.$show();
    expect(el.$isShown).toBe(false);

    // check when showCase != 0
    jest.clearAllTimers();
    el.$options.showCase = 1 << 2; // onClick
    document.body.append(el);
    jest.advanceTimersToNextTimer(); // wait for ready
    trg.click();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onShow is async
    expect(el.$isShown).toBe(true); // checking if click-listener works
    el.$show();

    el.$show();
    trg.click();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onShow is async
    expect(el.$isShown).toBe(true); // checking if click-listener is off because was opened by manual $show
    el.$hide();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onShow is async
    jest.advanceTimersByTime(100); // click has debounce filter
    expect(el.$isShown).toBe(false); // checking if click-listener is off because was opened by manual $show
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter
    await Promise.resolve(); // wait for promise onShow is async
    expect(el.$isShown).toBe(true); // checking if events works again

    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.showCase = 0;
    document.body.append(a);
    expect(a.$isReady).toBe(false);
    expect(() => a.$hide()).not.toThrow();
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
    expect(a.$isShown).toBe(true);

    /** @type typeof el */
    const b = document.createElement(el.tagName);
    jest.spyOn(b, "goShow").mockImplementationOnce(() => false);
    b.$options.target = trg;
    document.body.appendChild(b);
    jest.advanceTimersByTime(1);
    trg.click();
    await h.wait();
    expect(b.$isShown).toBe(false);
    trg.click(); // click again (goShow is once => it's restored to previous)
    await h.wait();
    expect(b.$isShown).toBe(true);

    expect(() => b.$refresh()).not.toThrow();
    // other cases in test(`options.$target`) and test(`remove`)

    b.$hide();
    await h.wait();
    b.goHide(); // just for coverage
    expect(b.$isShown).toBe(false);
    expect(() => b.$refresh()).not.toThrow(); // for coverage
  });

  test("$options.animation: drawer", async () => {
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
    expect(el.$isShown).toBe(true); // because $hide is async
    await h.wait();
    expect(el.$isShown).toBe(false);
    el.$options.animation = Animations.drawer;
    el.$show();
    expect(el.$isShown).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top" animation="drawer"><div></div><div></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px) scaleY(0); transform-origin: bottom;" position="top" animation="drawer"><div></div><div></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px) scaleY(0.055555555555555566); transform-origin: bottom;" position="top" animation="drawer"><div style="transform: scaleY(17.999999999999996) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(17.999999999999996) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px) scaleY(0.1111111111111111); transform-origin: bottom;" position="top" animation="drawer"><div style="transform: scaleY(9) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    el.$hide();
    expect(el.$isShown).toBe(true); // because $hide is async
    await Promise.resolve();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px) scaleY(0.1111111111111111); transform-origin: bottom;" position="top" animation="drawer" hide=""><div style="transform: scaleY(9) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    await nextFrame(2);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px) scaleY(0.05555555555555553); transform-origin: bottom;" position="top" animation="drawer" hide=""><div style="transform: scaleY(18.000000000000007) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(18.000000000000007) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top" animation="drawer"><div style=""></div><div style=""></div></wup-popup>"`
    );
    await h.wait();
    await nextFrame();
    expect(el.$isShown).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top" animation="drawer"><div style=""></div><div style=""></div></wup-popup>"`
    );

    // animation to another side
    el.$options.placement = [WUPPopupElement.$placements.$bottom.$start.$adjust];
    await h.wait(); // options is async
    expect(el.$isShown).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 150px);" position="bottom" animation="drawer"><div style=""></div><div style=""></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 150px) scaleY(0); transform-origin: top;" position="bottom" animation="drawer"><div style=""></div><div style=""></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 150px) scaleY(0.055555555555555525); transform-origin: top;" position="bottom" animation="drawer"><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    // checking how it works if options is changed during the animation
    el.$options.placement = [WUPPopupElement.$placements.$top.$start.$adjust];
    await h.wait(); // options is async
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.055555555555555525); transform-origin: bottom; display: block;" position="top" animation="drawer"><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom; display: block;" position="top" animation="drawer"><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );
    el.$hide(); // force to hide during the show-animation
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom; display: block;" position="top" animation="drawer" hide=""><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.05555555555555543); transform-origin: bottom; display: block;" position="top" animation="drawer" hide=""><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );
    el.$show(); // force to show during the hide-animation
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.05555555555555543); transform-origin: bottom; display: block;" position="top" animation="drawer"><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom; display: block;" position="top" animation="drawer"><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    // checking when element is removed
    el.remove();
    await nextFrame();
    // WARN styles haven't been removed because expected that item destroyed
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px); display: block;" position="top" animation="drawer"><div style=""></div><div style=""></div></wup-popup>"`
    );

    // checking states
    document.body.append(el);
    expect(el.$isShown).toBe(false);
    expect(el.$isHidden).toBe(true);
    el.$show();
    await h.wait(50);
    expect(el.$isShown).toBe(true);
    expect(el.$isShowing).toBe(true);
    expect(el.$isHidden).toBe(false);
    expect(el.$isHiding).toBe(false);
    await nextFrame(100);
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$isShowing).toBe(false);
    expect(el.$isHidden).toBe(false);
    expect(el.$isHiding).toBe(false);

    el.$hide();
    await h.wait(50);
    expect(el.$isShown).toBe(true);
    expect(el.$isShowing).toBe(false);
    expect(el.$isHidden).toBe(false);
    expect(el.$isHiding).toBe(true);
    await nextFrame(100);
    expect(el.$isShown).toBe(false);
    expect(el.$isShowing).toBe(false);
    expect(el.$isHidden).toBe(true);
    expect(el.$isHiding).toBe(false);

    // show/hide in a short time
    el.$show();
    await h.wait(50);
    expect(el.$isShowing).toBe(true);
    expect(el.$isHiding).toBe(false);
    el.$hide();
    await h.wait(50);
    expect(el.$isShowing).toBe(false);
    expect(el.$isHiding).toBe(true);
    el.$show();
    await h.wait(50);
    expect(el.$isShowing).toBe(true);
    expect(el.$isHiding).toBe(false);
    await nextFrame(100);
    expect(el.$isShown).toBe(true);
    expect(el.$isShowing).toBe(false);
    expect(el.$isHidden).toBe(false);
    expect(el.$isHiding).toBe(false);

    // no new show-logic
    const spyThen = jest.fn();
    const spyWill = jest.fn();
    el.addEventListener("$willShow", spyWill);
    el.$show().then(spyThen);
    el.goShow(0); // just for coverage
    await h.wait(10);
    expect(spyThen).toBeCalledTimes(1); // because popup already isShowned
    expect(spyWill).toBeCalledTimes(0); // no new event

    // no new hide-logic
    spyThen.mockClear();
    spyWill.mockClear();
    el.$hide();
    el.goHide(0).then(spyThen); // just for coverage
    await nextFrame(100);
    expect(spyThen).toBeCalledTimes(1); // because popup already isHidden
    expect(el.$isHidden).toBe(true);

    el.addEventListener("$willHide", spyWill);
    el.$hide().then(spyThen);
    await h.wait(10);
    expect(spyThen).toBeCalledTimes(2); // because popup already isHidden
    expect(spyWill).toBeCalledTimes(0); // no new event

    // checking error when animTime is missed
    spyStyle.mockRestore();
    await h.wait();
    el.$hide();
    await h.wait();
    // checking with default: when browser prefers-reduced-motion = false
    jest.spyOn(window, "matchMedia").mockReturnValueOnce({ matches: true });
    el.$show();
    await h.wait();
    expect(el.$isShown).toBe(true);
    await nextFrame(); // no-animation expected
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(140px, 100px);" position="top" animation="drawer"><div style=""></div><div style=""></div></wup-popup>"`
    );
    h.unMockConsoleWarn();

    // testing attr
    el.setAttribute("animation", "default");
    await h.wait(1);
    expect(el.$options.animation).toBe(Animations.default);
    el.setAttribute("animation", "drawer");
    await h.wait(1);
    expect(el.$options.animation).toBe(Animations.drawer);
  });

  test("$options.animation: stack", async () => {
    // WARN: there is only code coverage. For full animation tests see helpers/animateStack
    const { nextFrame } = h.useFakeAnimation();
    el.$options.showCase = 0;
    el.$options.animation = Animations.stack;
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        /** @type CSSStyleDeclaration */
        return { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
      }
      return orig(elem);
    });
    el.innerHTML = "<ul><li>Item 1</li><li>Item 2</></ul>";

    // vertical
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    await nextFrame(2);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top" animation="stack"><ul style="overflow: visible; z-index: 0;"><li style="transition: transform 300ms ease-out;">Item 1</li><li style="transition: transform 300ms ease-out;">Item 2</li></ul></wup-popup>"`
    );
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul>"`);
    el.$hide();
    await nextFrame(50);

    // horizontal
    el.$options.placement = [WUPPopupElement.$placements.$left.$middle];
    el.$show();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul>"`);
    el.$hide();
    await nextFrame(50);

    // selector [item]
    el.innerHTML = "<div [items]><button>Item1</button><button>Item2</button></div>";
    el.$show();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<div [items]="" style=""><button style="">Item1</button><button style="">Item2</button></div>"`
    );
    el.$hide();
    await nextFrame(50);

    // root of popup
    el.innerHTML = "<button>Item1</button><button>Item2</button>";
    el.$show();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<button style="">Item1</button><button style="">Item2</button>"`);
    el.$hide();
    await nextFrame(50);

    // inside wrapper
    el.innerHTML = "<div><button>Item1</button><button>Item2</button></div>";
    el.$show();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<div style=""><button style="">Item1</button><button style="">Item2</button></div>"`
    );
    el.$hide();
    await nextFrame(50);

    // exclusion for single item
    el.innerHTML = "<button>Item1</button>";
    el.$show();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<button style="">Item1</button>"`);
    el.$hide();
    await nextFrame(50);

    // testing attr
    el.setAttribute("animation", "");
    await h.wait(1);
    expect(el.$options.animation).toBe(Animations.default);
    el.setAttribute("animation", "stack");
    await h.wait(1);
    expect(el.$options.animation).toBe(Animations.stack);
  });

  test("attr: target", async () => {
    el = document.createElement(el.tagName);
    el.$options.showCase = 0;
    document.body.prepend(el);
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because of target not defined
    jest.clearAllMocks();
    expect(el.$isShown).toBe(false);
    expect(el.$options.target == null).toBe(true);

    // attr 'target'
    el.setAttribute("target", `#${trg.getAttribute("id")}`);
    jest.advanceTimersToNextTimer();
    expect(el.$options.target).toBeDefined();
    expect(el.$isShown).toBe(true);

    el.setAttribute("target", "#not-found-id");
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because of target is defined but not HTMLELement
  });

  test("attr: placement", async () => {
    el.$hide();
    await h.wait();

    el.setAttribute("placement", "top-start");
    await h.wait();
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$top$start_adjust $bottom$start_adjust"`
    );
    el.setAttribute("placement", "top-middle");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$top$middle_adjust $bottom$middle_adjust"`
    );
    el.setAttribute("placement", "top-end");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$top$end_adjust $bottom$end_adjust"`
    );

    el.setAttribute("placement", "bottom-start");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$bottom$start_adjust $top$start_adjust"`
    );
    el.setAttribute("placement", "bottom-middle");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$bottom$middle_adjust $top$middle_adjust"`
    );
    el.setAttribute("placement", "bottom-end");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$bottom$end_adjust $top$end_adjust"`
    );

    el.setAttribute("placement", "left-start");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$left$start_adjust $right$start_adjust"`
    );
    el.setAttribute("placement", "left-middle");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$left$middle_adjust $right$middle_adjust"`
    );
    el.setAttribute("placement", "left-end");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$left$end_adjust $right$end_adjust"`
    );

    el.setAttribute("placement", "right-start");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$right$start_adjust $left$start_adjust"`
    );
    el.setAttribute("placement", "right-middle");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$right$middle_adjust $left$middle_adjust"`
    );
    el.setAttribute("placement", "right-end");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$right$end_adjust $left$end_adjust"`
    );

    el.removeAttribute("placement", "");
    await h.wait(1);
    expect(el.$options.placement).toStrictEqual(WUPPopupElement.$defaults.placement);
    expect(el.$options.placement).not.toBe(WUPPopupElement.$defaults.placement);

    el.setAttribute("placement", "---");
    await h.wait(1);
    expect(el.$options.placement).toStrictEqual(WUPPopupElement.$defaults.placement);
  });

  test("remove", async () => {
    const dispose = jest.spyOn(el, "dispose");
    expect(el.$isShown).toBe(true);
    el.remove();
    expect(dispose).toBeCalledTimes(1);
    expect(el.$isShown).toBe(false);
    expect(el.$isReady).toBe(false);

    // try to open when element not appended
    const onErr = jest.fn();
    el.$show().catch(onErr);
    expect(el.$isShown).toBe(false); // because $show() is async method
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // to apply options - throw error because popup isn't ready
    expect(el.$isReady).toBe(false);
    expect(el.$isShown).toBe(false); // because $show() is async method

    // try to append and open
    document.body.appendChild(el);
    jest.advanceTimersToNextTimer();
    expect(() => el.$show()).not.toThrow();
    expect(el.$isShown).toBe(true);
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
    expect(a.$isShown).toBe(false); // no events from target

    const called = spy.map((v) => v.on.mock.calls[0]).filter((v) => v);
    expect(called).not.toHaveLength(0); // test if event listeners were added

    trg.click(); // it will add extra events
    await h.wait(1);
    expect(a.$isShown).toBe(true);
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
    expect(a.$isShown).toBe(false);
    spy.check(); // checking if removed every listener that was added

    // checking target removed > event removed
    jest.clearAllMocks();
    trg.remove();
    document.body.appendChild(a);
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // error: Target must be appended to layout
    trg.click();
    await h.wait();
    expect(a.$isShown).toBe(false); // because target removed
    expect(() => a.goShow(0)).toThrow(); // error expected
    spy.check(); // checking if removed every listener that was added

    document.body.appendChild(trg);
    trg.click();
    await h.wait();
    expect(a.$isShown).toBe(false); // because target isn't appened before initPopup
    a.$options.target = null;
    a.$options.target = trg; // reassignTarget
    await h.wait();
    trg.click();
    await h.wait();
    expect(a.$isShown).toBe(true);

    spyFrameCancel.mockClear();
    // WARN: impossible to detect target removing
    // trg.remove();
    // expect(spyFrameCancel).toBeCalledTimes(1);
    // await h.wait();
    // await h.wait();
    // expect(a.$isShown).toBe(false);
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
    expect(a.$isShown).toBe(true);
  });

  test("position", async () => {
    expect(el.$isShown).toBe(true); // checking prev-state

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
    expect(el.$isShown).toBe(true); // checking prev-state

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
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(2000);
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(2000);
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return { minWidth: "2000px", minHeight: "2000px", animationDuration: "0s" };
      }
      return orig(elem);
    });
    (await expectIt([WUPPopupElement.$placements.$left.$start])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 1024px; max-height: 768px; transform: translate(112px, 0px);" position="right"></wup-popup>"`
    );
    expect(fn).toBeCalledTimes(1);

    el.$options.offsetFitElement = [2, 3, 4, 8];
    (await expectIt([WUPPopupElement.$placements.$left.$start])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 1024px; max-height: 768px; transform: translate(112px, 2px);" position="right"></wup-popup>"`
    );

    // case when user-style-size bigger then viewport size
    el.$hide();
    await h.wait();
    jest.clearAllTimers();
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        /** @type CSSStyleDeclaration */
        return { maxWidth: "3000px", maxHeight: "3000px", animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
      }
      return orig(elem);
    });
    (await expectIt([WUPPopupElement.$placements.$left.$start])).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 1024px; max-height: 768px; transform: translate(112px, 2px);" position="right"></wup-popup>"`
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
    expect(el.$isShown).toBe(true); // checking prev-state
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
    expect(popup.$isShown).toBe(true);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup style="display: block; transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );
    expect(cnt).toBe(1);
    expect(spyShow).toBeCalledTimes(1);
    expect(spyHide).toBeCalledTimes(0);

    trg.click(); // to hide
    await h.wait();
    expect(cnt).toBe(1);
    expect(popup.$isShown).toBe(false);
    expect(popup.isConnected).toBe(false);
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id="targetId">some text</div>"`);
    expect(spyShow).toBeCalledTimes(1);
    expect(spyHide).toBeCalledTimes(1);

    await h.wait();
    trg.click(); // to show again
    await h.wait();
    expect(popup.$isShown).toBe(true);
    expect(popup.isConnected).toBe(true);
    expect(cnt).toBe(2);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup style="display: block; transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );
    expect(spyShow).toBeCalledTimes(2);
    expect(spyHide).toBeCalledTimes(1);

    detach();
    expect(detach).not.toThrow(); // checking detach again
    expect(popup.$isShown).toBe(false);
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
    expect(popup.$isShown).toBe(false);
    detach();
    detach = WUPPopupElement.$attach({ target: trg, showCase: 1 << 2, text: "Me2", placement: [] }, (popupEl) => {
      popup = popupEl;
    });
    trg.click();
    await h.wait();
    expect(popup.$isShown).toBe(true);
    expect(popup.getAttribute("position")).not.toBe("bottom");
    jest.advanceTimersByTime(1000);
    popup.$options.placement = [WUPPopupElement.$placements.$bottom.$start.$adjust];
    jest.advanceTimersByTime(1000);
    expect(popup.$isShown).toBe(false); // changing options hides popup
    trg.click();
    await h.wait();
    expect(popup.$isShown).toBe(true);
    expect(popup.getAttribute("position")).toBe("bottom");

    // checking changing target
    const divRemove = document.body.appendChild(document.createElement("div"));
    const trg2 = divRemove.appendChild(document.createElement("button"));
    popup.$options.target = trg2;
    jest.advanceTimersByTime(1000);
    expect(popup.$isShown).toBe(false); // changing options hides popup
    trg.click();
    await h.wait();
    expect(popup.$isShown).toBe(false); // because target changed
    popup.$options.target.click();
    await h.wait();
    expect(popup.$isShown).toBe(true);

    // set target to null (for coverage)
    popup.$options.target = null;
    jest.advanceTimersByTime(1000);
    expect(popup.$isShown).toBe(false); // changing options hides popup
    expect(popup.$options.target).toBe(trg); // because it returns to previous
    trg2.click();
    await h.wait();
    expect(popup.$isShown).toBe(false); // because target changed
    trg.click();
    await h.wait();
    expect(popup.$isShown).toBe(true);

    // checking self-removing opened popup when target turns into removed
    let animateFrame;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => (animateFrame = fn));
    popup.$options.target = trg2;
    jest.advanceTimersByTime(1000);
    expect(popup.$isShown).toBe(false); // because target changed
    trg2.click();
    await h.wait();
    expect(popup.$isShown).toBe(true);
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
    expect(el.$isShown).toBe(false);

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
    expect(popup.$isShown).toBe(true);
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );

    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a2" };
    trg.click();
    await h.wait(1);
    expect(popup.$isShown).toBe(true); // because we are waiting for animation
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; transform: translate(190px, 100px);" position="top" hide="">Me</wup-popup>"`
    );
    await h.wait();
    expect(popup.$isShown).toBe(false);
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );

    objStyle = { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
    trg.click();
    await h.wait();
    expect(popup.$isShown).toBe(true);
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
    expect(el.$isShown).toBe(false);

    // checking ordinary behavior without animation
    trg.click();
    await h.wait();
    expect(el.$isShown).toBe(true);

    trg.click();
    await h.wait();
    expect(el.$isShown).toBe(false);

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
    expect(el.$isShown).toBe(true); // because open is sync method

    // hide
    trg.click();
    expect(el.$isShown).toBe(true); // because hide is async method
    await h.wait(50); // wait for 50ms
    expect(el.$isShown).toBe(true); // because hide waits for animation in 300ms

    // open
    trg.click(); // try open again when hide hasn't been finished yet
    expect(el.$isShown).toBe(true);
    await h.wait(50); // wait for 50ms
    expect(el.$isShown).toBe(true);

    // hide
    trg.click(); // try again when previous hide hasn't been finished yet but opened again
    expect(el.$isShown).toBe(true);
    await h.wait(50); // wait for 50ms
    expect(el.$isShown).toBe(true);
    await h.wait(1000);
    expect(el.$isShown).toBe(false);

    // checking if it works again
    trg.click(); // try to open again when previous hide hasn't been finished yet but opened again
    await h.wait();
    expect(el.$isShown).toBe(true);
    trg.click();
    await h.wait();
    expect(el.$isShown).toBe(false);
  });

  test("popup inside target", async () => {
    el.$options.showCase = 1 << 2;
    trg.appendChild(el);
    await h.wait();

    // click on popup > close popup
    await h.userClick(trg);
    await h.wait();
    expect(el.$isShown).toBe(true);
    await h.userClick(el);
    await h.wait();
    expect(el.$isShown).toBe(false);
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

  test("update on screesize changes", async () => {
    const { nextFrame } = h.useFakeAnimation();

    h.mockConsoleError(); // error on not-enough space
    expect(window.innerWidth).toBe(1024);
    expect(window.innerHeight).toBe(768);
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(2000);
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(2000);
    el.$options.placement = [WUPPopupElement.$placements.$left.$start];
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 1024px; max-height: 768px; transform: translate(240px, 0px);" position="right"></wup-popup>"`
    );

    const spyStyle = jest.spyOn(window, "getComputedStyle");
    await nextFrame();
    expect(spyStyle).toBeCalledTimes(0);

    // case on device rotation
    window.innerWidth = 600;
    window.innerHeight = 800;
    await nextFrame();
    expect(spyStyle).toBeCalledTimes(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 600px; max-height: 800px; transform: translate(0px, 0px);" position="top"></wup-popup>"`
    );

    window.innerHeight -= 80; // simulate mobile-keyboard opening
    await nextFrame();
    await nextFrame();
    expect(spyStyle).toBeCalledTimes(2);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="display: block; max-width: 600px; max-height: 720px; transform: translate(0px, 0px);" position="top"></wup-popup>"`
    );

    h.unMockConsoleError();
  });

  test("show/hide manually + listener", async () => {
    /** @type typeof el */
    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.target = trg;
    await h.wait();

    expect(el.$isShown).toBe(false);
    await h.userClick(trg); // open by listener
    await h.wait();
    expect(el.$isShown).toBe(true);
    el.$hide(); // hide manually
    await h.wait();
    expect(el.$isShown).toBe(false);
    await h.userClick(trg); // open by listener
    await h.wait();
    expect(el.$isShown).toBe(true);

    await h.userClick(trg); // open by listener
    await h.wait();
    expect(el.$isShown).toBe(false);
    el.$show();
    await h.wait();
    expect(el.$isShown).toBe(true);
    await h.userClick(trg); // open by listener
    await h.wait();
    expect(el.$isShown).toBe(false);
  });
});
