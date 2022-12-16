import { WUPNumberControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../testHelper";

/** @type WUPNumberControl */
let el;
initTestBaseControl({ type: WUPNumberControl, htmlTag: "wup-num", onInit: (e) => (el = e) });

describe("control.num", () => {
  // todo numberControl is localeBased so need somehow redefine locale
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
    expect(el.$refInput.getAttribute("inputmode")).toBe("numeric"); // inputmode must be always numeric (even witohut mask)
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
