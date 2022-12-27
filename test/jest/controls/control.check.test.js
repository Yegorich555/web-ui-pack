import { WUPCheckControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testSwitchControl from "./control.switchTest";

/** @type WUPSwitchControl */
let testEl;
initTestBaseControl({ type: WUPCheckControl, htmlTag: "wup-check", onInit: (e) => (testEl = e) });

describe("control.check", () => {
  testSwitchControl(() => testEl);
});
