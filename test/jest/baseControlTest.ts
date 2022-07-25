/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-export */
import WUPBaseControl, { ClearActions } from "web-ui-pack/controls/baseControl";
import * as h from "../testHelper";

interface InitOptions<T> {
  type: typeof WUPBaseControl;
  htmlTag: string;
  onInit: (el: T) => void;
}

let tagName = "";
let el: WUPBaseControl;
let elType: typeof WUPBaseControl;

/** Function with init-cylce beforeEach/afterEach */
export function initTestBaseControl<T extends WUPBaseControl>(cfg: InitOptions<T>) {
  !cfg.type && console.error("missed");
  tagName = cfg.htmlTag;
  elType = cfg.type;

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
  validations: Record<string, { set: any; failValue: T | undefined; trueValue: T }>;
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
      const spyChange = jest.fn();
      el.addEventListener("$change", spyChange);

      el.$initValue = cfg.initValues[0].value;
      expect(el.$value).toBe(cfg.initValues[0].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(false);
      expect(spyChange).toBeCalledTimes(1); // change event happens even via $initValue

      el.$initValue = cfg.initValues[1].value;
      expect(el.$value).toBe(cfg.initValues[1].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(false);
      expect(spyChange).toBeCalledTimes(2); // change event happens even via $initValue

      el.$value = cfg.initValues[2].value;
      expect(el.$initValue).toBe(cfg.initValues[1].value);
      expect(el.$value).toBe(cfg.initValues[2].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(true);
      expect(spyChange).toBeCalledTimes(3); // change event happens even via $initValue

      el.$initValue = cfg.initValues[0].value;
      expect(el.$value).toBe(cfg.initValues[2].value);
      expect(el.$isChanged).toBe(true);
      expect(spyChange).toBeCalledTimes(3);

      // checking when el not isReady
      spyChange.mockClear();
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      el.addEventListener("$change", spyChange);

      el.$value = cfg.initValues[0].value;
      expect(spyChange).not.toBeCalled(); // because el is not ready yet
      jest.advanceTimersByTime(1);
      el.$value = cfg.initValues[0].value;
      expect(spyChange).not.toBeCalled(); // because no changes
      el.$value = cfg.initValues[1].value;
      expect(spyChange).toBeCalledTimes(1);
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
      expect(el.$isFocused).toBe(false);
      jest.advanceTimersByTime(1);
      expect(document.activeElement).toBe(el.$refInput);
      expect(el.$isFocused).toBe(true);
    });

    test("clearActions", () => {
      // only clear
      el.$value = cfg.initValues[0].value;
      el.$initValue = cfg.initValues[1].value;
      el.$options.clearActions = ClearActions.clear as any;
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
      el.$options.clearActions = ClearActions.resetToInit as any;
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
      el.$options.clearActions = ClearActions.clear | ClearActions.resetToInit;
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

    test("disabled", () => {
      el.$options.disabled = true;
      jest.advanceTimersByTime(1);
      expect(el.$isDisabled).toBe(true);
      expect(el.getAttribute("disabled")).toBe("");
      expect(el.$refInput.disabled).toBe(true);

      el.$options.disabled = false;
      jest.advanceTimersByTime(1);
      expect(el.$isDisabled).toBe(false);
      expect(el.getAttribute("disabled")).toBe(null);
      expect(el.$refInput.disabled).toBe(false);
    });

    test("label", () => {
      el.$options.label = "Hello";
      jest.advanceTimersByTime(1);
      expect(el.$refTitle.textContent).toBe("Hello");

      el.$options.label = "Some-new";
      jest.advanceTimersByTime(1);
      expect(el.$refTitle.textContent).toBe("Some-new");

      el.$options.label = undefined;
      jest.advanceTimersByTime(1);
      expect(el.$refTitle.textContent).toBe("");
    });

    test("readonly", () => {
      el.$options.readOnly = true;
      jest.advanceTimersByTime(1);
      expect(el.getAttribute("readonly")).toBe("");
      expect(el.$isReadOnly).toBe(true);
      expect(el.$refInput.readOnly).toBe(true);

      el.$options.readOnly = false;
      jest.advanceTimersByTime(1);
      expect(el.$isReadOnly).toBe(false);
      expect(el.getAttribute("readonly")).toBe(null);
      expect(el.$refInput.readOnly).not.toBe(true);
    });

    test("name - without form", () => {
      el.$options.name = "firstName";
      el.$options.label = undefined;
      jest.advanceTimersByTime(1);
      expect(el.$refTitle.textContent).toBe("First Name");
      expect(el.$refInput.getAttribute("aria-label")).toBe(null);

      el.$options.label = "";
      jest.advanceTimersByTime(1);
      expect(el.$refTitle.textContent).toBe("");
      expect(el.$refInput.getAttribute("aria-label")).toBe("First Name");

      el.$options.name = undefined;
      jest.advanceTimersByTime(1);
      expect(el.$refTitle.textContent).toBe("");
      expect(el.$refInput.getAttribute("aria-label")).toBe(null);
    });
  });

  test("$show/$hide error", async () => {
    expect(el).toMatchSnapshot();
    el.$showError("Some custom message here");
    expect(el).toMatchSnapshot();
    el.$hideError();
    await h.wait();
    expect(el).toMatchSnapshot();
  });

  test("validation cases", () => {
    throw new Error("Need to implement");
  });

  describe("validations", () => {
    test("get $isValid() when not ready", () => {
      const el2 = document.createElement(tagName) as WUPBaseControl;
      el2.$options.validations = {};
      expect(el2.$isValid).toBeTruthy();
    });

    test("via attr [validations]", () => {
      const vld = { required: true };
      (window as any)._testVld = vld;
      el.setAttribute("validations", "_testVld");
      jest.advanceTimersByTime(1);
      expect((el as any).validations).toBe(vld);

      el.$value = undefined;
      expect(el.$validate()).not.toBe(false);
      expect(el.$isValid).toBe(false);

      el.$value = cfg.initValues[0].value;
      expect(el.$validate()).toBe(false);
      expect(el.$isValid).toBe(true);

      delete (window as any)._testVld;
      expect(el.$validate()).toBe(false);
      expect(el.$isValid).toBe(true);
    });

    test("rule not exists", () => {
      el.$options.validations = { no: true } as any;
      expect(() => el.$validate()).toThrowError();
      el.$options.name = "Me"; // just for coverage
      expect(() => el.$validate()).toThrowError();
    });

    const ruleNames = Object.keys(elType.$defaults.validationRules);
    cfg.validations.required = { set: true, failValue: undefined, trueValue: cfg.initValues[0].value };

    ruleNames.forEach((ruleName) => {
      test(`.${ruleName}`, () => {
        const isRuleRequired = ruleName === "required";
        expect(cfg.validations).toHaveProperty(ruleName);
        const vld = cfg.validations[ruleName];

        el.$value = vld.failValue;
        el.$options.validations = { [ruleName]: vld.set };

        if (isRuleRequired) {
          jest.advanceTimersByTime(1);
          expect(el.$refInput.getAttribute("aria-required")).toBe("true");
        }

        const defMsg = elType.$defaults.validationRules![ruleName]!(vld.failValue as any, vld.set);
        expect(defMsg).toBeTruthy();
        expect(el.$validate()).toBe(defMsg);
        expect(el.$isValid).toBe(false);

        el.$value = vld.trueValue;
        expect(el.$validate()).toBe(false);
        expect(el.$isValid).toBe(true);

        // with custom error
        el.$options.validations = { [ruleName]: (v: any) => v === undefined && "Custom error" };
        el.$value = undefined;
        expect(el.$validate()).toBe("Custom error");
        expect(el.$isValid).toBe(false);

        if (isRuleRequired) {
          el.$options.validations = {};
          jest.advanceTimersByTime(1);
          expect(el.$refInput.getAttribute("aria-required")).toBe(null);
        }
      });
    });
  });
}

// todo test $showError(), $hideError()
// todo test form-integration

// todo e2e $options.validityDebounce
// todo e2e check focused by click event (mouse-down/mouse-up)
