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
    let listenClick = 0;
    el.addEventListener("click", () => (listenClick += 1));

    const ev = el.fireEvent("click", { bubbles: true });
    expect(ev).toBeInstanceOf(Event);
    expect(ev.bubbles).toBeTruthy();
    expect(listenClick).toBe(1);
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

    expect(() => el.dispatchEvent("click")).not.toThrow();
    expect(fn).toBeCalledTimes(2);

    fn.mockClear();
    expect(() => el.dispatchEvent("click", { bubbles: true })).not.toThrow();
    expect(fn.mock.calls[0][0].bubbles).toBeTruthy();
  });
});
