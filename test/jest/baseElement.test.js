import WUPBaseElement from "web-ui-pack/baseElement";
import * as h from "../testHelper";

const testAttr = "testattr";
class TestElement extends WUPBaseElement {
  $options = {};
  static get observedAttributes() {
    return [testAttr];
  }
}

jest.useFakeTimers();
/** @type TestElement */
let el;
beforeAll(() => {
  customElements.define("test-inher-el", TestElement);
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  el = document.body.appendChild(document.createElement("test-inher-el"));
});

afterEach(() => {
  el?.remove();
  el = null;
  document.body.innerHTML = "";
});

describe("baseElement", () => {
  describe("inheritance", () => {
    h.testComponentFuncBind(document.createElement("test-inher-el"));
  });

  describe("me", () => {
    customElements.define("test-base-el", WUPBaseElement);
    h.testComponentFuncBind(document.createElement("test-base-el"));
  });

  test("gotReady/gotRemoved/gotAttributeChanged", () => {
    // somehow spyOn object doesn't work
    const spyAttrChanged = jest.spyOn(TestElement.prototype, "gotAttributeChanged");
    /** @type TestElement */
    const a = document.createElement("test-inher-el");
    const spyReady = jest.spyOn(a, "gotReady");
    const spyRemoved = jest.spyOn(a, "gotRemoved");
    const spyDispose = jest.spyOn(a, "dispose");

    expect(spyReady).not.toBeCalled();
    expect(spyRemoved).not.toBeCalled();
    expect(spyDispose).not.toBeCalled();

    // test appending
    document.body.appendChild(a);
    jest.advanceTimersToNextTimer();
    expect(spyReady).toBeCalled();
    expect(spyRemoved).not.toBeCalled();
    expect(spyDispose).not.toBeCalled();
    spyReady.mockClear();

    // test removing
    document.body.removeChild(a);
    expect(spyReady).not.toBeCalled();
    expect(spyRemoved).toBeCalled();
    expect(spyDispose).toBeCalled();
    spyRemoved.mockClear();
    spyDispose.mockClear();

    // test changing attrs when not added to document
    expect(spyAttrChanged).not.toBeCalled();
    a.setAttribute(testAttr, "someThing");
    expect(spyAttrChanged).not.toBeCalled();

    // test appending again
    document.body.appendChild(a);
    a.setAttribute(testAttr, "someThing2");
    expect(spyAttrChanged).not.toBeCalled(); // because a.isReady false (need wait for timeout)
    jest.advanceTimersToNextTimer();
    expect(spyReady).toBeCalledTimes(1);
    expect(spyRemoved).not.toBeCalled();
    expect(spyDispose).not.toBeCalled();
    expect(spyAttrChanged).not.toBeCalled(); // because a.isReady false (need wait for timeout)
    spyReady.mockClear();

    // test attrChange
    a.setAttribute(testAttr, "someThing3");
    expect(spyAttrChanged).toBeCalledTimes(1);
  });

  test("fireEvent", () => {
    const fn = jest.fn();
    el.addEventListener("click", fn);

    const ev = el.fireEvent("click", { bubbles: true });
    expect(ev).toBeInstanceOf(Event);
    expect(ev.bubbles).toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBe(ev);
  });

  test("appendEvent", () => {
    let listenClick = 0;
    // testing remove
    let remove = el.appendEvent(el, "click", () => (listenClick += 1));
    remove();

    el.dispatchEvent(new Event("click"));
    expect(listenClick).toBe(0); // no callback because removed
    expect(() => remove()).not.toThrow(); // testing remove again

    // testing callback
    remove = el.appendEvent(el, "click", () => (listenClick += 1));
    el.dispatchEvent(new Event("click"));
    expect(listenClick).toBe(1);
    el.dispatchEvent(new Event("click"));
    expect(listenClick).toBe(2);
    // append 1 more
    listenClick = 0;
    let listenDocClick = 0;
    const remove2 = el.appendEvent(document, "click", () => (listenDocClick += 1));
    el.dispatchEvent(new Event("click", { bubbles: true }));
    expect(listenClick).toBe(1);
    expect(listenDocClick).toBe(1);
    remove2();
    remove();

    // testing once: true
    listenClick = 0;
    remove = el.appendEvent(el, "click", () => (listenClick += 1), { once: true });
    el.dispatchEvent(new Event("click"));
    el.dispatchEvent(new Event("click"));
    expect(listenClick).toBe(1); // because it's removed after once
    remove(); // try remove againА

    // сhecking if option passive is changable
    let isPassive;
    const setPassive = (e) => {
      e.preventDefault();
      isPassive = !e.defaultPrevented;
    };
    el.appendEvent(el, "click", setPassive, { passive: true, once: true });
    el.dispatchEvent(new Event("click", { cancelable: true }));
    expect(isPassive).toBeTruthy();

    el.appendEvent(el, "click", setPassive, { passive: false, once: true });
    el.dispatchEvent(new Event("click", { cancelable: true }));
    expect(isPassive).toBeFalsy();

    // passive is true by default
    el.appendEvent(el, "click", setPassive, { once: true });
    el.dispatchEvent(new Event("click", { cancelable: true }));
    expect(isPassive).toBeTruthy();
  });

  test("dispose", () => {
    const spyOnDoc = jest.spyOn(document, "addEventListener");
    const spyOffDoc = jest.spyOn(document, "removeEventListener");
    const spyOnEl = jest.spyOn(el, "addEventListener");
    const spyOffEl = jest.spyOn(el, "removeEventListener");

    el.appendEvent(el, "click", () => {});
    const removeEl = el.appendEvent(el, "click", () => {});
    expect(spyOnEl).toBeCalledTimes(2);

    el.appendEvent(document, "click", () => {});
    expect(spyOnDoc).toBeCalledTimes(1);
    expect(el.disposeLst).toHaveLength(3);

    removeEl();
    expect(el.disposeLst).toHaveLength(2);
    expect(spyOffEl).toBeCalledTimes(1);

    // try again to double-check logic
    removeEl();
    expect(el.disposeLst).toHaveLength(2); // same length because previous was removed
    expect(spyOffEl).toBeCalledTimes(1);

    const spyRemove = jest.spyOn(el, "gotRemoved");
    el.remove(); // testing dispose by remove
    expect(spyRemove).toBeCalled();
    expect(el.disposeLst).toHaveLength(0);

    expect(spyOnDoc).toBeCalledTimes(spyOffDoc.mock.calls.length); // equal 1
    expect(spyOnEl).toBeCalledTimes(spyOffEl.mock.calls.length); // equal 2
  });

  test("includes", () => {
    const span = el.appendChild(document.createElement("span"));
    expect(el.includes(document)).toBeFalsy();
    expect(() => el.includes(null)).not.toThrow();
    expect(el.includes(null)).toBeFalsy();
    expect(el.includes(span)).toBeTruthy();
  });

  test("overriden dispatchEvent", () => {
    const fn = jest.fn();
    el.addEventListener("click", fn);
    el.dispatchEvent(new Event("click"));
    expect(fn).toBeCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBeInstanceOf(Event);

    expect(() => el.dispatchEvent("click")).not.toThrow();
    expect(fn).toBeCalledTimes(2);

    fn.mockClear();
    expect(() => el.dispatchEvent("click", { bubbles: true })).not.toThrow();
    expect(fn.mock.calls[0][0].bubbles).toBeTruthy();
  });

  test("static.$uniqueId", () => {
    expect(WUPBaseElement.$uniqueId).toBeDefined();
    expect(WUPBaseElement.$uniqueId).not.toBe(WUPBaseElement.$uniqueId);
    expect(WUPBaseElement.$uniqueId).not.toBe(WUPBaseElement.$uniqueId);
    expect(WUPBaseElement.$uniqueId).not.toBe(WUPBaseElement.$uniqueId);
  });

  test("focus", () => {
    class Test extends WUPBaseElement {}
    customElements.define("test-el", Test);
    const tst = document.body.appendChild(document.createElement("test-el"));
    expect(document.activeElement).not.toBe(tst);
    const btn = tst.appendChild(document.createElement("button"));
    tst.focus();
    expect(document.activeElement).toBe(btn);
  });

  test("gotOptionsChanged", () => {
    class Test extends WUPBaseElement {
      $options = {};
      static observedOptions = new Set(["t1", "t2"]);

      gotOptionsChanged() {}
    }
    customElements.define("test-opt-el", Test);
    const tst = document.body.appendChild(document.createElement("test-opt-el"));
    const fn = jest.spyOn(tst, "gotOptionsChanged");
    jest.advanceTimersToNextTimer();
    expect(tst.$isReady).toBeTruthy();

    tst.$options = {};
    const old = tst.$options;
    expect(fn).not.toBeCalled(); // because observedOptions not
    tst.$options = { t1: 1, t2: 2 };
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ props: ["t1", "t2"], target: tst.$options });

    fn.mockClear();
    tst.$options.t1 += 1;
    jest.advanceTimersToNextTimer(); // because of observer collect it via timeout
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ props: ["t1"], target: tst.$options });

    // check if changing old options affects on elemet
    fn.mockClear();
    old.t1 = "no";
    jest.advanceTimersToNextTimer(); // because of observer collect it via timeout
    expect(fn).not.toBeCalled(); // because listeners to object that not assigned must be destroyed

    fn.mockClear();
    tst.$options.another = "s";
    expect(fn).not.toBeCalled();
    tst.$options = { ...tst.$options, another: "s2" };
    expect(fn).not.toBeCalled();

    expect(() => (tst.$options = null)).toThrow();

    // test when no observedOptions
    expect(el.$isReady).toBeTruthy();
    el.$options = { v: 1 };

    // eslint-disable-next-line no-self-compare
    expect(el.$options === el.$options).toBeTruthy(); // just for coverage when observedOptions is empty
    class T2 extends WUPBaseElement {
      $options = {};
      static observedOptions = new Set(["to"]);
    }
    const fnT2 = jest.spyOn(T2.prototype, "gotOptionsChanged");
    customElements.define("t2-test", T2);
    const t2 = document.body.appendChild(document.createElement("t2-test"));
    jest.advanceTimersToNextTimer();
    t2.$options.to = "str";
    jest.advanceTimersToNextTimer();
    expect(fnT2).toBeCalled(); // just for coverage when observedOptions is empty
  });

  test("style inherritance", () => {
    expect(WUPBaseElement.$style).toBeDefined();
    expect(WUPBaseElement.$styleRoot).toBeTruthy();
    jest.spyOn(WUPBaseElement, "$style", "get").mockReturnValue(":host { display: block }");

    //  case when no new styles defined
    class TestA extends WUPBaseElement {}
    customElements.define("t-a", TestA);
    document.body.appendChild(document.createElement("t-a"));
    expect(WUPBaseElement.$refStyle).toBeDefined();
    expect(TestA.$refStyle).toBeDefined();

    let style = TestA.$refStyle.textContent.toLowerCase();
    expect(style).toContain(WUPBaseElement.$styleRoot);
    expect(style).toContain("t-a { display: block }");
    expect(style.lastIndexOf("t-a")).toBe(style.indexOf("t-a")); // checking if style applied once

    class TestB extends TestA {
      static get $style() {
        return ":host { position: my-absolute }";
      }

      static get $styleRoot() {
        return ":root { main-color: my-red }";
      }
    }
    customElements.define("t-b", TestB);
    document.body.appendChild(document.createElement("t-b"));
    style = TestB.$refStyle.textContent.toLowerCase();
    expect(style).toContain("t-b { position: my-absolute }");
    expect(style).toContain(":root { main-color: my-red }");

    class TestC extends TestB {
      static get $style() {
        return ":host { z-index: me }";
      }

      static get $styleRoot() {
        return ":root { vis: im here }";
      }
    }
    customElements.define("t-c", TestC);
    document.body.appendChild(document.createElement("t-c"));
    style = TestC.$refStyle.textContent.toLowerCase();
    expect(style).toContain("t-c { position: my-absolute }");
    expect(style).toContain(":root { main-color: my-red }");
    expect(style).toContain("t-c { z-index: me }");
    expect(style).toContain(":root { vis: im here }");

    class TestD extends TestC {}
    customElements.define("t-d", TestD);
    document.body.appendChild(document.createElement("t-d"));
    style = TestC.$refStyle.textContent.toLowerCase();
    expect(style).toContain("t-d { position: my-absolute }");
    expect(style).toContain(":root { main-color: my-red }");
    expect(style).toContain("t-d { z-index: me }");
    expect(style).toContain(":root { vis: im here }");

    expect(style.lastIndexOf("t-a")).toBe(style.indexOf("t-a")); // checking if style applied once
    expect(style.lastIndexOf("t-c { z-index: me }")).toBe(style.indexOf("t-c { z-index: me }")); // checking if style applied once
    expect(style.lastIndexOf(":root { vis: im here }")).toBe(style.indexOf(":root { vis: im here }")); // checking if style applied once
  });

  test("get/set bool attr", () => {
    expect(el.getBoolAttr("disabled")).toBeFalsy();

    el.setBoolAttr("disabled", true);
    expect(el.getAttribute("disabled")).toBe("");
    expect(el.getBoolAttr("disabled")).toBeTruthy();

    el.setBoolAttr("disabled", true, true);
    expect(el.getAttribute("disabled")).toBe("true");
    expect(el.getBoolAttr("disabled")).toBeTruthy();

    el.setBoolAttr("disabled", false);
    expect(el.getAttribute("disabled")).toBeNull();
    expect(el.getBoolAttr("disabled")).toBeFalsy();
  });
});
