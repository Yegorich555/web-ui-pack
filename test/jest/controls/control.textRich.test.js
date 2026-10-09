import WUPTextRichControl from "web-ui-pack/controls/textRich";
import { initTestBaseControl } from "./baseControlTest";
import testTextAreaControl, { mockAreaInput } from "./control.textAreaTest";
import * as h from "../../testHelper";

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
      "w-hidehotkeyshint": { value: true },
    },
  });

  test("format of line in empty editor", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    expect(inp.innerHTML).toBe("");
    inp.focus();
    window.getSelection().collapse(inp, 0); // caret is placed into root when editor is empty
    const btn = el.querySelector("[tool=header]");
    expect(btn.textContent).toBe("Normal");

    btn.click(); // open dropdown
    const menu = el.querySelector("wup-popup[menu]");
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    [...menu.querySelectorAll("li")].find((li) => li.textContent === "Heading 1").click();
    await h.wait();
    expect(inp.innerHTML).toBe("<h1><br></h1>");
    expect(btn.textContent).toBe("Heading 1"); // the 1st click must apply format to the line added for empty editor
    expect(btn.getAttribute("aria-expanded")).toBe("false");
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

  test("line format of nested list item moves it out of all lists", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html, selects text of list item & applies format */
    const format = (html, text, name, value) => {
      inp.innerHTML = html;
      const t = [...inp.querySelectorAll("li")].find((li) => li.firstChild.data === text).firstChild;
      window.getSelection().selectAllChildren(t.parentElement);
      el.applyFormat(name, value, true);
      return inp.innerHTML;
    };

    const nested = "<ul><li>a<ul><li>b</li></ul></li></ul>";
    // otherwise heading is placed inside parent item: `<li>a<ul></ul><h2>b</h2></li>`
    expect(format(nested, "b", "header", 2)).toBe("<ul><li>a</li></ul><h2>b</h2>");
    expect(format(nested, "b", "clean")).toBe("<ul><li>a</li></ul><div>b</div>");
    expect(format(nested, "b", "list", "bullet")).toBe("<ul><li>a</li></ul><div>b</div>"); // list off
    // items after line keep their level
    expect(format("<ol><li>a<ol><li>b</li><li>c</li></ol></li><li>d</li></ol>", "b", "header", 2)).toBe(
      "<ol><li>a</li></ol><h2>b</h2><ol><li><ol><li>c</li></ol></li><li>d</li></ol>"
    );
  });

  test("format of loose content with caret at the end of editor", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    // inline paste into empty editor leaves loose nodes & caret at (editor, childNodes.length)
    inp.innerHTML = "a <b>b</b> c";
    window.getSelection().collapse(inp, 3);
    expect(() => el.applyFormat("header", 1, true)).not.toThrow(); // otherwise IndexSizeError after wrapping lines
    expect(inp.innerHTML).toBe("<h1>a <b>b</b> c</h1>");
    const sel = window.getSelection(); // caret stays at the end
    expect(sel.isCollapsed).toBe(true);
    expect(sel.anchorNode).toBe(inp.firstChild.lastChild);
    expect(sel.anchorOffset).toBe(2);
  });

  test("value: <p> is used only if it's required", () => {
    const inp = document.createElement("wup-richinput"); // value of control's input is mocked by mockAreaInput
    inp._tools = WUPTextRichControl.$tools;
    const toValue = (html) => {
      inp.value = html;
      return inp.value;
    };

    [
      ["Some text", "Some text"],
      ["<p>Some <strong>bold</strong> text</p>", "Some <strong>bold</strong> text"],
      ["<div><b>bold</b></div>", "<strong>bold</strong>"],
      ["<p>First</p><p>Second</p>", "<p>First</p><p>Second</p>"],
      ["<h1>Heading</h1>", "<h1>Heading</h1>"],
      ["<ul><li>Item</li></ul>", "<ul><li>Item</li></ul>"],
      ['<p style="text-align: center;">Centered</p>', '<p style="text-align: center;">Centered</p>'],
      // otherwise it's parsed as 2 paragraphs
      ["<p>Line<br>break</p>", "<p>Line<br>break</p>"],
      // otherwise leading whitespaces are skipped
      ["<p>&nbsp;<strong>bold</strong></p>", "<p>&nbsp;<strong>bold</strong></p>"],
      ["<p>&nbsp;text</p>", "&nbsp;text"],
      ["<p></p>", ""],
    ].forEach(([html, expected]) => {
      expect(toValue(html)).toBe(expected);
      expect(toValue(expected)).toBe(expected); // value is the same after parsing back
    });
  });

  test("click on link: browser doesn't follow it (readonly editor isn't contenteditable)", async () => {
    el.$options.readOnly = true;
    await h.wait(1);
    const inp = el.$refInput;
    inp.innerHTML = '<div>Text <a href="https://example.com/">link</a></div>';
    const a = inp.querySelector("a");
    const spyOpen = jest.spyOn(window, "open").mockImplementation(() => null);

    expect(a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).toBe(false);
    expect(spyOpen).not.toBeCalled();

    // Ctrl + Click opens link in new tab
    expect(a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }))).toBe(false);
    expect(spyOpen).toBeCalledWith("https://example.com/", "_blank", "noopener,noreferrer");

    // click outside link isn't prevented
    expect(inp.firstChild.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).toBe(true);
    await h.wait();
  });
});
