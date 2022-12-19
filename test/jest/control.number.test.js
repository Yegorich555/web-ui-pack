import { WUPNumberControl } from "web-ui-pack";
import localeInfo from "web-ui-pack/helpers/localeInfo";
// import WUPNumberControl from "../../src/controls/number";
// import localeInfo from "../../src/helpers/localeInfo";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../testHelper";

beforeAll(() => {
  localeInfo.refresh("en-US"); // setup "en-US" locale
});

/** @type WUPNumberControl */
let el;
initTestBaseControl({ type: WUPNumberControl, htmlTag: "wup-num", onInit: (e) => (el = e) });

describe("control.number", () => {
  testBaseControl({
    initValues: [
      { attrValue: "123", value: 123 },
      { attrValue: "345.6", value: 345.6 },
      { attrValue: "34.32", value: 34.32 },
    ],
    validations: {
      min: { set: 5, failValue: 4, trueValue: 5 },
      max: { set: 1000, failValue: 1001, trueValue: 1000 },
    },
    attrs: {
      mask: { skip: true },
      maskholder: { skip: true },
      format: { skip: true },
    },
    $options: {
      mask: { skip: true },
      maskholder: { skip: true },
    },
    validationsSkip: ["_parse", "_mask"],
  });

  test("options format", async () => {
    el.focus();
    await h.wait();
    expect(el.$refInput.getAttribute("inputmode")).toBe("numeric"); // inputmode must be always numeric (even without mask)

    el.$value = 1234;
    expect(el.$refInput.value).toBe("1,234");
    h.setInputCursor(el.$refInput, "1,234|");
    expect(await h.userTypeText(el.$refInput, "5", { clearPrevious: false })).toBe("12,345|");
    expect(await h.userTypeText(el.$refInput, "6", { clearPrevious: false })).toBe("123,456|");
    expect(await h.userTypeText(el.$refInput, "7", { clearPrevious: false })).toBe("1,234,567|");
    expect(await h.userRemove(el.$refInput, { removeCount: 5 })).toBe("12|");
    expect(await h.userTypeText(el.$refInput, "ab", { clearPrevious: false })).toBe("12b|");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("12|");

    h.setInputCursor(el.$refInput, "|123");
    expect(await h.userTypeText(el.$refInput, "4", { clearPrevious: false })).toBe("4|,123");
    expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("4|23"); // expect: user deletes num instead of sep
    h.setInputCursor(el.$refInput, "4,|123");
    expect(await h.userRemove(el.$refInput)).toBe("|123"); // expect: user deletes num instead of sep

    el.$value = 1234;
    el.$options.format = { minDecimal: 2 };
    await h.wait(1);
    expect(el.$refInput.value).toBe("1,234.00");
    el.$value = 234.56;
    expect(el.$refInput.value).toBe("234.56");
    el.$value = 4.567;
    expect(el.$refInput.value).toBe("4.56");
    h.setInputCursor(el.$refInput, "4.56|");
    expect(await h.userTypeText(el.$refInput, "7", { clearPrevious: false })).toBe("4.567|");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("4.56|");
    expect(await h.userRemove(el.$refInput)).toBe("4.5|0");
    expect(await h.userRemove(el.$refInput)).toBe("4|.00");
    expect(await h.userRemove(el.$refInput)).toBe("|0.00");
    h.setInputCursor(el.$refInput, "|0.00|");
    expect(el.$refInput.selectionStart).not.toBe(el.$refInput.selectionEnd);
    expect(await h.userRemove(el.$refInput)).toBe("|");

    el.$value = 4.5678;
    el.$options.format = { maxDecimal: 3 };
    await h.wait(1);
    expect(el.$refInput.value).toBe("4.567");
    el.$value = 4;
    expect(el.$refInput.value).toBe("4");
    // todo user can't type decSep expect(await h.userTypeText(el.$refInput, ".78", { clearPrevious: false })).toBe("4.78|");

    el.$options.format = { sepDecimal: ",", minDecimal: 2, sep1000: "" };
    await h.wait(1);
    expect(el.$refInput.value).toBe("4,00");
    el.$value = 1234;
    expect(el.$refInput.value).toBe("1234,00");
    el.$value = 1234.567;
    expect(el.$refInput.value).toBe("1234,56");

    // maxSafeInteger
    el.$options.format = { sep1000: "" };
    el.$value = Number.MAX_SAFE_INTEGER;
    expect(await h.userTypeText(el.$refInput, "9", { clearPrevious: false })).toBe(`${Number.MAX_SAFE_INTEGER}9|`); // show&hide after 100ms
    await h.wait(150);
    expect(el.$value).toBe(Number.MAX_SAFE_INTEGER);
    expect(el.$refInput.value).toBe(Number.MAX_SAFE_INTEGER.toString());
  });

  test("history undo/redo", () => {
    // todo
  });

  test("with mask", () => {
    // todo
  });

  test("role spinner & inc/dec", async () => {
    el.focus();
    await h.wait();
    expect(el.$refInput.getAttribute("role")).toBe("spinbutton");
    // todo
  });
});
