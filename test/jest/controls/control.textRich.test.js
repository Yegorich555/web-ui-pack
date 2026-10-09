import WUPTextRichControl from "web-ui-pack/controls/textRich";
import TextRichHistory from "web-ui-pack/controls/textRich.history";
import { htmlToEditor } from "web-ui-pack/controls/textRich.input";
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

/** Adds embed tool `image` (`<img src>`)
 * @returns cleanup function */
function useImage(ask) {
  WUPTextRichControl.$tools.image = {
    kind: "embed",
    is: (e) => (e.tagName === "IMG" ? e.getAttribute("src") : undefined),
    create: (v) => Object.assign(document.createElement("img"), { src: v }),
    ask,
  };
  return () => delete WUPTextRichControl.$tools.image;
}

/** Sets editor html with selection: `[` - anchor, `]` - focus, `|` - caret (mark without text around it is point in element) */
function setHtml(html) {
  const inp = el.$refInput;
  inp.innerHTML = html;
  const pts = {};
  const empty = [];
  const w = document.createTreeWalker(inp, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode;
    for (let i = t.data.search(/[[\]|]/); i !== -1; i = t.data.search(/[[\]|]/)) {
      pts[t.data[i]] = [t, i];
      t.deleteData(i, 1);
    }
    !t.length && empty.push(t);
  }
  // otherwise empty text nodes stay (browser doesn't have them)
  empty.forEach((t) => {
    const p = t.parentNode;
    const i = Array.prototype.indexOf.call(p.childNodes, t);
    Object.values(pts).forEach((pt) => {
      if (pt[0] === t) {
        pt.splice(0, 2, p, i);
      } else if (pt[0] === p && pt[1] > i) {
        --pt[1];
      }
    });
    t.remove();
  });
  const a = pts["["] ?? pts["|"];
  a && window.getSelection().setBaseAndExtent(...a, ...(pts["]"] ?? a));
  document.dispatchEvent(new Event("selectionchange")); // jsdom doesn't fire it
}

/** Returns editor html with selection marks (see setHtml) */
function getHtml() {
  const inp = el.$refInput;
  const sel = window.getSelection();
  const saved = [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset];
  const marks = sel.isCollapsed
    ? [[sel.anchorNode, sel.anchorOffset, "|"]]
    : [
        [sel.anchorNode, sel.anchorOffset, "["],
        [sel.focusNode, sel.focusOffset, "]"],
      ];
  marks.sort((x, y) => (x[0] === y[0] ? y[1] - x[1] : 0)); // from the end: offsets stay valid
  const undo = marks.map(([n, offset, s]) => {
    if (n.nodeType === Node.TEXT_NODE) {
      n.insertData(offset, s);
      return () => n.deleteData(offset, 1);
    }
    const t = n.insertBefore(document.createTextNode(s), n.childNodes[offset] ?? null);
    return () => t.remove();
  });
  const html = inp.innerHTML;
  undo.reverse().forEach((f) => f());
  sel.setBaseAndExtent(...saved);
  return html;
}

/** Fires `beforeinput` like browser does on typing
 * @returns true if it's prevented (control inserts text itself) */
const typeText = (data, inputType = "insertText") =>
  !el.$refInput.dispatchEvent(new InputEvent("beforeinput", { inputType, data, bubbles: true, cancelable: true }));

/** Types text like browser: control inserts it itself or it's inserted at caret (in text node) as usual */
function userType(data) {
  if (typeText(data)) {
    return;
  }
  const sel = window.getSelection();
  const t = sel.focusNode;
  const offset = sel.focusOffset;
  t.insertData(offset, data);
  sel.collapse(t, offset + data.length);
  el.$refInput.dispatchEvent(new InputEvent("input", { inputType: "insertText", data, bubbles: true }));
  document.dispatchEvent(new Event("selectionchange")); // jsdom doesn't fire it
}

/** Fires `beforeinput` of paste with html
 * @returns true if it's prevented (control pastes it itself) */
