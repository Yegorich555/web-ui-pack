import { WUPTextControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";

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
  });

  describe("text options", () => {
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
