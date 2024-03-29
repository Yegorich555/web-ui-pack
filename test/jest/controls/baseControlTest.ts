/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-export */
import WUPBaseControl, {
  ClearActions,
  ValidationCases,
  ValidateFromCases,
  SetValueReasons,
} from "web-ui-pack/controls/baseControl";
import * as h from "../../testHelper";
import { BaseTestOptions } from "../../testHelper";

declare global {
  namespace WUP.BaseControl {
    interface ValidityMap {
      $alwaysValid: boolean;
      $alwaysInvalid: boolean;
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

/** Function with init-cycle beforeEach/afterEach */
export function initTestBaseControl<T extends WUPBaseControl>(cfg: InitOptions<T>) {
  !cfg.type && console.error("missed");
  tagName = cfg.htmlTag;
  elType = cfg.type;

  beforeEach(async () => {
    jest.useFakeTimers();
    let lastUniqueNum = 0;
    jest.spyOn(cfg.type, "$uniqueId", "get").mockImplementation(() => `txt${++lastUniqueNum}`);
    (elType.$defaults.validationRules as any).$alwaysValid = () => false;
    (elType.$defaults.validationRules as any).$alwaysInvalid = () => "Always error";

    el = document.createElement(cfg.htmlTag) as WUPBaseControl;
    cfg.onInit(el as T);
    document.body.appendChild(el);
    await h.wait(1); // wait for ready
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete (elType.$defaults.validationRules as any).$alwaysValid;
    delete (elType.$defaults.validationRules as any).$alwaysInvalid;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
}

interface ValueToAttr<T> {
  value: T;
  attrValue: string;
  urlValue?: string | null;
}

interface TestOptions<T> extends BaseTestOptions {
  /** For switch it's false */
  emptyValue?: any;
  /** For switch it's undefined */
  emptyInitValue?: any;
  initValues: [ValueToAttr<T>, ValueToAttr<T>, ValueToAttr<T>];
  validations: Record<string, { set: any; failValue: T | undefined; trueValue: T }>;
  validationsSkip?: string[];
  autoCompleteOff?: "off" | "new-password";
  /** Set true to ignore select in input text */
  noInputSelection?: boolean;
  onCreateNew: (el: WUPBaseControl) => void;
  testReadonly: { true: (el: WUPBaseControl) => void; false: (el: WUPBaseControl) => void };
}

export function testBaseControl<T>(cfg: TestOptions<T>) {
  cfg.autoCompleteOff = cfg.autoCompleteOff || "off";
  cfg.emptyValue = "emptyValue" in cfg ? cfg.emptyValue : undefined;
  const hasVldRequired = !cfg.validationsSkip?.includes("required");

  h.baseTestComponent(() => document.createElement(tagName), {
    attrs: {
      "w-label": { value: "First Name" },
      "w-name": { value: "firstN" },
      "w-autocomplete": { value: true },
      "w-autofocus": { value: true },
      disabled: { value: true, equalValue: "" },
      "w-disabled": { value: true, equalValue: "", skip: true },
      readonly: { value: true, equalValue: "" },
      "w-readonly": { value: true, equalValue: "", skip: true },
      "w-validations": { value: { required: true } },
      "w-validatedebouncems": { value: 13 },
      "w-validationcase": { value: 1 },
      "w-validationrules": { skip: true },
      "w-validationshowall": { value: true },
      "w-clearactions": { value: 1 },
      "w-focusdebouncems": { value: 12 },
      "w-storagekey": { value: "strg" },
      "w-storage": { value: "session" },

      "w-initvalue": { skip: true }, // manual testing
      ...cfg.attrs,
    },
  });

  describe("$initValue", () => {
    test("attr [initvalue] vs $initValue", async () => {
      expect(el.$isReady).toBe(true);
      el.setAttribute("w-initvalue", cfg.initValues[0].attrValue);
      expect(el.getAttribute("w-initvalue")).toStrictEqual(cfg.initValues[0].attrValue);
      await h.wait(1);
      expect(el.$initValue).toStrictEqual(cfg.initValues[0].value);

      el.$initValue = cfg.initValues[1].value;
      await h.wait(1);
      expect(el.getAttribute("w-initvalue")).toBe(null);
      expect(el.$initValue).toStrictEqual(cfg.initValues[1].value);

      el.setAttribute("w-initvalue", cfg.initValues[2].attrValue);
      await h.wait(1);
      expect(el.$initValue).toStrictEqual(cfg.initValues[2].value);
      expect(el.getAttribute("w-initvalue")).toStrictEqual(cfg.initValues[2].attrValue);

      el.removeAttribute("w-initvalue");
      await h.wait(1);
      expect(el.getAttribute("w-initvalue")).toBe(null);
      expect(el.$initValue).toStrictEqual(cfg.emptyInitValue);

      let prev = el.$initValue;
      jest.spyOn(el, "parse").mockImplementationOnce(() => {
        throw new Error("Test err");
      });
      el.setAttribute("w-initvalue", "wrong value");
      expect(() => jest.advanceTimersByTime(1)).toThrow();
      await h.wait(1);
      expect(el.$initValue).toStrictEqual(prev);

      el.setAttribute("w-initvalue", cfg.initValues[0].attrValue);
      prev = el.$initValue;
      await h.wait(1);
      el.setAttribute("w-initvalue", ""); // set empty value must return undefined
      await h.wait(1);
      const isBool = typeof cfg.initValues[0].value === "boolean";
      expect(el.$initValue).toStrictEqual(isBool ? true : prev);
    });

    test("$initValue vs $value", () => {
      const spyChange = jest.fn();
      el.addEventListener("$change", spyChange);

      el.$initValue = cfg.initValues[0].value;
      expect(el.$value).toBe(cfg.initValues[0].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(false);
      jest.advanceTimersByTime(1);
      expect(spyChange).toBeCalledTimes(0);
      // expect(spyChange.mock.lastCall[0].detail).toStrictEqual({ reason: SetValueReasons.initValue });

      el.$initValue = cfg.initValues[1].value;
      expect(el.$value).toBe(cfg.initValues[1].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(false);
      jest.advanceTimersByTime(1);
      expect(spyChange).toBeCalledTimes(0);

      el.$value = cfg.initValues[2].value;
      expect(el.$initValue).toBe(cfg.initValues[1].value);
      expect(el.$value).toBe(cfg.initValues[2].value);
      expect(el.$isDirty).toBe(false);
      expect(el.$isChanged).toBe(true);
      jest.advanceTimersByTime(1);
      expect(spyChange).toBeCalledTimes(1);
      expect(spyChange.mock.lastCall[0].detail).toStrictEqual({ reason: SetValueReasons.manual });

      el.$initValue = cfg.initValues[1].value;
      expect(el.$value).toBe(cfg.initValues[2].value);
      expect(el.$isChanged).toBe(true);
      jest.advanceTimersByTime(1);
      expect(spyChange).toBeCalledTimes(1);

      // checking when el not isReady
      spyChange.mockClear();
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      cfg.onCreateNew?.call(cfg, el);
      el.addEventListener("$change", spyChange);

      el.$value = cfg.initValues[0].value;
      jest.advanceTimersByTime(1);
      expect(spyChange).not.toBeCalled(); // because el is not ready yet
      jest.advanceTimersByTime(1);
      el.$value = cfg.initValues[0].value;
      jest.advanceTimersByTime(1);
      expect(spyChange).not.toBeCalled(); // because no changes
      el.$value = cfg.initValues[1].value;
      jest.advanceTimersByTime(1);
      expect(spyChange).toBeCalledTimes(1);

      // $initValue not override $value
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      cfg.onCreateNew?.call(cfg, el);
      el.$value = cfg.initValues[0].value;
      el.$initValue = cfg.initValues[1].value;
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.initValues[0].value);
      // $initValue is changeable
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      cfg.onCreateNew?.call(cfg, el);
      el.$initValue = cfg.initValues[0].value;
      el.$initValue = cfg.initValues[1].value;
      jest.advanceTimersByTime(1);
      expect(el.$initValue).toBe(cfg.initValues[1].value);
      expect(el.$value).toBe(el.$initValue);
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
      expect(el.$refInput.autocomplete).toBe(cfg.autoCompleteOff);

      el.setAttribute("w-autocomplete", "false");
      jest.advanceTimersByTime(1);
      expect(el.$options.autoComplete).toBe(false);

      el.setAttribute("w-autocomplete", "true");
      jest.advanceTimersByTime(1);
      expect(el.$options.autoComplete).toBe(true);

      el.setAttribute("w-autocomplete", "email");
      jest.advanceTimersByTime(1);
      expect(el.$options.autoComplete).toBe("email");
    });

    test("autoFocus", () => {
      el = document.createElement(el.tagName) as WUPBaseControl;
      cfg.onCreateNew?.call(cfg, el);
      el.$options.autoFocus = true;
      document.body.appendChild(el);
      expect(el.$isFocused).toBe(false);
      jest.advanceTimersByTime(100);
      expect(document.activeElement).toBe(el.$refInput);
      expect(el.$isFocused).toBe(true);
    });

    test("clearActions", async () => {
      // only clear
      el.$value = cfg.initValues[0].value;
      el.$initValue = cfg.initValues[1].value;
      el.$options.clearActions = ClearActions.clear as any;
      await h.wait(1);
      expect(el.$value).toBe(cfg.initValues[0].value);

      el.focus();
      await h.wait(1);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      (el as any).$refPopup && el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // again because menu was opened
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.emptyValue);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.emptyValue);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.emptyValue);

      // clear > back
      const val = cfg.initValues[0].value;
      const initVal = cfg.initValues[1].value;
      el.$value = val;
      el.$initValue = initVal;
      el.$options.clearActions = ClearActions.clearBack | 0;
      await h.wait(1);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.emptyValue);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(val);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.emptyValue);
      if (!cfg.noInputSelection) {
        expect(el.$refInput.selectionStart).toBe(0);
        expect(el.$refInput.selectionEnd).toBe(el.$refInput.value.length);
      }

      // reset to init > clear > back
      el.$options.clearActions = ClearActions.initClearBack | 0;
      el.$initValue = initVal;
      el.$value = val;
      await h.wait();
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(initVal);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.emptyValue);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(initVal);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe(cfg.emptyValue);
    });

    test("disabled", () => {
      el.$options.disabled = true;
      jest.advanceTimersByTime(1);
      expect(el.$isDisabled).toBe(true);
      expect(el.getAttribute("disabled")).toBe("");
      expect(((el as any).$refFieldset || el.$refInput).disabled).toBe(true);

      el.$options.disabled = false;
      jest.advanceTimersByTime(1);
      expect(el.$isDisabled).toBe(false);
      expect(el.getAttribute("disabled")).toBe(null);
      expect(((el as any).$refFieldset || el.$refInput).disabled).toBe(false);
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
      if (cfg.testReadonly) cfg.testReadonly.true(el);
      else if (!cfg.$options?.readOnly?.ignoreInput) expect(el.$refInput.readOnly).toBe(true);

      el.$options.readOnly = false;
      jest.advanceTimersByTime(1);
      expect(el.$isReadOnly).toBe(false);
      expect(el.getAttribute("readonly")).toBe(null);
      if (!cfg.$options?.readOnly?.ignoreInput) expect(el.$refInput.readOnly).not.toBe(true);
      if (cfg.testReadonly) cfg.testReadonly.false(el);
      else if (!cfg.$options?.readOnly?.ignoreInput) expect(el.$refInput.readOnly).not.toBe(true);
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

    test("storageKey", async () => {
      const onThrowErr = jest.spyOn(WUPBaseControl.prototype, "throwError");
      if (cfg.attrs?.["w-storagekey"]?.skip || cfg.attrs?.["w-storagekey"] === null) {
        return; // for password isn't allowed
      }
      const spyChange = jest.fn();
      // local storage
      const sSet = jest.spyOn(Storage.prototype, "setItem");
      const sGet = jest.spyOn(Storage.prototype, "getItem");
      const sRem = jest.spyOn(Storage.prototype, "removeItem");
      el.$options.clearActions = ClearActions.clear | 0;
      el.$options.name = "name1";
      el.$options.storageKey = true;
      el.$value = cfg.initValues[0].value;
      await h.wait(1);
      expect(el.storageKey).toBe("name1");
      expect(sSet).toBeCalledTimes(1);
      expect(sSet).lastCalledWith("name1", cfg.initValues[0].urlValue ?? (cfg.initValues[0].value as any).toString());
      expect(window.localStorage.getItem("name1")).toBeDefined(); // (cfg.initValues[0].attrValue);
      // getItem on init
      jest.clearAllMocks();
      el = document.body.appendChild(document.createElement(el.tagName)) as WUPBaseControl;
      el.$onChange = spyChange;
      cfg.onCreateNew?.call(cfg, el);
      el.$options.name = "name1";
      el.$options.storageKey = true;
      await h.wait(1);
      expect(el.storageKey).toBe("name1");
      expect(sGet).toBeCalledTimes(1);
      expect(sGet).lastCalledWith("name1");
      expect(el.$value).toStrictEqual(cfg.initValues[0].value);
      expect(el.$initValue).toBe(undefined);
      expect(onThrowErr).not.toBeCalled();
      expect(spyChange).toBeCalledTimes(1);
      expect(spyChange.mock.lastCall[0].detail).toStrictEqual({ reason: SetValueReasons.storage });

      // clearing value
      el.clearValue();
      await h.wait(1);
      expect(sRem).toBeCalledTimes(1);
      expect(onThrowErr).not.toBeCalled();

      // name is empty
      jest.clearAllMocks();
      el.$options.name = "";
      el.$options.storageKey = true;
      await h.wait(1);
      expect(sGet).toBeCalledTimes(0);

      expect(el.storageKey).toBe("");
      // @ts-ignore
      expect(el.storageGet()).toStrictEqual(el.$initValue); // cover case when storageKey is falsy
      el.$value = cfg.initValues[2].value;
      await h.wait(1);
      expect(sSet).toBeCalledTimes(0); // because name is missed
      el.clearValue();
      el.$options.name = "name1";
      await h.wait(1);

      // storage is full
      if (cfg.initValues[1].urlValue !== null) {
        sSet.mockImplementationOnce(() => {
          throw new Error("Storage is exceeded");
        });
        el.$value = cfg.initValues[1].value;
        await expect(h.wait()).rejects.toThrow();
        el.$value = cfg.initValues[0].value;
        await expect(h.wait()).resolves.not.toThrow(); // because exception was once
      }
      onThrowErr.mockClear();
      await h.wait();

      // session storage
      el = document.body.appendChild(document.createElement(el.tagName)) as WUPBaseControl;
      // el.$onChange = spyChange;
      cfg.onCreateNew?.call(cfg, el);
      el.$options.storage = "session";
      el.$options.storageKey = "name2";
      await h.wait(1);
      expect(el.$value).toStrictEqual(cfg.emptyValue);
      el.$value = cfg.initValues[0].value;
      jest.clearAllMocks();
      el.$value = cfg.initValues[1].value; // to call change event
      await h.wait();
      if (cfg.initValues[1].urlValue === null) {
        expect(sRem).toBeCalledTimes(1);
        expect(sRem).lastCalledWith("name2");
      } else {
        expect(sSet).toBeCalledTimes(1);
        expect(sSet).lastCalledWith("name2", cfg.initValues[1].urlValue ?? (cfg.initValues[1].value as any).toString());
      }
      el.$value = cfg.initValues[2].value;
      await h.wait(1);
      expect(window.sessionStorage.getItem("name2")).toBeDefined(); // .toBe(cfg.initValues[1].attrValue);
      // getItem on init
      jest.clearAllMocks();
      el = document.body.appendChild(document.createElement(el.tagName)) as WUPBaseControl;
      cfg.onCreateNew?.call(cfg, el);
      el.$options.storage = "session";
      el.$options.storageKey = "name2";
      await h.wait(1);
      expect(sGet).toBeCalledTimes(1);
      expect(sGet).lastCalledWith("name2");
      expect(el.$value).toStrictEqual(cfg.initValues[2].value);
      expect(onThrowErr).not.toBeCalled();

      window.localStorage.clear();
      window.sessionStorage.clear();
      jest.clearAllMocks();

      // browser url
      cfg.onCreateNew?.call(cfg, el);
      el.$options.storage = "url";
      el.$options.storageKey = "su";
      await h.wait(1);
      expect(window.location.href).toBe("http://localhost/");
      const testValues = cfg.initValues[1];
      el.$value = testValues.value;
      await h.wait(1);
      const strVal = testValues.urlValue === undefined ? (testValues.value as any).toString() : testValues.urlValue;
      const params = strVal == null ? "" : `?su=${window.encodeURIComponent(strVal).replace(/%20/g, "+")}`;
      expect(window.location.href).toBe(`http://localhost/${params}`);
      // getItem on init
      el = document.body.appendChild(document.createElement(el.tagName)) as WUPBaseControl;
      cfg.onCreateNew?.call(cfg, el);
      el.$options.storage = "url";
      el.$options.storageKey = "su";
      await h.wait(1);
      expect(el.$value).toStrictEqual(cfg.initValues[1].urlValue === null ? cfg.emptyValue : testValues.value);
      expect(onThrowErr).not.toBeCalled();
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
    cfg.onCreateNew?.call(cfg, el);
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

  test("$ariaSpeak", async () => {
    el.$refInput.setAttribute("aria-describedby", "my-test-id");
    el.$ariaSpeak("Hello");
    await h.wait(110);
    const a = el.$refInput.getAttribute("aria-describedby");
    expect(a?.includes("my-test-id")).toBe(true);
    el.$refInput.setAttribute("aria-describedby", `${a} my-test-id2`.trim());
    expect(el).toMatchSnapshot();
    await h.wait(1000);
    expect(el.$refInput.getAttribute("aria-describedby")).toBe("my-test-id my-test-id2");
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
      expect(el2.$isValid).toBe(true);
    });

    if (hasVldRequired) {
      test("via attr [validations]", () => {
        const vld = { required: true };
        (window as any)._testVld = vld;
        el.setAttribute("w-validations", "_testVld");
        jest.advanceTimersByTime(1);
        expect((el as any).validations).toBe(vld);

        el.$value = undefined;
        expect(el.$validate()).not.toBe(false);
        expect(el.$isValid).toBe(false);

        el.$value = cfg.initValues[0].value;
        expect(el.$validate()).toBe(false);
        expect(el.$isValid).toBe(true);

        (window as any)._testVld = null;
        expect(el.$validate()).toBe(false);
        expect(el.$isValid).toBe(true);

        (window as any)._testVld = undefined;
        (window as any)._testVld2 = undefined;
        const onErr = jest.spyOn(el, "throwError");
        el.setAttribute("w-validations", "_testVld2");
        expect(() => jest.advanceTimersByTime(1)).toThrow();
        expect(() => el.$validate()).not.toThrow(); // because key is pointed but value undefined
        expect(onErr).toBeCalled();
        h.unMockConsoleError();
      });
    }

    test("rule not exists", () => {
      el.$options.validations = { no: true } as any;
      el.$value = cfg.initValues[0].value;
      expect(() => el.$validate()).toThrowError();
      el.$options.name = "Me"; // just for coverage
      expect(() => el.$validate()).toThrowError();
    });

    test("options.validationCase", async () => {
      el.$options.name = "firstInput";
      el.$options.clearActions = ClearActions.clearBack | 0;
      el.$options.validations = { required: true };
      el.$value = cfg.initValues[0].value;

      // onChange only
      el.$options.validationCase = ValidationCases.onChange | 0;
      expect(el).toMatchSnapshot();
      el.focus();
      await h.wait(1);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // simulate change event
      (el as any).$refPopup && el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // again because menu was opened and prev-Esc closed it but not affect on input clearing
      jest.advanceTimersByTime(1);

      expect(el.$isEmpty).toBe(true);
      el.blur();
      await h.wait();
      if (cfg.emptyValue === cfg.emptyInitValue) {
        expect(el.$refError).toBeDefined();
        expect(el).toMatchSnapshot();
      }

      // onFocusWithValue
      el.$hideError();
      await h.wait();
      el.$options.validationCase = ValidationCases.onFocusWithValue | 0;
      el.$options.validations = { required: true, custom: () => "custom err here" };
      el.focus();
      await h.wait();
      expect(el.$refError).not.toBeDefined();
      if (cfg.emptyValue === cfg.emptyInitValue) {
        expect(el.$isValid).toBe(false);
        expect(el.$refError).not.toBeDefined();
      }
      el.blur();

      el.$value = cfg.initValues[0].value;
      el.focus();
      await h.wait();
      expect(el.$refError).toBeDefined();
      expect(el.$isValid).toBe(false);
      expect(el).toMatchSnapshot();

      // onFocusLost
      el.$hideError();
      el.blur();
      await h.wait();
      el.$value = undefined;
      el.$options.validationCase = ValidationCases.onFocusLost | 0;
      el.$options.validations = hasVldRequired ? { required: true } : { $alwaysInvalid: true };
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
      cfg.onCreateNew?.call(cfg, el);
      el.$initValue = cfg.initValues[0].value;
      el.$options.validationCase = ValidationCases.onInit | 0;
      el.$options.validations = { custom: () => "custom err here", required: true, c2: () => false };
      const onVld = jest.spyOn(el.$options.validations!, "custom");
      await h.wait();
      expect(el.$refError).toBeDefined();
      expect(onVld).lastCalledWith(el.$initValue, el, ValidateFromCases.onInit);

      // onChangeSmart
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      cfg.onCreateNew?.call(cfg, el);
      el.$options.validationCase = ValidationCases.onChangeSmart | 0;
      el.$options.validations = { required: true };
      el.$options.clearActions = ClearActions.clearBack | 0;
      el.$value = cfg.initValues[0].value;
      await h.wait();

      if (cfg.emptyValue === cfg.emptyInitValue) {
        el.focus();
        await h.wait(1);
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // simulate change event
        (el as any).$refPopup && el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // again because menu was opened
        jest.advanceTimersByTime(1);
        expect(el.$isEmpty).toBe(true);
        await h.wait();
        expect(el.$refError).toBeDefined(); // because previously was valid and now need to show invalid state
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // simulate change event
        jest.advanceTimersByTime(1);
        expect(el.$isEmpty).toBe(false);
        await h.wait();
        expect(el.$refError).not.toBeDefined();
      }

      // cover case when el is invalid previously
      el = document.body.appendChild(document.createElement(tagName)) as WUPBaseControl;
      cfg.onCreateNew?.call(cfg, el);
      el.$options.validationCase = ValidationCases.onChangeSmart | 0;
      el.$options.validations = { required: true, custom: () => "always err", c2: () => false };
      el.$options.clearActions = ClearActions.clear | 0;
      el.$value = undefined;
      await h.wait();
      // @ts-ignore
      el.setValue(cfg.initValues[0].value);
      expect(el.$isValid).toBe(false);
      await h.wait();
      expect(el.$refError).not.toBeDefined();
      el.$options.validations = { required: true };
      // @ts-ignore
      el.setValue(cfg.initValues[1].value);
      expect(el.$isValid).toBe(true); // was valid
      if (cfg.emptyValue === cfg.emptyInitValue) {
        // @ts-ignore
        el.setValue(undefined);
        expect(el.$isValid).toBe(false);
        await h.wait();
        expect(el.$refError).toBeDefined();
      }

      // cover case when focusOut but error left
      el.$value = cfg.initValues[0].value;
      el.$options.validations = { $alwaysInvalid: true };
      (document.activeElement as HTMLElement)!.blur();
      await h.wait();
      el.$refInput.focus();
      el.$validate(false);
      await h.wait();
      expect(el.$isValid).toBe(false);
      expect(el.$refError).toBeDefined();
      (document.activeElement as HTMLElement)!.blur();
      await h.wait();
      expect(el.$isValid).toBe(false);
      expect(el.$refError).toBeDefined(); // popup must left even focusout
    });

    test("options.validateDebounceMs", async () => {
      el.$options.validationCase = ValidationCases.onChange | 0;
      el.$options.validateDebounceMs = 500;
      el.$options.validations = { $alwaysInvalid: true };
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
      await h.wait(9);
      expect(el.$refError).toBe(undefined);
      await h.wait(2);
      expect(el.$refError).toBeDefined();
    });

    const ruleNames = Object.keys(elType.$defaults.validationRules);
    if (!cfg.validationsSkip?.includes("required")) {
      cfg.validations.required = { set: true, failValue: undefined, trueValue: cfg.initValues[0].value };
    }
    const hasValidations = !!Object.keys(cfg.validations).length;

    hasValidations &&
      test("$options.validationShowAll", async () => {
        el.$options.validationShowAll = true;
        const vld = {} as Record<string, any>;
        Object.keys(cfg.validations).forEach((k) => (vld[k] = cfg.validations[k].set));
        el.$options.validations = vld;
        el.$validate();
        await h.wait();
        expect(el.$refError).toBeDefined();
        expect(el).toMatchSnapshot();

        el.$value = cfg.initValues[0].value;
        el.$validate();
        await h.wait();
        expect(el).toMatchSnapshot();

        (el.$options.validations as any).$alwaysValid = true;
        (el.$options.validations as any).$alwaysInvalid = true;

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

    ruleNames.forEach((ruleName: string) => {
      if ((cfg.validationsSkip as any)?.includes(ruleName)) {
        return;
      }

      test(`.${ruleName}`, async () => {
        const isRuleRequired = ruleName === "required";
        expect(cfg.validations).toHaveProperty(ruleName);
        const vld = cfg.validations[ruleName];

        el.$value = vld.failValue;
        el.$options.validations = { [ruleName]: vld.set };

        if (isRuleRequired) {
          await h.wait(1);
          expect(el.$refInput.getAttribute("aria-required")).toBe("true");
        }

        const defMsg = elType.$defaults.validationRules![ruleName]!(vld.failValue as any, vld.set, el);
        expect(defMsg).toBeTruthy();
        expect(el.$validate()).toBe(defMsg);
        expect(el.$isValid).toBe(false);

        el.$value = vld.trueValue;
        expect(el.$validate()).toBe(false);
        expect(el.$isValid).toBe(true);

        // with custom error
        el.$options.validations = { [ruleName]: (v: any) => v === undefined || "Custom error" };
        el.$value = cfg.initValues[0].value;
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

  test("validation when disabled", () => {
    el.$value = cfg.initValues[0].value;
    el.$options.validations = { $alwaysInvalid: true };
    jest.advanceTimersByTime(1);
    el.$validate();
    expect(el.$isValid).toBe(false);
    expect(el.$refError).toBeTruthy();

    el.$options.disabled = true;
    jest.advanceTimersByTime(1);
    expect(el.$isValid).toBe(false); // still invalid
    expect(el.$refError).toBeFalsy(); // message hidden because control disabled
    expect(el.$value).toBeTruthy(); // value still here even invalid
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
    expect(((el as any).$refFieldset || el.$refInput).disabled).toBe(true);

    el.$options.disabled = false;
    jest.advanceTimersByTime(1);
    expect(el.$isDisabled).toBe(true);

    form.$options.disabled = false;
    jest.advanceTimersByTime(1);
    expect(el.$isDisabled).toBe(false);
    expect(((el as any).$refFieldset || el.$refInput).disabled).toBe(false);

    el.$options.disabled = true;
    jest.advanceTimersByTime(1);
    expect(el.$isDisabled).toBe(true);

    // form.readOnly
    expect(el.$isReadOnly).toBe(false);
    form.$options.readOnly = true;
    jest.advanceTimersByTime(1);
    expect(el.$isReadOnly).toBe(true);
    if (cfg.testReadonly) cfg.testReadonly.true(el);
    else if (!cfg.$options?.readOnly?.ignoreInput) expect(el.$refInput.readOnly).toBe(true);

    el.$options.readOnly = false;
    jest.advanceTimersByTime(1);
    expect(el.$isReadOnly).toBe(true);

    form.$options.readOnly = false;
    jest.advanceTimersByTime(1);
    expect(el.$isReadOnly).toBe(false);
    if (cfg.testReadonly) cfg.testReadonly.true(el);
    else if (!cfg.$options?.readOnly?.ignoreInput) expect(el.$refInput.readOnly).toBe(false);

    el.$options.readOnly = true;
    jest.advanceTimersByTime(1);
    expect(el.$isReadOnly).toBe(true);

    // form.autoComplete
    expect(el.$autoComplete).toBeFalsy();
    form.$options.autoComplete = true;
    jest.advanceTimersByTime(1);
    expect(el.$autoComplete).toBeTruthy();
    expect(el.$refInput.autocomplete).toBeTruthy();

    el.$options.autoComplete = false;
    jest.advanceTimersByTime(1);
    expect(el.$autoComplete).toBeFalsy();
    expect(el.$refInput.autocomplete).toBe(cfg.autoCompleteOff);

    // @ts-ignore
    form.$options.autoComplete = undefined;
    // @ts-ignore
    el.$options.autoComplete = undefined;
    jest.advanceTimersByTime(1);
    expect(el.$autoComplete).toBeFalsy();
    expect(el.$refInput.autocomplete).toBe(cfg.autoCompleteOff);

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
