import { initTestTextControl, testTextControl } from "./control.textTest";

initTestTextControl({ htmlTag: "wup-text", type: "WUPTextControl" });

describe("control.text", () => {
  testTextControl();
});
