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

/** Adds token tool `placeholder` (trigger `{`) & mocks rect of range (jsdom doesn't support it: menu is placed near caret)
 * @returns cleanup function */
function usePlaceholder() {
  WUPTextRichControl.$tools.placeholder = {
    values: [{ value: "firstName" }, { value: "email" }],
    trigger: "{",
    kind: "inline",
    is: (e) => (e.classList.contains("placeholder") ? e.textContent.slice(1, -1) : undefined),
    create: "span",
    classNameTag: "placeholder",
  };
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 1, bottom: 9, width: 1, height: 9 };
  Range.prototype.getBoundingClientRect = () => rect;
  return () => {
    delete WUPTextRichControl.$tools.placeholder;
    delete Range.prototype.getBoundingClientRect;
  };
}

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

  test("typed trigger opens menu when text is inserted by control", async () => {
    const cleanup = usePlaceholder();
    try {
      el.$options.toolbar = [["bold"], ["placeholder"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const btn = el.querySelector("[tool=placeholder]");
      /** Sets html, places caret at the end of text & types trigger */
      const typeTrigger = async (html, text) => {
        inp.innerHTML = html;
        const t = document.createTreeWalker(inp, NodeFilter.SHOW_TEXT);
        while (t.nextNode().data !== text);
        window.getSelection().collapse(t.currentNode, text.length);
        const init = { inputType: "insertText", data: "{", bubbles: true, cancelable: true };
        const ev = new InputEvent("beforeinput", init);
        inp.dispatchEvent(ev);
        await h.wait(1);
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        el.$refInput.blur(); // closes menu
        await h.wait(1);
        inp.focus();
        return [ev.defaultPrevented, isOpen];
      };

      // at the end of bold: typed text is inserted by control (otherwise Chrome types after link)
      expect(await typeTrigger("<div><b>bold</b></div>", "bold")).toEqual([true, true]);
      // after token: typed text is inserted out of it
      expect(await typeTrigger('<div><span class="placeholder">{email}</span></div>', "{email}")).toEqual([true, true]);
    } finally {
      cleanup();
    }
  });

  test("paste over several lines merges them", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html, selects from char of the 1st line to char of the last one & pastes html */
    const paste = (html, [start, end], pasted) => {
      inp.innerHTML = html;
      window.getSelection().setBaseAndExtent(inp.firstChild.firstChild, start, inp.lastChild.firstChild, end);
      el.insertHTML(pasted);
      return inp.innerHTML;
    };
    // otherwise `<div>HeX</div><div>ld</div>`
    expect(paste("<div>Hello</div><div>World</div>", [2, 3], "<b>X</b>")).toBe("<div>He<b>X</b>ld</div>");
    expect(paste("<div>Hello</div><div>World</div>", [2, 3], "<h1>T</h1><p>x</p>")).toBe(
      "<div>He</div><h1>T</h1><div>x</div><div>ld</div>"
    );

    // caret at editor root (empty editor): otherwise blocks are flattened into `T<br>x`
    inp.innerHTML = "";
    window.getSelection().collapse(inp, 0);
    el.insertHTML("<h1>T</h1><ul><li>x</li></ul>");
    expect(inp.innerHTML).toBe("<h1>T</h1><ul><li>x</li></ul>");
  });

  test("split at caret keeps part with embed only", async () => {
    WUPTextRichControl.$tools.image = {
      kind: "embed",
      is: (e) => (e.tagName === "IMG" ? e.getAttribute("src") : undefined),
      create: (v) => Object.assign(document.createElement("img"), { src: v }),
    };
    try {
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const img = '<img src="a.png">';

      // paste of block splits line at caret
      inp.innerHTML = `<div>${img}</div>`;
      window.getSelection().collapse(inp.firstChild, 1);
      el.insertHTML("<h1>T</h1>");
      expect(inp.innerHTML).toBe(`<div>${img}</div><h1>T</h1>`); // otherwise image is removed

      // typing with pending format splits format element at caret
      inp.innerHTML = `<div><b>${img}</b></div>`;
      window.getSelection().collapse(inp.querySelector("b"), 1);
      el.applyFormat("bold"); // pending: not bold
      const init = { inputType: "insertText", data: "x", bubbles: true, cancelable: true };
      inp.dispatchEvent(new InputEvent("beforeinput", init));
      expect(inp.innerHTML).toBe(`<div><b>${img}</b>x</div>`);
    } finally {
      delete WUPTextRichControl.$tools.image;
    }
  });

  test("clean removes inline formats of subclass tools", async () => {
    class TestTextRich extends WUPTextRichControl {
      static $tools = {
        ...WUPTextRichControl.$tools,
        highlight: {
          kind: "inline",
          is: (e) => e.classList.contains("hl") || undefined,
          create: "span",
          classNameTag: "hl",
        },
      };
    }
    customElements.define("test-textrich", TestTextRich);
    const c = document.body.appendChild(document.createElement("test-textrich"));
    await h.wait(1);
    const inp = c.$refInput;
    inp.innerHTML = '<div><span class="hl">x</span> <b>y</b></div>';
    inp.focus();
    window.getSelection().selectAllChildren(inp.firstChild);
    c.applyFormat("clean");
    expect(inp.innerHTML).toBe("<div>x y</div>");
    c.remove();
  });

  test("hotkeys of tool values with quotes", async () => {
    const format = jest.fn();
    const times = '"Times New Roman", serif';
    WUPTextRichControl.$tools.font = {
      hotKey: "Control+Alt+Shift+F Control+Alt+Shift+G", // previous & next value
      values: [{ value: times, hotKey: "Control+Alt+Shift+1" }, { value: "monospace" }],
      format,
    };
    try {
      el.$options.toolbar = [[{ font: times }, { font: "monospace" }]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.innerHTML = "<div>text</div>";
      inp.focus();
      window.getSelection().selectAllChildren(inp.firstChild);
      /** Presses Ctrl+Alt+Shift+{key} */
      const press = (code) => {
        const init = { code, ctrlKey: true, altKey: true, shiftKey: true, bubbles: true, cancelable: true };
        return inp.dispatchEvent(new KeyboardEvent("keydown", init));
      };

      // otherwise querySelector throws SyntaxError: `[tool="font:"Times New Roman", serif"]`
      expect(press("Digit1")).toBe(false); // value shortcut
      expect(format).toBeCalledTimes(1);
      expect(format.mock.calls[0][0].value).toBe(times);
      expect(press("KeyG")).toBe(false); // the next value
      expect(format).toBeCalledTimes(2);
      expect(format.mock.calls[1][0].value).toBe(times);
    } finally {
      delete WUPTextRichControl.$tools.font;
    }
  });

  test("click on dropdown opens its menu instead of menu of typed trigger", async () => {
    const cleanup = usePlaceholder();
    try {
      el.$options.toolbar = [["placeholder"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.innerHTML = "<div>{</div>";
      inp.focus();
      window.getSelection().collapse(inp.firstChild.firstChild, 1);
      el.gotTrigger(); // typed trigger opens menu near caret (popup target is dropdown)
      const btn = el.querySelector("[tool=placeholder]");
      expect(btn.getAttribute("aria-expanded")).toBe("true");

      btn.click(); // otherwise menu of trigger is closed only
      await h.wait(1);
      expect(btn.getAttribute("aria-expanded")).toBe("true");
      expect(el.querySelectorAll("wup-popup[menu]").length).toBe(1);
      btn.click(); // the 2nd click closes it
      await h.wait(1);
      expect(btn.getAttribute("aria-expanded")).toBe("false");
    } finally {
      cleanup();
    }
  });

  test("indent of pasted line in px", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets line with margin & changes indent */
    const indent = (margin, value) => {
      inp.innerHTML = `<div style="margin-left: ${margin}; font-size: 16px;">x</div>`;
      window.getSelection().collapse(inp.firstChild.firstChild, 1);
      el.applyFormat("indent", value, true);
      return inp.firstChild.style.marginLeft;
    };
    // 3em per level: 96px = 6em = level 2 (otherwise px is ignored: level 0)
    expect(indent("96px", 1)).toBe("9em");
    expect(indent("96px", -1)).toBe("3em");
    expect(indent("6em", 1)).toBe("9em");
    expect(indent("6em", -1)).toBe("3em");
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
