/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-export */
import WUPBaseControl, { ClearActions, ValidationCases } from "web-ui-pack/controls/baseControl";
import * as h from "../testHelper";

declare global {
  namespace WUPBase {
    interface ValidationMap {
      _alwaysValid: boolean;
      _alwaysInvalid: boolean;
    }
  }
}

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
    Element.prototype.scrollIntoView = jest.fn();
    let lastUniqueNum = 0;
    jest.spyOn(cfg.type, "$uniqueId", "get").mockImplementation(() => `txt${++lastUniqueNum}`);
    (elType.$defaults.validationRules as any)._alwaysValid = () => false;
    (elType.$defaults.validationRules as any)._alwaysInvalid = () => "Always error";

    el = document.createElement(cfg.htmlTag) as WUPBaseControl;
    cfg.onInit(el as T);
    document.body.appendChild(el);
    jest.advanceTimersByTime(1); // wait for ready
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete (elType.$defaults.validationRules as any)._alwaysValid;
    delete (elType.$defaults.validationRules as any)._alwaysInvalid;
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

      el.focus();
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
    const first = el;

    // just for coverage
    el = document.createElement(tagName) as WUPBaseControl;
    expect(() => el.$showError("Test when not connected")).not.toThrowError();
    // just for coverage
    document.body.appendChild(el);
    jest.advanceTimersByTime(1);
    // @ts-ignore
    expect(() => el.goShowError("Test with another target", first)).not.toThrowError();
    expect(() => el.$hideError()).not.toThrow();
    await h.wait();
  });

  test("$ariaDetails", () => {
    el.$ariaDetails("Some details for screen-readers");
    expect(el).toMatchSnapshot();
    el.$ariaDetails(null);
    expect(el).toMatchSnapshot();
  });

  test("focus by click", () => {
    expect(el.$isFocused).toBe(false);
    el.dispatchEvent(new MouseEvent("mousedown"));
    el.dispatchEvent(new MouseEvent("mouseup"));
    expect(el.$isFocused).toBe(true);

    el.blur();
    expect(el.$isFocused).toBe(false);
    el.$options.disabled = true;
    jest.advanceTimersByTime(1);
    el.dispatchEvent(new MouseEvent("mousedown"));
    el.dispatchEvent(new MouseEvent("mouseup"));
    expect(el.$isFocused).toBe(false);
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

    test("options.validationCase", async () => {
      el.$options.name = "firstInput";
      el.$options.clearActions = ClearActions.clear | 0;
      el.$options.validations = { required: true };
      el.$value = cfg.initValues[0].value;

      // onChange only
      el.$options.validationCase = ValidationCases.onChange | 0;
      expect(el).toMatchSnapshot();
      el.focus();
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // simulate change event
      expect(el.$isEmpty).toBe(true);
      await h.wait();
      expect(el.$refError).toBeDefined();
      expect(el).toMatchSnapshot();

      // onFocusWithValue
      el.$hideError();
      await h.wait();
      el.$options.validationCase = ValidationCases.onFocusWithValue | 0;
      el.$options.validations = { required: true, custom: () => "custom err here" };
      el.focus();
      await h.wait();
      expect(el.$refError).not.toBeDefined();
      expect(el.$isValid).toBe(false);
      expect(el.$refError).not.toBeDefined();
      el.blur();

      el.$value = cfg.initValues[0].value;
      el.focus();
      await h.wait();
      expect(el.$refError).toBeDefined();
      expect(el).toMatchSnapshot();

      // onFocusLost
      el.$hideError();
      el.blur();
      await h.wait();
      el.$value = undefined;
      el.$options.validationCase = ValidationCases.onFocusLost | 0;
      el.$options.validations = { required: true };
      await h.wait();
      expect(el.$refError).not.toBeDefined();
      el.focus();
      await h.wait();
      el.blur();
      await h.wait();
      expect(el.$refError).toBeDefined();
      expect(el).toMatchSnapshot();

      // onInit
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      el.$initValue = cfg.initValues[0].value;
      el.$options.validationCase = ValidationCases.onInit | 0;
      el.$options.validations = { custom: () => "custom err here", required: true, c2: () => false };
      await h.wait();
      expect(el.$refError).toBeDefined();

      // onChangeSmart
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      el.$options.validationCase = ValidationCases.onChangeSmart | 0;
      el.$options.validations = { required: true };
      el.$options.clearActions = ClearActions.clear | 0;
      el.$value = cfg.initValues[0].value;
      await h.wait();

      el.focus();
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // simulate change event
      expect(el.$isEmpty).toBe(true);
      await h.wait();
      expect(el.$refError).toBeDefined(); // because previously was valid and now need to show invalid state
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // simulate change event
      expect(el.$isEmpty).toBe(false);
      await h.wait();
      expect(el.$refError).not.toBeDefined();

      // cover case when el is invalid previously
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      el.$options.validationCase = ValidationCases.onChangeSmart | 0;
      el.$options.validations = { required: true, custom: () => "always err", c2: () => false };
      el.$options.clearActions = ClearActions.clear | 0;
      el.$value = undefined;
      await h.wait();
      // @ts-ignore
      el.setValue(cfg.initValues[0]);
      expect(el.$isValid).toBe(false);
      await h.wait();
      expect(el.$refError).not.toBeDefined();
      el.$options.validations = { required: true };
      // @ts-ignore
      el.setValue(cfg.initValues[1]);
      expect(el.$isValid).toBe(true); // was valid
      // @ts-ignore
      el.setValue(undefined);
      expect(el.$isValid).toBe(false);
      await h.wait();
      expect(el.$refError).toBeDefined();
    });

    test("options.validateDebounceMs", async () => {
      el.$options.validationCase = ValidationCases.onChange | 0;
      el.$options.validateDebounceMs = 500;
      el.$options.validations = { _alwaysInvalid: true };
      // @ts-ignore
      el.setValue(cfg.initValues[0].value);
      expect(el.$isValid).toBe(false);
      jest.advanceTimersByTime(499);
      expect(el.$refError).toBe(undefined);

      // @ts-ignore
      el.setValue(cfg.initValues[1].value);
      expect(el.$isValid).toBe(false);
      jest.advanceTimersByTime(499);
      expect(el.$refError).toBe(undefined);
      jest.advanceTimersByTime(2);
      expect(el.$refError).toBeDefined();

      el.$options.validateDebounceMs = 10;
      el.$hideError();
      await h.wait();
      expect(el.$refError).toBe(undefined);

      // @ts-ignore
      el.setValue(cfg.initValues[0].value);
      jest.advanceTimersByTime(9);
      expect(el.$refError).toBe(undefined);
      jest.advanceTimersByTime(2);
      expect(el.$refError).toBeDefined();
    });

    const ruleNames = Object.keys(elType.$defaults.validationRules);
    cfg.validations.required = { set: true, failValue: undefined, trueValue: cfg.initValues[0].value };

    test("$options.validationShowAll", async () => {
      el.$options.validationShowAll = true;
      const vld = {} as Record<string, any>;
      Object.keys(cfg.validations).map((k) => (vld[k] = cfg.validations[k].set));
      el.$options.validations = vld;
      el.$validate();
      await h.wait();
      expect(el.$refError).toBeDefined();
      expect(el).toMatchSnapshot();

      el.$value = cfg.initValues[0].value;
      el.$validate();
      await h.wait();
      expect(el).toMatchSnapshot();

      (el.$options.validations as any)._alwaysValid = true;
      el.$hideError();
      el.$validate();
      expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because impossible to get errorMessage

      el.$options.name = "firstName"; // again just for coverage
      el.$hideError();
      el.$validate();
      expect(() => jest.advanceTimersByTime(1000)).toThrow(); // because impossible to get errorMessage

      el.$options.validations = { required: true };
      el.$value = undefined;
      el.$hideError();
      el.$validate();
      expect(el.$isValid).toBe(false);
      await h.wait();
      expect(el).toMatchSnapshot();
    });

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

  test("with form", () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    el.$options.name = "firstInput";
    jest.advanceTimersByTime(1);
    expect(el.$form).toBe(form);
    expect(el.$form).toMatchSnapshot();

    // form.disabled
    expect(el.$isDisabled).toBe(false);
    form.$options.disabled = true;
    jest.advanceTimersByTime(1);
    expect(el.$isDisabled).toBe(true);
    expect(el.$refInput.disabled).toBe(true);

    el.$options.disabled = false;
    jest.advanceTimersByTime(1);
    expect(el.$isDisabled).toBe(true);

    form.$options.disabled = false;
    jest.advanceTimersByTime(1);
    expect(el.$isDisabled).toBe(false);
    expect(el.$refInput.disabled).toBe(false);

    el.$options.disabled = true;
    jest.advanceTimersByTime(1);
    expect(el.$isDisabled).toBe(true);

    // form.readOnly
    expect(el.$isReadOnly).toBe(false);
    form.$options.readOnly = true;
    jest.advanceTimersByTime(1);
    expect(el.$isReadOnly).toBe(true);
    expect(el.$refInput.readOnly).toBe(true);

    el.$options.readOnly = false;
    jest.advanceTimersByTime(1);
    expect(el.$isReadOnly).toBe(true);

    form.$options.readOnly = false;
    jest.advanceTimersByTime(1);
    expect(el.$isReadOnly).toBe(false);
    expect(el.$refInput.readOnly).toBe(false);

    el.$options.readOnly = true;
    jest.advanceTimersByTime(1);
    expect(el.$isReadOnly).toBe(true);

    // form.autoComplete
    expect(el.$autoComplete).toBe(false);
    form.$options.autoComplete = true;
    jest.advanceTimersByTime(1);
    expect(el.$autoComplete).toBeTruthy();
    expect(el.$refInput.autocomplete).toBeTruthy();

    el.$options.autoComplete = false;
    jest.advanceTimersByTime(1);
    expect(el.$autoComplete).toBeFalsy();
    expect(el.$refInput.autocomplete).toBe("off");

    form.$options.autoComplete = undefined;
    el.$options.autoComplete = undefined;
    jest.advanceTimersByTime(1);
    expect(el.$autoComplete).toBeFalsy();
    expect(el.$refInput.autocomplete).toBe("off");

    // form.$initModel vs control.$initValue
    form.$initModel = { firstInput: cfg.initValues[0].value };
    expect(el.$initValue).toBe(cfg.initValues[0].value);
    form.$initModel = { firstInput: cfg.initValues[1].value };
    expect(el.$initValue).toBe(cfg.initValues[1].value);

    el.$initValue = cfg.initValues[0].value;
    expect(el.$initValue).toBe(cfg.initValues[0].value);
    expect(form.$initModel).toMatchObject({ firstInput: cfg.initValues[0].value });
    form.$initModel = { firstInput: cfg.initValues[1].value };
    expect(el.$initValue).toBe(cfg.initValues[1].value);
  });
}
