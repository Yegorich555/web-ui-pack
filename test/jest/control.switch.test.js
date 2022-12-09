import { WUPSwitchControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testSwitchControl from "./control.switchTest";

/** @type WUPSwitchControl */
let testEl;
initTestBaseControl({ type: WUPSwitchControl, htmlTag: "wup-switch", onInit: (e) => (testEl = e) });

describe("control.switch", () => {
  testSwitchControl(() => testEl);
});
