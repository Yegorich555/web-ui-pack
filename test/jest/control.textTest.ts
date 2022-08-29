import { WUPTextControl } from "web-ui-pack";
import { ValidationCases, ClearActions } from "web-ui-pack/controls/baseControl";
import { testBaseControl } from "./baseControlTest";
import * as h from "../testHelper";

// eslint-disable-next-line jest/no-export
export default function testTextControl(getEl: () => WUPTextControl, opts: Parameters<typeof testBaseControl>[0]) {
  const initV = "some init val";

  testBaseControl({
    ...opts,
    initValues: [
      { attrValue: "123", value: "123" },
      { attrValue: "some txt", value: "some txt" },
      { attrValue: "34", value: "34" },
    ],
    validations: {
      min: { set: 2, failValue: "r", trueValue: "re" },
      max: { set: 3, failValue: "rela", trueValue: "rel" },
      email: { set: true, failValue: "relation", trueValue: "relation@google.com" },
      ...opts?.validations,
    },
  });

  test("$initValue affects on input", () => {
    const el = getEl();
    el.$initValue = initV;
    expect(el.$refInput.value).toBe(initV);
    el.$initValue = undefined;
    el.$value = undefined;
    expect(el.$refInput.value).toBe("");
    el.$value = initV;
    expect(el.$refInput.value).toBe(initV);
  });

  test("validation messages ends without '-s'", async () => {
    const el = getEl();
    el.$options.validations = { min: 1 };
    el.$validate();
    await h.wait();
    expect(el).toMatchSnapshot();

    el.$options.validations = { max: 1 };
    el.$validate();
    await h.wait();
    expect(el).toMatchSnapshot();
  });

  describe("options", () => {
    test("clearButton", () => {
      const el = getEl();
      el.$value = initV;
      el.$options.clearButton = true;
      el.$options.clearActions = ClearActions.clear | 0;
      jest.advanceTimersByTime(1);
      expect(el.$refBtnClear).toBeDefined();
      el.$refBtnClear!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(el.$value).toBe(undefined);
      expect(el).toMatchSnapshot();

      el.$options.clearButton = false;
      jest.advanceTimersByTime(1);
      expect(el.$refBtnClear).toBe(undefined);
      expect(el).toMatchSnapshot();
    });

    test("debounceMs", async () => {
      const el = getEl();
      el.$options.debounceMs = 400;
      el.$options.validations = { _alwaysInvalid: true }; // just for coverage
      el.$options.validationCase = ValidationCases.onChange | 0; // just for coverage
      const spyChange = jest.fn();
      el.addEventListener("$change", spyChange);

      expect(el.$value).toBe(undefined);
      await h.typeInputText(el.$refInput, initV);
      expect(el.$value).toBe(undefined);
      jest.advanceTimersByTime(401);
      expect(el.$refInput.value).toBe(initV);
      expect(el.$value).toBe(initV);
      expect(spyChange).toBeCalledTimes(1);
      await h.typeInputText(el.$refInput, ""); // just for coverage

      el.$options.debounceMs = 0;
      el.$value = undefined;
      await h.typeInputText(el.$refInput, initV);
      expect(el.$value).toBe(initV);
    });

    test("selectOnFocus (selectAll by clear/focus)", () => {
      const el = getEl();
      el.$options.selectOnFocus = true;
      jest.advanceTimersByTime(1);

      el.$initValue = initV;
      expect(el.$refInput.value).toBe(initV);
      el.focus();
      expect(el.$refInput.selectionStart).toBe(0);
      expect(el.$refInput.selectionEnd).toBe(initV.length);

      el.$refInput.selectionEnd = 0;
      expect(el.$refInput.selectionEnd).toBe(0);

      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(initV);

      expect(el.$refInput.selectionStart).toBe(0);
      expect(el.$refInput.selectionEnd).toBe(initV.length);

      el.$refInput.selectionEnd = 0;
      el.blur();
      expect(document.activeElement).not.toBe(el.$refInput);
      expect(el.$refInput.selectionEnd).toBe(0);
      expect(el.$refInput.selectionStart).toBe(0);
      el.$options.selectOnFocus = false;
      jest.advanceTimersByTime(1);

      el.focus();
      expect(el.$refInput.selectionEnd - el.$refInput.selectionStart!).toBe(0);

      // checking if select by clear not depends on $options.selectOnFocus
      expect(el.$value).toBe(initV);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(initV);
      expect(el.$refInput.selectionEnd).toBe(initV.length);
    });
  });
}
