import { WUPTextControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../testHelper";

/** @type WUPTextControl */
let el;
initTestBaseControl({ type: WUPTextControl, htmlTag: "wup-text", onInit: (e) => (el = e) });

describe("control.text", () => {
  const initV = "some init val";

  testBaseControl({
    initValues: [
      { attrValue: "123", value: "123" },
      { attrValue: "some txt", value: "some txt" },
      { attrValue: "34", value: "34" },
    ],
    validations: {
      min: { set: 2, failValue: "r", trueValue: "re" },
      max: { set: 3, failValue: "rela", trueValue: "rel" },
      email: { set: true, failValue: "relation", trueValue: "relation@google.com" },
    },
  });

  // todo move it to common tests
  test("$initValue affects on input", () => {
    el.$initValue = initV;
    expect(el.$refInput.value).toBe(initV);
    el.$initValue = undefined;
    el.$value = undefined;
    expect(el.$refInput.value).toBe("");
    el.$value = initV;
    expect(el.$refInput.value).toBe(initV);
  });

  describe("options", () => {
    test("debounceMs", async () => {
      el.$options.debounceMs = 400;
      const spyChange = jest.fn();
      el.addEventListener("$change", spyChange);

      expect(el.$value).toBe(undefined);
      await h.typeInputText(el.$refInput, initV);
      expect(el.$value).toBe(undefined);
      jest.advanceTimersByTime(401);
      expect(el.$refInput.value).toBe(initV);
      expect(el.$value).toBe(initV);
      expect(spyChange).toBeCalledTimes(1);

      el.$options.debounceMs = 0;
      el.$value = undefined;
      await h.typeInputText(el.$refInput, initV);
      expect(el.$value).toBe(initV);
    });

    test("selectOnFocus (selectAll by clear/focus)", () => {
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
      expect(el.$refInput.selectionEnd - el.$refInput.selectionStart).toBe(0);

      // checking if select by clear not depends on $options.selectOnFocus
      expect(el.$value).toBe(initV);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(initV);
      expect(el.$refInput.selectionEnd).toBe(initV.length);
    });
  });
});
