import { WUPPasswordControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";

/** @type WUPPasswordControl */
let testEl;
initTestBaseControl({ type: WUPPasswordControl, htmlTag: "wup-pwd", onInit: (e) => (testEl = e) });

describe("control.pwd", () => {
  testTextControl(() => testEl, {
    autoCompleteOff: "new-password",
    validations: {
      minNumber: { set: 2, failValue: "relax", trueValue: "relax123" },
      minUpper: { set: 2, failValue: "relax", trueValue: "RelaX" },
      minLower: { set: 1, failValue: "RELAX", trueValue: "RELAx" },
      special: { set: { min: 1, chars: "#!-_?,.@:;'" }, failValue: "relax", trueValue: "re-l-ax" },
    },
  });
});
