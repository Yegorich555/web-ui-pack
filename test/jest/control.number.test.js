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

    el.$options.format = { minDecimal: 2 };
    await h.wait(1);
    expect(el.$refInput.value).toBe("1,234.00");
    el.$value = 234.56;
    expect(el.$refInput.value).toBe("234.56");
    el.$value = 4.567;
    expect(el.$refInput.value).toBe("4.56");

    el.$options.format = { maxDecimal: 3 };
    await h.wait(1);
    expect(el.$refInput.value).toBe("4.567");
    el.$value = 4;
    expect(el.$refInput.value).toBe("4");

    el.$options.format = { sepDecimal: ",", minDecimal: 2, sep1000: " " };
    await h.wait(1);
    expect(el.$refInput.value).toBe("4,00");
    el.$value = 1234;
    expect(el.$refInput.value).toBe("1 234,00");
    el.$value = 1234.567;
    expect(el.$refInput.value).toBe("1 234,56");

    // todo test userInput
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
