import WUPTextRichControl from "web-ui-pack/controls/textRich";
import WUPDropdownElement from "web-ui-pack/dropdownElement";
import { initTestBaseControl } from "./baseControlTest";
import testTextAreaControl, { mockAreaInput } from "./control.textAreaTest";
import * as h from "../../testHelper";

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
  testTextAreaControl(() => el, {
    attrs: {
      "w-toolbar": {
        value: [
          ["bold", "italic"],
          ["header", { size: ["sm", false, "lg"] }],
        ],
      },
    },
  });

  test("format of line in empty editor", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    expect(inp.innerHTML).toBe("");
    inp.focus();
    window.getSelection().collapse(inp, 0); // caret is placed into root when editor is empty
    const btn = el.querySelector("wup-dropdown[tool=header] > button");
    expect(btn.textContent).toBe("Normal");

    btn.click(); // open dropdown
    await h.wait();
    expect(btn.parentElement.$refPopup.$isOpened).toBe(true);
    el.querySelector('[tool="header:1"]').click();
    expect(inp.innerHTML).toBe("<h1><br></h1>");
    expect(btn.textContent).toBe("Heading 1"); // the 1st click must apply format to the line added for empty editor
    const sel = window.getSelection();
    expect(sel.anchorNode).toBe(inp.firstChild);
    expect(sel.anchorOffset).toBe(0);
  });

  test("text nodes are joined after formatting", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.innerHTML = "<div>Text with <b>bold</b>,</div>"; // value isn't used: it's mocked by mockAreaInput
    inp.focus();
    window.getSelection().selectAllChildren(inp.firstChild);

    el.applyFormat("clean");
    expect(inp.innerHTML).toBe("<div>Text with bold,</div>");
    expect(inp.firstChild.childNodes.length).toBe(1); // "Text with " "bold" "," => "Text with bold,"
    const sel = window.getSelection();
    expect(sel.toString()).toBe("Text with bold,"); // selection is kept
  });
});
