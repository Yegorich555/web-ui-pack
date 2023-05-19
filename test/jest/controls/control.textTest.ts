import { WUPTextControl } from "web-ui-pack";
import { ValidationCases, ClearActions } from "web-ui-pack/controls/baseControl";
import { testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

// eslint-disable-next-line jest/no-export
export default function testTextControl(getEl: () => WUPTextControl, opts: Parameters<typeof testBaseControl>[0]) {
  const initV = "some init val";

  testBaseControl({
    ...opts,
    initValues: opts?.initValues ?? [
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
    validationsSkip: ["_parse", "_mask", ...(opts?.validationsSkip || [])],
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

  test("validations without 'required'", async () => {
    const el = getEl();
    el.$value = "";
    el.$options.validations = { min: 2 };
    el.$validate();
    expect(el.$isValid).toBe(true); // because it's not required
    el.$value = "a";
    el.$validate(); // need to show error-msg
    expect(el.$isValid).toBe(false);
    await h.wait();
    expect(el.$refError).toBeDefined();
  });

  test("validations debounce", async () => {
    /* rules:
      1. invalid > valid: hide without debounce
      2. invalid > invalid show another message without debouce
      3. valid > invalid: debounce
    */
    const el = getEl();
    const inp = el.$refInput;
    el.$options.validations = {
      min: () => inp.value.length < 2 && "Min 2",
      max: () => inp.value.length > 3 && "Max 3",
    };
    el.$options.validateDebounceMs = 300;
    el.$options.debounceMs = 0;
    await h.wait(1);
    await h.userTypeText(inp, "ab"); // type to Valid
    expect(el._wasValidNotEmpty).toBe(true);
    await h.userRemove(inp); // remove to Invalid
    expect(inp.value).toBe("a");
    await h.wait(100);
    expect(el.$refError).toBeFalsy(); // waiting for debounce
    await h.wait(300);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(`"<span class="wup-hidden"></span><span>Min 2</span>"`);

    inp.value += "bcd";
    await h.userTypeText(inp, "2", { clearPrevious: false });
    expect(el.$refInput.value).toBe("abcd2");
    await h.wait(1);
    // don't wait for debounce because error message is changed. Debounce only to show error at first time
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(`"<span class="wup-hidden"></span><span>Max 3</span>"`);
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
      el.$options.validations = { $alwaysInvalid: true }; // just for coverage
      el.$options.validationCase = ValidationCases.onChange | 0; // just for coverage
      const spyChange = jest.fn();
      el.addEventListener("$change", spyChange);
      el.$onChange = jest.fn();

      expect(el.$value).toBe(undefined);
      await h.userTypeText(el.$refInput, initV);
      expect(el.$value).toBe(undefined);
      jest.advanceTimersByTime(401);
      expect(el.$refInput.value).toBe(initV);
      expect(el.$value).toBe(initV);
      expect(spyChange).toBeCalledTimes(1);
      expect(el.$onChange).toBeCalledTimes(1);
      await h.userTypeText(el.$refInput, ""); // just for coverage

      el.$options.debounceMs = 0;
      el.$value = undefined;
      await h.userTypeText(el.$refInput, initV);
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
