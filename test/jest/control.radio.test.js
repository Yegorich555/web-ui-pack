import { WUPRadioControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";

/** @type WUPRadioControl */
let testEl;
initTestBaseControl({ type: WUPRadioControl, htmlTag: "wup-radio", onInit: (e) => (testEl = e) });

describe("control.radio", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "true", value: true },
      { attrValue: "false", value: false },
      { attrValue: "true", value: true },
    ],
    validations: {},
    // attrs: { defaultchecked: { skip: true } },
  });
});
