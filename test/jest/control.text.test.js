import { WUPTextControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";

/** @type WUPTextControl */
let el;
initTestBaseControl({ type: WUPTextControl, htmlTag: "wup-text", onInit: (e) => (el = e) });

describe("control.text", () => {
  testBaseControl({
    initValues: [
      { attrValue: "123", value: "123" },
      { attrValue: "some txt", value: "some txt" },
      { attrValue: "34", value: "34" },
    ],
  });

  test("selectAll by clear/focus", () => {
    // todo split test for $option.selectOnFocus
    // todo test btnClear
    const initV = "some text";
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
  });
});
