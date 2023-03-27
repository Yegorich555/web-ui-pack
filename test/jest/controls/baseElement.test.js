import WUPBaseElement from "web-ui-pack/baseElement";
import * as h from "../../testHelper";

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
    h.baseTestComponent(() => document.createElement("test-inher-el"));
  });

  describe("me", () => {
    class TestMeElement extends WUPBaseElement {
      $options = {};
    }
    customElements.define("test-base-el", TestMeElement);
    h.baseTestComponent(() => document.createElement("test-base-el"));
  });

  test("static.$uniqueId", () => {
    expect(WUPBaseElement.$uniqueId).toBeDefined();
    expect(WUPBaseElement.$uniqueId).not.toBe(WUPBaseElement.$uniqueId);
    expect(WUPBaseElement.$uniqueId).not.toBe(WUPBaseElement.$uniqueId);
    expect(WUPBaseElement.$uniqueId).not.toBe(WUPBaseElement.$uniqueId);
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

    const was = TestA.$refStyle;
    TestA.$refStyle = ""; // just for coverage
    expect(TestA.$refStyle).toBeFalsy();
    TestA.$refStyle = was;

    class TestB extends TestA {
      static get $style() {
        return `${super.$style} :host { position: my-absolute }`;
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
        return `${super.$style} :host { z-index: me }`;
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

  test("gotOptionsChanged", () => {
    class Test extends WUPBaseElement {
      $options = {};
      static get observedOptions() {
        return ["t1", "t2"];
      }

      gotOptionsChanged() {}
    }
    customElements.define("test-opt-el", Test);
    const tst = document.body.appendChild(document.createElement("test-opt-el"));
    const fn = jest.spyOn(tst, "gotOptionsChanged");
    jest.advanceTimersToNextTimer();
    expect(tst.$isReady).toBe(true);

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
    expect(el.$isReady).toBe(true);
    el.$options = { v: 1 };

    // eslint-disable-next-line no-self-compare
    expect(el.$options === el.$options).toBe(true); // just for coverage when observedOptions is empty
    class T2 extends WUPBaseElement {
      $options = {};
      static get observedOptions() {
        return ["to"];
      }
    }
    const fnT2 = jest.spyOn(T2.prototype, "gotOptionsChanged");
    customElements.define("t2-test", T2);
    const t2 = document.body.appendChild(document.createElement("t2-test"));
    jest.advanceTimersToNextTimer();
    t2.$options.to = "str";
    jest.advanceTimersToNextTimer();
    expect(fnT2).toBeCalled(); // just for coverage when observedOptions is empty
  });

  test("gotChanges method", async () => {
    class TestEl extends WUPBaseElement {
      $options = {};
      static get observedOptions() {
        return ["disabled", "disabledReflect"];
      }

      static get observedAttributes() {
        return ["disabled", "disabledreflect", "readonly"];
      }

      gotChanges(...args) {
        super.gotChanges(...args);
        this._opts.disabledReflect = !this._opts.disabledReflect;
        this.setAttribute("disabled", this._opts.disabled);
      }
    }
    customElements.define("test-ch", TestEl);

    const spyAttr = jest.spyOn(TestEl.prototype, "gotAttributeChanged");
    const spyOpts = jest.spyOn(TestEl.prototype, "gotOptionsChanged");
    const spyAll = jest.spyOn(TestEl.prototype, "gotChanges");

    const testEl = document.body.appendChild(document.createElement("test-ch"));
    await h.wait();

    expect(spyAll).toBeCalledTimes(1); // it's called on init
    expect(spyAll).toBeCalledWith(null);
    expect(spyAttr).toBeCalledTimes(0); // because of inside gotChanges()
    expect(spyOpts).toBeCalledTimes(0);

    await h.wait();
    jest.clearAllMocks();
    testEl.$options.disabled = !testEl.$options.disabled;
    await h.wait();
    expect(spyAll).toBeCalledTimes(1);
    expect(spyAll).toBeCalledWith(["disabled"]);
    expect(spyAttr).toBeCalledTimes(0);
    expect(spyOpts).toBeCalledTimes(1);

    jest.clearAllMocks();
    testEl.setAttribute("disabled", "true");
    await h.wait();
    expect(spyAll).toBeCalledTimes(0); // because no changes (attr is set before)

    testEl.setAttribute("disabled", "false");
    await h.wait();
    expect(spyAll).toBeCalledTimes(1);
    expect(spyAll).toBeCalledWith(["disabled"]);
    expect(spyAttr).toBeCalledTimes(1);
    expect(spyOpts).toBeCalledTimes(0);

    jest.clearAllMocks();
    testEl.setAttribute("disabled", "true");
    testEl.setAttribute("readonly", "false");
    await h.wait();
    expect(spyAll).toBeCalledTimes(1);
    expect(spyAll).toBeCalledWith(["disabled", "readonly"]);
    expect(spyAttr).toBeCalledTimes(2);
    expect(spyOpts).toBeCalledTimes(0);

    jest.clearAllMocks();
    testEl.$options.disabled = !testEl.$options.disabled;
    setTimeout(() => (testEl.$options.disabled = !testEl.$options.disabled));
    setTimeout(() => (testEl.$options.disabled = !testEl.$options.disabled), 10);
    await h.wait();
    expect(spyOpts).toBeCalledTimes(3);
  });

  test("get/set bool attr", () => {
    expect(el.getAttr("disabled", "bool")).toBeFalsy();

    el.setAttr("disabled", true, true);
    expect(el.getAttribute("disabled")).toBe("");
    expect(el.getAttr("disabled", "bool")).toBe(true);

    el.setAttr("disabled", true, false);
    expect(el.getAttribute("disabled")).toBe("true");
    expect(el.getAttr("disabled", "bool")).toBe(true);

    el.setAttr("disabled", false);
    expect(el.getAttribute("disabled")).toBeNull();
    expect(el.getAttr("disabled", "bool")).toBeFalsy();
  });

  test("getNumAttr", () => {
    el.setAttribute("tn", "abc");
    const onErr = jest.spyOn(el, "throwError");
    el.getAttr("tn", "number");
    expect(onErr).toBeCalledTimes(1);

    el.setAttribute("tn", "123");
    expect(el.getAttr("tn", "number")).toBe(123);

    el.removeAttribute("tn");
    expect(el.getAttr("tn", "number")).toBe(undefined);
    el._opts.tn = 56;
    expect(el.getAttr("tn", "number")).toBe(56);

    el.setAttribute("tn", "wrongNumber");
    expect(el.getAttr("tn", "number", 234)).toBe(234);

    h.unMockConsoleError();
  });

  test("getRefAttr", () => {
    el.setAttribute("tr", "window._model.firstName");
    const onErr = jest.spyOn(el, "throwError");
    el.getAttr("tr", "ref");
    expect(onErr).toBeCalledTimes(1);
    el.setAttribute("tr", "_model.firstName");
    el.getAttr("tr", "ref");
    expect(onErr).toBeCalledTimes(2);

    window._model = { firstName: "Den" };
    el.setAttribute("tr", "_model.firstName");
    expect(el.getAttr("tr", "ref")).toBe("Den");

    window._model = { firstName: "Wiki" };
    el.setAttribute("tr", "window._model.firstName");
    expect(el.getAttr("tr", "ref")).toBe("Wiki");

    el.removeAttribute("tr");
    expect(el.getAttr("tr", "ref")).toBe(undefined);
    el._opts.tr = { me: true };
    expect(el.getAttr("tr", "ref")).toEqual({ me: true });

    el.setAttribute("tr", "window._wrongkey");
    expect(el.getAttr("tr", "ref", "Alt Ref")).toBe("Alt Ref");

    h.unMockConsoleError();
  });

  test("getObjAttr", () => {
    expect(el.getAttr("tob", "obj")).toBe(undefined);
    expect(el.getAttr("tob", "obj", { me: 1 })).toEqual({ me: 1 });

    el.setAttribute("tob", "hello");
    expect(el.getAttr("tob", "obj")).toBe("hello");

    el.setAttribute("tob", '{"me":2}');
    el.parse = (s) => JSON.parse(s);
    expect(el.getAttr("tob", "obj")).toEqual({ me: 2 });

    el.setAttribute("tob", "wrong text");
    const onErr = jest.spyOn(el, "throwError");
    el.parse = () => {
      throw new Error("Simulated err");
    };
    expect(el.getAttr("tob", "obj", "alt-text")).toBe("alt-text");
    expect(onErr).toBeCalledTimes(1);
  });

  test("getStrAttr", () => {
    expect(el.getAttr("str", "string")).toBe(undefined);
    expect(el.getAttr("str", "string", "hello")).toBe("hello");

    el.setAttribute("str", "hi");
    expect(el.getAttr("str", "string")).toBe("hi");
  });

  test("fireEvent", () => {
    const fn = jest.fn();
    el.addEventListener("click", fn);

    const ev = el.fireEvent("click", { bubbles: true });
    expect(ev).toBeInstanceOf(Event);
    expect(ev.bubbles).toBe(true);
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
    expect(isPassive).toBe(true);

    el.appendEvent(el, "click", setPassive, { passive: false, once: true });
    el.dispatchEvent(new Event("click", { cancelable: true }));
    expect(isPassive).toBe(false);

    // passive is true by default
    el.appendEvent(el, "click", setPassive, { once: true });
    el.dispatchEvent(new Event("click", { cancelable: true }));
    expect(isPassive).toBe(true);
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

  test("autofocus", async () => {
    expect(document.activeElement).not.toBe(el);
    const input = el.appendChild(document.createElement("input"));
    expect(document.activeElement).not.toBe(input);
    el.autofocus = true;
    await h.wait();
    expect(document.activeElement).toBe(input);

    input.blur();
    expect(document.activeElement).not.toBe(input);
    el.remove();
    el.$options.autofocs = true;
    document.body.appendChild(el);
    await h.wait();
    expect(document.activeElement).toBe(input);
  });

  test("blur", async () => {
    el.tabIndex = 0;
    el.focus();
    const mocked = jest.spyOn(document, "activeElement", "get").mockReturnValue(el); // jsdom works wrong with custom elements
    expect(document.activeElement).toBe(el);
    el.blur();
    mocked.mockRestore();
    expect(document.activeElement).not.toBe(el);

    el.tabIndex = undefined;
    const input = el.appendChild(document.createElement("input"));
    input.focus();
    expect(document.activeElement).toBe(input);

    el.blur();
    expect(document.activeElement).not.toBe(input);
    expect(document.activeElement).not.toBe(el);
  });

  test("includes", () => {
    const span = el.appendChild(document.createElement("span"));
    expect(el.includes(document)).toBe(false);
    expect(() => el.includes(null)).not.toThrow();
    expect(el.includes(null)).toBe(false);
    expect(el.includes(span)).toBe(true);
  });

  test("removeChildren", () => {
    el.appendChild(document.createElement("div"));
    el.appendChild(document.createElement("span"));
    el.removeChildren();
    expect(el.textContent).toBe("");

    el.textContent = "Hello";
    el.removeChildren();
    expect(el.textContent).toBe("");
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
});
