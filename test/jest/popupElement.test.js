import { WUPPopupElement } from "web-ui-pack";
import { PopupAnimations, PopupOpenCases, PopupCloseCases } from "web-ui-pack/popup/popupElement.types";
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
  el.$options.openCase = PopupOpenCases.onInit; // always
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
        "w-animation": { /* value: "drawer", parsedValue: 1, */ skip: true },
        "w-placement": { value: "top-start", parsedValue: WUPPopupElement.$placementAttrs("top-start") },
        "w-target": { /* value: "body", parsedValue: document.body, */ skip: true },
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
    a.$options.openCase = PopupOpenCases.onInit; // always
    a.$options.target = trg;

    const gotReady = jest.spyOn(a, "gotReady");
    const init = jest.spyOn(a, "init");
    const open = jest.spyOn(a, "goOpen");
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const onWillOpen = jest.fn();
    const onWillClose = jest.fn();

    a.addEventListener("$open", onOpen);
    a.addEventListener("$close", onClose);
    a.addEventListener("$willOpen", onWillOpen);
    a.addEventListener("$willClose", onWillClose);

    a.$onOpen = jest.fn();
    a.$onClose = jest.fn();
    a.$onWillOpen = jest.fn();
    a.$onWillClose = jest.fn();

    expect(gotReady).toBeCalledTimes(0);
    expect(init).toBeCalledTimes(0);
    expect(open).toBeCalledTimes(0);
    expect(a.$isOpened).toBe(false);
    expect(onOpen).toBeCalledTimes(0);
    expect(onWillOpen).toBeCalledTimes(0);

    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(gotReady).toBeCalledTimes(1);
    expect(init).toBeCalledTimes(1);
    expect(open).toBeCalledTimes(1); // openCase = always so expected element to open
    expect(a.$isOpened).toBe(true);
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(a.$onOpen).toBeCalledTimes(1);
    expect(onOpen.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onWillOpen).toBeCalledTimes(1);
    expect(a.$onWillOpen).toBeCalledTimes(1);
    expect(onWillOpen.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(onClose).not.toBeCalled();
    expect(onWillClose).not.toBeCalled();

    // testing events
    a.$close();
    await h.wait(1);
    expect(a.$isOpened).toBe(false);
    jest.advanceTimersByTime(1);
    expect(onClose).toBeCalledTimes(1);
    expect(a.$onClose).toBeCalledTimes(1);
    expect(onWillClose).toBeCalledTimes(1);
    expect(a.$onWillClose).toBeCalledTimes(1);

    jest.clearAllMocks();
    const r = (e) => e.preventDefault();
    a.addEventListener("$willOpen", r);
    a.$open();
    jest.advanceTimersByTime(1);
    expect(onWillOpen).toBeCalledTimes(1);
    expect(a.$isOpened).toBe(false); // because of prevented
    expect(onOpen).not.toBeCalled();
    a.removeEventListener("$willOpen", r); // remove event
    a.$open();
    await h.wait();
    expect(a.$isOpened).toBe(true);
    expect(onOpen).toBeCalled();

    a.addEventListener("$willClose", r);
    jest.clearAllMocks();
    a.$close();
    jest.advanceTimersByTime(1);
    expect(onWillClose).toBeCalledTimes(1);
    expect(a.$isOpened).toBe(true); // because of prevented
    expect(onClose).not.toBeCalled();
    a.removeEventListener("$willClose", r); // remove event
    a.$close();
    jest.advanceTimersByTime(1);
    expect(a.$isOpened).toBe(false);
    expect(onClose).toBeCalledTimes(1);
  });

  test("$options.target", async () => {
    /** @type typeof el */
    let a = document.createElement(el.tagName);
    a.$options.openCase = PopupOpenCases.onInit; // always
    const onOpen = jest.fn();
    const onClose = jest.fn();
    a.addEventListener("$open", onOpen);
    a.addEventListener("$close", onClose);

    document.body.appendChild(a); // event gotReady here
    jest.advanceTimersToNextTimer(); // onReady has timeout

    expect(a.$options.target).toBeDefined(); // target wasn't pointed but defined as previousSibling
    expect(a.$isOpened).toBe(true);
    await h.wait();
    expect(onOpen).toBeCalledTimes(1);
    expect(onOpen.mock.calls[0][0]).toBeInstanceOf(Event);
    expect(a.$isOpened).toBe(true);
    expect(onClose).not.toBeCalled();

    a.$options.target = null;
    a.remove();
    onOpen.mockClear();
    document.body.prepend(a); // prepend to previousElementSibling = null
    expect(a.previousElementSibling).toBeNull();
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // onReady has timeout and it throws exception
    expect(onOpen).not.toBeCalled(); // because target is null

    // onClose expected by $open-success > $open-failed
    h.handleRejection(); // target is not defined and in this case observer gets exception from callback
    a.$options.target = trg;
    a.$open();
    await h.wait(1);
    expect(a.$isOpened).toBe(true);
    expect(a.$isOpening).toBe(false);
    a.$close();
    await h.wait();
    expect(a.$isClosed).toBe(true);
    expect(a.$isClosing).toBe(false);
    onClose.mockClear();
    a.$options.target = null;
    const spyOpen = jest.spyOn(a, "goOpen").mockClear();
    const onErr = jest.fn();
    a.$open().catch(onErr);
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // to apply options - throw error because target is not defined
    expect(spyOpen).toBeCalledTimes(2);
    expect(a.$isOpened).toBe(false); // because target is not defined
    jest.advanceTimersToNextTimer(); // onClose has timeout
    // expect(onClose).toBeCalledTimes(1); // because it was opened with target and hidden with the next open without target

    // try createElement when target is null by init
    a.removeEventListener("$open", onOpen);
    onOpen.mockClear();
    /** @type typeof el */
    a = document.createElement(el.tagName);
    a.addEventListener("$open", onOpen);
    a.$options.openCase = PopupOpenCases.onInit;
    document.body.prepend(a); // prepend to previousElementSibling = null
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // onReady has timeout; throw error because target is not defined
    expect(onOpen).not.toBeCalled(); // because target is null

    // check if changing on the fly >>> reinit event
    a.$options.target = trg;
    jest.advanceTimersToNextTimer(); // $options.onChanged has timeout
    expect(a.$isOpened).toBe(true);
    a.$options.openCase = PopupOpenCases.onClick; // onClick
    await h.wait(2); // $options.onChanged has timeout
    expect(a.$isOpened).toBe(false); // because option changed
    trg.click(); // checking if new openCase works
    await h.wait();
    expect(a.$isOpened).toBe(true);
  });

  test("$options.openCase", async () => {
    /** @type typeof el */
    el = document.createElement(el.tagName);
    const spyOpen = jest.spyOn(el, "goOpen");
    const spyClose = jest.spyOn(el, "goClose");
    const trgInput = trg.appendChild(document.createElement("input"));

    document.body.appendChild(el);
    el.$options.openCase = 0b111111111;
    el.$options.target = trgInput; // only for testing
    await h.wait();
    expect(el.$isOpened).toBe(false);

    // open by mouseenter-click-focus
    let ev = new MouseEvent("mouseenter", { bubbles: true });
    trgInput.dispatchEvent(ev);
    await h.wait(el.$options.hoverOpenTimeout); // mouseenter has debounce timeout
    expect(el.$isOpened).toBe(true);
    expect(spyOpen).lastCalledWith(PopupOpenCases.onHover, ev);
    trgInput.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    trgInput.focus();
    trgInput.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await h.wait(1); // wait for promise onOpen is async
    expect(el.$isOpened).toBe(true); // no changes in state
    trgInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.$isOpened).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    await h.wait(1); // wait for promise onOpen is async

    // close by blur
    spyClose.mockClear();
    trgInput.blur();
    await h.wait(1); // wait for promise onClose is async
    expect(el.$isOpened).toBe(false); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyClose.mock.calls[0][0]).toBe(2);

    // close by mouseleave
    trgInput.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    await h.wait(el.$options.hoverOpenTimeout + 10); // mouseenter has debounce timeout
    expect(el.$isOpened).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    ev = new MouseEvent("mouseleave", { bubbles: true });
    trgInput.dispatchEvent(ev);
    await h.wait(el.$options.hoverCloseTimeout + 10); // mouseenter has debounce timeout
    expect(el.$isOpened).toBe(false); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyClose).lastCalledWith(PopupCloseCases.onMouseLeave, ev);

    // open again by click
    ev = new MouseEvent("click", { bubbles: true });
    trgInput.dispatchEvent(ev);
    await h.wait();
    expect(el.$isOpened).toBe(true); // because wasOpened by onHover and can be hidden by focusLost or mouseLeave
    expect(spyOpen).lastCalledWith(PopupOpenCases.onClick, ev);

    // close by click again
    await h.userClick(trgInput);
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(spyClose.mock.lastCall[0]).toBe(5);
    trgInput.blur();
    spyOpen.mockClear();

    // for coverage
    el.$options.hoverCloseTimeout = 10; // WARN: this time must be less 300ms (debounce for hover-click)
    el.init();
    trgInput.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(el.$options.hoverOpenTimeout);
    trgInput.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(50);
    expect(el.$isOpened).toBe(false);

    el.remove();
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false); // because remmoved

    // alwaysOff
    document.body.innerHTML = "";
    el = document.createElement(el.tagName);
    document.body.appendChild(el);
    document.body.appendChild(trg);
    el.$options.openCase = PopupOpenCases.onManualCall;
    el.$options.target = trg;
    await h.wait();
    expect(el.$isOpened).toBe(false);
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    // always
    el.$options.openCase = PopupOpenCases.onInit;
    await h.wait();
    expect(el.$isOpened).toBe(true);
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    // alwaysOff & target missed
    el.$options.openCase = PopupOpenCases.onManualCall;
    el.$options.target = null;
    await h.wait();
    expect(el.$isOpened).toBe(false);
    const onErr = jest.fn();
    el.$open().catch(onErr);
    await h.wait();
    expect(el.$options.target).toBeFalsy();
    expect(onErr).toBeCalledTimes(1);
    expect(el.$isOpened).toBe(false);
  });

  test("$options.minWidth/minHeight/maxWidth by target", async () => {
    // just for coverage
    el = document.createElement(el.tagName);
    el.$options.openCase = PopupOpenCases.onInit; // always
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
    el.$options.openCase = PopupOpenCases.onInit; // always
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
    el.$options.openCase = PopupOpenCases.onInit; // always
    el.$options.maxWidthByTarget = false;
    document.body.append(el);
    jest.spyOn(el.previousElementSibling, "getBoundingClientRect").mockReturnValue(trg.getBoundingClientRect());
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onOpen/onClose is async
    expect(el.$isOpened).toBe(true);
    expect(el.isConnected).toBe(true);
    // WARN: layout impossible to test with unit; all layout tests see in e2e
    expect(el.style.maxWidth).toBe("");

    el.$close();
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onOpen/onClose is async
    expect(el.$isOpened).toBe(false);
    expect(el.isConnected).toBe(true);
    el.$options.maxWidthByTarget = true;
    el.$open();
    jest.advanceTimersByTime(1000); // wait for ready/init
    await Promise.resolve(); // onOpen/onClose is async
    // WARN: layout impossible to test with unit; all layout tests see in e2e
    expect(el.style.maxWidth).not.toBe("");
  });

  test("$options.offsetFitElement", async () => {
    el.$options.offsetFitElement = [1, 1];
    el.$open();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" show=""></wup-popup>"`
    );

    el.$options.offsetFitElement = [2, 3, 4, 8];
    el.$open();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" show=""></wup-popup>"`
    );

    el.$options.offsetFitElement = undefined;
    el.$open();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" show=""></wup-popup>"`
    );

    WUPPopupElement.$defaults.offsetFitElement = [2, 2];
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$open();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" show=""></wup-popup>"`
    );

    WUPPopupElement.$defaults.offset = [1, 1];
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.target = trg;
    el.$open();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 99px);" position="top" show=""></wup-popup>"`
    );
    el.$close();
    await h.wait();

    el.$options.offset = (r) => [-r.height / 2, -r.height / 2]; // around center of target
    el.$open();
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 125px);" position="top" open="" show=""></wup-popup>"`
    );

    WUPPopupElement.$defaults.offsetFitElement = undefined;
    WUPPopupElement.$defaults.offset = undefined;
  });

  test("$close()/$open()", async () => {
    expect(el.$isOpened).toBe(true);
    expect(el.$isClosed).toBe(false);

    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$isClosed).toBe(true);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosing).toBe(false);

    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(el.$isClosed).toBe(false);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosing).toBe(false);

    el.remove();
    el.$close();
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(false);

    // check when openCase != 0
    jest.clearAllTimers();
    el.$options.openCase = PopupOpenCases.onClick; // onClick
    document.body.append(el);
    jest.advanceTimersToNextTimer(); // wait for ready
    trg.click();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onOpen is async
    expect(el.$isOpened).toBe(true); // checking if click-listener works
    el.$open();

    el.$open();
    trg.click();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onOpen is async
    expect(el.$isOpened).toBe(true); // checking if click-listener is off because was opened by manual $open
    el.$close();
    jest.advanceTimersByTime(1000); // click has debounce filter
    await Promise.resolve(); // wait for promise onOpen is async
    jest.advanceTimersByTime(100); // click has debounce filter
    expect(el.$isOpened).toBe(false); // checking if click-listener is off because was opened by manual $open
    trg.click();
    jest.advanceTimersByTime(100); // click has debounce filter
    await Promise.resolve(); // wait for promise onOpen is async
    expect(el.$isOpened).toBe(true); // checking if events works again

    /** @type typeof el */
    const a = document.createElement(el.tagName);
    a.$options.openCase = PopupOpenCases.onInit;
    document.body.append(a);
    expect(a.$isReady).toBe(false);
    expect(() => a.$close()).not.toThrow();
    jest.advanceTimersByTime(1);

    // test timeouts inside $open
    a.remove();
    const onErr = jest.fn();
    a.$open().catch(onErr);
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // to apply options - throw error because popup isn't ready
    a.$open();
    document.body.append(a);
    await h.wait();
    expect(a.$isOpened).toBe(true);

    /** @type typeof el */
    const b = document.createElement(el.tagName);
    jest.spyOn(b, "goOpen").mockImplementationOnce(() => false);
    b.$options.target = trg;
    document.body.appendChild(b);
    jest.advanceTimersByTime(1);
    trg.click();
    await h.wait();
    expect(b.$isOpened).toBe(false);
    trg.click(); // click again (goOpen is once => it's restored to previous)
    await h.wait();
    expect(b.$isOpened).toBe(true);

    expect(() => b.$refresh()).not.toThrow();
    // other cases in test(`options.$target`) and test(`remove`)

    b.$close();
    await h.wait();
    b.goClose(); // just for coverage
    expect(b.$isOpened).toBe(false);
    expect(() => b.$refresh()).not.toThrow(); // for coverage
  });

  test("$options.animation: drawer", async () => {
    const { nextFrame } = h.useFakeAnimation();
    el.$options.openCase = PopupOpenCases.onInit;
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top"></wup-popup>"`
    );

    el.appendChild(document.createElement("div"));
    el.appendChild(document.createElement("div"));
    const spyStyle = h.setupCssCompute(el, { transitionDuration: "0.3s", animationDuration: "0.3s" });

    el.$close();
    expect(el.$isOpened).toBe(true); // because $close is async
    await h.wait();
    expect(el.$isOpened).toBe(false);
    el.$options.animation = PopupAnimations.drawer;
    el.$open();
    expect(el.$isOpened).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px); opacity: 0;" position="top" open="" w-animation="drawer"><div></div><div></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0); transform-origin: bottom;" position="top" open="" w-animation="drawer" show=""><div></div><div></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0.055555555555555566); transform-origin: bottom;" position="top" open="" w-animation="drawer" show=""><div style="transform: scaleY(17.999999999999996) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(17.999999999999996) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0.1111111111111111); transform-origin: bottom;" position="top" open="" w-animation="drawer" show=""><div style="transform: scaleY(9) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    el.$close();
    expect(el.$isOpened).toBe(true); // because $close is async
    await Promise.resolve();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0.1111111111111111); transform-origin: bottom;" position="top" open="" w-animation="drawer"><div style="transform: scaleY(9) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    await nextFrame(2);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px) scaleY(0.05555555555555553); transform-origin: bottom;" position="top" open="" w-animation="drawer"><div style="transform: scaleY(18.000000000000007) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(18.000000000000007) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top" w-animation="drawer"><div></div><div></div></wup-popup>"`
    );
    await h.wait();
    await nextFrame();
    expect(el.$isOpened).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top" w-animation="drawer"><div></div><div></div></wup-popup>"`
    );

    // animation to another side
    el.$options.placement = [WUPPopupElement.$placements.$bottom.$start.$adjust];
    await h.wait(); // options is async
    expect(el.$isOpened).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 150px);" position="bottom" w-animation="drawer" open="" show=""><div></div><div></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 150px) scaleY(0); transform-origin: top;" position="bottom" w-animation="drawer" open="" show=""><div></div><div></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 150px) scaleY(0.055555555555555525); transform-origin: top;" position="bottom" w-animation="drawer" open="" show=""><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: bottom;"></div><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: bottom;"></div></wup-popup>"`
    );

    // checking how it works if options is changed during the animation
    el.$options.placement = [WUPPopupElement.$placements.$top.$start.$adjust];
    await h.wait(); // options is async
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.055555555555555525); transform-origin: bottom;" position="top" w-animation="drawer" open="" show=""><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(18.00000000000001) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom;" position="top" w-animation="drawer" open="" show=""><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );
    el.$close(); // force to close during the open-animation
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom;" position="top" w-animation="drawer" open=""><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.05555555555555543); transform-origin: bottom;" position="top" w-animation="drawer" open=""><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );
    el.$open(); // force to open during the hide-animation
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.05555555555555543); transform-origin: bottom;" position="top" w-animation="drawer" open="" show=""><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(18.000000000000043) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px) scaleY(0.11111111111111105); transform-origin: bottom;" position="top" w-animation="drawer" open="" show=""><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div><div style="transform: scaleY(9.000000000000005) translateZ(0px); transform-origin: top;"></div></wup-popup>"`
    );

    // checking when element is removed
    el.remove();
    await nextFrame();
    // WARN styles haven't been removed because expected that item destroyed
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px);" position="top" w-animation="drawer" show=""><div></div><div></div></wup-popup>"`
    );

    // checking states
    document.body.append(el);
    expect(el.$isOpened).toBe(false);
    expect(el.$isClosed).toBe(true);
    el.$open();
    await h.wait(50);
    expect(el.$isOpened).toBe(true);
    expect(el.$isOpening).toBe(true);
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(false);
    await nextFrame(100);
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(false);

    el.$close();
    await h.wait(50);
    expect(el.$isOpened).toBe(true);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(true);
    await nextFrame(100);
    expect(el.$isOpened).toBe(false);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosed).toBe(true);
    expect(el.$isClosing).toBe(false);

    // open/close in a short time
    el.$open();
    await h.wait(50);
    expect(el.$isOpening).toBe(true);
    expect(el.$isClosing).toBe(false);
    el.$close();
    await h.wait(50);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosing).toBe(true);
    el.$open();
    await h.wait(50);
    expect(el.$isOpening).toBe(true);
    expect(el.$isClosing).toBe(false);
    await nextFrame(100);
    expect(el.$isOpened).toBe(true);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(false);

    // no new open-logic
    const spyThen = jest.fn();
    const spyWill = jest.fn();
    el.addEventListener("$willOpen", spyWill);
    el.$open().then(spyThen);
    el.goOpen(0); // just for coverage
    await h.wait(10);
    expect(spyThen).toBeCalledTimes(1); // because popup already isOpeneded
    expect(spyWill).toBeCalledTimes(0); // no new event

    // no new hide-logic
    spyThen.mockClear();
    spyWill.mockClear();
    el.$close();
    el.goClose(0).then(spyThen); // just for coverage
    await nextFrame(100);
    expect(spyThen).toBeCalledTimes(1); // because popup already isHidden
    expect(el.$isClosed).toBe(true);

    el.addEventListener("$willClose", spyWill);
    el.$close().then(spyThen);
    await h.wait(10);
    expect(spyThen).toBeCalledTimes(2); // because popup already isHidden
    expect(spyWill).toBeCalledTimes(0); // no new event

    // checking error when animTime is missed
    spyStyle.mockRestore();
    await h.wait();
    el.$close();
    await h.wait();
    // checking with default: when browser prefers-reduced-motion = false
    jest.spyOn(window, "matchMedia").mockReturnValueOnce({ matches: true });
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    await nextFrame(); // no-animation expected
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(140px, 100px);" position="top" w-animation="drawer" open="" show=""><div></div><div></div></wup-popup>"`
    );
    h.unMockConsoleWarn();

    // testing attr
    el.setAttribute("w-animation", "default");
    await h.wait(1);
    expect(el.$options.animation).toBe(PopupAnimations.default);
    el.setAttribute("w-animation", "drawer");
    await h.wait(1);
    expect(el.$options.animation).toBe(PopupAnimations.drawer);
  });

  test("$options.animation: stack", async () => {
    // WARN: there is only code coverage. For full animation tests see helpers/animateStack
    const { nextFrame } = h.useFakeAnimation();
    el.$options.openCase = PopupOpenCases.onInit;
    el.$options.animation = PopupAnimations.stack;
    h.setupCssCompute(el, { transitionDuration: "0.3s", animationDuration: "0.3s" });
    el.innerHTML = "<ul><li>Item 1</li><li>Item 2</></ul>";

    // vertical
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    await nextFrame(2);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" w-animation="stack" show=""><ul style="overflow: visible; z-index: 0;"><li style="transition: transform 300ms ease-out;">Item 1</li><li style="transition: transform 300ms ease-out;">Item 2</li></ul></wup-popup>"`
    );
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<ul><li>Item 1</li><li>Item 2</li></ul>"`);
    el.$close();
    await nextFrame(50);

    // horizontal
    el.$options.placement = [WUPPopupElement.$placements.$left.$middle];
    el.$open();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<ul><li>Item 1</li><li>Item 2</li></ul>"`);
    el.$close();
    await nextFrame(50);

    // selector [item]
    el.innerHTML = "<div [items]><button>Item1</button><button>Item2</button></div>";
    el.$open();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<div [items]=""><button>Item1</button><button>Item2</button></div>"`);
    el.$close();
    await nextFrame(50);

    // root of popup
    el.innerHTML = "<button>Item1</button><button>Item2</button>";
    el.$open();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<button>Item1</button><button>Item2</button>"`);
    el.$close();
    await nextFrame(50);

    // inside wrapper
    el.innerHTML = "<div><button>Item1</button><button>Item2</button></div>";
    el.$open();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<div><button>Item1</button><button>Item2</button></div>"`);
    el.$close();
    await nextFrame(50);

    // exclusion for single item
    el.innerHTML = "<button>Item1</button>";
    el.$open();
    await nextFrame(50);
    expect(el.innerHTML).toMatchInlineSnapshot(`"<button>Item1</button>"`);
    el.$close();
    await nextFrame(50);

    // testing attr
    el.setAttribute("w-animation", "");
    await h.wait(1);
    expect(el.$options.animation).toBe(PopupAnimations.default);
    el.setAttribute("w-animation", "stack");
    await h.wait(1);
    expect(el.$options.animation).toBe(PopupAnimations.stack);
  });

  test("attr: target", async () => {
    el = document.createElement(el.tagName);
    el.$options.openCase = PopupOpenCases.onInit;
    document.body.prepend(el);
    // await h.wait();
    await expect(h.wait()).rejects.toThrow(); // because of target not defined
    jest.clearAllMocks();
    expect(el.$options.target).toBeFalsy();
    expect(el.$isOpened).toBe(false);

    // attr 'target'
    el.setAttribute("w-target", `#${trg.getAttribute("id")}`);
    jest.advanceTimersToNextTimer();
    expect(el.$options.target).toBeDefined();
    expect(el.$isOpened).toBe(true);

    el.setAttribute("w-target", "#not-found-id");
    await expect(h.wait()).rejects.toThrow(); // because of target is defined but not HTMLELement
  });

  test("attr: placement", async () => {
    el.$close();
    await h.wait();

    el.setAttribute("w-placement", "top-start");
    await h.wait();
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$top$start_adjust $bottom$start_adjust"`
    );
    el.setAttribute("w-placement", "top-middle");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$top$middle_adjust $bottom$middle_adjust"`
    );
    el.setAttribute("w-placement", "top-end");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$top$end_adjust $bottom$end_adjust"`
    );

    el.setAttribute("w-placement", "bottom-start");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$bottom$start_adjust $top$start_adjust"`
    );
    el.setAttribute("w-placement", "bottom-middle");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$bottom$middle_adjust $top$middle_adjust"`
    );
    el.setAttribute("w-placement", "bottom-end");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$bottom$end_adjust $top$end_adjust"`
    );

    el.setAttribute("w-placement", "left-start");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$left$start_adjust $right$start_adjust"`
    );
    el.setAttribute("w-placement", "left-middle");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$left$middle_adjust $right$middle_adjust"`
    );
    el.setAttribute("w-placement", "left-end");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$left$end_adjust $right$end_adjust"`
    );

    el.setAttribute("w-placement", "right-start");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$right$start_adjust $left$start_adjust"`
    );
    el.setAttribute("w-placement", "right-middle");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$right$middle_adjust $left$middle_adjust"`
    );
    el.setAttribute("w-placement", "right-end");
    await h.wait(1);
    expect(el.$options.placement.map((a) => a.name).join(" ")).toMatchInlineSnapshot(
      `"$right$end_adjust $left$end_adjust"`
    );

    el.removeAttribute("w-placement", "");
    await h.wait(1);
    expect(el.$options.placement).toStrictEqual(WUPPopupElement.$defaults.placement);
    expect(el.$options.placement).not.toBe(WUPPopupElement.$defaults.placement);

    el.setAttribute("w-placement", "---");
    await h.wait(1);
    expect(el.$options.placement).toStrictEqual(WUPPopupElement.$defaults.placement);
  });

  test("remove", async () => {
    const dispose = jest.spyOn(el, "dispose");
    expect(el.$isOpened).toBe(true);
    el.remove();
    expect(dispose).toBeCalledTimes(1);
    expect(el.$isOpened).toBe(false);
    expect(el.$isReady).toBe(false);

    // try to open when element not appended
    const onErr = jest.fn();
    el.$open().catch(onErr);
    expect(el.$isOpened).toBe(false); // because $open() is async method
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // to apply options - throw error because popup isn't ready
    expect(el.$isReady).toBe(false);
    expect(el.$isOpened).toBe(false); // because $open() is async method

    // try to append and open
    document.body.appendChild(el);
    jest.advanceTimersToNextTimer();
    expect(() => el.$open()).not.toThrow();
    expect(el.$isOpened).toBe(true);
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
    a.$options.openCase = 0b11111111; // all
    document.body.appendChild(a);
    jest.advanceTimersToNextTimer(); // onReady has timeout
    expect(a.$isOpened).toBe(false); // no events from target

    const called = spy.map((v) => v.on.mock.calls[0]).filter((v) => v);
    expect(called).not.toHaveLength(0); // test if event listeners were added

    trg.click(); // it will add extra events
    await h.wait(1);
    expect(a.$isOpened).toBe(true);
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
    expect(a.$isOpened).toBe(false);
    spy.check(); // checking if removed every listener that was added

    // checking target removed > event removed
    jest.clearAllMocks();
    trg.remove();
    document.body.appendChild(a);
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // error: Target must be appended to layout
    trg.click();
    await h.wait();
    expect(a.$isOpened).toBe(false); // because target removed
    expect(() => a.goOpen(0)).toThrow(); // error expected
    spy.check(); // checking if removed every listener that was added

    document.body.appendChild(trg);
    trg.click();
    await h.wait();
    expect(a.$options.target).toBe(trg);
    expect(a.$isOpened).toBe(true);

    spyFrameCancel.mockClear();
    // WARN: impossible to detect target removing
    // trg.remove();
    // expect(spyFrameCancel).toBeCalledTimes(1);
    // await h.wait();
    // await h.wait();
    // expect(a.$isOpened).toBe(false);
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
    expect(a.$isOpened).toBe(true);
  });

  test("position", async () => {
    expect(el.$isOpened).toBe(true); // checking prev-state

    const expectIt = (placement) => {
      el.$options.placement = placement ? [placement] : [];
      jest.advanceTimersByTime(10);
      // eslint-disable-next-line jest/valid-expect
      return expect(el.outerHTML);
    };

    expectIt(WUPPopupElement.$placements.$top.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(140px, 100px);" position="top" show=""></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" show=""></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(240px, 100px);" position="top" show=""></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$bottom.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(140px, 150px);" position="bottom" show=""></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 150px);" position="bottom" show=""></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(240px, 150px);" position="bottom" show=""></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$left.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(140px, 100px);" position="left" show=""></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(140px, 125px);" position="left" show=""></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(140px, 150px);" position="left" show=""></wup-popup>"`
    );

    expectIt(WUPPopupElement.$placements.$right.$start.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(240px, 100px);" position="right" show=""></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$middle.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(240px, 125px);" position="right" show=""></wup-popup>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(240px, 150px);" position="right" show=""></wup-popup>"`
    );

    // checking if $placements.$right == $placements.$right.middle etc.
    expectIt(WUPPopupElement.$placements.$right).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(240px, 125px);" position="right" show=""></wup-popup>"`
    );

    expectIt().toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" show=""></wup-popup>"`
    );
  });

  test("position alt", async () => {
    // checking alt when no space
    expect(el.$isOpened).toBe(true); // checking prev-state

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
      `"<wup-popup open="" style="transform: translate(140px, 50px);" position="bottom" show=""></wup-popup>"`
    );

    // just for coverage: tesing ignoreAlign in popupAdjustInternal()
    // el.style.minHeight = "10px"; // watchfix: https://github.com/jsdom/jsdom/issues/2986
    const orig = window.getComputedStyle;
    let overflowX = "auto";
    let overflowY = "auto";
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return {
          minWidth: "10px",
          minHeight: "10px",
          overflowX,
          overflowY,
          animationDuration: "0s",
          transitionDuration: "0s",
        };
      }
      return orig(elem);
    });

    (await expectIt([WUPPopupElement.$placements.$top.$start])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 50px);" position="bottom" show=""></wup-popup>"`
    );

    // cover calc maxHeight by freeHeight in popupAdjustInternal()
    y = 11; // so freeH < me.H but freeH > minHeight
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y + 1);
    trgRect.y = y;
    trgRect.top = y;
    trgRect.bottom = height + y;
    // expected bottom.middle position because at left/top not enough space
    (await expectIt([WUPPopupElement.$placements.$top.$start.$adjust])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 61px);" position="bottom" show=""></wup-popup>"`
    );

    // checking $resizeHeight - expected $top.$start with maxHeight
    (await expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-height: 11px; transform: translate(140px, 0px);" position="top" show=""></wup-popup>"`
    );
    // checking maxHeight inheritance
    const divH = el.appendChild(document.createElement("div"));
    overflowY = "visible";
    (await expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-height: 11px; transform: translate(140px, 0px);" position="top" show=""><div style="max-height: 11px;"></div></wup-popup>"`
    );
    divH.remove();

    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(y);
    // expected $top.$start without maxHeight because height == freeH
    (await expectIt([WUPPopupElement.$placements.$top.$start.$adjust.$resizeHeight])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(140px, 0px);" position="top" show=""></wup-popup>"`
    );
    // expected $top.$start with maxHeight
    (await expectIt([WUPPopupElement.$placements.$top.$start.$resizeHeight])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(140px, 0px);" position="top" show=""></wup-popup>"`
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
      `"<wup-popup open="" style="transform: translate(56px, 61px);" position="bottom" show=""></wup-popup>"`
    );
    expect(positionIsInteger()).toEqual({ left: "int", top: "int" });

    // checking $resizeWidth - expected left.start with maxWidth
    (await expectIt([WUPPopupElement.$placements.$left.$start.$adjust.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 12px; transform: translate(0px, 11px);" position="left" show=""></wup-popup>"`
    );

    // checking maxHeight inheritance
    const divW = el.appendChild(document.createElement("div"));
    overflowX = "visible";
    (await expectIt([WUPPopupElement.$placements.$left.$start.$adjust.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 12px; transform: translate(0px, 11px);" position="left" show=""><div style="max-width: 12px;"></div></wup-popup>"`
    );
    divW.remove();

    (await expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 12px; transform: translate(0px, 11px);" position="left" show=""></wup-popup>"`
    );

    // cover case when maxWidth affects on height
    jest.spyOn(el, "offsetHeight", "get").mockImplementation(() => {
      if (el.style.maxWidth) {
        return document.body.clientHeight;
      }
      return y + 1;
    });
    (await expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(56px, 61px);" position="bottom" show=""></wup-popup>"`
    );
    expect(positionIsInteger()).toEqual({ left: "int", top: "int" });
    // cover case when maxWidthByTarget=true
    el.$options.maxWidthByTarget = true;
    (await expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 100px; transform: translate(112px, 0px);" position="right" show=""></wup-popup>"`
    );
    el.$options.maxWidthByTarget = false;
    (await expectIt([WUPPopupElement.$placements.$left.$start.$resizeWidth])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(56px, 61px);" position="bottom" show=""></wup-popup>"`
    );

    // test case when not enough space
    const fn = h.mockConsoleError();
    jest.clearAllTimers();
    // h.setupLayout(el, { h: 2000, w: 2000, y: 0, x: 0 });
    // h.setupCssCompute(el, { minWidth: "2000px", minHeight: "2000px", transitionDuration: "0s" });
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(2000);
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(2000);
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return { minWidth: "2000px", minHeight: "2000px", animationDuration: "0s", transitionDuration: "0s" };
      }
      return orig(elem);
    });
    (await expectIt([WUPPopupElement.$placements.$left.$start])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 1024px; max-height: 768px; transform: translate(112px, 0px);" position="right" show=""></wup-popup>"`
    );
    expect(fn).toBeCalledTimes(1);

    el.$options.offsetFitElement = [2, 3, 4, 8];
    (await expectIt([WUPPopupElement.$placements.$left.$start])).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 1024px; max-height: 768px; transform: translate(112px, 2px);" position="right" show=""></wup-popup>"`
    );

    // case when user-style-size bigger then viewport size
    el.$close();
    await h.wait();
    jest.clearAllTimers();
    h.setupCssCompute(el, {
      animationDuration: "0.3s",
      transitionDuration: "0.3s",
      maxWidth: "3000px",
      maxHeight: "3000px",
    });

    (await expectIt([WUPPopupElement.$placements.$left.$start])).toMatchInlineSnapshot(
      `"<wup-popup style="max-width: 1024px; max-height: 768px; transform: translate(112px, 2px);" position="right" open="" show=""></wup-popup>"`
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
      `"<wup-popup open="" style="transform: translate(50px, 50px);" position="bottom" show=""></wup-popup>"`
    );

    // cover case when target is partiallyHidden by scrollable parent
    // no place at the top
    moveTo(0, bodyRect.top - trgRect.height / 2); // move to top
    expectIt(WUPPopupElement.$placements.$top.$middle).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(50px, 25px);" position="bottom" show=""></wup-popup>"`
    );

    // no place at the bottom
    moveTo(0, bodyRect.bottom - trgRect.height / 2); // move to bottom
    expectIt(WUPPopupElement.$placements.$bottom.$middle).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(50px, 375px);" position="top" show=""></wup-popup>"`
    );

    // no place at the left
    moveTo(bodyRect.left - trgRect.width / 2, 10); // move to left
    expectIt(WUPPopupElement.$placements.$left.$middle).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(25px, 10px);" position="top" show=""></wup-popup>"`
    );

    // no place at the right
    moveTo(bodyRect.right - trgRect.width / 2, 10); // move to right
    expectIt(WUPPopupElement.$placements.$right.$middle).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(575px, 10px);" position="top" show=""></wup-popup>"`
    );

    // target is completely hidden at the top of scrollable content
    trgRect.width = 18;
    trgRect.height = 10;
    moveTo(0, bodyRect.top - trgRect.height);
    expectIt(WUPPopupElement.$placements.$top.$middle).toMatchInlineSnapshot(
      `"<wup-popup open="" style="display: none;" position="top" show=""></wup-popup>"`
    );
    el.$options.arrowEnable = true; // checking if arrow is hidden also
    el.$options.placement = [WUPPopupElement.$placements.$top.$middle];
    jest.advanceTimersByTime(10);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="display: none;" position="top" show=""></wup-popup><wup-popup-arrow style="display: none;"></wup-popup-arrow></body>"`
    );
    el.$options.arrowEnable = false;

    // target is completely hidden at the bottom of scrollable content
    moveTo(0, bodyRect.bottom - trgRect.height); // move to bottom/partially
    expectIt(WUPPopupElement.$placements.$bottom.$middle).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(9px, 390px);" position="top" show=""></wup-popup>"`
    );
  });

  test("arrow", () => {
    expect(el.$isOpened).toBe(true); // checking prev-state
    expect(el.$refArrow).toBeFalsy();
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

    h.setupCssCompute(el, { borderRadius: "6px 6px 6px 6px" });

    const expectIt = (placement) => {
      el.$options.placement = [placement];
      jest.advanceTimersByTime(10);
      // eslint-disable-next-line jest/valid-expect
      return expect(document.body.outerHTML);
    };

    expectIt(WUPPopupElement.$placements.$top.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(140px, 70px);" position="top" show=""></wup-popup><wup-popup-arrow style="transform: translate(154px, 90px) rotate(0.1deg);"></wup-popup-arrow></body>"`
    );
    expect(el.$refArrow).toBeDefined();

    expectIt(WUPPopupElement.$placements.$top.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(170px, 70px);" position="top" show=""></wup-popup><wup-popup-arrow style="transform: translate(180px, 90px) rotate(0.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$top.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(200px, 70px);" position="top" show=""></wup-popup><wup-popup-arrow style="transform: translate(206px, 90px) rotate(0.1deg);"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$bottom.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(140px, 160px);" position="bottom" show=""></wup-popup><wup-popup-arrow style="transform: translate(154px, 150px) rotate(180.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(170px, 160px);" position="bottom" show=""></wup-popup><wup-popup-arrow style="transform: translate(180px, 150px) rotate(180.1deg);"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$bottom.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(200px, 160px);" position="bottom" show=""></wup-popup><wup-popup-arrow style="transform: translate(206px, 150px) rotate(180.1deg);"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$left.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(96px, 100px);" position="left" show=""></wup-popup><wup-popup-arrow style="transform: translate(134px, 108px) rotate(-90.1deg); width: 8px; height: 4px;"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(96px, 115px);" position="left" show=""></wup-popup><wup-popup-arrow style="transform: translate(134px, 123px) rotate(-90.1deg); width: 8px; height: 4px;"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$left.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(96px, 130px);" position="left" show=""></wup-popup><wup-popup-arrow style="transform: translate(134px, 138px) rotate(-90.1deg); width: 8px; height: 4px;"></wup-popup-arrow></body>"`
    );

    expectIt(WUPPopupElement.$placements.$right.$start.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(244px, 100px);" position="right" show=""></wup-popup><wup-popup-arrow style="transform: translate(238px, 108px) rotate(90.1deg); width: 8px; height: 4px;"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$middle.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(244px, 115px);" position="right" show=""></wup-popup><wup-popup-arrow style="transform: translate(238px, 123px) rotate(90.1deg); width: 8px; height: 4px;"></wup-popup-arrow></body>"`
    );
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(244px, 130px);" position="right" show=""></wup-popup><wup-popup-arrow style="transform: translate(238px, 138px) rotate(90.1deg); width: 8px; height: 4px;"></wup-popup-arrow></body>"`
    );

    el.$options.arrowClass = "my-arrow";
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(244px, 130px);" position="right" show=""></wup-popup><wup-popup-arrow style="transform: translate(238px, 138px) rotate(90.1deg); width: 8px; height: 4px;" class="my-arrow"></wup-popup-arrow></body>"`
    );
    // checking with nextSibling
    document.body.appendChild(document.createElement("a"));
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(244px, 130px);" position="right" show=""></wup-popup><wup-popup-arrow style="transform: translate(238px, 138px) rotate(90.1deg); width: 8px; height: 4px;" class="my-arrow"></wup-popup-arrow><a></a></body>"`
    );

    el.$options.arrowOffset = [2, 3];
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(244px, 130px);" position="right" show=""></wup-popup><wup-popup-arrow style="transform: translate(241px, 138px) rotate(90.1deg); width: 8px; height: 4px;" class="my-arrow"></wup-popup-arrow><a></a></body>"`
    );

    WUPPopupElement.$defaults.arrowOffset = [4, 8];
    el = document.body.appendChild(document.createElement("wup-popup"));
    el.$options.arrowEnable = true;
    expectIt(WUPPopupElement.$placements.$right.$end.$adjust).toMatchInlineSnapshot(
      `"<body><div id="targetId">some text</div><wup-popup open="" style="transform: translate(244px, 130px);" position="right" show=""></wup-popup><wup-popup-arrow style="transform: translate(241px, 138px) rotate(90.1deg); width: 8px; height: 4px;" class="my-arrow"></wup-popup-arrow><a></a><wup-popup></wup-popup></body>"`
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
    const spyClose = jest.spyOn(WUPPopupElement.prototype, "goClose");
    const spyOpen = jest.spyOn(WUPPopupElement.prototype, "goOpen");

    let detach = WUPPopupElement.$attach({ target: trg, openCase: 0b111111, text: "Me" }, (popupEl) => {
      popup = popupEl;
      ++cnt;
    });

    expect(popup).toBeNull();
    trg.click(); // to open
    await h.wait(100);
    expect(popup).toBeDefined();
    expect(popup.$options.openCase).toBe(0b111111);
    expect(popup.$options.target).toBe(trg);
    expect(popup.isConnected).toBe(true);
    expect(popup.$isOpened).toBe(true);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup open="" style="transform: translate(190px, 100px);" position="top" show="">Me</wup-popup>"`
    );
    expect(cnt).toBe(1);
    expect(spyOpen).toBeCalledTimes(1);
    expect(spyClose).toBeCalledTimes(0);

    trg.click(); // to hide
    await h.wait();
    expect(cnt).toBe(1);
    expect(popup.$isOpened).toBe(false);
    expect(popup.isConnected).toBe(false);
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id="targetId">some text</div>"`);
    expect(spyOpen).toBeCalledTimes(1);
    expect(spyClose).toBeCalledTimes(1);

    await h.wait();
    trg.click(); // to open again
    await h.wait();
    expect(popup.$isOpened).toBe(true);
    expect(popup.isConnected).toBe(true);
    expect(cnt).toBe(2);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup open="" style="transform: translate(190px, 100px);" position="top" show="">Me</wup-popup>"`
    );
    expect(spyOpen).toBeCalledTimes(2);
    expect(spyClose).toBeCalledTimes(1);

    detach();
    expect(detach).not.toThrow(); // checking detach again
    expect(popup.$isOpened).toBe(false);
    expect(popup.isConnected).toBe(false);
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id="targetId">some text</div>"`);
    expect(spyOpen).toBeCalledTimes(2);
    expect(spyClose).toBeCalledTimes(2);

    spy.check(); // checking memory leak

    // checking when canShow = false > popup.removed
    jest.clearAllMocks();
    jest.spyOn(WUPPopupElement.prototype, "goOpen").mockImplementationOnce(() => false);
    detach = WUPPopupElement.$attach({ target: trg, openCase: 0b111111, text: "Me" }); // checking without callback
    trg.click();
    jest.advanceTimersByTime(100); // popup has click-timeouts
    expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div id="targetId">some text</div>"`);
    detach();
    spy.check(); // checking memory leak

    // checking several attach() on the same target
    popup = undefined;
    detach = WUPPopupElement.$attach({ target: trg, openCase: 0b111111, text: "Me" });
    const warn = h.wrapConsoleWarn(
      () =>
        (detach = WUPPopupElement.$attach({ target: trg, openCase: PopupOpenCases.onClick, text: "Me2" }, (popupEl) => {
          popup = popupEl;
        }))
    );
    expect(warn).toBeCalledTimes(1);
    trg.click();
    await h.wait();
    // checking if rendered once
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup open="" style="transform: translate(190px, 100px);" position="top" show="">Me2</wup-popup>"`
    );
    expect(popup).toBeDefined();

    // checking if options that affects on re-init can be changed in callback
    document.body.click();
    trg.blur();
    await h.wait(1);
    expect(popup.$isOpened).toBe(false);
    detach();
    detach = WUPPopupElement.$attach(
      { target: trg, openCase: PopupOpenCases.onClick, text: "Me2", placement: [] },
      (popupEl) => {
        popup = popupEl;
      }
    );
    trg.click();
    await h.wait();
    expect(popup.$isOpened).toBe(true);
    expect(popup.getAttribute("position")).not.toBe("bottom");
    jest.advanceTimersByTime(1000);
    popup.$options.placement = [WUPPopupElement.$placements.$bottom.$start.$adjust];
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpened).toBe(false); // changing options hides popup
    trg.click();
    await h.wait();
    expect(popup.$isOpened).toBe(true);
    expect(popup.getAttribute("position")).toBe("bottom");

    // checking changing target
    const divRemove = document.body.appendChild(document.createElement("div"));
    const trg2 = divRemove.appendChild(document.createElement("button"));
    popup.$options.target = trg2;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpened).toBe(false); // changing options hides popup
    trg.click();
    await h.wait();
    expect(popup.$isOpened).toBe(false); // because target changed
    popup.$options.target.click();
    await h.wait();
    expect(popup.$isOpened).toBe(true);

    // set target to null (for coverage)
    popup.$options.target = null;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpened).toBe(false); // changing options hides popup
    expect(popup.$options.target).toBe(trg); // because it returns to previous
    trg2.click();
    await h.wait();
    expect(popup.$isOpened).toBe(false); // because target changed
    trg.click();
    await h.wait();
    expect(popup.$isOpened).toBe(true);

    // checking self-removing opened popup when target turns into removed
    let animateFrame;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => (animateFrame = fn));
    popup.$options.target = trg2;
    jest.advanceTimersByTime(1000);
    expect(popup.$isOpened).toBe(false); // because target changed
    trg2.click();
    await h.wait();
    expect(popup.$isOpened).toBe(true);
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
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);

    // checking with defaults
    h.setupCssCompute((elt) => elt instanceof WUPPopupElement, {
      transitionDuration: "0.3s",
      animationDuration: "0.3s",
    });
    el.$open();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px); opacity: 0;" position="top" show="" open=""></wup-popup>"`
    );

    el.$close();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px); opacity: 0;" position="top" open=""></wup-popup>"`
    );

    el.$open();
    await h.wait(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="opacity: 0; transform: translate(190px, 100px);" position="top" open="" show=""></wup-popup>"`
    );

    // checking the same with attach
    /** @type WUPPopupElement */
    let popup;
    const detach = WUPPopupElement.$attach({ target: trg, openCase: 0b111111, text: "Me" }, (popupEl) => {
      popup = popupEl;
    });
    trg.click();
    await h.wait();
    expect(popup.$isOpened).toBe(true);
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" show="">Me</wup-popup>"`
    );

    trg.click();
    await h.wait(1);
    expect(popup.$isOpened).toBe(true); // because we are waiting for animation
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );
    await h.wait();
    expect(popup.$isOpened).toBe(false);
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top">Me</wup-popup>"`
    );

    trg.click();
    await h.wait();
    expect(popup.$isOpened).toBe(true);
    expect(popup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="transform: translate(190px, 100px);" position="top" show="">Me</wup-popup>"`
    );
    detach();

    // checking with custom animation
    let animateFrame;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => (animateFrame = fn));
    h.setupCssCompute(el, { transitionDuration: "0.2s", animationDuration: "0.2s" });
    el.$open();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top" open="" show=""></wup-popup>"`
    );
    el.$close(); // cover clearing animationTimer

    el.$open();
    await h.wait(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px); opacity: 0;" position="top" open="" show=""></wup-popup>"`
    );
    jest.advanceTimersByTime(200);
    const v = { ...trg.getBoundingClientRect() };
    v.height += 1;
    v.bottom += 1;
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValueOnce(v);
    animateFrame();
    await h.wait(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top" open="" show=""></wup-popup>"`
    );

    // checking with wrong directions
    el.$close();
    h.setupCssCompute(el, { transitionDuration: "0", animationDuration: "0" });

    el.$open();
    await h.wait(1);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup style="transform: translate(190px, 100px);" position="top" open="" show=""></wup-popup>"`
    );

    el.remove();
  });

  test("async open/close on target click", async () => {
    // issue by trg.click() open > close > open  --- error
    el.$close();
    el.$options.openCase = PopupOpenCases.onClick; // onlyClick
    await h.wait();
    expect(el.$isOpened).toBe(false);

    // checking ordinary behavior without animation
    trg.click();
    await h.wait();
    expect(el.$isOpened).toBe(true);

    trg.click();
    await h.wait();
    expect(el.$isOpened).toBe(false);

    // simulate defaults
    h.setupCssCompute(el, { transitionDuration: "0.3s", animationDuration: "0.3s" });

    trg.click();
    await h.wait(50);
    expect(el.$isOpened).toBe(true); // because open is sync method

    // hide
    trg.click();
    expect(el.$isOpened).toBe(true); // because close is async method
    await h.wait(50); // wait for 50ms
    expect(el.$isOpened).toBe(true); // because close waits for animation in 300ms

    // open
    trg.click(); // try open again when close hasn't been finished yet
    expect(el.$isOpened).toBe(true);
    await h.wait(50); // wait for 50ms
    expect(el.$isOpened).toBe(true);

    // hide
    trg.click(); // try again when previous close hasn't been finished yet but opened again
    expect(el.$isOpened).toBe(true);
    await h.wait(50); // wait for 50ms
    expect(el.$isOpened).toBe(true);
    await h.wait(1000);
    expect(el.$isOpened).toBe(false);

    // checking if it works again
    trg.click(); // try to open again when previous close hasn't been finished yet but opened again
    await h.wait();
    expect(el.$isOpened).toBe(true);
    trg.click();
    await h.wait();
    expect(el.$isOpened).toBe(false);
  });

  test("popup inside target", async () => {
    el.$options.openCase = PopupOpenCases.onClick;
    trg.appendChild(el);
    await h.wait();

    // click on popup > close popup
    await h.userClick(trg);
    await h.wait();
    expect(el.$isOpened).toBe(true);
    await h.userClick(el);
    await h.wait();
    expect(el.$isOpened).toBe(false);
  });

  test("popup with parent transform.translate", async () => {
    const { nextFrame } = h.useFakeAnimation();
    el.remove();
    el = document.createElement("wup-popup");
    el.$options.openCase = PopupOpenCases.onInit; // always
    el.$options.arrowEnable = true;
    el.$options.target = trg;
    document.body.appendChild(el);

    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup open="" style="transform: translate(190px, 100px);" position="top" show=""></wup-popup><wup-popup-arrow style="transform: translate(190px, 100px) rotate(0.1deg);"></wup-popup-arrow>"`
    );

    trg.parentElement.style.transform = "translate(-50%,-50%)";
    const rect = trg.getBoundingClientRect();
    jest.spyOn(trg, "getBoundingClientRect").mockReturnValue({ ...rect, left: 0, x: 0 });
    const rectEl = el.getBoundingClientRect();
    jest.spyOn(el, "getBoundingClientRect").mockReturnValue({ ...rectEl, left: 19, x: 19 }); // simulate case when parent transform affects on positioning

    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div id="targetId">some text</div><wup-popup open="" style="transform: translate(221px, 100px);" position="top" show=""></wup-popup><wup-popup-arrow style="transform: translate(221px, 100px) rotate(0.1deg);"></wup-popup-arrow>"`
    );
  });

  test("update on screen size changes", async () => {
    const { nextFrame } = h.useFakeAnimation();

    h.mockConsoleError(); // error on not-enough space
    expect(window.innerWidth).toBe(1024);
    expect(window.innerHeight).toBe(768);
    jest.spyOn(el, "offsetHeight", "get").mockReturnValue(2000);
    jest.spyOn(el, "offsetWidth", "get").mockReturnValue(2000);
    el.$options.placement = [WUPPopupElement.$placements.$left.$start];
    await h.wait();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 1024px; max-height: 768px; transform: translate(240px, 0px);" position="right" show=""></wup-popup>"`
    );

    const spyStyle = jest.spyOn(window, "getComputedStyle");
    await nextFrame();
    expect(spyStyle).toBeCalledTimes(0);

    // case on device rotation
    window.innerWidth = 600;
    window.innerHeight = 800;
    await nextFrame();
    expect(spyStyle).toBeCalledTimes(3); // 3 instead of 1 because findScrollParent calls it also for checking position
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 600px; max-height: 800px; transform: translate(0px, 0px);" position="top" show=""></wup-popup>"`
    );

    window.innerHeight -= 80; // simulate mobile-keyboard opening
    await nextFrame();
    await nextFrame();
    expect(spyStyle).toBeCalledTimes(6); // 6 instead of 1 because findScrollParent calls it also for checking position
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup open="" style="max-width: 600px; max-height: 720px; transform: translate(0px, 0px);" position="top" show=""></wup-popup>"`
    );

    h.unMockConsoleError();
  });

  test("open/close manually + listener", async () => {
    /** @type typeof el */
    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.target = trg;
    await h.wait();

    expect(el.$isOpened).toBe(false);
    await h.userClick(trg); // open by listener
    await h.wait();
    expect(el.$isOpened).toBe(true);
    el.$close(); // close manually
    await h.wait();
    expect(el.$isOpened).toBe(false);
    await h.userClick(trg); // open by listener
    await h.wait();
    expect(el.$isOpened).toBe(true);

    await h.userClick(trg); // open by listener
    await h.wait();
    expect(el.$isOpened).toBe(false);
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    await h.userClick(trg); // open by listener
    await h.wait();
    expect(el.$isOpened).toBe(false);
  });
});
