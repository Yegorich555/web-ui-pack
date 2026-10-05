import WUPTextRichControl from "web-ui-pack/controls/textRich";
import WUPDropdownElement from "web-ui-pack/dropdownElement";
import { initTestBaseControl } from "./baseControlTest";
import testTextareaControl, { mockAreaInput } from "./control.textareaTest";

// WARN: it must be before initTestBaseControl: the control with dropdowns is created in its beforeEach
beforeEach(() => {
  let lastId = 0;
  // dropdowns of toolbar use own counter: otherwise ids in snapshots depend on order of tests
  jest.spyOn(WUPDropdownElement, "$uniqueId", "get").mockImplementation(() => `dd${++lastId}`);
});

/** @type WUPTextRichControl */
let el;
initTestBaseControl({
  type: WUPTextRichControl,
  htmlTag: "wup-textrich",
  onInit: (e) => {
    el = e;
    mockAreaInput(el);
  },
});

describe("control.textRich", () => {
  testTextareaControl(() => el, {
    attrs: {
      "w-toolbar": {
        value: [
          ["bold", "italic"],
          ["header", { size: ["sm", false, "lg"] }],
        ],
      },
    },
  });
});
