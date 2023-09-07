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

  test("style inheritance", () => {
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
    const spyOptionChanged = jest.spyOn(TestElement.prototype, "gotChanges");
    /** @type TestElement */
    const a = document.createElement("test-inher-el");
    expect(TestElement.observedAttributes).toMatchInlineSnapshot(`
      [
        "testattr",
      ]
    `);
    expect(TestElement.observedOptions).toMatchInlineSnapshot(`null`);
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
    jest.clearAllMocks();

    // test removing
    document.body.removeChild(a);
    expect(spyReady).not.toBeCalled();
    expect(spyRemoved).toBeCalled();
    expect(spyDispose).toBeCalled();

    // test changing attrs when not added to document
    jest.clearAllMocks();
    expect(spyAttrChanged).not.toBeCalled();
    a.setAttribute(testAttr, "someThing");
    expect(spyAttrChanged).toBeCalledTimes(1);
    jest.advanceTimersToNextTimer();
    expect(spyOptionChanged).not.toBeCalled(); // because component is not ready

    // test appending again
    document.body.appendChild(a);
    a.setAttribute(testAttr, "someThing2");
    expect(spyAttrChanged).toBeCalled(); // because a.isReady false (need wait for timeout)
    jest.advanceTimersToNextTimer();
    expect(spyReady).toBeCalledTimes(1);
    expect(spyRemoved).not.toBeCalled();
    expect(spyDispose).not.toBeCalled();
    expect(spyAttrChanged).toBeCalled();
    spyReady.mockClear();

    // test attrChange
    a.setAttribute(testAttr, "someThing3");
    expect(spyAttrChanged).toBeCalledTimes(3);
  });

  test("gotOptionsChanged", () => {
    class Test extends WUPBaseElement {
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
    tst.$options = tst._opts;
    expect(fn).toBeCalledTimes(0); // because no-changes actually
    // eslint-disable-next-line no-self-assign
    tst.$options = tst.$options;
    expect(fn).toBeCalledTimes(0); // because no-changes actually
    tst.$options = { t1: 1, t2: 2 };
    expect(fn).toBeCalledTimes(0); // because no-changes actually

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

    expect(() => (tst.$options = null)).not.toThrow();

    // test when no observedOptions
    expect(el.$isReady).toBe(true);
    el.$options = { v: 1 };

    // eslint-disable-next-line no-self-compare
    expect(el.$options === el.$options).toBe(true); // just for coverage when observedOptions is empty
    class T2 extends WUPBaseElement {
      static get observedOptions() {
        return [];
      }
    }
    const fnT2 = jest.spyOn(T2.prototype, "gotOptionsChanged");
    customElements.define("t2-test", T2);
    const t2 = document.body.appendChild(document.createElement("t2-test"));
    jest.advanceTimersByTime(1);
    t2.$options.to = "str";
    jest.advanceTimersByTime(1);
    expect(fnT2).not.toBeCalled(); // just for coverage when observedOptions is empty
  });

  test("gotChanges", async () => {
    class TestEl extends WUPBaseElement {
      static $defaults = {
        disabled: false,
        readOnly: false,
        inline: true,
        offset: 0,
        label: "Ctrl",
        target: null,
        fitEl: "auto",
        someFunction: () => "not implemented, but required for testing",
      };
    }

    const onGotChanges = jest.spyOn(TestEl.prototype, "gotChanges");
    customElements.define("test-ch", TestEl);
    el = document.body.appendChild(document.createElement("test-ch"));
    // attributes must be auto-mapped
    expect(el.parse("me")).toBe("me"); // just for coverage
    el.setAttribute("w-disabled", "");
    el.setAttribute("w-readonly", "true");
    el.setAttribute("w-inline", "false");
    el.setAttribute("w-label", "Hi");
    el.setAttribute("w-fitEl", "true");
    el.setAttribute("w-offset", "12");
    window.someTrg = el;
    el.setAttribute("w-target", "window.someTrg");
    await h.wait(1);
    expect(TestEl.observedAttributes).toMatchInlineSnapshot(`
      [
        "w-disabled",
        "w-readonly",
        "w-inline",
        "w-offset",
        "w-label",
        "w-target",
        "w-fitel",
        "w-somefunction",
      ]
    `);
    expect(TestEl.observedOptions).toMatchInlineSnapshot(`null`);
    expect(onGotChanges).toBeCalledTimes(1); // only 1 time on init
    expect(el.$options).toMatchInlineSnapshot(`
      {
        "disabled": true,
        "fitEl": true,
        "inline": false,
        "label": "Hi",
        "offset": 12,
        "readOnly": true,
        "someFunction": [Function],
        "target": <test-ch
          w-disabled=""
          w-fitel="true"
          w-inline="false"
          w-label="Hi"
          w-offset="12"
          w-readonly="true"
          w-target="window.someTrg"
        />,
      }
    `);
    // set wrong target
    el.setAttribute("w-target", "window.wrongRef");
    expect(() => jest.advanceTimersByTime(1)).toThrow();
    el.setAttribute("w-target", "wrongRef");
    expect(() => jest.advanceTimersByTime(1)).toThrow();
    // removing attribute rollbacks to default value
    jest.clearAllMocks();
    el.removeAttribute("w-disabled");
    el.removeAttribute("w-readonly");
    el.removeAttribute("w-inline");
    el.removeAttribute("w-label");
    el.removeAttribute("w-fitEl");
    el.removeAttribute("w-target");
    el.removeAttribute("w-offset");
    expect(onGotChanges).toBeCalledTimes(0); // called once after timeout
    expect(el.$options).toStrictEqual(TestEl.$defaults);
    await h.wait(1);
    expect(onGotChanges).toBeCalledTimes(1);
    expect(onGotChanges.mock.calls[0]).toMatchInlineSnapshot(`
      [
        [
          "disabled",
          "readOnly",
          "inline",
          "label",
          "fitEl",
          "target",
          "offset",
        ],
      ]
    `);
    // works with options
    jest.clearAllMocks();
    el.$options.disabled = !el.$options.disabled;
    el.$options.readOnly = !el.$options.readOnly;
    await h.wait(1);
    expect(onGotChanges).toBeCalledTimes(1);
    expect(el.$options).toMatchInlineSnapshot(`
      {
        "disabled": true,
        "fitEl": "auto",
        "inline": true,
        "label": "Ctrl",
        "offset": 0,
        "readOnly": true,
        "someFunction": [Function],
        "target": null,
      }
    `);
    // assigning undefined rollbacks to default value
    jest.clearAllMocks();
    el.$options.disabled = undefined;
    el.$options.readOnly = undefined;
    el.$options.label = undefined;
    await h.wait(1);
    expect(onGotChanges).toBeCalledTimes(1);
    expect(el.$options).toStrictEqual(TestEl.$defaults);
    // assigning partial object works fine
    jest.clearAllMocks();
    el.$options = { disabled: !el.$options.disabled, readOnly: !el.$options.readOnly, label: "Hello" };
    expect(onGotChanges).toBeCalledTimes(1);
    expect(el.$options).toMatchInlineSnapshot(`
      {
        "disabled": true,
        "fitEl": "auto",
        "inline": true,
        "label": "Hello",
        "offset": 0,
        "readOnly": true,
        "someFunction": [Function],
        "target": null,
      }
    `);
    // assigning partially with undefined rollback to defaults
    jest.clearAllMocks();
    el.$options = { disabled: undefined, readOnly: undefined, label: undefined };
    expect(onGotChanges).toBeCalledTimes(1);
    expect(el.$options).toStrictEqual(TestEl.$defaults);
    // assigning full undefined rollback to defaults
    jest.clearAllMocks();
    el.$options = { target: el };
    el.$options = null;
    expect(onGotChanges).toBeCalledTimes(2);
    expect(el.$options).toStrictEqual(TestEl.$defaults);

    // assgin wrong number
    const prev = el.$options.offset;
    el.setAttribute("w-offset", "abc");
    expect(() => jest.advanceTimersByTime(1)).toThrow();
    expect(el.$options.offset).toBe(prev);
  });

  test("fireEvent", () => {
    const evCallback = jest.fn();
    el.addEventListener("click", evCallback);

    let ev = el.fireEvent("click", { bubbles: true });
    expect(ev).toBeInstanceOf(Event);
    expect(ev.bubbles).toBe(true);
    expect(evCallback).toHaveBeenCalledTimes(1);
    expect(evCallback.mock.calls[0][0]).toBe(ev);

    // event calls also function
    el.$onShowMe = jest.fn();
    ev = el.fireEvent("$showMe");
    expect(el.$onShowMe).toBeCalledTimes(1);
    expect(el.$onShowMe).lastCalledWith(ev);

    // no function
    jest.clearAllMocks();
    el.$onShowMe = undefined;
    expect(() => el.fireEvent("$showMe")).not.toThrow();

    // stopImmediatePropagation
    el.addEventListener("$showMe", evCallback);
    el.$onShowMe = jest.fn();
    ev = el.fireEvent("$showMe");
    expect(evCallback).toBeCalledTimes(1);
    expect(el.$onShowMe).toBeCalledTimes(1);
    jest.clearAllMocks();
    el.$onShowMe.mockImplementation((e) => e.stopImmediatePropagation());
    ev = el.fireEvent("$showMe");
    expect(el.$onShowMe).toBeCalledTimes(1); // because stopImmediatePropagation is called
    expect(evCallback).toBeCalledTimes(0);

    // without prefix '$'
    jest.clearAllMocks();
    el.$onTestCustom = evCallback;
    el.fireEvent("testCustom");
    expect(el.$onTestCustom).not.toBeCalled();
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