function userPaste(html, targetRange) {
  const ev = new InputEvent("beforeinput", { inputType: "insertFromPaste", bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", { value: { getData: (t) => (t === "text/html" ? html : "text") } });
  targetRange && (ev.getTargetRanges = () => [targetRange]);
  return !el.$refInput.dispatchEvent(ev);
}

describe("control.textRich", () => {
  afterEach(() => delete Range.prototype.getBoundingClientRect); // mocked by tests with menu near caret

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

    // <br> after inline content is the next line, otherwise empty line; whitespaces between lines are skipped
    inp.innerHTML = "a<br><br>b<div>c</div> ";
    window.getSelection().collapse(inp.firstChild, 1);
    el.applyFormat("header", 1, true);
    expect(getHtml()).toBe("<h1>a|</h1><div><br></div><div>b</div><div>c</div> ");
    // caret at the end of editor after element
    inp.innerHTML = "a <b>b</b>";
    window.getSelection().collapse(inp, 2);
    el.applyFormat("header", 1, true);
    expect(getHtml()).toBe("<h1>a <b>b|</b></h1>");
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
      el.$options.toolbar = [["bold"]]; // tools are applied on toolbar render
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
    inp.innerHTML = '<div style="margin-left: 48px;">x</div>'; // default font size: 16px
    window.getSelection().collapse(inp.firstChild.firstChild, 1);
    el.applyFormat("indent", 1, true);
    expect(inp.firstChild.style.marginLeft).toBe("6em");
    expect(indent("6em", -1)).toBe("3em");
  });

  test("pointer move over the same element doesn't look up tools", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.innerHTML = '<div>Text <a href="https://x.com/">link</a></div>';
    const a = inp.querySelector("a");
    const spy = jest.spyOn(el, "hoverOf");
    const move = (t) => t.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));

    move(a);
    move(a);
    move(a);
    expect(spy).toBeCalledTimes(1);
    move(inp.firstChild);
    move(inp.firstChild);
    expect(spy).toBeCalledTimes(2);
    // pointer returns: element is looked up again (readonly etc. can be changed)
    inp.dispatchEvent(new MouseEvent("pointerleave"));
    move(inp.firstChild);
    expect(spy).toBeCalledTimes(3);
    el.$options.readOnly = true;
    await h.wait(1);
    move(inp.firstChild);
    expect(spy).toBeCalledTimes(4);
    await h.wait(); // hover timers
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

  test("inline formats", async () => {
    await h.wait(1);
    el.$refInput.focus();
    /** Sets html with selection & applies format */
    const format = (html, ...args) => {
      setHtml(html);
      el.applyFormat(...args);
      return getHtml();
    };

    // toggle: edge text nodes are split by selection
    expect(format("<div>H[ell]o</div>", "bold")).toBe("<div>H[<b>ell]</b>o</div>");
    expect(format("<div><b>H[ell]o</b></div>", "bold")).toBe("<div><b>H[</b>ell]<b>o</b></div>");
    // partially formatted selection gets format; adjacent elements are merged
    expect(format("<div>[a<b>b</b>]</div>", "bold")).toBe("<div><b>[ab]</b></div>");
    expect(format("<div><b>a</b>[b]</div>", "italic")).toBe("<div><b>a[</b><em>b]</em></div>");
    expect(format("<div><b>[a<i>b</i>c]</b></div>", "bold")).toBe("<div>[a<i>b</i>c]</div>");
    expect(format("<div><b>[a</b>b]c</div>", "italic")).toBe("<div><b><em>[a</em></b><em>b]</em>c</div>");
    // single value only: sub replaces super
    expect(format("<div>x<sup>[2]</sup></div>", "script", "sub")).toBe("<div>x[<sub>2]</sub></div>");
    expect(format("<div>x[2]</div>", "script", "super")).toBe("<div>x[<sup>2]</sup></div>");
    // set value (dropdown): replaces previous one; false removes format
    expect(format("<div>[a<span style='font-size: small;'>b</span>]</div>", "size", "lg", true)).toBe(
      '<div><span style="font-size: x-large;">[ab]</span></div>'
    );
    expect(format("<div><span style='font-size: small;'>[a]</span></div>", "size", false, true)).toBe("<div>[a]</div>");
    expect(format("<div>[a]</div>", "size", "unknown", true)).toBe("<div><span>[a]</span></div>"); // default size
    // selection starts at the end of text node & ends at start of another one: they're skipped
    setHtml("<div>a<b>b</b>c</div>");
    const [a, , c] = [...el.$refInput.firstChild.childNodes];
    window.getSelection().setBaseAndExtent(a, 1, c, 0);
    el.applyFormat("italic");
    expect(el.$refInput.innerHTML).toBe("<div>a<b><em>b</em></b>c</div>");
  });

  test("format removed at edge of nested element doesn't leave its empty copy", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html, selects from char of the 1st text node to char of the last one & toggles bold */
    const unbold = (html, start, end) => {
      inp.innerHTML = html;
      const w = document.createTreeWalker(inp, NodeFilter.SHOW_TEXT);
      const arr = [];
      while (w.nextNode()) {
        arr.push(w.currentNode);
      }
      window.getSelection().setBaseAndExtent(arr[0], start, arr.at(-1), end);
      el.applyFormat("bold");
      return inp.innerHTML;
    };

    // otherwise `a<i>bc</i><b><i></i></b>` & `<b><i></i></b><i>ab</i>c`
    expect(unbold("<div><b>a<i>bc</i></b></div>", 0, 2)).toBe("<div>a<i>bc</i></div>");
    expect(unbold("<div><b><i>ab</i>c</b></div>", 0, 1)).toBe("<div><i>ab</i>c</div>");
    expect(unbold("<div><b>x<i><u>ab</u></i></b></div>", 0, 2)).toBe("<div>x<i><u>ab</u></i></div>");
    // the rest of nested element keeps format
    expect(unbold("<div><b>a<i>bc</i></b></div>", 0, 1)).toBe("<div>a<i>b</i><b><i>c</i></b></div>");
    expect(unbold("<div><b><i>ab</i>c</b></div>", 1, 1)).toBe("<div><b><i>a</i></b><i>b</i>c</div>");
  });

  test("line formats", async () => {
    await h.wait(1);
    el.$refInput.focus();
    /** Sets html with selection & applies format */
    const format = (html, ...args) => {
      setHtml(html);
      el.applyFormat(...args);
      return getHtml();
    };

    expect(format("<div>a|</div>", "header", 2, false)).toBe("<h2>a|</h2>"); // button {header: 2}
    expect(format("<h2>a|</h2>", "header", 2, false)).toBe("<div>a|</div>"); // toggle off
    expect(format("<h2>a|</h2>", "header", 3, true)).toBe("<h3>a|</h3>"); // dropdown sets value
    expect(format("<div>a|</div>", "blockquote")).toBe("<blockquote>a|</blockquote>");
    expect(format("<div>a|</div>", "code")).toBe("<pre>a|</pre>");
    // line keeps its style (alignment etc.)
    expect(format('<div style="text-align: center;">a|</div>', "header", 1, true)).toBe(
      '<h1 style="text-align: center;">a|</h1>'
    );
    // lineStyle
    expect(format("<div>[a</div><h1>b]</h1>", "align", "right", true)).toBe(
      '<div style="text-align: right;">[a</div><h1 style="text-align: right;">b]</h1>'
    );
    expect(format('<div style="text-align: right;">a|</div>', "align", "right", false)).toBe("<div>a|</div>");
    expect(format('<div style="text-align: right;">a|</div>', "align", false, true)).toBe("<div>a|</div>");
    // triple click selects line till the start of the next one: the next line isn't formatted
    setHtml("<div>a</div><div>b</div>");
    const inp = el.$refInput;
    window.getSelection().setBaseAndExtent(inp.firstChild.firstChild, 0, inp.lastChild, 0);
    el.applyFormat("header", 1, true);
    expect(inp.innerHTML).toBe("<h1>a</h1><div>b</div>");
    // custom line tool: element style wins
    WUPTextRichControl.$tools.note = {
      kind: "line",
      is: (e) => (e.tagName === "ASIDE" ? true : undefined),
      create: () => Object.assign(document.createElement("aside"), { style: "color: red; text-align: left;" }),
    };
    try {
      setHtml('<div style="text-align: center;">a|</div>');
      el.applyFormat("note");
      expect(inp.firstChild.tagName).toBe("ASIDE");
      expect(inp.firstChild.style.textAlign).toBe("left");
      expect(inp.firstChild.style.color).toBe("red");
    } finally {
      delete WUPTextRichControl.$tools.note;
    }
  });

  test("list format", async () => {
    await h.wait(1);
    el.$refInput.focus();
    /** Sets html with selection & applies format */
    const format = (html, value) => {
      setHtml(html);
      el.applyFormat("list", value, false);
      return getHtml();
    };

    // adjacent lists are merged
    expect(format("<div>[a</div><div>b]</div>", "ordered")).toBe("<ol><li>[a</li><li>b]</li></ol>");
    expect(format("<ol><li>[a</li><li>b]</li></ol>", "bullet")).toBe("<ul><li>[a</li><li>b]</li></ul>");
    expect(format("<ol><li>[a<b>b</b></li></ol><div>c]</div>", "ordered")).toBe(
      "<ol><li>[a<b>b</b></li><li>c]</li></ol>"
    );
    expect(format("<ul><li>[a</li><li>b]</li></ul>", "bullet")).toBe("<div>[a</div><div>b]</div>"); // toggle off
    // item is moved out of another list
    expect(format("<ol><li>a</li><li>b|</li><li>c</li></ol>", "bullet")).toBe(
      "<ol><li>a</li></ol><ul><li>b|</li></ul><ol><li>c</li></ol>"
    );
  });

  test("link format", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const url = "https://example.com/";

    setHtml("<div>a [link] b</div>");
    el.$format("link", url);
    expect(getHtml()).toBe(`<div>a [<a href="${url}" target="_blank" rel="noopener noreferrer">link]</a> b</div>`);
    // collapsed selection: url is inserted as text & caret goes after it
    setHtml("<div>a |b</div>");
    el.$format("link", url);
    expect(getHtml()).toBe(`<div>a <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>|b</div>`);
    // empty url removes the whole link around caret
    setHtml(`<div>a <a href="${url}">li|nk</a> b</div>`);
    el.$format("link", "");
    expect(inp.innerHTML).toBe("<div>a link b</div>");
    setHtml("<div>a |b</div>");
    el.$format("link", "");
    expect(inp.innerHTML).toBe("<div>a b</div>");

    // without value: link around caret is removed, otherwise url is asked
    setHtml(`<div>a <a href="${url}">li|nk</a> b</div>`);
    el.$format("link");
    await h.wait(1);
    expect(inp.innerHTML).toBe("<div>a link b</div>");
  });

  test("embed, token & action formats", async () => {
    const cleanup = usePlaceholder();
    const cleanupImg = useImage();
    WUPTextRichControl.$tools.action = { label: "Action" };
    WUPTextRichControl.$tools.del = { format: ({ control }) => control.$insert(document.createDocumentFragment()) };
    WUPTextRichControl.$tools.mention = {
      values: [{ value: "john" }],
      trigger: "@",
      kind: "inline",
      is: (e) => (e.tagName === "MARK" ? e.textContent.slice(1) : undefined),
      create: "mark",
    };
    try {
      el.$options.toolbar = [["placeholder", "image", "action", "mention"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();

      // embed replaces selection, caret goes after it
      setHtml("<div>a[b]c</div>");
      el.$format("image", "a.png");
      expect(getHtml()).toBe('<div>a<img src="a.png">|c</div>');

      // token replaces selection or token around caret
      setHtml("<div>a[b]c</div>");
      el.$format("placeholder", "email");
      expect(getHtml()).toBe('<div>a<span class="placeholder">{email}</span>|c</div>');
      setHtml('<div>a<span class="placeholder">{em|ail}</span>c</div>');
      el.$format("placeholder", "firstName");
      expect(getHtml()).toBe('<div>a<span class="placeholder">{firstName}</span>|c</div>');
      // trigger without pair
      setHtml("<div>a|</div>");
      el.$format("mention", "john");
      expect(getHtml()).toBe("<div>a<mark>@john</mark>|</div>");

      // action without `format` changes nothing
      setHtml("<div>a|</div>");
      el.$format("action");
      expect(getHtml()).toBe("<div>a|</div>");
      setHtml("<div>a[b]c</div>");
      el.$format("del");
      expect(getHtml()).toBe("<div>a|c</div>");
      // uppercase (example of $tools): collapsed selection has no texts
      WUPTextRichControl.$tools.upper = {
        format: ({ texts }) => texts.forEach((t) => (t.data = t.data.toUpperCase())),
      };
      setHtml("<div>a[b<b>c]</b>d</div>");
      el.$format("upper");
      expect(getHtml()).toBe("<div>a[B<b>C]</b>d</div>");
      setHtml("<div><b>a</b>b</div>");
      window.getSelection().collapse(el.$refInput.firstChild, 1);
      el.$format("upper");
      expect(el.$refInput.innerHTML).toBe("<div><b>a</b>b</div>");
      // readonly: ignored
      el.$options.readOnly = true;
      await h.wait(1);
      setHtml("<div>[a]</div>");
      el.$format("upper");
      expect(el.$refInput.innerHTML).toBe("<div>a</div>");
      el.$options.readOnly = false;
      await h.wait(1);
      // selection out of editor
      window.getSelection().selectAllChildren(el.$refLabel);
      el.$format("upper");
      expect(el.$refInput.innerHTML).toBe("<div>a</div>");
    } finally {
      cleanup();
      cleanupImg();
      delete WUPTextRichControl.$tools.action;
      delete WUPTextRichControl.$tools.mention;
      delete WUPTextRichControl.$tools.del;
      delete WUPTextRichControl.$tools.upper;
    }
  });

  test("pending formats for the next typed text", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const btnBold = el.querySelector("[tool=bold]");

    setHtml("<div>a|</div>");
    el.applyFormat("bold");
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    expect(inp.innerHTML).toBe("<div>a</div>"); // nothing is changed till typing
    expect(typeText("b")).toBe(true);
    expect(getHtml()).toBe("<div>a<b>b|</b></div>");

    // toggle twice: off
    setHtml("<div>a|</div>");
    el.applyFormat("bold");
    el.applyFormat("bold");
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(typeText("b")).toBe(true);
    expect(getHtml()).toBe("<div>ab|</div>");

    // clean removes formats of caret
    setHtml("<div><b><em>a|</em></b></div>");
    el.applyFormat("clean");
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(typeText("b")).toBe(true);
    expect(getHtml()).toBe("<div><b><em>a</em></b>b|</div>");

    // set value inside format: text isn't wrapped twice
    setHtml("<div><b>a|</b></div>");
    el.$format("bold", true);
    expect(typeText("b")).toBe(true);
    expect(getHtml()).toBe("<div><b>ab|</b></div>");

    // caret moves: pending formats are reset
    setHtml("<div>ab|</div>");
    el.applyFormat("bold");
    window.getSelection().collapse(inp.firstChild.firstChild, 1);
    document.dispatchEvent(new Event("selectionchange"));
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(typeText("c")).toBe(false);
  });

  test("ArrowRight at the end of format: the next typed text goes out of it", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const btnBold = el.querySelector("[tool=bold]");
    /** Presses key on editor @returns true if it's prevented */
    const press = (key, opts) =>
      !inp.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }));

    setHtml("<div><b>bold|</b></div>");
    expect(press("ArrowRight")).toBe(true); // caret stays, format is left
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(press("ArrowRight")).toBe(false); // the 2nd one moves caret
    expect(press("ArrowLeft")).toBe(true); // back into format
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    expect(press("ArrowLeft")).toBe(false);
    expect(press("ArrowRight", { shiftKey: true })).toBe(false); // selection

    setHtml("<div><b>bo|ld</b></div>");
    expect(press("ArrowRight")).toBe(false);
    setHtml("<div><b>[bold]</b></div>");
    expect(press("ArrowRight")).toBe(false);
  });

  test("sanitizer", () => {
    const cleanup = useImage();
    try {
      const tools = {
        ...WUPTextRichControl.$tools,
        bold: { ...WUPTextRichControl.$tools.bold, classNameTag: "b" },
        highlight: { kind: "inline", is: (e) => e.style.backgroundColor === "yellow" || undefined, create: "mark" },
      };
      const inp = document.createElement("wup-richinput"); // value of control's input is mocked by mockAreaInput
      inp._tools = tools;
      /** Returns sanitized html for editor */
      const toEditor = (html) => {
        const div = document.createElement("div");
        div.appendChild(htmlToEditor(html, tools));
        return div.innerHTML;
      };
      /** Returns value of editor with html */
      const toValue = (html) => {
        inp.innerHTML = html;
        inp._cached = undefined;
        return inp.value;
      };

      [
        // inline content: unsupported elements are unwrapped or removed with content, comments are skipped
        ["a<!--c--><span>b</span><script>alert(1)</script><img src='a.png'>", '<div>ab<img src="a.png"></div>'],
        ["<p>a<!--c--><code>b</code><button>x</button><img src='a.png'></p>", '<div>ab<img src="a.png"></div>'],
        ["<p><b>a</b><b></b></p>", '<div><b class="b">a</b></div>'], // empty format is removed
        ["<p><a href='javascript:alert(1)'>a</a><a href='http://[x'>b</a><a>c</a></p>", "<div>abc</div>"],
        // element applies several formats; unsupported font size is removed
        [
          '<p><span style="font-size: small; background-color: yellow">a</span></p>',
          '<div><span style="font-size: small;"><mark>a</mark></span></div>',
        ],
        ['<p><span style="font-size: 20px">a</span></p>', "<div>a</div>"],
        // line breaks
        ["a<br>b<br><br>c", "<div>a</div><div>b</div><div><br></div><div>c</div>"],
        ["<br><p>a<br></p>", "<div><br></div><div>a<br></div>"],
        // blocks inside line are flattened
        ["<h1>a<div>b</div><p>c</p></h1>", "<h1>a<br>b<br>c</h1>"],
        ["<h1><div>a</div></h1>", "<h1>a</h1>"],
        // lists
        ["<li>a</li>", "<ul><li>a</li></ul>"],
        [
          "<ul> <li>a<p>b</p><ol><li>c</li></ol></li> <ol><li>d</li></ol> e<b>f</b></ul>",
          '<ul><li>a<br>b<ol><li>c</li></ol></li><ol><li>d</li></ol><li> e<b class="b">f</b></li></ul>',
        ],
        ["<ul><li></li></ul>", "<ul><li><br></li></ul>"],
        // containers with blocks are unwrapped
        ["<div><ol><li>a</li></ol>b</div>", "<ol><li>a</li></ol><div>b</div>"],
        ["<section><p></p></section>", ""],
        ["<h1>a</h1> <h2>b</h2>", "<h1>a</h1><h2>b</h2>"],
        // indent & line styles
        [
          "<p style='margin-left: 6em; text-align: center; color: red'>a</p><p style='margin-left: 0px'>b</p>",
          '<div style="text-align: center; margin-left: 6em;">a</div><div>b</div>',
        ],
      ].forEach(([html, expected]) => expect(toEditor(html)).toBe(expected));
      expect(toEditor("")).toBe("");

      // value: <strong> instead of <b> (keeps class), trailing <br> of line is removed, empty lines are kept
      expect(toValue('<div><b class="b">a</b><br></div><div><br></div>')).toBe(
        '<p><strong class="b">a</strong></p><p><br></p>'
      );
      expect(toValue("<ul><li>a<br></li></ul><h1>b<br></h1>")).toBe("<ul><li>a</li></ul><h1>b</h1>");
      expect(toValue('<div><img src="a.png"></div>')).toBe('<img src="a.png">'); // embed without text isn't empty
      expect(toValue("<div> </div>")).toBe("");
      expect(toValue("a<br>b")).toBe("<p>a</p><p>b</p>"); // loose content (Chrome doesn't wrap the 1st line)
    } finally {
      cleanup();
    }
  });

  test("history: snapshots of html & selection", () => {
    const refInput = {
      value: "",
      selection: { start: 0, end: 0 },
      setSelectionRange(start, end) {
        this.selection = { start, end };
      },
    };
    const hist = new TextRichHistory(refInput);
    /** Saves state before change & sets new value */
    const change = (value, pos, inserted) => {
      const st = { ...hist.inputState, pos1: pos, pos2: pos };
      if (inserted !== undefined) {
        st.action = 0; // InputTypes.append
        st.inserted = inserted;
      }
      refInput.value = value;
      hist.save(st);
      jest.advanceTimersByTime(1); // otherwise the next change is the same one
    };
    const undo = () => hist.undoRedo(false) && refInput.value;
    const redo = () => hist.undoRedo(true) && refInput.value;

    expect(undo()).toBe(false); // nothing to undo
    // typing is merged by words
    change("a", 0, "a");
    change("ab", 1, "b");
    change("ab ", 2, " ");
    change("ab  ", 3, " "); // the next delimiter is merged
    change("ab  c", 4, "c"); // word after delimiters
    change("ab  c", 5, "x"); // value isn't changed: skipped
    change("<b>ab  c</b>", 0); // format
    change("<b>ab  c</b>d", 5, null); // text without data (insertReplacementText etc.)
    expect(hist._hist).toEqual(["0,0,", "2,2,ab", "0,0,ab  c", "5,5,<b>ab  c</b>"]);

    refInput.selection = { start: 6, end: 6 };
    expect(undo()).toBe("<b>ab  c</b>");
    expect(refInput.selection).toEqual({ start: 5, end: 5 });
    expect(undo()).toBe("ab  c");
    expect(redo()).toBe("<b>ab  c</b>");
    expect(redo()).toBe("<b>ab  c</b>d"); // state before the 1st undo
    expect(refInput.selection).toEqual({ start: 6, end: 6 });
    expect(redo()).toBe(false);
    // typing after undo isn't merged into old snapshot
    undo();
    change("<b>ab  c</b>e", 5, "e");
    expect(hist._hist.at(-1)).toBe("5,5,<b>ab  c</b>");

    // the oldest snapshots are removed
    const { maxSnapshots } = TextRichHistory;
    TextRichHistory.maxSnapshots = hist._hist.length;
    try {
      change("1", 0);
      expect(hist._hist.length).toBe(TextRichHistory.maxSnapshots);
      expect(hist._hist[0]).toBe("2,2,ab");
    } finally {
      TextRichHistory.maxSnapshots = maxSnapshots;
    }
  });

  test("typed quote or bracket wraps selection", async () => {
    const cleanup = useImage();
    WUPTextRichControl.$tools.formula = {
      kind: "embed",
      is: (e) => (e.classList.contains("formula") ? e.textContent : undefined),
      create: "span",
      classNameTag: "formula",
    };
    try {
      el.$options.toolbar = [["bold"]]; // tools are applied on toolbar render
      await h.wait(1);
      el.$refInput.focus();
      /** Sets html with selection & types char */
      const wrap = (html, ch) => {
        setHtml(html);
        return [typeText(ch), getHtml()];
      };

      expect(wrap("<div>a [word] b</div>", "(")).toEqual([true, "<div>a ([word]) b</div>"]);
      // edge whitespaces stay outside (double click selects trailing space)
      expect(wrap("<div>a[ word ]b</div>", '"')).toEqual([true, '<div>a "[word]" b</div>']);
      expect(wrap("<div>a[b <b>c]</b> d</div>", "[")).toEqual([true, "<div>a[[b <b>c]]</b> d</div>"]);
      // embeds are content
      expect(wrap('<div>a[<img src="a.png">] b</div>', "{")).toEqual([true, '<div>a{[<img src="a.png">]} b</div>']);
      expect(wrap('<div>a[<img src="a.png">]</div>', "{")).toEqual([true, '<div>a{[<img src="a.png">]}</div>']);
      expect(wrap('<div>[<span class="formula">x</span>]</div>', "'")).toEqual([
        true,
        "<div>'[<span class=\"formula\">x</span>]'</div>",
      ]);
      // nothing to wrap: char replaces selection as usual
      expect(wrap("<div>a[ ]b</div>", "(")).toEqual([false, "<div>a[ ]b</div>"]);
      expect(wrap("<div>[ab]</div>", "x")).toEqual([false, "<div>[ab]</div>"]);
    } finally {
      cleanup();
      delete WUPTextRichControl.$tools.formula;
    }
  });

  test("typed text around token", async () => {
    const cleanup = usePlaceholder();
    try {
      el.$options.toolbar = [["placeholder"]];
      await h.wait(1);
      el.$refInput.focus();
      const token = '<span class="placeholder">{email}</span>';
      /** Sets html with selection & types char */
      const type = (html, ch) => {
        setHtml(html);
        return [typeText(ch), getHtml()];
      };

      // text typed at token edges goes outside it
      expect(type(`<div>a<span class="placeholder">|{email}</span></div>`, "x")).toEqual([
        true,
        `<div>ax|${token}</div>`,
      ]);
      expect(type(`<div><span class="placeholder">{email}|</span></div>`, "x")).toEqual([
        true,
        `<div>${token}x|</div>`,
      ]);
      setHtml(`<div>${token}</div>`);
      window.getSelection().collapse(el.$refInput.firstChild, 1); // after token (caret after insertion)
      expect(typeText("x")).toBe(true);
      expect(getHtml()).toBe(`<div>${token}x|</div>`);
      expect(type(`<div><span class="placeholder">{em|ail}</span></div>`, "x")).toEqual([
        false,
        `<div><span class="placeholder">{em|ail}</span></div>`,
      ]);
      expect(type(`<div>[${token}]</div>`, "x")[0]).toBe(false);

      // typed pair of trigger turns text into token even if it isn't in values
      expect(type("<div>a {someProp|</div>", "}")).toEqual([
        true,
        '<div>a <span class="placeholder">{someProp}</span>|</div>',
      ]);
      expect(type("<div>a {some prop|</div>", "}")[0]).toBe(false); // whitespaces
      expect(type("<div>a |</div>", "}")[0]).toBe(false); // without trigger
      expect(type("<div>a {|</div>", "}")[0]).toBe(false); // empty
      // `is` rejects value
      const { is } = WUPTextRichControl.$tools.placeholder;
      WUPTextRichControl.$tools.placeholder.is = (e) => (e.textContent === "{email}" ? "email" : undefined);
      expect(type("<div>a {someProp|</div>", "}")[0]).toBe(false);
      expect(type("<div>a {email|</div>", "}")).toEqual([true, `<div>a ${token}|</div>`]);
      WUPTextRichControl.$tools.placeholder.is = is;
      // tool isn't rendered
      el.$options.toolbar = [["bold"]];
      await h.wait(1);
      expect(type("<div>a {someProp|</div>", "}")[0]).toBe(false);
    } finally {
      cleanup();
    }
  });

  test("typed trigger: menu is filtered by text after it", async () => {
    const cleanup = usePlaceholder();
    WUPTextRichControl.$tools.header.trigger = "/";
    try {
      el.$options.toolbar = [["header"], ["placeholder"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const btn = el.querySelector("[tool=placeholder]");
      const items = () => [...el.querySelectorAll("wup-popup[menu] li")].filter((li) => !li.hidden);
      /** Presses key on editor @returns true if it's prevented */
      const press = (key) => !inp.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

      setHtml("<div>a |</div>");
      userType("{");
      expect(btn.getAttribute("aria-expanded")).toBe("true");
      expect(items().map((li) => li.textContent)).toEqual(["First Name", "Email"]);
      userType("e"); // label or value contains typed text
      expect(items().map((li) => li.textContent)).toEqual(["First Name", "Email"]);
      userType("m");
      expect(items().map((li) => li.textContent)).toEqual(["Email"]);
      expect(items()[0].hasAttribute("focused")).toBe(true);
      expect(press("Enter")).toBe(true);
      await h.wait(1);
      expect(getHtml()).toBe('<div>a <span class="placeholder">{email}</span>|</div>');
      expect(btn.getAttribute("aria-expanded")).toBe("false");

      // closed if whitespace is typed, nothing matches or caret leaves trigger
      setHtml("<div>a |</div>");
      userType("{");
      userType(" ");
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      setHtml("<div>a |</div>");
      userType("{");
      userType("z");
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      setHtml("<div>a |</div>");
      userType("{");
      window.getSelection().collapse(inp.firstChild.firstChild, 0);
      document.dispatchEvent(new Event("selectionchange"));
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      setHtml("<div>a |</div>");
      userType("{");
      window.getSelection().selectAllChildren(inp.firstChild);
      document.dispatchEvent(new Event("selectionchange"));
      expect(btn.getAttribute("aria-expanded")).toBe("false");

      // line format: typed text is deleted
      setHtml("<div>a |</div>");
      userType("/");
      // the 1st item is focused: Arrows cycle
      expect(press("ArrowUp")).toBe(true);
      expect(press("ArrowDown")).toBe(true);
      expect(press("Enter")).toBe(true);
      await h.wait(1);
      expect(getHtml()).toBe("<h1>a |</h1>");
    } finally {
      cleanup();
      delete WUPTextRichControl.$tools.header.trigger;
    }
  });

  test("paste", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();

    setHtml("<div>a|</div>");
    expect(userPaste("<b>b</b><script>alert(1)</script>")).toBe(true);
    expect(getHtml()).toBe("<div>a<b>b</b>|</div>");
    expect(userPaste("")).toBe(false); // plain text: browser pastes it
    // target range is selected at first
    setHtml("<div>abc</div>");
    const t = inp.firstChild.firstChild;
    expect(userPaste("<i>x</i>", { startContainer: t, startOffset: 1, endContainer: t, endOffset: 2 })).toBe(true);
    expect(getHtml()).toBe("<div>a<em>x</em>|c</div>");
    // nothing to paste: selection is deleted only
    setHtml("<div>a[b]c</div>");
    expect(userPaste("<script>alert(1)</script>")).toBe(true);
    expect(inp.innerHTML).toBe("<div>ac</div>");
    // into list item: lists are flattened
    setHtml("<ul><li>x|</li></ul>");
    userPaste("<ul><li>a</li><li>b<ol><li>c</li></ol></li></ul><p>d</p>");
    expect(getHtml()).toBe("<ul><li>xa<br>b<br>c<br>d|</li></ul>");
  });

  test("delete over several lines", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html & fires `beforeinput` of deleting with target range from char of the 1st line to char of the last one
     * @returns [isPrevented, html] */
    const del = (html, [startNode, start], [endNode, end]) => {
      setHtml(html);
      const r = { startContainer: startNode(), startOffset: start, endContainer: endNode(), endOffset: end };
      const ev = new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true });
      ev.getTargetRanges = () => [r];
      return [!inp.dispatchEvent(ev), getHtml()];
    };
    const first = () => inp.firstElementChild.firstChild;
    const last = () => inp.lastElementChild.firstChild;

    // the rest of the last line joins the 1st one
    expect(del("<h1>ab</h1><div>cd</div>", [first, 1], [last, 1])).toEqual([true, "<h1>a|d</h1>"]);
    // the 1st line is deleted from its start: the last one keeps its tag
    expect(del("<h1>ab</h1><div>cd</div>", [first, 0], [last, 1])).toEqual([true, "<div>|d</div>"]);
    expect(del("<h1>ab</h1><div>cd</div>", [first, 1], [last, 2])).toEqual([true, "<h1>a|</h1>"]);
    // everything is deleted: plain paragraph
    expect(del('<h1>ab</h1><h2 style="text-align: center;">cd</h2>', [first, 0], [last, 2])).toEqual([
      true,
      "<div>|<br></div>",
    ]);
    // emptied list is removed
    expect(del("<ul><li>ab</li></ul><div>cd</div>", [() => inp.querySelector("li").firstChild, 0], [last, 1])).toEqual([
      true,
      "<div>|d</div>",
    ]);
    // trailing <br> of the 1st line is removed
    expect(del("<div>a<br></div><div>cd</div>", [() => inp.firstElementChild, 2], [last, 1])).toEqual([
      true,
      "<div>a|d</div>",
    ]);
    // nested lists: browser deletes it
    expect(
      del(
        "<div>ab</div><ul><li>cd<ul><li>e</li></ul></li></ul>",
        [first, 1],
        [() => inp.querySelector("li").firstChild, 1]
      )[0]
    ).toBe(false);
    expect(del("<div>ab</div>", [first, 0], [first, 1])[0]).toBe(false); // single line
  });

  test("browser formatting is replaced by tools", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const spy = jest.spyOn(el, "applyFormat");
    [
      ["formatBold", ["bold", undefined, false]],
      ["formatStrikeThrough", ["strike", undefined, false]],
      ["formatJustifyFull", ["align", "justify", true]],
      ["formatJustifyLeft", ["align", false, true]],
      ["formatJustifyCenter", ["align", "center", true]],
      ["formatSuperscript", ["script", "super", false]],
      ["formatIndent", ["indent", 1, false]],
      ["formatOutdent", ["indent", -1, false]],
      ["formatRemove", ["clean", undefined, false]],
      ["formatFontColor", null], // not supported
    ].forEach(([inputType, args]) => {
      setHtml("<div>[a]</div>");
      spy.mockClear();
      expect(typeText(null, inputType)).toBe(true);
      expect(spy.mock.calls).toEqual(args ? [args] : []);
    });
  });

  test("link url is asked via popup", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Opens popup by $format without value & returns its text control */
    const ask = async (html) => {
      setHtml(html);
      el.$format("link");
      await h.wait();
      return el.querySelector("wup-popup wup-text");
    };
    /** Presses key in text control of popup */
    const press = async (txt, key) => {
      txt.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
      await h.wait(1);
    };

    let txt = await ask("<div>a [b] c</div>");
    expect(txt.$value).toBe("https://");
    await press(txt, "a");
    expect(txt.isConnected).toBe(true);
    expect(document.activeElement).toBe(txt.$refInput);
    txt.$value = "ftp://x.com/"; // unsafe protocol
    await press(txt, "Enter");
    expect(txt.$refError?.textContent).toContain("Invalid link"); // popup isn't closed
    expect(txt.isConnected).toBe(true);
    txt.$value = undefined;
    await press(txt, "Enter");
    expect(txt.isConnected).toBe(true); // required
    txt.$value = "https://x.com/";
    await press(txt, "Enter");
    await h.wait();
    expect(txt.isConnected).toBe(false);
    expect(document.activeElement).toBe(inp); // focus & selection return to editor
    expect(getHtml()).toBe('<div>a [<a href="https://x.com/" target="_blank" rel="noopener noreferrer">b]</a> c</div>');

    // canceled by Escape or focus out
    txt = await ask("<div>a [b] c</div>");
    await press(txt, "Escape");
    expect(txt.isConnected).toBe(false);
    expect(getHtml()).toBe("<div>a [b] c</div>");
    txt = await ask("<div>a [b] c</div>");
    txt.$refInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    await h.wait();
    expect(txt.isConnected).toBe(false);
    expect(inp.innerHTML).toBe("<div>a b c</div>");

    // tool isn't rendered: popup is placed near editor
    el.$options.toolbar = [["bold"]];
    await h.wait(1);
    txt = await ask("<div>a [b] c</div>");
    expect(txt.parentElement.$options.target).toBe(inp);
    await press(txt, "Escape");
    await h.wait();
  });

  test("popup on hover: link url & dropdown of embed", async () => {
    const cleanupImg = useImage();
    WUPTextRichControl.$tools.image.values = [{ value: "a.png" }, { value: "b.png" }];
    try {
      el.$options.toolbar = [["image"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const url = "https://x.com/";
      setHtml(`<div>a <a href="${url}">link</a> <img src="a.png"> b|</div>`);
      const a = inp.querySelector("a");
      const img = inp.querySelector("img");
      const move = (t, opts) => t.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, ...opts }));
      const leave = (t, pointerType = "mouse") => {
        const ev = new MouseEvent("pointerleave");
        ev.pointerType = pointerType;
        t.dispatchEvent(ev);
      };
      const popup = () => [...el.querySelectorAll("wup-popup")].at(-1) ?? null;

      // link: url popup with text control (not focused)
      move(a, { buttons: 1 }); // selecting by mouse
      await h.wait();
      expect(popup()).toBe(null);
      move(a);
      await h.wait();
      const txt = popup().querySelector("wup-text");
      expect(txt.$value).toBe(url);
      expect(document.activeElement).toBe(inp);
      // pointer moves between link & popup: it stays opened
      leave(inp);
      popup().onpointerenter();
      await h.wait();
      expect(popup()).toBeTruthy();
      popup().onpointerleave({ pointerType: "touch" }); // touch leaves right after tap
      await h.wait();
      expect(popup()).toBeTruthy();
      popup().onpointerleave({ pointerType: "mouse" });
      await h.wait();
      expect(popup()).toBe(null);
      // new url
      move(a);
      await h.wait();
      const txt2 = popup().querySelector("wup-text");
      txt2.$value = "https://y.com/";
      txt2.$refInput.focus();
      leave(inp); // user edits value: popup stays
      await h.wait();
      popup()
        .querySelector("input")
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      await h.wait();
      expect(a.getAttribute("href")).toBe("https://y.com/");
      // cleared url removes link
      move(inp.firstChild);
      move(a);
      await h.wait();
      popup().querySelector("wup-text").clearValue();
      await h.wait();
      expect(inp.querySelector("a")).toBe(null);
      expect(popup()).toBe(null);

      // embed: dropdown with values, chosen one replaces it
      move(img);
      await h.wait();
      expect(popup().hasAttribute("menu")).toBe(true);
      expect(popup().querySelector("[aria-selected=true]").textContent).toBe("A.png");
      leave(inp, "touch");
      await h.wait();
      expect(popup()).toBeTruthy();
      // Escape closes it instead of clearing value
      expect(inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))).toBe(
        false
      );
      await h.wait();
      expect(popup()).toBe(null);
      move(inp.firstChild);
      move(img);
      await h.wait();
      popup().querySelectorAll("li")[1].click();
      await h.wait();
      expect(inp.querySelector("img").getAttribute("src")).toBe("b.png");
      expect(img.isConnected).toBe(false);

      // embed is removed while popup is opened
      const img2 = inp.querySelector("img");
      move(inp.firstChild);
      move(img2);
      await h.wait();
      popup().querySelectorAll("li")[0].click();
      img2.remove();
      await h.wait();
      expect(inp.querySelector("img")).toBe(null);
      // pointer leaves before popup is opened
      setHtml(`<div><img src="a.png"></div>`);
      move(inp.querySelector("img"));
      inp.querySelector("img").remove();
      await h.wait();
      expect(popup()).toBe(null);

      // readonly is set before popup is opened
      setHtml(`<div><img src="a.png"></div>`);
      move(inp.querySelector("img"));
      el.$options.readOnly = true;
      await h.wait();
      expect(popup()).toBe(null);
      el.$options.readOnly = false;
      await h.wait(1);
      // focus is lost
      setHtml(`<div><a href="${url}">link</a></div>`);
      move(inp.querySelector("a"));
      await h.wait();
      expect(popup().querySelector("wup-text")).toBeTruthy();
      inp.blur();
      await h.wait();
      expect(popup()).toBe(null);
      inp.focus();

      // readonly: links only
      setHtml(`<div><img src="a.png"></div>`);
      el.$options.readOnly = true;
      await h.wait(1);
      move(inp.querySelector("img"));
      await h.wait();
      expect(popup()).toBe(null);
    } finally {
      cleanupImg();
    }
  });

  test("press on element with popup opens it at once", async () => {
    const cleanupImg = useImage();
    WUPTextRichControl.$tools.image.values = [{ value: "a.png" }];
    try {
      el.$options.toolbar = [["image"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      setHtml('<div>a <img src="a.png"> <a href="https://x.com/">link</a></div>');
      const press = (t, pointerType) => {
        const ev = new MouseEvent("pointerdown", { bubbles: true });
        ev.pointerType = pointerType;
        t.dispatchEvent(ev);
      };
      const popup = () => [...el.querySelectorAll("wup-popup")].at(-1) ?? null;

      press(inp.querySelector("img"), "touch"); // touch presses on click
      expect(popup()).toBe(null);
      inp.querySelector("img").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(popup().hasAttribute("menu")).toBe(true);
      press(inp.querySelector("img"), "mouse"); // the same element
      expect(el.querySelectorAll("wup-popup").length).toBe(1);
      press(inp.querySelector("a"), "mouse");
      expect(popup().querySelector("wup-text")).toBeTruthy();
      press(inp.firstChild, "mouse"); // elsewhere: closed
      await h.wait();
      expect(popup()).toBe(null);
    } finally {
      cleanupImg();
    }
  });

  test("click on embed with `ask`: asked value replaces it", async () => {
    const ask = jest.fn(() => Promise.resolve("b.png"));
    const cleanupImg = useImage(ask);
    try {
      el.$options.toolbar = [["image"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      setHtml('<div>a <img src="a.png"> b|</div>');
      const img = inp.querySelector("img");
      img.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(ask).toBeCalledWith(img, el, "a.png");
      await h.wait(1);
      expect(getHtml()).toBe('<div>a <img src="b.png">| b</div>');
      // tool button: popup is placed near it
      setHtml("<div>a|</div>");
      el.$format("image");
      expect(ask).lastCalledWith(el.querySelector("[tool=image]"), el, undefined);
      await h.wait(1);
      expect(getHtml()).toBe('<div>a<img src="b.png">|</div>');
      // canceled
      ask.mockImplementation(() => Promise.resolve(null));
      setHtml("<div>a|</div>");
      el.$format("image");
      await h.wait(1);
      expect(getHtml()).toBe("<div>a|</div>");
      // readonly: not asked
      ask.mockClear();
      setHtml('<div>a <img src="a.png"> b|</div>');
      el.$options.readOnly = true;
      await h.wait(1);
      inp.querySelector("img").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(ask).not.toBeCalled();
    } finally {
      cleanupImg();
    }
  });

  test("dropdown menu", async () => {
    const rect = { x: 0, y: 0, top: 0, left: 0, right: 1, bottom: 9, width: 1, height: 9 };
    Range.prototype.getBoundingClientRect = () => rect; // jsdom doesn't support it: menu is placed near selection
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const btn = el.querySelector("[tool=header]");
    const menu = () => el.querySelector("wup-popup[menu]");
    /** Presses key on element @returns true if it's prevented */
    const press = (t, key, opts) =>
      !t.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }));

    // $format without value: menu near selection
    setHtml("<div>[a]</div>");
    el.$format("header");
    await h.wait(1);
    expect(menu()).toBeTruthy();
    expect(inp.getAttribute("aria-activedescendant")).toBe(menu().querySelector("[aria-selected=true]").id);
    document.dispatchEvent(new Event("selectionchange")); // selection isn't changed
    expect(menu()).toBeTruthy();
    expect(press(inp, "ArrowDown", { shiftKey: true })).toBe(false); // modifiers: not menu keys
    expect(press(inp, "Tab")).toBe(true); // chooses focused item
    await h.wait();
    expect(menu()).toBe(null);
    expect(inp.hasAttribute("aria-activedescendant")).toBe(false);
    setHtml("<div>[a]</div>");
    el.$format("header");
    await h.wait(1);
    window.getSelection().collapse(inp.firstChild.firstChild, 1);
    document.dispatchEvent(new Event("selectionchange")); // selection is changed: closed
    await h.wait();
    expect(menu()).toBe(null);
    // Escape & blur close it
    el.$format("header");
    await h.wait(1);
    expect(press(inp, "Escape")).toBe(true);
    await h.wait();
    expect(menu()).toBe(null);
    el.$format("header");
    await h.wait(1);
    inp.blur();
    await h.wait();
    expect(menu()).toBe(null);
    inp.focus();

    // keyboard on focused dropdown: ArrowDown opens menu, Space chooses
    setHtml("<div>a|</div>");
    btn.focus();
    expect(press(btn, "ArrowDown")).toBe(true);
    await h.wait(1);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(btn); // focus stays on dropdown
    expect(press(btn, "ArrowDown")).toBe(true);
    expect(press(btn, "ArrowDown")).toBe(true);
    expect(press(btn, "ArrowUp")).toBe(true);
    expect(press(btn, " ")).toBe(true);
    await h.wait();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(getHtml()).toBe("<h1>a|</h1>");
    expect(btn.textContent).toBe("Heading 1");

    // tool isn't rendered as dropdown: nothing to ask
    el.$options.toolbar = [[{ header: 1 }]];
    await h.wait(1);
    el.$format("header");
    await h.wait(1);
    expect(menu()).toBe(null);
    // dropdown without values: Enter closes it
    el.$options.toolbar = [[{ header: [] }]];
    await h.wait(1);
    el.$format("header");
    await h.wait(1);
    expect(menu()).toBeTruthy();
    expect(press(inp, "Enter")).toBe(true);
    await h.wait();
    expect(menu()).toBe(null);
  });

  test("dropdown items", async () => {
    WUPTextRichControl.$tools.image = { kind: "embed", values: [{ value: "a.png", hotKey: "Control+Alt+I" }] };
    try {
      el.$options.toolbar = [["align", { list: ["ordered", "check"] }, "header", "size", "image"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      /** Opens dropdown & returns its items */
      const open = async (name) => {
        el.querySelector(`[tool=${name}]`).click();
        await h.wait(1);
        const items = [...el.querySelectorAll("wup-popup[menu] li")];
        const r = items.map((li) => li.outerHTML.replace(/ id="[^"]+"| focused=""/g, ""));
        el.querySelector(`[tool=${name}]`).click(); // close
        await h.wait();
        return r;
      };

      setHtml('<div style="text-align: right;"><span style="font-size: 20px;">a|</span></div>');
      // icons by className: label in tooltip
      const align = el.querySelector("[tool=align]");
      expect(align.hasAttribute("icon")).toBe(true);
      expect(align.className).toBe("wup-icon-align-right"); // icon of current value
      expect((await open("align"))[0]).toBe(
        '<li role="option" aria-selected="false" icon="" class="wup-icon-align-center" aria-label="Center" aria-keyshortcuts="Control+Shift+E" w-tooltip="Center (Ctrl+Shift+E)"></li>'
      );
      // without preview: label & hint; value missed in tool is prettified
      expect(await open("list")).toEqual([
        '<li role="option" aria-selected="false" aria-keyshortcuts="Control+Shift+7">Numbered list<kbd aria-hidden="true">Ctrl+Shift+7</kbd></li>',
        '<li role="option" aria-selected="false">Check</li>',
      ]);
      expect(await open("image")).toEqual([
        '<li role="option" aria-selected="false" aria-keyshortcuts="Control+Alt+I">A.png<kbd aria-hidden="true">Ctrl+Alt+I</kbd></li>',
      ]);
      // block preview: hint in tooltip
      expect((await open("header"))[0]).toBe(
        '<li role="option" aria-selected="false" aria-keyshortcuts="Control+Alt+1" w-tooltip="Heading 1 (Ctrl+Alt+1)"><h1 role="none">Heading 1</h1></li>'
      );
      // unsupported font size is shown as default
      expect(el.querySelector("[tool=size]").textContent).toBe("Default");
      setHtml("<h3>a|</h3>");
      document.dispatchEvent(new Event("selectionchange"));
      expect(el.querySelector("[tool=header]").textContent).toBe("Heading 3");
    } finally {
      delete WUPTextRichControl.$tools.image;
    }
  });

  test("toolbar", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    // unknown tool
    const spyErr = jest.spyOn(console, "error").mockImplementation(() => {});
    el.$options.toolbar = [["bold", "unknown"]];
    await h.wait(1);
    expect(spyErr).toBeCalledTimes(1);
    expect(spyErr.mock.calls[0][0]).toMatch("Toolbar item 'unknown' isn't defined in $tools");
    expect(el.$refToolbar.innerHTML).toBe(
      '<div role="group"><button type="button" tabindex="-1" tool="bold" aria-label="Bold" aria-keyshortcuts="Control+B" w-tooltip="Bold (Ctrl+B)" aria-pressed="false"></button></div>'
    );
    // label of clear button
    const { label } = WUPTextRichControl.$tools.btnClear;
    delete WUPTextRichControl.$tools.btnClear.label;
    try {
      el.$options.toolbar = [["btnClear"]];
      await h.wait(1);
      expect(el.$refBtnClear.getAttribute("aria-label")).toBe("btnClear");
    } finally {
      WUPTextRichControl.$tools.btnClear.label = label;
    }

    // formats of the 1st selected char: selection starts at the end of line
    el.$options.toolbar = [["header"]];
    await h.wait(1);
    setHtml("<div><br></div><h2>b</h2>");
    window.getSelection().setBaseAndExtent(inp.firstChild, 1, inp.lastChild.firstChild, 1);
    document.dispatchEvent(new Event("selectionchange"));
    expect(el.querySelector("[tool=header]").textContent).toBe("Heading 2");

    // keyboard: Arrows cycle, Home/End, Escape returns to editor
    el.$options.toolbar = [["bold", "italic"], ["header"]];
    await h.wait(1);
    setHtml("<div>a|</div>");
    const [b, i, hd] = el.$refToolbar.querySelectorAll("button");
    const press = (key, opts) =>
      !document.activeElement.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts })
      );
    expect(press("F10", { code: "F10", altKey: true })).toBe(true); // Alt+F10
    expect(document.activeElement).toBe(b);
    expect(press("ArrowRight")).toBe(true);
    expect(document.activeElement).toBe(i);
    expect(press("End")).toBe(true);
    expect(document.activeElement).toBe(hd);
    expect(press("ArrowRight")).toBe(true);
    expect(document.activeElement).toBe(b);
    expect(press("ArrowLeft")).toBe(true);
    expect(document.activeElement).toBe(hd);
    expect(press("Home")).toBe(true);
    expect(document.activeElement).toBe(b);
    expect(press("ArrowDown")).toBe(false); // not dropdown
    expect(press("ArrowRight", { ctrlKey: true })).toBe(false);
    expect(press("a")).toBe(false);
    // click on button restores selection of editor
    b.click();
    expect(document.activeElement).toBe(inp);
    expect(getHtml()).toBe("<div>a|</div>");
    expect(b.getAttribute("aria-pressed")).toBe("true"); // pending
    b.focus();
    expect(press("Escape")).toBe(true);
    expect(document.activeElement).toBe(inp);
    // selection is removed from editor
    b.focus();
    inp.innerHTML = "<div>b</div>";
    b.click();
    expect(document.activeElement).toBe(inp);
  });

  test("hotkeys", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Presses Ctrl + key on editor @returns true if it's prevented */
    const press = (code, opts) =>
      !inp.dispatchEvent(
        new KeyboardEvent("keydown", { code, ctrlKey: true, bubbles: true, cancelable: true, ...opts })
      );

    setHtml("<div>[a]</div>");
    expect(press("KeyB")).toBe(true);
    expect(inp.innerHTML).toBe("<div><b>a</b></div>");
    expect(press("Digit1", { altKey: true })).toBe(true); // value of dropdown
    expect(inp.innerHTML).toBe("<h1><b>a</b></h1>");
    expect(press("Period", { shiftKey: true })).toBe(true); // bigger font
    expect(inp.innerHTML).toBe('<h1><b><span style="font-size: x-large;">a</span></b></h1>');
    expect(press("Comma", { shiftKey: true })).toBe(true); // smaller font
    expect(inp.innerHTML).toBe("<h1><b>a</b></h1>");
    expect(press("Comma", { shiftKey: true })).toBe(true);
    expect(inp.innerHTML).toBe('<h1><b><span style="font-size: small;">a</span></b></h1>');
    expect(press("Comma", { shiftKey: true })).toBe(true); // the smallest one: nothing to apply
    expect(inp.innerHTML).toBe('<h1><b><span style="font-size: small;">a</span></b></h1>');
    expect(press("KeyQ")).toBe(false); // not a shortcut
    expect(press("KeyB", { metaKey: true })).toBe(false);

    // tool isn't rendered: browser handles shortcut
    el.$options.toolbar = [["italic"]];
    await h.wait(1);
    setHtml("<div>[a]</div>");
    expect(press("KeyB")).toBe(false);
    expect(press("Digit1", { altKey: true })).toBe(false);
    expect(press("Period", { shiftKey: true })).toBe(false);
    // browser formatting is blocked if shortcut is redefined
    const { hotKey } = WUPTextRichControl.$tools.bold;
    WUPTextRichControl.$tools.bold.hotKey = "Control+Shift+B";
    try {
      el.$options.toolbar = [["bold"]];
      await h.wait(1);
      expect(press("KeyB")).toBe(true);
      expect(inp.innerHTML).toBe("<div>a</div>");
      expect(press("KeyB", { shiftKey: true })).toBe(true);
      expect(inp.innerHTML).toBe("<div><b>a</b></div>");
    } finally {
      WUPTextRichControl.$tools.bold.hotKey = hotKey;
    }

    // clear button
    WUPTextRichControl.$tools.btnClear.hotKey = "Control+Shift+Delete";
    try {
      el.$options.toolbar = [["btnClear"]];
      await h.wait(1);
      el.$value = "abc";
      await h.wait(1);
      expect(press("Delete", { shiftKey: true })).toBe(true);
      await h.wait(1);
      expect(el.$value).toBe(undefined);
    } finally {
      WUPTextRichControl.$tools.btnClear.hotKey = "Escape";
    }

    // current value isn't in values: the 1st shortcut selects the last value
    const format = jest.fn();
    WUPTextRichControl.$tools.font = {
      hotKey: "Control+Alt+Shift+F Control+Alt+Shift+G",
      values: [{ value: "serif" }, { value: "monospace" }],
      is: (e) => e.style.fontFamily || undefined,
      format,
    };
    try {
      el.$options.toolbar = [["font"]];
      await h.wait(1);
      setHtml('<div><span style="font-family: Arial;">[a]</span></div>');
      expect(press("KeyF", { altKey: true, shiftKey: true })).toBe(true);
      expect(format.mock.calls[0][0].value).toBe("monospace");
    } finally {
      delete WUPTextRichControl.$tools.font;
    }
  });

  test("$ask: value via popup with text control", async () => {
    await h.wait(1);
    const btn = el.querySelector("[tool=bold]");
    const p = el.$ask(btn, "x", { label: "Name" });
    await h.wait();
    const txt = el.querySelector("wup-popup wup-text");
    expect(txt.$options.label).toBe("Name");
    expect(txt.parentElement.$options.target).toBe(btn);
    txt.$value = undefined;
    txt.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await expect(p).resolves.toBe(""); // empty value
  });

  test("undo/redo of formats", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    await h.wait(1);
    setHtml("<div>[a]</div>");
    el.applyFormat("bold");
    expect(inp.innerHTML).toBe("<div><b>a</b></div>");
    await h.wait(1);
    expect(typeText(null, "historyUndo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe("<div>a</div>");
    expect(typeText(null, "historyRedo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe("<div><b>a</b></div>");
  });

  test("menu near caret", async () => {
    const cleanup = usePlaceholder();
    const { DOMRect } = window;
    window.DOMRect = class {
      constructor(x, y, width, height) {
        Object.assign(this, { x, y, width, height });
      }
    };
    try {
      el.$options.toolbar = [["placeholder"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      let rect = { x: 5, y: 6, right: 5, width: 0, height: 9 };
      Range.prototype.getBoundingClientRect = () => rect;
      let rects = [];
      Range.prototype.getClientRects = () => rects;
      /** Opens menu at caret & returns rect of its target */
      const rectAt = async (n, offset) => {
        window.getSelection().collapse(n, offset);
        el.$format("placeholder");
        await h.wait(1);
        const { x, y, width, height } = el.querySelector("wup-popup[menu]").getTargetRect();
        el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
        await h.wait();
        return [x, y, width, height];
      };

      setHtml("<div>a<br></div>");
      const div = inp.firstChild;
      expect(await rectAt(div.firstChild, 1)).toEqual([5, 6, 1, 9]); // caret gets width 1px
      rect = { x: 5, y: 6, right: 7, width: 2, height: 9 };
      expect(await rectAt(div.firstChild, 1)).toEqual([5, 6, 2, 9]);
      // caret between nodes has empty rect: the end of previous node or the start of node
      rect = { x: 0, y: 0, right: 0, width: 0, height: 0 };
      rects = [
        { x: 1, y: 2, right: 3, height: 4 },
        { x: 10, y: 20, right: 30, height: 40 },
      ];
      expect(await rectAt(div, 1)).toEqual([30, 20, 1, 40]);
      expect(await rectAt(div, 0)).toEqual([1, 2, 1, 4]);
      rects = [];
      expect(await rectAt(div, 0)).toEqual([0, 0, 1, 0]);
    } finally {
      cleanup();
      window.DOMRect = DOMRect;
      delete Range.prototype.getClientRects;
    }
  });

  test("macOS: Cmd instead of Ctrl", async () => {
    const spyUA = jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh)");
    const { define } = customElements;
    // control is defined already: new tag for its copy
    jest
      .spyOn(customElements, "define")
      .mockImplementation((tag, c) => tag === "wup-textrich" && define.call(customElements, "wup-textrich-mac", c));
    // WARN: 'isMac' is resolved on import so module must be re-imported after mocks are applied
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      require("web-ui-pack/controls/textRich");
    });
    customElements.define = define;
    spyUA.mockRestore();

    const c = document.body.appendChild(document.createElement("wup-textrich-mac"));
    await h.wait(1);
    const inp = c.$refInput;
    inp.innerHTML = "<div>a</div>";
    inp.focus();
    window.getSelection().selectAllChildren(inp.firstChild);
    const press = (opts) =>
      !inp.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyB", bubbles: true, cancelable: true, ...opts }));
    expect(c.querySelector("[tool=bold]").getAttribute("aria-keyshortcuts")).toBe("Meta+B");
    expect(c.querySelector("[tool=bold]").getAttribute("w-tooltip")).toBe("Bold (⌘B)");
    expect(press({ ctrlKey: true })).toBe(false);
    expect(press({ metaKey: true, ctrlKey: true })).toBe(false);
    expect(press({ metaKey: true })).toBe(true);
    expect(inp.innerHTML).toBe("<div><b>a</b></div>");
    // hints in order of macOS menus
    const b = document.createElement("button");
    expect(c.setHotKeys(b, "Control+Alt+Shift+C Control+Escape Alt+Shift+5")).toBe("⌥⇧⌘C / ⌘Esc / ⌥⇧5");
    expect(b.getAttribute("aria-keyshortcuts")).toBe("Meta+Alt+Shift+C Meta+Escape Alt+Shift+5");
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
