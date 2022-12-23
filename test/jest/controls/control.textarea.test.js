import { WUPTextareaControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
// import * as h from "../../testHelper";

/** @type WUPTextareaControl */
let testEl;
initTestBaseControl({ type: WUPTextareaControl, htmlTag: "wup-textarea", onInit: (e) => (testEl = e) });

describe("control.textarea", () => {
  testTextControl(() => testEl, {
    validations: {},
    // validationsSkip: [],
  });
});
