import { WUPTextControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";

/** @type WUPTextControl */
let testEl;
initTestBaseControl({ type: WUPTextControl, htmlTag: "wup-text", onInit: (e) => (testEl = e) });

describe("control.text", () => {
  testTextControl(() => testEl);
});
