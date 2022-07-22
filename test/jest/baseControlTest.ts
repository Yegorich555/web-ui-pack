/* eslint-disable jest/no-export */
import WUPBaseControl from "web-ui-pack/controls/baseControl";
import * as h from "../testHelper";

interface InitOptions<T> {
  type: typeof WUPBaseControl;
  htmlTag: string;
  onInit: (el: T) => void;
}

let tagName = "";
let el: WUPBaseControl;

/** Function with init-cylce beforeEach/afterEach */
export function initTestBaseControl<T extends WUPBaseControl>(cfg: InitOptions<T>) {
  !cfg.type && console.error("missed");
  tagName = cfg.htmlTag;

  beforeEach(() => {
    jest.useFakeTimers();
    let lastUniqueNum = 0;
    jest.spyOn(cfg.type, "$uniqueId", "get").mockImplementation(() => `txt${++lastUniqueNum}`);
    el = document.createElement(cfg.htmlTag) as WUPBaseControl;
    cfg.onInit(el as T);
    document.body.appendChild(el);
    jest.advanceTimersByTime(1); // wait for ready
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
}

interface ValueToAttr<T> {
  value: T;
  attrValue: string;
}

interface TestOptions<T> {
  initValues: [ValueToAttr<T>, ValueToAttr<T>, ValueToAttr<T>];
}

export function testBaseControl<T>(cfg: TestOptions<T>) {
  h.baseTestComponent(() => document.createElement(tagName), { attrs: { initvalue: { skip: true } } });

  describe("$initValue", () => {
    test("attr [initvalue] vs $initValue", () => {
      expect(el.$isReady).toBeTruthy();
      el.setAttribute("initvalue", cfg.initValues[0].attrValue);
      expect(el.getAttribute("initValue")).toBe(cfg.initValues[0].attrValue);
      jest.advanceTimersByTime(1);
      expect(el.$initValue).toBe(cfg.initValues[0].value);

      el.$initValue = cfg.initValues[1].value;
      jest.advanceTimersByTime(1);
      expect(el.$initValue).toBe(cfg.initValues[1].value);
      expect(el.getAttribute("initvalue")).toBe(null);

      el.setAttribute("initvalue", cfg.initValues[2].attrValue);
      jest.advanceTimersByTime(1);
      expect(el.$initValue).toBe(cfg.initValues[2].value);
      expect(el.getAttribute("initvalue")).toBe(cfg.initValues[2].attrValue);

      el.removeAttribute("initvalue");
      jest.advanceTimersByTime(1);
      expect(el.getAttribute("initvalue")).toBe(null);
      expect(el.$initValue).toBe(undefined);
    });

    test("$initValue vs $value", () => {
      el.$initValue = cfg.initValues[0].value;
      expect(el.$value).toBe(cfg.initValues[0].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(false);

      el.$initValue = cfg.initValues[1].value;
      expect(el.$value).toBe(cfg.initValues[1].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(false);

      el.$value = cfg.initValues[2].value;
      expect(el.$initValue).toBe(cfg.initValues[1].value);
      expect(el.$value).toBe(cfg.initValues[2].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(true);

      el.$initValue = cfg.initValues[0].value;
      expect(el.$value).toBe(cfg.initValues[2].value);
      expect(el.$isChanged).toBe(true);
    });
  });

  describe("base options", () => {
    test("autoComplete", () => {
      el.$options.autoComplete = "first-name";
      jest.advanceTimersByTime(1);
      expect(el.$refInput.autocomplete).toBe("first-name");

      el.$options.autoComplete = true;
      el.$options.name = "lastName";
      jest.advanceTimersByTime(1);
      expect(el.$refInput.autocomplete).toBe("lastName");

      el.$options.autoComplete = false;
      jest.advanceTimersByTime(1);
      expect(el.$refInput.autocomplete).toBe("off"); // todo it's wrong for password
    });

    test("autoFocus", () => {
      el = document.createElement(el.tagName) as WUPBaseControl;
      el.$options.autoFocus = true;
      document.body.appendChild(el);
      jest.advanceTimersByTime(1);
      expect(document.activeElement).toBe(el.$refInput);
    });

    test("clearActions", () => {
      // only clear
      el.$value = cfg.initValues[0].value;
      el.$initValue = cfg.initValues[1].value;
      el.$options.clearActions = 1 << 1; // clear
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.initValues[0].value);

      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(cfg.initValues[0].value); // rollback to previous value
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);

      el.$value = cfg.initValues[2].value;
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(cfg.initValues[2].value);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);

      // only reset to init
      el.$value = cfg.initValues[0].value;
      el.$initValue = cfg.initValues[1].value;
      el.$options.clearActions = 1 << 2; // resetToInit
      jest.advanceTimersByTime(1);

      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(cfg.initValues[1].value);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(cfg.initValues[0].value);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(cfg.initValues[1].value);
      expect(el.$refInput.selectionStart).toBe(0);
      expect(el.$refInput.selectionEnd).toBe(el.$refInput.value.length);

      // clear + resetToInit
      el.$value = cfg.initValues[0].value;
      el.$initValue = cfg.initValues[1].value;
      el.$options.clearActions = 0b1111111; // all
      jest.advanceTimersByTime(1);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(cfg.initValues[1].value);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);

      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(cfg.initValues[1].value);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);
    });
  });
}
