import WUPTextRichControl from "web-ui-pack/controls/textRich/textRich";
import TextRichHistory from "web-ui-pack/controls/textRich/textRich.history";
import { Html } from "web-ui-pack/controls/textRich/textRich.utils";
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

/** Adds tools `phone`, `tag` & `mention` like demo textRich.custom.tsx does (classes `wup-tag`, `wup-mention`);
 *  they're removed after each test */
function useSocial() {
  const t = WUPTextRichControl.$tools;
  const telOf = (e) => {
    const href = (e.tagName === "A" && e.getAttribute("href")) || "";
    return (/^tel:/i.test(href) && href.slice(4)) || undefined;
  };
  t.phone = {
    label: "Phone",
    hideOnToolbar: true,
    kind: "inline",
    recognize: /(?<![\p{L}\p{N}+/.:-])\+\d \(\d{3}\) \d{3}-\d{2}-\d{2}$/u, // strict format `+1 (555) 123-45-67`
    placeholder: "+1 (555) 123-45-67",
    is: telOf,
    create: (v) => Object.assign(document.createElement("a"), { href: `tel:${v.replace(/[^\d+]/g, "")}` }),
  };
  t.tag = {
    label: "Hashtag",
    hideOnToolbar: true,
    kind: "inline",
    recognize: /(?<![\p{L}\p{N}\p{M}_&/#])#(?![\p{N}_]+$)[\p{L}\p{N}\p{M}_]+$/u,
    placeholder: "#tag",
    is: (e) => (e.classList.contains("wup-tag") ? e.textContent.slice(1) : undefined),
    create: "span",
    classNameTag: "wup-tag",
  };
  t.mention = {
    label: "Mention",
    hideOnToolbar: true,
    trigger: "@",
    kind: "inline",
    recognize: /(?<![\p{L}\p{N}\p{M}_.@/-])@[\p{L}\p{N}\p{M}_](?:[\p{L}\p{N}\p{M}_.-]*[\p{L}\p{N}\p{M}_])?$/u,
    placeholder: "@name",
    is: (e) => (e.classList.contains("wup-mention") ? e.textContent.slice(1) : undefined),
    create: "span",
    classNameTag: "wup-mention",
  };
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

/** Types text like browser: control inserts it itself or it's inserted at caret (in text node) as usual;
 *  caret after text node (after insertion: `(line, index)`) types at its end like Chrome */
function userType(data) {
  if (typeText(data)) {
    return;
  }
  const sel = window.getSelection();
  let t = sel.focusNode;
  let offset = sel.focusOffset;
  if (t.nodeType !== Node.TEXT_NODE) {
    t = t.childNodes[offset - 1];
    offset = t.length;
  }
  t.insertData(offset, data);
  sel.collapse(t, offset + data.length);
  el.$refInput.dispatchEvent(new InputEvent("input", { inputType: "insertText", data, bubbles: true }));
  document.dispatchEvent(new Event("selectionchange")); // jsdom doesn't fire it
}

/** Deletes char before caret like browser (Backspace) */
function userDelete() {
  const sel = window.getSelection();
  const t = sel.focusNode;
  const offset = sel.focusOffset;
  typeText(null, "deleteContentBackward");
  t.deleteData(offset - 1, 1);
  sel.collapse(t, offset - 1);
  el.$refInput.dispatchEvent(new InputEvent("input", { inputType: "deleteContentBackward", bubbles: true }));
}

/** Fires `beforeinput` of paste with html & plain text
 * @returns true if it's prevented (control pastes it itself) */
function userPaste(html, targetRange, text = "") {
  const ev = new InputEvent("beforeinput", { inputType: "insertFromPaste", bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", { value: { getData: (t) => (t === "text/html" ? html : text) } });
  targetRange && (ev.getTargetRanges = () => [targetRange]);
  return !el.$refInput.dispatchEvent(ev);
}

describe("control.textRich", () => {
  afterEach(() => {
    delete Range.prototype.getBoundingClientRect; // mocked by tests with menu near caret
    // see useSocial
    delete WUPTextRichControl.$tools.phone;
    delete WUPTextRichControl.$tools.tag;
    delete WUPTextRichControl.$tools.mention;
  });

  testTextAreaControl(() => el, {
    clear: (c) => c.clearValue(), // Escape doesn't clear rich text
    copied: (c) => ({ "text/html": c.$refInput.value, "text/plain": c.$refInput.text }), // with formats
    attrs: {
      "w-toolbar": {
        value: [
          ["bold", "italic"],
          ["header", { size: ["sm", false, "lg"] }],
        ],
      },
      "w-hidehotkeyshint": { value: true },
      "w-copypasteformatted": { value: true },
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

    el.$format("clean");
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
      el.$format(name, value, true);
      return inp.innerHTML;
    };

    const nested = "<ul><li>a<ul><li>b</li></ul></li></ul>";
    // otherwise heading is placed inside parent item: `<li>a<ul></ul><h2>b</h2></li>`
    expect(format(nested, "b", "header", 2)).toBe("<ul><li>a</li></ul><h2>b</h2>");
    expect(format(nested, "b", "clean")).toBe("<ul><li>a</li></ul><div>b</div>");
    expect(format(nested, "b", "list", "bullet")).toBe("<ul><li>a</li></ul><div>b</div>"); // list off
    // items after line keep their level: list without parent item (otherwise item without text is shown as empty bullet)
    expect(format("<ol><li>a<ol><li>b</li><li>c</li></ol></li><li>d</li></ol>", "b", "header", 2)).toBe(
      "<ol><li>a</li></ol><h2>b</h2><ol><ol><li>c</li></ol><li>d</li></ol>"
    );
  });

  test("format of loose content with caret at the end of editor", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    // inline paste into empty editor leaves loose nodes & caret at (editor, childNodes.length)
    inp.innerHTML = "a <b>b</b> c";
    window.getSelection().collapse(inp, 3);
    expect(() => el.$format("header", 1, true)).not.toThrow(); // otherwise IndexSizeError after wrapping lines
    expect(inp.innerHTML).toBe("<h1>a <b>b</b> c</h1>");
    const sel = window.getSelection(); // caret stays at the end
    expect(sel.isCollapsed).toBe(true);
    expect(sel.anchorNode).toBe(inp.firstChild.lastChild);
    expect(sel.anchorOffset).toBe(2);

    // <br> after inline content is the next line, otherwise empty line; whitespaces between lines are skipped
    inp.innerHTML = "a<br><br>b<div>c</div> ";
    window.getSelection().collapse(inp.firstChild, 1);
    el.$format("header", 1, true);
    expect(getHtml()).toBe("<h1>a|</h1><div><br></div><div>b</div><div>c</div> ");
    // caret at the end of editor after element
    inp.innerHTML = "a <b>b</b>";
    window.getSelection().collapse(inp, 2);
    el.$format("header", 1, true);
    expect(getHtml()).toBe("<h1>a <b>b|</b></h1>");
  });

  test("format with caret placed at editor (between lines)", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html, places caret at editor child index & applies format */
    const format = (html, index, ...args) => {
      inp.innerHTML = html;
      window.getSelection().collapse(inp, index);
      el.$format(...args);
      return getHtml();
    };

    // otherwise caret isn't inside any line: nothing is formatted
    expect(format("<div>a</div>", 1, "header", 1, true)).toBe("<h1>a|</h1>");
    expect(format("<div>a</div><div>b</div>", 1, "header", 1, true)).toBe("<div>a</div><h1>|b</h1>");
    // list: into its item
    expect(format("<ul><li>a</li><li>b</li></ul>", 0, "header", 1, true)).toBe("<h1>|a</h1><ul><li>b</li></ul>");
    expect(format("<ul><li>a</li><li>b</li></ul>", 1, "header", 1, true)).toBe("<ul><li>a</li></ul><h1>b|</h1>");
    expect(format("<ol><li>a<ol><li>b</li></ol></li></ol>", 1, "list", "ordered", false)).toBe(
      "<ol><li>a</li></ol><div>b|</div>"
    );
    expect(format("<ul></ul>", 1, "header", 1, true)).toBe("|<ul></ul>"); // empty list: nothing to format
    // selection by editor points (select all in Firefox)
    inp.innerHTML = "<div>a</div><ul><li>b</li></ul>";
    window.getSelection().setBaseAndExtent(inp, 0, inp, 2);
    el.$format("align", "center", true);
    expect(getHtml()).toBe('<div style="text-align: center;">[a</div><ul><li style="text-align: center;">b]</li></ul>');
  });

  test("typed trigger opens menu when text is inserted by control", async () => {
    const cleanup = usePlaceholder();
    try {
      el.$options.toolbar = [["bold"], ["placeholder"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const btn = el.querySelector("[tool=placeholder]");
      /** Sets html with caret (see setHtml) & types trigger */
      const typeTrigger = async (html) => {
        setHtml(html);
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
      expect(await typeTrigger("<div><b>bold |</b></div>")).toEqual([true, true]);
      // next to token (left via arrow or inserted): typed text is inserted out of it
      expect(await typeTrigger('<div><span class="placeholder">{email}</span>|</div>')).toEqual([true, true]);
      // inside token at its end: typed text goes into it (it isn't word start)
      expect(await typeTrigger('<div><span class="placeholder">{email}|</span></div>')).toEqual([true, false]);
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
      inp.insertHTML(pasted);
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
    inp.insertHTML("<h1>T</h1><ul><li>x</li></ul>");
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
      inp.insertHTML("<h1>T</h1>");
      expect(inp.innerHTML).toBe(`<div>${img}</div><h1>T</h1>`); // otherwise image is removed

      // typing with pending format splits format element at caret
      inp.innerHTML = `<div><b>${img}</b></div>`;
      window.getSelection().collapse(inp.querySelector("b"), 1);
      el.$format("bold"); // pending: not bold
      const init = { inputType: "insertText", data: "x", bubbles: true, cancelable: true };
      inp.dispatchEvent(new InputEvent("beforeinput", init));
      expect(inp.innerHTML).toBe(`<div><b>${img}</b>x</div>`);
    } finally {
      delete WUPTextRichControl.$tools.image;
    }
  });

  test("split at edge of nested element doesn't leave its empty copy", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html with caret, toggles bold (pending: not bold) & types text */
    const type = (html) => {
      setHtml(html);
      el.$format("bold");
      const init = { inputType: "insertText", data: "x", bubbles: true, cancelable: true };
      inp.dispatchEvent(new InputEvent("beforeinput", init));
      return getHtml();
    };

    // otherwise `<b>a<i></i></b>x|<b><i>bc</i></b>` & `<b><i>ab</i></b>x|<b><i></i>c</b>`
    expect(type("<div><b>a<i>|bc</i></b></div>")).toBe("<div><b>a</b>x|<b><i>bc</i></b></div>");
    expect(type("<div><b><i>ab|</i>c</b></div>")).toBe("<div><b><i>ab</i></b>x|<b>c</b></div>");
    expect(type("<div><b>a<i>b|c</i></b></div>")).toBe("<div><b>a<i>b</i></b>x|<b><i>c</i></b></div>");

    // paste of block splits line at caret: otherwise `<div>a<b></b></div>`
    setHtml("<div>a<b>|bc</b></div>");
    inp.insertHTML("<h1>T</h1>");
    expect(inp.innerHTML).toBe("<div>a</div><h1>T</h1><div><b>bc</b></div>");
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
    c.$format("clean");
    expect(inp.innerHTML).toBe("<div>x y</div>");
    c.remove();
  });

  test("hotkeys of tool values with quotes", async () => {
    const format = jest.fn();
    const times = '"Times New Roman", serif';
    WUPTextRichControl.$tools.font = {
      hotKey: { prev: ["Control", "Alt", "Shift", "F"], next: ["Control", "Alt", "Shift", "G"] }, // previous & next value
      values: [{ value: times, hotKey: ["Control", "Alt", "Shift", "1"] }, { value: "monospace" }],
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
      el.$format("indent", value, true);
      return inp.firstChild.style.marginLeft;
    };
    // 3em per level: 96px = 6em = level 2 (otherwise px is ignored: level 0)
    expect(indent("96px", 1)).toBe("9em");
    expect(indent("96px", -1)).toBe("3em");
    expect(indent("6em", 1)).toBe("9em");
    inp.innerHTML = '<div style="margin-left: 48px;">x</div>'; // default font size: 16px
    window.getSelection().collapse(inp.firstChild.firstChild, 1);
    el.$format("indent", 1, true);
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
      // line break is `\n` (`<br>` isn't used): it doesn't split paragraph; empty line is `\n` too
      ["<p>Line<br>break</p>", "Line\nbreak"],
      ["<p>a</p><p><br></p>", "<p>a</p><p>\n</p>"],
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
      el.$format(...args);
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
    // toggle (button) too: other value is removed, the same one is toggled off
    expect(format("<div>x<sup>[2]</sup></div>", "script", "sub", false)).toBe("<div>x[<sub>2]</sub></div>");
    expect(format("<div>x<sub>[2]</sub></div>", "script", "sub", false)).toBe("<div>x[2]</div>");
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
    el.$format("italic");
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
      el.$format("bold");
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
      el.$format(...args);
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
    el.$format("header", 1, true);
    expect(inp.innerHTML).toBe("<h1>a</h1><div>b</div>");
    // custom line tool: element style wins
    WUPTextRichControl.$tools.note = {
      kind: "line",
      is: (e) => (e.tagName === "ASIDE" ? true : undefined),
      create: () => Object.assign(document.createElement("aside"), { style: "color: red; text-align: left;" }),
    };
    try {
      setHtml('<div style="text-align: center;">a|</div>');
      el.$format("note");
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
      el.$format("list", value, false);
      return getHtml();
    };

    // adjacent lists are merged
    expect(format("<div>[a</div><div>b]</div>", "ordered")).toBe("<ol><li>[a</li><li>b]</li></ol>");
    expect(format("<ol><li>[a</li><li>b]</li></ol>", "bullet")).toBe("<ul><li>[a</li><li>b]</li></ul>");
    expect(format("<ol><li>[a<b>b</b></li></ol><div>c]</div>", "ordered")).toBe(
      "<ol><li>[a<b>b</b></li><li>c]</li></ol>"
    );
    expect(format("<ul><li>[a</li><li>b]</li></ul>", "bullet")).toBe("<div>[a</div><div>b]</div>"); // toggle off
    // item of another list is nested into the previous item: Enter in numbered list & bulleted list
    expect(format("<ol><li>a</li><li>|<br></li></ol>", "bullet")).toBe("<ol><li>a<ul><li>|<br></li></ul></li></ol>");
    expect(format("<ol><li>a</li><li>b|</li><li>c</li></ol>", "bullet")).toBe(
      "<ol><li>a<ul><li>b|</li></ul></li><li>c</li></ol>"
    );
    expect(format("<ol><li>a</li><li>[b</li><li>c]</li></ol>", "bullet")).toBe(
      "<ol><li>a<ul><li>[b</li><li>c]</li></ul></li></ol>"
    );
    // into nested list of the previous item
    expect(format("<ol><li>a<ul><li>x</li></ul></li><li>b|</li></ol>", "bullet")).toBe(
      "<ol><li>a<ul><li>x</li><li>b|</li></ul></li></ol>"
    );
    expect(format("<ol><li>a<ol><li>x</li></ol></li><li>b|</li></ol>", "bullet")).toBe(
      "<ol><li>a<ol><li>x</li></ol><ul><li>b|</li></ul></li></ol>"
    );
    expect(format("<ul><li>a<ul><li>x</li><li>b|</li></ul></li></ul>", "ordered")).toBe(
      "<ul><li>a<ul><li>x<ol><li>b|</li></ol></li></ul></li></ul>"
    );
    // the 1st item keeps its level: it's moved out of its list (whole list is converted if it's selected)
    expect(format("<ol><li>a|</li><li>b</li></ol>", "bullet")).toBe("<ul><li>a|</li></ul><ol><li>b</li></ol>");
    expect(format("<ul><li>a<ul><li>b|</li><li>y</li></ul></li></ul>", "ordered")).toBe(
      "<ul><li>a<ol><li>b|</li></ol><ul><li>y</li></ul></li></ul>"
    );
    expect(format("<ul><li>a<ul><li>b|</li></ul></li></ul>", "bullet")).toBe("<ul><li>a</li></ul><div>b|</div>"); // off
    // parent item & nested one
    expect(format("<ul><li>[a<ul><li>b]</li></ul></li></ul>", "ordered")).toBe(
      "<ol><li>[a<ol><li>b]</li></ol></li></ol>"
    );
  });

  test("nested lists: indent of list item changes its level", async () => {
    await h.wait(1);
    el.$refInput.focus();
    /** Sets html with selection & changes indent */
    const indent = (html, value) => {
      setHtml(html);
      el.$format("indent", value, true);
      return getHtml();
    };

    // into nested list of the previous item & back
    expect(indent("<ul><li>a</li><li>b|</li></ul>", 1)).toBe("<ul><li>a<ul><li>b|</li></ul></li></ul>");
    expect(indent(getHtml(), 1)).toBe("<ul><li>a<ul><li>b|</li></ul></li></ul>"); // the 1st item of nested list
    expect(indent(getHtml(), -1)).toBe("<ul><li>a</li><li>b|</li></ul>");
    expect(indent(getHtml(), -1)).toBe("<ul><li>a</li><li>b|</li></ul>"); // top level
    expect(indent("<ul><li>a|</li><li>b</li></ul>", 1)).toBe("<ul><li>a|</li><li>b</li></ul>"); // the 1st item
    // existing nested list of the previous item; type of list is kept
    expect(indent("<ul><li>a<ul><li>x</li></ul></li><li>b|</li></ul>", 1)).toBe(
      "<ul><li>a<ul><li>x</li><li>b|</li></ul></li></ul>"
    );
    expect(indent("<ol><li>a<ul><li>x</li></ul></li><li>b|</li></ol>", 1)).toBe(
      "<ol><li>a<ul><li>x</li></ul><ol><li>b|</li></ol></li></ol>"
    );
    // nested items are moved with item
    expect(indent("<ul><li>a</li><li>b|<ul><li>c</li></ul></li></ul>", 1)).toBe(
      "<ul><li>a<ul><li>b|<ul><li>c</li></ul></li></ul></li></ul>"
    );
    expect(indent(getHtml(), -1)).toBe("<ul><li>a</li><li>b|<ul><li>c</li></ul></li></ul>");
    // decrease: the next items stay below item (become its nested ones), other nested lists of parent too
    expect(
      indent("<ul><li>a<ul><li>b|<ul><li>x</li></ul></li><li>c</li></ul><ol><li>d</li></ol></li><li>e</li></ul>", -1)
    ).toBe("<ul><li>a</li><li>b|<ul><li>x</li><li>c</li></ul><ol><li>d</li></ol></li><li>e</li></ul>");
    // list without parent item (Chrome places nested list into list)
    expect(indent("<ul><li>a</li><ul><li>b|</li><li>c</li></ul><li>d</li></ul>", -1)).toBe(
      "<ul><li>a</li><li>b|<ul><li>c</li></ul></li><li>d</li></ul>"
    );
    expect(indent("<ul><ul><li>a</li></ul><li>b|</li></ul>", 1)).toBe("<ul><ul><li>a</li><li>b|</li></ul></ul>");
    expect(indent("<ul><ol><li>a</li></ol><li>b|</li></ul>", 1)).toBe(
      "<ul><ol><li>a</li></ol><ul><li>b|</li></ul></ul>"
    );
    // item without own content is removed: otherwise it's shown as empty bullet
    expect(indent("<ul><li><ul><li>a|</li></ul></li></ul>", -1)).toBe("<ul><li>a|</li></ul>");

    // several items
    expect(indent("<ul><li>a</li><li>[b</li><li>c]</li></ul>", 1)).toBe(
      "<ul><li>a<ul><li>[b</li><li>c]</li></ul></li></ul>"
    );
    expect(indent(getHtml(), -1)).toBe("<ul><li>a</li><li>[b</li><li>c]</li></ul>");
    // the next items aren't nested into the 1st one (it isn't moved)
    expect(indent("<div>[p</div><ul><li>a</li><li>b]</li></ul>", 1)).toBe(
      '<div style="margin-left: 3em;">[p</div><ul><li>a</li><li>b]</li></ul>'
    );
    // parent & its nested item: each one changes level once
    expect(indent("<ul><li>z</li><li>[a<ul><li>b]</li></ul></li></ul>", 1)).toBe(
      "<ul><li>z<ul><li>[a<ul><li>b]</li></ul></li></ul></li></ul>"
    );
    expect(indent(getHtml(), -1)).toBe("<ul><li>z</li><li>[a<ul><li>b]</li></ul></li></ul>");
    // nested item without parent: it's moved alone
    expect(indent("<ul><li>a<ul><li>b</li><li>[c</li></ul></li><li>d]</li></ul>", 1)).toBe(
      "<ul><li>a<ul><li>b<ul><li>[c</li></ul></li><li>d]</li></ul></li></ul>"
    );
  });

  test("nested lists: Tab & Shift+Tab in list item", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html with selection & presses Tab
     * @returns true if event is prevented (otherwise focus goes to the next element) */
    const tab = (html, shiftKey) => {
      html && setHtml(html);
      const e = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
      return !inp.dispatchEvent(e);
    };

    expect(tab("<ul><li>a</li><li>b|</li></ul>")).toBe(true);
    expect(getHtml()).toBe("<ul><li>a<ul><li>b|</li></ul></li></ul>");
    expect(tab()).toBe(false); // nothing is changed
    expect(tab(null, true)).toBe(true);
    expect(getHtml()).toBe("<ul><li>a</li><li>b|</li></ul>");
    expect(tab(null, true)).toBe(false);
    expect(tab("<div>a|</div>")).toBe(false); // not list: focus goes out
    expect(getHtml()).toBe("<div>a|</div>");
    // undo
    tab("<ul><li>a</li><li>b|</li></ul>");
    await h.wait(1);
    expect(typeText(null, "historyUndo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe("<ul><li>a</li><li>b</li></ul>");

    // tool isn't rendered
    el.$options.toolbar = [["bold"], [{ list: "bullet" }]];
    await h.wait(1);
    expect(tab("<ul><li>a</li><li>b|</li></ul>")).toBe(false);
    // readonly
    el.$options.toolbar = [[{ indent: -1 }, { indent: 1 }]];
    el.$options.readOnly = true;
    await h.wait(1);
    expect(tab("<ul><li>a</li><li>b|</li></ul>")).toBe(false);
    expect(getHtml()).toBe("<ul><li>a</li><li>b|</li></ul>");
  });

  test("nested lists: Enter in empty nested item moves it to parent list", async () => {
    await h.wait(1);
    el.$refInput.focus();
    /** Sets html with selection & fires `beforeinput` of Enter
     * @returns html or false if browser handles it */
    const enter = (html) => {
      setHtml(html);
      return typeText(null, "insertParagraph") && getHtml();
    };

    expect(enter("<ul><li>a<ul><li>b</li><li>|<br></li><li>c</li></ul></li></ul>")).toBe(
      "<ul><li>a<ul><li>b</li></ul></li><li>|<br><ul><li>c</li></ul></li></ul>"
    );
    expect(enter("<ul><li>a<ul><li>|<br><ul><li>b</li></ul></li></ul></li></ul>")).toBe(
      "<ul><li>a</li><li>|<br><ul><li>b</li></ul></li></ul>"
    );
    // browser handles it: text (the next item)
    expect(enter("<ul><li>a<ul><li>b|</li></ul></li></ul>")).toBe(false);
    // top level: paragraph instead of item (see line format)
    expect(enter("<ul><li>a</li><li>|<br></li></ul>")).toBe("<ul><li>a</li></ul><div>|<br></div>");
    // embed is content
    const cleanup = useImage();
    try {
      el.$options.toolbar = [["bold"]]; // tools are applied on toolbar render
      await h.wait(1);
      expect(enter('<ul><li>a<ul><li><img src="x.png">|</li></ul></li></ul>')).toBe(false);
      expect(enter('<ul><li>a<ul><li><b><img src="x.png"></b>|</li></ul></li></ul>')).toBe(false);
      expect(enter('<ul><li>a<ul><li><b><i><img src="x.png"></i></b>|</li></ul></li></ul>')).toBe(false);
      expect(enter("<ul><li>a<ul><li><b><br></b>|</li></ul></li></ul>")).toBe(
        "<ul><li>a</li><li>|<b><br></b></li></ul>"
      ); // empty format isn't content
    } finally {
      cleanup();
    }
  });

  test("nested lists: line formats of parent item & nested one", async () => {
    await h.wait(1);
    el.$refInput.focus();
    /** Sets html with selection & applies format */
    const format = (html, ...args) => {
      setHtml(html);
      el.$format(...args);
      return getHtml();
    };

    // parent selected with nested item: both are formatted
    expect(format("<ul><li>[a<ul><li>b]</li></ul></li></ul>", "align", "center", true)).toBe(
      '<ul><li style="text-align: center;">[a<ul><li style="text-align: center;">b]</li></ul></li></ul>'
    );
    // nested item only: parent isn't formatted
    expect(format("<ul><li>a<ul><li>[b]</li></ul></li></ul>", "align", "center", true)).toBe(
      '<ul><li>a<ul><li style="text-align: center;">[b]</li></ul></li></ul>'
    );
    // nested items keep their level: otherwise list is placed into heading
    expect(format("<ul><li>a|<ul><li>b</li></ul></li><li>c</li></ul>", "header", 2, true)).toBe(
      "<h2>a|</h2><ul><ul><li>b</li></ul><li>c</li></ul>"
    );
    // list without parent item: decreasing moves it back
    expect(format("<h2>a</h2><ul><ul><li>b|</li></ul><li>c</li></ul>", "indent", -1, true)).toBe(
      "<h2>a</h2><ul><li>b|</li><li>c</li></ul>"
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
    // caret or selection inside link: the whole link is changed, empty url removes it
    setHtml(`<div>a <a href="${url}">li|nk</a> b</div>`);
    el.$format("link", "www.x.com");
    expect(getHtml()).toBe(
      '<div>a <a href="https://www.x.com" target="_blank" rel="noopener noreferrer">li|nk</a> b</div>'
    );
    setHtml(`<div>a <a href="${url}">l[in]k</a> b</div>`);
    el.$format("link", "");
    expect(getHtml()).toBe("<div>a l[in]k b</div>");
    setHtml("<div>a |b</div>");
    el.$format("link", "");
    expect(inp.innerHTML).toBe("<div>a b</div>");
    // selection goes out of link: format is changed for selected text only
    setHtml(`<div>a <a href="${url}">li[nk</a> b]</div>`);
    el.$format("link", "");
    expect(getHtml()).toBe(`<div>a <a href="${url}">li[</a>nk b]</div>`);
  });

  test("embed, token & action formats", async () => {
    const cleanup = usePlaceholder();
    const cleanupImg = useImage();
    WUPTextRichControl.$tools.del = { format: ({ editor }) => editor.$insert(document.createDocumentFragment()) };
    WUPTextRichControl.$tools.mention = {
      values: [{ value: "john" }],
      trigger: "@",
      kind: "inline",
      is: (e) => (e.tagName === "MARK" ? e.textContent.slice(1) : undefined),
      create: "mark",
    };
    try {
      el.$options.toolbar = [["placeholder", "image", "mention"]];
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

      // action
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
      // readonly: API works (options restrict user only)
      el.$options.readOnly = true;
      await h.wait(1);
      setHtml("<div>[a]b</div>");
      el.$format("upper");
      expect(el.$refInput.innerHTML).toBe("<div>Ab</div>");
      el.$options.readOnly = false;
      await h.wait(1);
      // selection out of editor: the last selection in editor is restored
      setHtml("<div>a[b]</div>");
      window.getSelection().selectAllChildren(el.$refLabel);
      el.$format("upper");
      expect(getHtml()).toBe("<div>a[B]</div>");
    } finally {
      cleanup();
      cleanupImg();
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
    el.$format("bold");
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    expect(inp.innerHTML).toBe("<div>a</div>"); // nothing is changed till typing
    expect(typeText("b")).toBe(true);
    expect(getHtml()).toBe("<div>a<b>b|</b></div>");

    // toggle twice: off
    setHtml("<div>a|</div>");
    el.$format("bold");
    el.$format("bold");
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(typeText("b")).toBe(true);
    expect(getHtml()).toBe("<div>ab|</div>");

    // clean removes formats of caret
    setHtml("<div><b><em>a|</em></b></div>");
    el.$format("clean");
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
    el.$format("bold");
    window.getSelection().collapse(inp.firstChild.firstChild, 1);
    document.dispatchEvent(new Event("selectionchange"));
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(typeText("c")).toBe(false);

    // line format replaces line, but caret stays: pending formats too
    setHtml("<div>a|</div>");
    el.$format("bold");
    el.$format("header", 1, true);
    document.dispatchEvent(new Event("selectionchange"));
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    expect(typeText("b")).toBe(true);
    expect(getHtml()).toBe("<h1>a<b>b|</b></h1>");

    // caret at editor root (value is replaced): typed text goes into line
    setHtml("<div>a</div><div>b</div>");
    window.getSelection().collapse(inp, 1);
    el.$format("bold");
    expect(typeText("c")).toBe(true);
    expect(getHtml()).toBe("<div>a</div><div><b>c|</b>b</div>");

    // deleted text: its inline formats stay for the next typed text (recognized text & tokens aren't continued)
    /** Sets html with selection, deletes it via $insert & returns formats at caret */
    const del = (html) => {
      setHtml(html);
      inp.changeContent(() => inp.$insert(document.createDocumentFragment()));
      return inp.getFormats();
    };
    expect(del("<div>a[<b>b</b>]</div>").get("bold")).toBe(true);
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    expect(typeText("c")).toBe(true);
    expect(getHtml()).toBe("<div>a<b>c|</b></div>");
    expect(del("<div><b>a[b]</b></div>").get("bold")).toBe(true); // format is at caret yet
    expect(del("<div>a|</div>").get("bold")).toBe(undefined); // nothing is deleted
    expect(del('<div>a[<a href="mailto:a@b.c">a@b.c</a>]</div>').has("email")).toBe(false);
    const cleanup = usePlaceholder();
    try {
      el.$options.toolbar = [["placeholder"]]; // tools are applied on toolbar render
      await h.wait(1);
      expect(del('<div>a[<span class="placeholder">{email}</span>]</div>').has("placeholder")).toBe(false);
    } finally {
      cleanup();
    }
  });

  test("deleted text: typing style of browser is reset, inline formats of deleted text stay for typed text", async () => {
    useSocial();
    const cleanup = usePlaceholder();
    const cleanupImg = useImage();
    try {
      el.$options.toolbar = [["bold"], ["mention", "placeholder", "image"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const token = '<span class="placeholder">{email}</span>';
      const mention = '<span class="wup-mention">@john</span>';
      /** Deletes selection like browser (`html` before & `after` it) @returns formats for the next typed text */
      const del = (html, after) => {
        setHtml(html);
        expect(typeText(null, "deleteContentBackward")).toBe(false); // browser deletes it
        setHtml(after);
        const spy = jest.spyOn(window.getSelection(), "collapse");
        inp.dispatchEvent(new InputEvent("input", { inputType: "deleteContentBackward", bubbles: true }));
        // selection is set again: Chrome resets its typing style (otherwise typed text gets `<font color>` of mention)
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
        return inp.getFormats();
      };

      // Delete, Backspace, Ctrl+X etc.
      expect(del("<div>a[<b>bc</b>]</div>", "<div>a|</div>").get("bold")).toBe(true);
      expect(typeText("x")).toBe(true);
      expect(getHtml()).toBe("<div>a<b>x|</b></div>");
      // recognized text & tokens aren't continued
      expect(del(`<div>a[${mention}]</div>`, "<div>a|</div>").has("mention")).toBe(false);
      expect(del(`<div>a[${token}]</div>`, "<div>a|</div>").has("placeholder")).toBe(false);
      expect(typeText("x")).toBe(false); // browser types plain text

      // typed text replaces selection: it's deleted at first (otherwise Chrome types with its typing style)
      setHtml("<div>a[<b>bc</b>]</div>");
      expect(typeText("x")).toBe(true);
      expect(getHtml()).toBe("<div>a<b>x|</b></div>");
      setHtml(`<div>a[${token}]</div>`);
      expect(typeText("x")).toBe(true);
      expect(getHtml()).toBe("<div>ax|</div>");
      setHtml(`<div>${token}[ b]</div>`); // caret goes after token: typed text is out of it
      expect(typeText("x")).toBe(true);
      expect(getHtml()).toBe(`<div>${token}x|</div>`);
      // pasted plain text replaces selection too
      setHtml(`<div>a[${token}]</div>`);
      expect(userPaste("", undefined, "xy")).toBe(true);
      expect(getHtml()).toBe("<div>axy|</div>");

      // everything is deleted by browser: `<br>` is left in editor (caret can't be inside it: it goes into line)
      inp.innerHTML = "<br>";
      window.getSelection().collapse(inp, 0);
      el.$format("bold");
      expect(typeText("x")).toBe(true);
      expect(getHtml()).toBe("<div><b>x|</b><br></div>");
      // the same for embed & line at editor root
      inp.innerHTML = '<img src="a.png">b';
      window.getSelection().collapse(inp, 0);
      inp.getSelectionPos();
      expect(getHtml()).toBe('<div>|<img src="a.png">b</div>');
      window.getSelection().collapse(inp, 0);
      inp.getSelectionPos();
      expect(getHtml()).toBe('<div>|<img src="a.png">b</div>');
    } finally {
      cleanup();
      cleanupImg();
    }
  });

  test("tool is applied while editor isn't focused: the last selection is restored", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    setHtml("<div>ab|c</div>");
    // the real input skips the same value on blur, the mocked one renders it again (selection is lost)
    const spy = jest.spyOn(el, "setInputValue").mockImplementation(() => {});
    inp.blur();
    await h.wait();
    spy.mockRestore();
    window.getSelection().removeAllRanges(); // click out of editor
    // like Chrome: focus places caret at editor start
    inp.focus = (opts) => {
      window.getSelection().collapse(inp.firstChild.firstChild, 0);
      HTMLElement.prototype.focus.call(inp, opts);
    };
    el.querySelector("[tool=bold]").click();
    expect(document.activeElement).toBe(inp);
    expect(typeText("x")).toBe(true);
    expect(getHtml()).toBe("<div>ab<b>x|</b>c</div>");
  });

  test("arrows & line break at the edges of format: the next typed text goes out of it", async () => {
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
    // typed text goes after format
    setHtml("<div><b>bold|</b></div>");
    press("ArrowRight");
    userType("x");
    expect(getHtml()).toBe("<div><b>bold</b>x|</div>");

    // ArrowLeft at the start of format: the next typed text goes before it, ArrowRight returns into it
    setHtml("<div>a<b>|bold</b></div>");
    expect(press("ArrowLeft")).toBe(true);
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(press("ArrowLeft")).toBe(false); // the 2nd one moves caret
    expect(press("ArrowRight")).toBe(true); // back into format
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    expect(press("ArrowLeft")).toBe(true);
    userType("x");
    expect(getHtml()).toBe("<div>ax|<b>bold</b></div>");
    setHtml("<div><b>|</b></div>"); // empty element: start & end at once
    expect(press("ArrowRight")).toBe(true);
    expect(press("ArrowLeft")).toBe(true); // back
    expect(press("ArrowLeft")).toBe(true);
    userType("x");
    expect(getHtml()).toBe("<div>x|</div>"); // empty element is removed

    /** Fires line break like Chrome: new line with copies of formats at caret (`copy` - its html), then input & selectionchange */
    const lineBreak = (copy) => {
      expect(typeText(null, "insertParagraph")).toBe(false); // browser adds line
      inp.insertAdjacentHTML("beforeend", `<div>${copy}</div>`);
      let n = inp.lastChild;
      while (n.firstChild.nodeName !== "BR") {
        n = n.firstChild;
      }
      window.getSelection().collapse(n, 0);
      inp.dispatchEvent(new InputEvent("input", { inputType: "insertParagraph", bubbles: true }));
      document.dispatchEvent(new Event("selectionchange")); // jsdom doesn't fire it
    };
    // Enter continues format in the new line
    setHtml("<div><b>123|</b></div>");
    lineBreak("<b><br></b>");
    expect(getHtml()).toBe("<div><b>123</b></div><div><b>|<br></b></div>");
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    // except format turned off before: Bold, 123, Bold, Enter, 234 => 234 isn't bold
    setHtml("<div><b>123|</b></div>");
    el.$format("bold"); // off for the next typed text
    lineBreak("<b><br></b>");
    expect(getHtml()).toBe("<div><b>123</b></div><div>|<br></div>");
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    userType("234");
    expect(getHtml()).toBe("<div><b>123</b></div><div>234|<br></div>");
    // or left via ArrowRight
    setHtml("<div><b>123|</b></div>");
    press("ArrowRight");
    lineBreak("<b><br></b>");
    expect(getHtml()).toBe("<div><b>123</b></div><div>|<br></div>");
    userType("234");
    expect(getHtml()).toBe("<div><b>123</b></div><div>234|<br></div>");
    // format turned on before: it's applied to text typed in the new line
    setHtml("<div>123|</div>");
    el.$format("bold");
    lineBreak("<br>");
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    userType("234");
    expect(getHtml()).toBe("<div>123</div><div><b>234|</b><br></div>");
  });

  test("ArrowRight at the end of the last block (list etc.): caret goes into new line after it", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const btnList = el.querySelector('[tool="list:ordered"]');
    const btnBold = el.querySelector("[tool=bold]");
    /** Presses key on editor @returns true if it's prevented */
    const press = (key) => !inp.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

    // list applied to empty line
    setHtml("<ol><li>|<br></li></ol>");
    expect(btnList.getAttribute("aria-pressed")).toBe("true");
    expect(press("ArrowRight")).toBe(true);
    expect(getHtml()).toBe("<ol><li><br></li></ol><div>|<br></div>");
    expect(btnList.getAttribute("aria-pressed")).toBe("false");
    expect(press("ArrowRight")).toBe(false); // plain line: nothing to go out of
    await h.wait(1);
    expect(typeText(null, "historyUndo")).toBe(true); // separate undo step
    await h.wait(1);
    expect(inp.innerHTML).toBe("<ol><li><br></li></ol>");
    // the end of nested list; inline formats are left at first: `Note:` + ArrowRight continues item with plain text
    setHtml("<ul><li>a<ul><li><b>Note:|</b></li></ul></li></ul>");
    expect(press("ArrowRight")).toBe(true);
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(getHtml()).toBe("<ul><li>a<ul><li><b>Note:|</b></li></ul></li></ul>");
    expect(press("ArrowRight")).toBe(true);
    expect(getHtml()).toBe("<ul><li>a<ul><li><b>Note:</b></li></ul></li></ul><div>|<br></div>");
    // other blocks
    setHtml("<blockquote>q|</blockquote>");
    expect(press("ArrowRight")).toBe(true);
    expect(getHtml()).toBe("<blockquote>q</blockquote><div>|<br></div>");
    setHtml("<h1>a</h1><pre>code|</pre>");
    expect(press("ArrowRight")).toBe(true);
    expect(getHtml()).toBe("<h1>a</h1><pre>code</pre><div>|<br></div>");
    // pending formats stay for the next typed text
    setHtml("<pre>code|</pre>");
    el.$format("bold");
    expect(press("ArrowRight")).toBe(true);
    document.dispatchEvent(new Event("selectionchange")); // jsdom doesn't fire it
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    userType("x");
    expect(getHtml()).toBe("<pre>code</pre><div><b>x|</b><br></div>");

    // not the end of the last block: arrow moves caret as usual
    setHtml("<ol><li>a|</li></ol><div>next</div>"); // caret goes into the next line
    expect(press("ArrowRight")).toBe(false);
    setHtml("<ol><li>a|</li><li><br></li></ol>"); // empty item after caret
    expect(press("ArrowRight")).toBe(false);
    setHtml("<ol><li>a|b</li></ol>");
    expect(press("ArrowRight")).toBe(false);
    setHtml("<ol><li>a|<br><br></li></ol>"); // empty line via Shift+Enter
    expect(press("ArrowRight")).toBe(false);
    setHtml("<ol><li>a|<ul><li>b</li></ul></li></ol>");
    expect(press("ArrowRight")).toBe(false);
    setHtml("<ol><li>[a]</li></ol>");
    expect(press("ArrowRight")).toBe(false);
    setHtml("<div>a|</div>"); // plain or aligned paragraph isn't block
    expect(press("ArrowRight")).toBe(false);
    setHtml('<div style="text-align: center;">a|</div>');
    expect(press("ArrowRight")).toBe(false);
    setHtml("a|"); // Chrome doesn't wrap the 1st line
    expect(press("ArrowRight")).toBe(false);
    setHtml("<ol><li>a|</li></ol>");
    expect(press("ArrowLeft")).toBe(false); // ArrowRight only
    window.getSelection().collapse(document.body, 0);
    expect(press("ArrowRight")).toBe(false);
    window.getSelection().removeAllRanges();
    expect(press("ArrowRight")).toBe(false);
    const cleanup = useImage();
    try {
      el.$options.toolbar = [["bold"]]; // tools are applied on toolbar render
      await h.wait(1);
      setHtml('<ol><li>a|<img src="a.png"></li></ol>'); // embed after caret
      expect(press("ArrowRight")).toBe(false);
    } finally {
      cleanup();
    }
    el.$options.readOnly = true;
    await h.wait(1);
    setHtml("<ol><li>a|</li></ol>");
    expect(press("ArrowRight")).toBe(false);
    expect(inp.innerHTML).toBe("<ol><li>a</li></ol>");
  });

  test("ArrowDown/ArrowUp at the end/start of content: like ArrowRight/ArrowLeft", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const btnBold = el.querySelector("[tool=bold]");
    /** Presses key on editor @returns true if it's prevented */
    const press = (key, opts) =>
      !inp.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }));

    // the end of the last block: new line after it
    setHtml("<ul><li>a</li><li><b>Note:|</b></li></ul>");
    expect(press("ArrowDown")).toBe(true); // inline format is left at first
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(press("ArrowDown")).toBe(true);
    expect(getHtml()).toBe("<ul><li>a</li><li><b>Note:</b></li></ul><div>|<br></div>");
    expect(press("ArrowDown")).toBe(false); // plain line: nothing to go out of
    // the start of content: inline format is left
    setHtml("<div><b>|bold</b></div>");
    expect(press("ArrowUp")).toBe(true);
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(press("ArrowDown")).toBe(false); // not the end: caret moves
    userType("x");
    expect(getHtml()).toBe("<div>x|<b>bold</b></div>");
    setHtml("<ol><li>|a</li></ol>");
    expect(press("ArrowUp")).toBe(false); // ArrowLeft doesn't add line before block

    // caret can move into another line
    setHtml("<ul><li><b>a|</b></li><li>b</li></ul>");
    expect(press("ArrowDown")).toBe(false);
    setHtml("<div><b>a|</b><br>b</div>"); // soft line break
    expect(press("ArrowDown")).toBe(false);
    setHtml("<ul><li><b>a|</b>b</li></ul>"); // native: to the end of line
    expect(press("ArrowDown")).toBe(false);
    setHtml("<div>a</div><div><b>|b</b></div>");
    expect(press("ArrowUp")).toBe(false);
    setHtml("<ul><li>a<ul><li><b>|b</b></li></ul></li></ul>");
    expect(press("ArrowUp")).toBe(false);
    setHtml("<ol><li>[a]</li></ol>");
    expect(press("ArrowDown")).toBe(false);
    setHtml("<ol><li>a|</li></ol>");
    expect(press("ArrowDown", { shiftKey: true })).toBe(false); // selection
    expect(inp.innerHTML).toBe("<ol><li>a</li></ol>");
  });

  test("ArrowLeft one char after the start of inline element: caret goes inside it like ArrowRight to the end", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const btnBold = el.querySelector("[tool=bold]");
    /** Presses key on editor @returns true if it's prevented */
    const press = (key) => !inp.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

    // in the middle of line Chrome moves caret to the end of text before element
    setHtml("<div>hi <b>b|old</b></div>");
    expect(press("ArrowLeft")).toBe(true);
    expect(getHtml()).toBe("<div>hi <b>|bold</b></div>");
    expect(btnBold.getAttribute("aria-pressed")).toBe("true");
    expect(press("ArrowLeft")).toBe(true); // leaves it
    expect(btnBold.getAttribute("aria-pressed")).toBe("false");
    expect(press("ArrowLeft")).toBe(false); // caret moves as usual
    // emoji or letter with combining mark: caret moves over it at once
    setHtml("<div>hi <b>👍🏽|ok</b></div>");
    expect(press("ArrowLeft")).toBe(true);
    expect(getHtml()).toBe("<div>hi <b>|👍🏽ok</b></div>");
    setHtml(`<div>hi <b>e${String.fromCharCode(0x301)}|ok</b></div>`);
    expect(press("ArrowLeft")).toBe(true);
    // nested elements: caret goes inside the inner one, typed text goes into it (Chrome types out of link at its start)
    setHtml('<div><b>hi <a href="https://a.com">l|ink</a></b></div>');
    expect(press("ArrowLeft")).toBe(true);
    expect(getHtml()).toBe('<div><b>hi <a href="https://a.com">|link</a></b></div>');
    expect(typeText("x")).toBe(true);
    expect(getHtml()).toBe('<div><b>hi <a href="https://a.com">x|link</a></b></div>');

    // otherwise caret moves as usual
    setHtml("<div>hi <b>bo|ld</b></div>");
    expect(press("ArrowLeft")).toBe(false);
    setHtml("<div>hi b|old</div>");
    expect(press("ArrowLeft")).toBe(false);
    setHtml("<div>hi <b>b|old</b></div>");
    expect(press("ArrowUp")).toBe(false); // to the start of line
    expect(press("ArrowRight")).toBe(false);
  });

  test("inline element with caret at its edge is highlighted: typed text goes into it", async () => {
    useSocial();
    const tool = WUPTextRichControl.$tools.mention;
    tool.values = [{ value: "john" }];
    const anyText = tool.is;
    tool.is = (e) => (tool.values.some((x) => x.value === anyText(e)) ? anyText(e) : undefined); // values only
    el.$options.toolbar = [["bold", "link", "mention"]];
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Returns highlighted text */
    const hl = () => [...CSS.highlights.get("wup-textrich-edge")].map((r) => r.toString());
    /** Presses key on editor */
    const press = (key) => {
      inp.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
      document.dispatchEvent(new Event("selectionchange")); // jsdom doesn't fire it
    };

    setHtml("<div>hi <b>bo|ld</b></div>");
    expect(hl()).toEqual([]); // in the middle: nothing to point
    setHtml("<div>hi <b>bold|</b></div>");
    expect(hl()).toEqual(["bold"]);
    press("ArrowRight"); // left: the next typed text goes out of it
    expect(hl()).toEqual([]);
    press("ArrowLeft"); // back
    expect(hl()).toEqual(["bold"]);
    el.$format("bold"); // off for the next typed text
    expect(hl()).toEqual([]);
    setHtml("<div>hi <b>|bold</b></div>");
    expect(hl()).toEqual(["bold"]);
    // nested elements: the outer one at caret
    setHtml('<div><b>hi <a href="https://a.com">link|</a></b></div>');
    expect(hl()).toEqual(["hi link"]);
    setHtml('<div><b>hi <a href="https://a.com">link|</a> x</b></div>');
    expect(hl()).toEqual(["link"]);
    // token with caret in holder at its start: `is` rejects its text with holder
    setHtml('<div>hi <span class="wup-mention">@|john</span></div>');
    press("ArrowLeft");
    expect(hl()).toEqual([`${String.fromCharCode(0x200b)}@john`]);
    press("ArrowLeft"); // left
    expect(hl()).toEqual([]);
    // blur removes it
    setHtml("<div>hi <b>bold|</b></div>");
    expect(hl()).toEqual(["bold"]);
    inp.blur();
    await h.wait(1);
    expect(hl()).toEqual([]);
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
        div.appendChild(Html.toEditor(html, tools));
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
        // line breaks: loose `<br>` splits lines, `<br>` in line is `\n` (the last one after content isn't shown: it's
        // removed with emptied formats, the last of two shows empty line), empty line gets `<br>` (its formats are removed)
        ["a<br>b<br><br>c", "<div>a</div><div>b</div><div><br></div><div>c</div>"],
        ["<br><p>a<br></p>", "<div><br></div><div>a</div>"],
        ["<p>a<br>b<br><br></p><p><b>c<br></b></p>", '<div>a\nb\n\n</div><div><b class="b">c</b></div>'],
        [
          '<p><b>a</b><b><br></b></p><p><img src="a.png"><br></p>',
          '<div><b class="b">a</b></div><div><img src="a.png"></div>',
        ],
        [
          "<p><b><br></b></p><p>\n</p><p>a\n<img src='a.png'></p>",
          '<div><br></div><div><br></div><div>a\n<img src="a.png"></div>',
        ],
        // blocks inside line are flattened
        ["<h1>a<div>b</div><p>c</p></h1>", "<h1>a\nb\nc</h1>"],
        ["<h1>a<br><div>b</div></h1>", "<h1>a\nb</h1>"],
        ["<h1><div>a</div></h1>", "<h1>a</h1>"],
        // lists
        ["<li>a</li>", "<ul><li>a</li></ul>"],
        [
          "<ul> <li>a<p>b</p><ol><li>c</li></ol></li> <ol><li>d</li></ol> e<b>f</b></ul>",
          '<ul><li>a\nb<ol><li>c</li></ol></li><ol><li>d</li></ol><li> e<b class="b">f</b></li></ul>',
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

      // value: <strong> instead of <b> (keeps class), line breaks are `\n`: the last one of line is removed,
      // empty lines are kept
      expect(toValue('<div><b class="b">a</b><br></div><div><br></div>')).toBe(
        '<p><strong class="b">a</strong></p><p>\n</p>'
      );
      expect(toValue("<div>a<br>b</div><ul><li><br></li></ul>")).toBe("<p>a\nb</p><ul><li>\n</li></ul>");
      expect(toValue("<ul><li>a<br></li></ul><h1>b<br></h1>")).toBe("<ul><li>a</li></ul><h1>b</h1>");
      expect(toValue("<ul>a<br></ul>")).toBe("<ul><li>a</li></ul>"); // loose content of list (invalid html)
      // editor: `<br>` at root (Chrome leaves it when everything is deleted), empty text node after line break
      const line = document.createElement("div");
      line.append("a\n", "");
      const root = document.createElement("div");
      root.append(document.createElement("br"), line);
      expect(Html.fromEditor(root, WUPTextRichControl.$tools)).toBe("<p>\n</p><p>a</p>");
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
      // nothing to wrap: char replaces selection as usual (it's deleted at first)
      expect(wrap("<div>a[ ]b</div>", "(")).toEqual([true, "<div>a(|b</div>"]);
      expect(wrap("<div>[ab]</div>", "x")).toEqual([true, "<div>x|</div>"]);
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

      // text typed inside token at its edges goes into it like into other inline elements (`is` checks it on input)
      expect(type(`<div>a<span class="placeholder">|{email}</span></div>`, "x")).toEqual([
        true,
        `<div>a<span class="placeholder">x|{email}</span></div>`,
      ]);
      expect(type(`<div><span class="placeholder">{email}|</span></div>`, "x")).toEqual([
        true,
        `<div><span class="placeholder">{email}x|</span></div>`,
      ]);
      // next to token (left via arrow, caret after insertion): text goes out of it, otherwise browser extends token
      expect(type(`<div>${token}|</div>`, "x")).toEqual([true, `<div>${token}x|</div>`]);
      expect(type(`<div>|${token}</div>`, "x")).toEqual([true, `<div>x|${token}</div>`]);
      setHtml(`<div>${token}|</div>`);
      el.$format("bold"); // pending format
      expect(typeText("x")).toBe(true);
      expect(getHtml()).toBe(`<div>${token}<b>x|</b></div>`);
      expect(type(`<div><span class="placeholder">{em|ail}</span></div>`, "x")).toEqual([
        false,
        `<div><span class="placeholder">{em|ail}</span></div>`,
      ]);
      // selected token is deleted at first: otherwise Chrome types with its typing style (`<font color>`)
      expect(type(`<div>[${token}]</div>`, "x")).toEqual([true, "<div>x|</div>"]);

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

  test("token edited inside stays token only if `is` accepts its text", async () => {
    useSocial();
    const tool = WUPTextRichControl.$tools.mention;
    tool.values = [{ value: "john" }, { value: "jon" }];
    el.$options.toolbar = [["mention"]];
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const mention = (s) => `<span class="wup-mention">${s}</span>`;

    // `is` accepts any text: edited token stays
    setHtml(`<div>hi ${mention("@jo|hn")}</div>`);
    userType("123");
    expect(getHtml()).toBe(`<div>hi ${mention("@jo123|hn")}</div>`);

    // `is` accepts values only (see demo `allowUnknownMentions`): unknown text becomes plain text, caret stays
    const anyText = tool.is;
    tool.is = (e) => {
      const v = anyText(e);
      return tool.values.some((x) => x.value === v) ? v : undefined;
    };
    setHtml(`<div>hi ${mention("@jo|hn")}</div>`);
    userType("123");
    expect(getHtml()).toBe("<div>hi @jo123|hn</div>");
    setHtml(`<div>hi ${mention("@jo|n")} now</div>`);
    userType("h"); // known value
    expect(getHtml()).toBe(`<div>hi ${mention("@joh|n")} now</div>`);
    // deleted chars
    setHtml(`<div>hi ${mention("@joh|n")}</div>`);
    userDelete();
    expect(getHtml()).toBe(`<div>hi ${mention("@jo|n")}</div>`);
    userDelete();
    expect(getHtml()).toBe("<div>hi @j|n</div>");
    // text typed at token edge goes outside it, but token follows its text (see `recognize`): unknown one is plain text
    setHtml(`<div>hi ${mention("@john|")}</div>`);
    userType("x");
    expect(getHtml()).toBe("<div>hi @johnx|</div>");
    userDelete();
    expect(getHtml()).toBe(`<div>hi ${mention("@john|")}</div>`);

    // the same undo step: undo returns token, redo returns plain text (caret inside token); value is loose content
    el.$value = `hi ${mention("@john")}`;
    await h.wait(1);
    const caretInToken = () => window.getSelection().collapse(inp.querySelector(".wup-mention").firstChild, 3);
    caretInToken();
    userType("1");
    expect(getHtml()).toBe("hi @jo1|hn");
    await h.wait(1);
    expect(typeText(null, "historyUndo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe(`hi ${mention("@john")}`);
    caretInToken();
    expect(typeText(null, "historyRedo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe("hi @jo1hn");
  });

  test("text is recognized while typing: link, email & phone", async () => {
    useSocial();
    el.$options.toolbar = [["link", "email", "phone"]];
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html with caret, types text like browser & returns html */
    const rec = (html, data) => {
      setHtml(html);
      userType(data);
      return getHtml();
    };
    const a = (href, text = href) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    const b = (href, text) => `<a href="${href}">${text}</a>`; // email & phone
    const isLink = (html, data = " ") => rec(html, data).includes("<a");

    // element appears as soon as text is recognized & follows typed text
    expect(rec("<div>see https://|</div>", "e")).toBe(`<div>see ${a("https://e", "https://e|")}</div>`);
    userType("x.com/a?b=1");
    expect(getHtml()).toBe(`<div>see ${a("https://ex.com/a?b=1", "https://ex.com/a?b=1|")}</div>`);
    userType("."); // trailing punctuation & whitespace go out of it
    expect(getHtml()).toBe(`<div>see ${a("https://ex.com/a?b=1")}.|</div>`);
    expect(rec(`<div>see ${a("https://e", "https://e|")}</div>`, " ")).toBe(`<div>see ${a("https://e")} |</div>`);
    // deleted chars
    setHtml(`<div>see ${a("https://ex", "https://ex|")}</div>`);
    userDelete();
    expect(getHtml()).toBe(`<div>see ${a("https://e", "https://e|")}</div>`);
    userDelete();
    expect(getHtml()).toBe("<div>see https://|</div>");
    // typed in the middle
    expect(rec(`<div>${a("https://example.com", "https://exa|mple.com")}</div>`, "x")).toBe(
      `<div>${a("https://exaxmple.com", "https://exax|mple.com")}</div>`
    );
    expect(rec(`<div>x|${a("https://a.com")}</div>`, "y")).toBe("<div>xy|https://a.com</div>"); // isn't link anymore
    setHtml("<div>|ab</div>");
    inp.dispatchEvent(new InputEvent("input", { inputType: "deleteContentBackward", bubbles: true }));
    expect(getHtml()).toBe("<div>|ab</div>");
    // element left via ArrowRight doesn't join text typed after it, the returned one follows typed text
    const press = (key) => inp.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    setHtml(`<div>${a("https://a.com", "https://a.com|")}</div>`);
    press("ArrowRight");
    userType("/x");
    expect(getHtml()).toBe(`<div>${a("https://a.com")}/x|</div>`);
    userType("y");
    expect(getHtml()).toBe(`<div>${a("https://a.com")}/xy|</div>`);
    setHtml(`<div>${a("https://a.com", "https://a.com|")}</div>`);
    press("ArrowRight");
    press("ArrowLeft"); // back into it
    userType("/x");
    expect(getHtml()).toBe(`<div>${a("https://a.com/x", "https://a.com/x|")}</div>`);

    expect(rec("<div>www.example.co|</div>", "m")).toBe(
      `<div>${a("https://www.example.com", "www.example.com|")}</div>`
    );
    // trailing punctuation stays outside, balanced brackets are inside
    expect(rec("<div>(see https://en.wikipedia.org/wiki/A_(b))|</div>", ".")).toBe(
      `<div>(see ${a("https://en.wikipedia.org/wiki/A_(b)")}).|</div>`
    );
    expect(rec("<div>mail someone@gmail.|</div>", "c")).toBe(
      `<div>mail ${b("mailto:someone@gmail.c", "someone@gmail.c|")}</div>`
    );
    // phone in strict format: element appears when it's typed completely, extra digit removes it
    expect(isLink("<div>call +1 (555) 123-45-|</div>", "6")).toBe(false);
    expect(rec("<div>call +1 (555) 123-45-6|</div>", "7")).toBe(
      `<div>call ${b("tel:+15551234567", "+1 (555) 123-45-67|")}</div>`
    );
    userType("8");
    expect(getHtml()).toBe("<div>call +1 (555) 123-45-678|</div>");
    // not phones: other formats, short, id, number, date
    expect(isLink("<div>+1 (555) 123-456|</div>", "7")).toBe(false);
    expect(isLink("<div>+44 20 7946 095|</div>", "8")).toBe(false);
    expect(isLink("<div>555-123-45-6|</div>", "7")).toBe(false); // without country code
    expect(isLink("<div>123-45-67|</div>")).toBe(false);
    expect(isLink("<div>1234567890|</div>")).toBe(false);
    expect(isLink("<div>2026-10-15 1234|</div>")).toBe(false);
    // typed separator stays outside element, next chars join it: `a@b.co` + `-op.com`
    expect(rec(`<div>${b("mailto:a@b.co", "a@b.co|")}</div>`, "-")).toBe(
      `<div>${b("mailto:a@b.co", "a@b.co")}-|</div>`
    );
    userType("op.com");
    expect(getHtml()).toBe(`<div>${b("mailto:a@b.co-op.com", "a@b.co-op.com|")}</div>`);
    // not links
    expect(isLink("<div>https:/|</div>", "/")).toBe(false);
    expect(isLink("<div>xhttps://a.co|</div>", "m")).toBe(false);
    expect(isLink("<div>mailto:me@example.co|</div>", "m")).toBe(false);
    expect(isLink("<pre>https://a.co|</pre>", "m")).toBe(false); // code block
    // text is formatted already: link around it or in it
    expect(rec(`<div><a href="/x">https://a.co|</a></div>`, "m")).toBe(`<div><a href="/x">https://a.com|</a></div>`);
    expect(rec(`<div><a href="/x">+1 (555)</a> 123-45-6|</div>`, "7")).toBe(
      `<div><a href="/x">+1 (555)</a> 123-45-67|</div>`
    );

    // word from the last line break or embed to the next one
    expect(rec("<div>a<br>https://a.co|<br>b</div>", "m")).toBe(
      `<div>a<br>${a("https://a.com", "https://a.com|")}<br>b</div>`
    );
    expect(rec("<ul><li>https://a.co|<ul><li>b</li></ul></li></ul>", "m")).toBe(
      `<ul><li>${a("https://a.com", "https://a.com|")}<ul><li>b</li></ul></li></ul>`
    );
    expect(rec(`<ul><li>https://a.co|<ul><li>${a("https://b.com")}</li></ul></li></ul>`, "m")).toBe(
      `<ul><li>${a("https://a.com", "https://a.com|")}<ul><li>${a("https://b.com")}</li></ul></li></ul>`
    ); // link of nested item isn't touched
    // loose content (Chrome doesn't wrap the 1st line)
    expect(rec("https://a.co|<div>b</div>", "m")).toBe(`${a("https://a.com", "https://a.com|")}<div>b</div>`);
    // text split by formats: element per part
    expect(rec("<div><b>see https://a</b>.co|</div>", "m")).toBe(
      `<div><b>see ${a("https://a.com", "https://a")}</b>${a("https://a.com", ".com|")}</div>`
    );

    // line break: caret goes out of element (otherwise browser adds line into it)
    setHtml(`<div>${a("https://a.com", "https://a.com|")}</div>`);
    expect(typeText(null, "insertParagraph")).toBe(false);
    expect(getHtml()).toBe(`<div>${a("https://a.com")}|</div>`);
    setHtml("<div><b>https://a.com|</b></div>"); // not recognized yet: pasted etc.
    typeText(null, "insertLineBreak");
    expect(getHtml()).toBe(`<div><b>${a("https://a.com")}\n|\n</b></div>`);
    setHtml("<div>https://a.com!|</div>");
    typeText(null, "insertParagraph");
    expect(getHtml()).toBe(`<div>${a("https://a.com")}!|</div>`);
    setHtml("<div>[https://a.com]</div>");
    typeText(null, "insertParagraph");
    expect(getHtml()).toBe("<div>[https://a.com]</div>");

    // undo removes new element & pauses recognizing till caret leaves word
    setHtml("<div>a |</div>");
    await h.wait(1);
    userType("https://a.c");
    expect(getHtml()).toBe(`<div>a ${a("https://a.c", "https://a.c|")}</div>`);
    await h.wait(1);
    expect(typeText(null, "historyUndo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe("<div>a https://a.c</div>");
    expect(rec("<div>a https://a.c|</div>", "o")).toBe("<div>a https://a.co|</div>");
    userType(" ");
    expect(rec("<div>a https://a.c|</div>", "o")).toBe(`<div>a ${a("https://a.co", "https://a.co|")}</div>`);
    const pause = () => typeText(null, "historyRedo");
    const isResumed = () => rec("<div>https://a.c|</div>", "o").includes("<a");
    pause();
    inp.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(isResumed()).toBe(true);
    pause();
    inp.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(isResumed()).toBe(true);
    pause();
    setHtml("<div>https://a.c|</div>");
    typeText(null, "insertParagraph");
    expect(isResumed()).toBe(true);
    pause();
    inp.blur();
    await h.wait(1);
    inp.focus();
    expect(isResumed()).toBe(true);
    // element of initial value follows its text too
    el.$value = `go ${a("https://a.com")}`;
    await h.wait(1);
    expect(rec(`<div>go ${a("https://a.com", "https://a.com|")}</div>`, "/")).toBe(
      `<div>go ${a("https://a.com/", "https://a.com/|")}</div>`
    );

    // custom tools: RegExp & function
    const { $tools } = WUPTextRichControl;
    $tools.marked = {
      kind: "inline",
      recognize: /(?<!\w)#(\w+)$/, // group isn't markdown (only named group `text`): text is recognized as usual
      is: (e) => e.tagName === "MARK" || undefined,
      create: "mark",
    };
    $tools.issue = {
      hideOnToolbar: true,
      kind: "inline",
      recognize: (s) => /\b[A-Z]+-\d+$/.exec(s)?.[0],
      is: (e) => (e.classList.contains("issue") ? e.title : undefined),
      create: (v) => Object.assign(document.createElement("span"), { title: v }),
      classNameTag: "issue",
    };
    $tools.wrong = {
      kind: "inline",
      recognize: (s) => s.endsWith("!") && "?", // recognized text isn't at the end
      is: (e) => e.tagName === "I" || undefined,
      create: "i",
    };
    try {
      el.$options.toolbar = [["link", "marked", "issue", "wrong"]];
      await h.wait(1);
      expect(rec("<div>#ab #new|</div>", "s")).toBe("<div>#ab <mark>#news|</mark></div>");
      expect(rec("<div>see WUP-1|</div>", "2")).toBe(
        '<div>see <span title="WUP-12" class="issue">WUP-12|</span></div>'
      );
      expect(rec("<div>a|</div>", "!")).toBe("<div>a!|</div>");
      expect(isLink("<div>a@b.co|</div>", "m")).toBe(false); // tool isn't in toolbar
      expect(isLink("<div>www.|</div>", "[")).toBe(false); // `is` rejects element: invalid url
      expect(el.$refToolbar.querySelector('[tool="issue"]').hidden).toBe(true);
      el.$options.toolbar = [["bold"]];
      await h.wait(1);
      expect(isLink("<div>https://a.co|</div>", "m")).toBe(false); // without tools
    } finally {
      delete $tools.marked;
      delete $tools.issue;
      delete $tools.wrong;
    }
  });

  test("hashtags & mentions", async () => {
    useSocial();
    el.$options.toolbar = [["link", "email", "tag", "mention"]];
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html with caret, types text like browser & returns html */
    const rec = (html, data) => {
      setHtml(html);
      userType(data);
      return getHtml();
    };
    const tag = (s) => `<span class="wup-tag">${s}</span>`;
    const mention = (s) => `<span class="wup-mention">${s}</span>`;

    expect(rec("<div>see #new|</div>", "s")).toBe(`<div>see ${tag("#news|")}</div>`);
    expect(rec("<div>(#café_|</div>", "2")).toBe(`<div>(${tag("#café_2|")}</div>`);
    expect(rec("<div>hi @john.do|</div>", "e")).toBe(`<div>hi ${mention("@john.doe|")}</div>`);
    expect(rec(`<div>hi ${mention("@john|")}</div>`, ".")).toBe(`<div>hi ${mention("@john")}.|</div>`);
    userType("doe"); // joins element again
    expect(getHtml()).toBe(`<div>hi ${mention("@john.doe|")}</div>`);
    // not hashtags & mentions: digits only, in word, email, url
    expect(rec("<div>#1|</div>", "2")).toBe("<div>#12|</div>");
    expect(rec("<div>C|</div>", "#")).toBe("<div>C#|</div>");
    expect(rec("<div>a&#|</div>", "x")).toBe("<div>a&amp;#x|</div>");
    expect(rec("<div>a@|</div>", "b")).toBe("<div>a@b|</div>");
    expect(rec("<div>a@b.|</div>", "c")).toBe('<div><a href="mailto:a@b.c">a@b.c|</a></div>');
    expect(rec("<div>https://a.com/#to|</div>", "p")).toBe(
      '<div><a href="https://a.com/#top" target="_blank" rel="noopener noreferrer">https://a.com/#top|</a></div>'
    );
    // sanitizer keeps them
    const div = document.createElement("div");
    div.append(
      Html.toEditor(`<p>${mention("@john")} ${tag("#news")} <span class="x">@a</span></p>`, WUPTextRichControl.$tools)
    );
    expect(div.innerHTML).toBe(`<div>${mention("@john")} ${tag("#news")} @a</div>`);

    // ArrowLeft at the start: typed text goes before element & doesn't join it
    setHtml(`<div>${tag("|#news")}</div>`);
    inp.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    userType("x");
    expect(getHtml()).toBe(`<div>x|${tag("#news")}</div>`);
    // line break: recognized text & token aren't continued in the next line
    setHtml(`<div>hi ${tag("#news|")}</div>`);
    expect(typeText(null, "insertParagraph")).toBe(false); // caret goes out of element
    expect(getHtml()).toBe(`<div>hi ${tag("#news")}|</div>`);
    setHtml(`<div>hi ${mention("@john|")}</div>`);
    typeText(null, "insertLineBreak");
    expect(getHtml()).toBe(`<div>hi ${mention("@john")}\n|\n</div>`);
    setHtml(`<div>${mention(tag("#news"))}</div><div>${mention(tag("|<br>"))}</div>`); // copied by Chrome
    inp.dispatchEvent(new InputEvent("input", { inputType: "insertParagraph", bubbles: true }));
    expect(getHtml()).toBe(`<div>${mention(tag("#news"))}</div><div>|<br></div>`);
    setHtml("<div><b>bold</b></div><div><b>|<br></b></div>"); // formats are continued
    inp.dispatchEvent(new InputEvent("input", { inputType: "insertLineBreak", bubbles: true }));
    expect(getHtml()).toBe("<div><b>bold</b></div><div><b>|<br></b></div>");

    // tool with values: menu on trigger at word start, typed text is recognized too (see the next test)
    const { mention: tool } = WUPTextRichControl.$tools;
    tool.values = [{ value: "john", label: "John Smith" }];
    const rect = { x: 0, y: 0, top: 0, left: 0, right: 1, bottom: 9, width: 1, height: 9 };
    Range.prototype.getBoundingClientRect = () => rect; // jsdom: menu is placed near caret
    try {
      el.$options.toolbar = [["bold"], ["mention"]];
      await h.wait(1);
      const btn = el.querySelector("[tool=mention]");
      expect(btn.hidden).toBe(true);
      expect(rec("<div>hi @joh|</div>", "n")).toBe(`<div>hi ${mention("@john|")}</div>`);
      inp.blur();
      await h.wait(1);
      inp.focus();
      setHtml("<div>a|</div>");
      userType("@"); // in word: email
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      setHtml("<div>hi |</div>");
      userType("@");
      expect(btn.getAttribute("aria-expanded")).toBe("true");
      expect(el.querySelector("wup-popup[menu] li").textContent).toBe("John Smith");
      inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      await h.wait(1);
      expect(getHtml()).toBe(`<div>hi ${mention("@john")} |</div>`); // followed by space: caret is out of token
      // text typed right after token goes outside it, but token follows its text (`is` accepts any text here)
      window.getSelection().collapse(inp.firstChild, 2);
      userType("x");
      expect(getHtml()).toBe(`<div>hi ${mention("@johnx|")} </div>`);
    } finally {
      delete tool.values;
    }
  });

  test("typed text replaces selection with hashtag & mention", async () => {
    useSocial();
    WUPTextRichControl.$tools.mention.values = [{ value: "john", label: "John Smith" }]; // token
    el.$options.toolbar = [["tag", "mention"]];
    await h.wait(1);
    el.$refInput.focus();
    const tag = (s) => `<span class="wup-tag">${s}</span>`;
    const mention = (s) => `<span class="wup-mention">${s}</span>`;

    // Ctrl+A: lines are merged, otherwise text goes between lines & empty mention stays in the 2nd line
    setHtml(`<div>[Text</div><div>Call ${tag("#news")} by ${mention("@john]")}</div>`);
    expect(typeText("d")).toBe(true);
    expect(getHtml()).toBe("<div>d|<br></div>");
    // the same line: elements selected entirely are removed (without empty copies)
    setHtml(`<div>Call ${tag("[#news")} by ${mention("@john]")}</div>`);
    expect(typeText("d")).toBe(true);
    expect(getHtml()).toBe("<div>Call d|</div>");
    setHtml(`<div>${mention("[@john")} by ${tag("#news]")} now</div>`);
    expect(typeText("d")).toBe(true);
    expect(getHtml()).toBe("<div>d| now</div>");
    // element selected partially is unwrapped: its text with typed one is recognized again
    setHtml(`<div>${tag("#ne[ws")} b]</div>`);
    expect(typeText("x")).toBe(true);
    expect(getHtml()).toBe(`<div>${tag("#nex|")}</div>`);
  });

  test("arrows at token edges: caret goes out of invisible holder, typed text isn't joined with token", async () => {
    useSocial();
    const tool = WUPTextRichControl.$tools.mention;
    tool.values = [{ value: "john" }];
    const anyText = tool.is;
    tool.is = (e) => {
      const v = anyText(e);
      return tool.values.some((x) => x.value === v) ? v : undefined; // values only: `@johnx` isn't mention
    };
    el.$options.toolbar = [["mention"]];
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const zw = String.fromCharCode(0x200b); // Chrome paints caret inside token at its end (any point) otherwise
    const mention = '<span class="wup-mention">@john</span>';
    /** Presses key on editor @returns true if it's prevented */
    const press = (key) => !inp.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

    setHtml(`<div>hi <span class="wup-mention">@john|</span></div>`);
    expect(press("ArrowRight")).toBe(true);
    expect(getHtml()).toBe(`<div>hi ${mention}${zw}|</div>`);
    expect(press("ArrowRight")).toBe(false); // nowhere to move: holder stays
    userType("x"); // instead of holder
    expect(getHtml()).toBe(`<div>hi ${mention}x|</div>`);
    // ArrowLeft returns into token
    setHtml(`<div>hi <span class="wup-mention">@john|</span></div>`);
    press("ArrowRight");
    expect(press("ArrowLeft")).toBe(true);
    expect(getHtml()).toBe(`<div>hi <span class="wup-mention">@john|</span></div>`);
    // Backspace: holder is removed, browser deletes the last char of token
    press("ArrowRight");
    expect(typeText(null, "deleteContentBackward")).toBe(false);
    expect(getHtml()).toBe(`<div>hi ${mention}|</div>`);
    // holder isn't content: caret moves, the end of the last block (the 2nd ArrowRight adds line), blur
    setHtml(`<div>hi <span class="wup-mention">@john|</span></div>`);
    press("ArrowRight");
    window.getSelection().collapse(inp.firstChild.firstChild, 1);
    document.dispatchEvent(new Event("selectionchange"));
    expect(getHtml()).toBe(`<div>h|i ${mention}</div>`);
    setHtml(`<ul><li>a <span class="wup-mention">@john|</span></li></ul>`);
    press("ArrowRight");
    expect(press("ArrowRight")).toBe(true);
    expect(getHtml()).toBe(`<ul><li>a ${mention}</li></ul><div>|<br></div>`);
    el.$value = `hi ${mention}`; // blur renders $value (setHtml doesn't change it)
    await h.wait(1);
    window.getSelection().collapse(inp.querySelector(".wup-mention").firstChild, 5);
    press("ArrowRight");
    expect(inp.innerHTML).toBe(`hi ${mention}${zw}`);
    inp.blur();
    await h.wait(1);
    expect(inp.innerHTML).toBe(`hi ${mention}`);
    // content is replaced with holder
    inp.focus();
    window.getSelection().collapse(inp.querySelector(".wup-mention").firstChild, 5);
    press("ArrowRight");
    el.$value = "abc";
    await h.wait(1);
    inp.blur();
    await h.wait(1);
    expect(inp.innerHTML).toBe("abc");

    // ArrowLeft at the start of token (at line start & in the middle of line)
    inp.focus();
    setHtml(`<div><span class="wup-mention">|@john</span> hi</div>`);
    expect(press("ArrowLeft")).toBe(true);
    expect(getHtml()).toBe(`<div>|${zw}${mention} hi</div>`);
    userType("x");
    expect(getHtml()).toBe(`<div>x|${mention} hi</div>`);
    setHtml(`<div>hi <span class="wup-mention">|@john</span></div>`);
    expect(press("ArrowLeft")).toBe(true);
    expect(getHtml()).toBe(`<div>hi |${zw}${mention}</div>`);
    // ArrowRight returns into token: holder inside it (in the middle of line Chrome paints caret out of it otherwise)
    expect(press("ArrowRight")).toBe(true);
    const start = `<span class="wup-mention">${zw}|@john</span>`;
    expect(getHtml()).toBe(`<div>hi ${start}</div>`);
    expect(press("ArrowRight")).toBe(false); // caret moves as usual
    // ArrowLeft one char after the start of token goes into its start, the next one leaves it
    setHtml(`<div>hi <span class="wup-mention">@|john</span></div>`);
    expect(press("ArrowLeft")).toBe(true);
    expect(getHtml()).toBe(`<div>hi ${start}</div>`);
    expect(press("ArrowLeft")).toBe(true);
    expect(getHtml()).toBe(`<div>hi |${zw}${mention}</div>`);
    // text typed at the start of token goes into it: `x@john` isn't mention anymore
    setHtml(`<div>hi <span class="wup-mention">@|john</span></div>`);
    press("ArrowLeft");
    userType("x");
    expect(getHtml()).toBe("<div>hi x|@john</div>");
    // ArrowDown/ArrowUp: the same as ArrowRight/ArrowLeft without line below/above caret
    setHtml(`<div>hi <span class="wup-mention">@john|</span></div>`);
    expect(press("ArrowDown")).toBe(true);
    expect(getHtml()).toBe(`<div>hi ${mention}${zw}|</div>`);
    setHtml(`<div><span class="wup-mention">|@john</span> hi</div>`);
    expect(press("ArrowUp")).toBe(true);
    expect(getHtml()).toBe(`<div>|${zw}${mention} hi</div>`);
    // rendered rows (paragraph can be wrapped): row of caret & rows of content before/after it
    let rows = [];
    Range.prototype.getClientRects = function rectsOf() {
      return this.collapsed ? [{ top: 20, bottom: 30, height: 10 }] : rows;
    };
    try {
      setHtml(`<div>hi <span class="wup-mention">@john|</span></div>`);
      press("ArrowDown");
      rows = [
        { top: 20, bottom: 30, height: 10 },
        { top: 0, bottom: 0, height: 0 },
      ]; // the same row
      expect(press("ArrowUp")).toBe(true); // back into token
      expect(getHtml()).toBe(`<div>hi <span class="wup-mention">@john|</span></div>`);
      press("ArrowDown");
      rows = [{ top: 0, bottom: 10, height: 10 }]; // row above caret
      expect(press("ArrowUp")).toBe(false); // browser moves caret into it
      rows = [{ top: 40, bottom: 50, height: 10 }]; // row below caret
      expect(press("ArrowDown")).toBe(false);
    } finally {
      delete Range.prototype.getClientRects;
    }
  });

  test("typed token is recognized if `is` accepts it: tool with values (mention)", async () => {
    useSocial();
    const tool = WUPTextRichControl.$tools.mention;
    tool.values = [{ value: "john", label: "John Smith" }, { value: "Ann Lee" }];
    const anyText = tool.is;
    // values only (see demo `allowUnknownMentions`)
    tool.is = (e) => {
      const v = anyText(e);
      return tool.values.some((x) => x.value === v) ? v : undefined;
    };
    const rect = { x: 0, y: 0, top: 0, left: 0, right: 1, bottom: 9, width: 1, height: 9 };
    Range.prototype.getBoundingClientRect = () => rect; // jsdom: menu is placed near caret
    el.$options.toolbar = [["tag", "mention"]];
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const btn = el.querySelector("[tool=mention]");
    const tag = (s) => `<span class="wup-tag">${s}</span>`;
    const mention = (s) => `<span class="wup-mention">${s}</span>`;

    // element follows typed text while menu is filtered by it
    setHtml("<div>hi |</div>");
    userType("@");
    userType("joh");
    expect(getHtml()).toBe("<div>hi @joh|</div>");
    userType("n");
    expect(getHtml()).toBe(`<div>hi ${mention("@john|")}</div>`);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    // unknown text is plain text (without menu: jsdom breaks live range of typed trigger on unwrapping, Chrome doesn't)
    setHtml(`<div>hi ${mention("@john|")}</div>`);
    userType("n");
    userType("y");
    expect(getHtml()).toBe("<div>hi @johnny|</div>");
    userDelete();
    userDelete();
    expect(getHtml()).toBe(`<div>hi ${mention("@john|")}</div>`);

    // chosen value replaces recognized token entirely (without its empty copy); trigger typed at the start of text node
    setHtml("<div>| a</div>");
    userType("@");
    userType("john");
    expect(getHtml()).toBe(`<div>${mention("@john|")} a</div>`);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(getHtml()).toBe(`<div>${mention("@john")}| a</div>`);

    // token chosen in menu with text that isn't recognized entirely doesn't follow its text: `is` checks text typed into it
    setHtml(`<div>hi ${mention("@Ann Lee|")}</div>`);
    userType(",");
    expect(getHtml()).toBe("<div>hi @Ann Lee,|</div>");
    setHtml(`<div>hi ${mention("@Ann Lee|")}</div>`);
    inp.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })); // leaves it
    userType(",");
    expect(getHtml()).toBe(`<div>hi ${mention("@Ann Lee")},|</div>`);
    // recognized token follows text typed into it in the same undo step: it stays before typed space
    el.$value = `hi ${mention("@john")}`;
    await h.wait(1);
    window.getSelection().collapse(inp.querySelector(".wup-mention").firstChild, 5);
    userType(" ");
    expect(getHtml()).toBe(`hi ${mention("@john")} |`);
    await h.wait(1);
    expect(typeText(null, "historyUndo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe(`hi ${mention("@john")}`);
    // pasted text into it isn't recognized: token is checked by `is`
    window.getSelection().collapse(inp.querySelector(".wup-mention").firstChild, 5);
    expect(userPaste("", undefined, "x")).toBe(true);
    expect(inp.innerHTML).toBe("<div>hi @johnx</div>"); // paste wraps loose line

    // line break at the end of token goes out of it: Shift+Enter is custom (see the test of line format), on Enter Chrome
    // adds its empty copy into the new line (`is` rejects it: without text); caret after element is at its end too
    setHtml(`<div>hi ${mention("@john|")}</div>`);
    expect(typeText(null, "insertLineBreak")).toBe(true);
    expect(getHtml()).toBe(`<div>hi ${mention("@john")}\n|\n</div>`);
    setHtml(`<div>hi ${mention("@john")}|</div>`);
    expect(typeText(null, "insertParagraph")).toBe(false);
    inp.insertAdjacentHTML("beforeend", `<div>${mention("<br>")}</div>`);
    window.getSelection().collapse(inp.lastChild.firstChild, 0);
    inp.dispatchEvent(new InputEvent("input", { inputType: "insertParagraph", bubbles: true }));
    expect(getHtml()).toBe(`<div>hi ${mention("@john")}</div><div>|<br></div>`);

    // hashtag pasted over selected text: it's pasted as usual (its value is text itself) & recognized
    setHtml("<div>see [docs]</div>");
    expect(userPaste("", undefined, "#news")).toBe(true);
    expect(getHtml()).toBe(`<div>see ${tag("#news|")}</div>`);
  });

  test("lists are recognized by typed text at line start: `1. ` & `- `", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html with caret, types text like browser & returns html */
    const rec = (html, data = " ") => {
      setHtml(html);
      userType(data);
      return getHtml();
    };
    const nbsp = String.fromCharCode(160); // Chrome types it at the end of line

    expect(rec("<div>1.|</div>")).toBe("<ol><li>|<br></li></ol>");
    expect(rec("<div>1)|</div>", nbsp)).toBe("<ol><li>|<br></li></ol>");
    expect(rec("<div>-|</div>", nbsp)).toBe("<ul><li>|<br></li></ul>");
    expect(rec("<div>*|abc</div>")).toBe("<ul><li>|abc</li></ul>"); // text after caret stays
    expect(rec("<h2>1.|</h2>")).toBe("<ol><li>|<br></li></ol>");
    expect(rec("1.|<div>b</div>")).toBe("<ol><li>|<br></li></ol><div>b</div>"); // loose content (Chrome)
    expect(rec("<div><b>-|</b></div>")).toBe("<ul><li>|<br></li></ul>"); // empty format is removed
    userType("z"); // format of typed text stays for the next one
    expect(getHtml()).toBe("<ul><li><b>z|</b><br></li></ul>");
    // works like button: joins the previous list, item of another list is nested into the previous item
    expect(rec("<ul><li>a</li></ul><div>-|</div>")).toBe("<ul><li>a</li><li>|<br></li></ul>");
    expect(rec("<ol><li>a</li><li>-|</li></ol>")).toBe("<ol><li>a<ul><li>|<br></li></ul></li></ol>");
    // not recognized
    expect(rec("<div>1|</div>", ".")).toBe("<div>1.|</div>"); // without space: `1.5 kg`
    expect(rec("<div>2.|</div>")).toBe("<div>2. |</div>");
    expect(rec("<div>a -|</div>")).toBe("<div>a - |</div>"); // not at line start
    expect(rec("<div>a<br>-|</div>")).toBe("<div>a<br>- |</div>");
    expect(rec("<pre>-|</pre>")).toBe("<pre>- |</pre>"); // code block
    expect(rec("<ul><li>-|</li></ul>")).toBe("<ul><li>- |</li></ul>"); // applied already
    el.$options.toolbar = [["bold"]]; // tool isn't rendered
    await h.wait(1);
    expect(rec("<div>-|</div>")).toBe("<div>- |</div>");
  });

  test("markdown: `recognize` of line tool & RegExp with group `text`", async () => {
    // like demo textRich.custom.tsx
    const { header, blockquote, code, bold, italic } = WUPTextRichControl.$tools;
    header.values.forEach((v) => {
      v.value && (v.recognize = new RegExp(`^#{${v.value}}\\s$`));
    });
    blockquote.recognize = /^>\s$/;
    code.recognize = (s) => (s === "```" ? s : undefined);
    bold.recognize = /(?<!\S)\*\*(?<text>[^*\s](?:[^*]*[^*\s])?)\*\*$/;
    // flags `d` & `g` are ignored; other groups are allowed: `_a_` & `*a*`
    italic.recognize = /(?<!\S)([_*])(?<text>[^_*\s](?:[^_*]*[^_*\s])?)\1$/dg;
    try {
      el.$options.toolbar = [["header"], ["bold", "italic"], ["blockquote", "code"], [{ list: "bullet" }]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      /** Sets html with caret, types text like browser & returns html */
      const rec = (html, data = " ") => {
        setHtml(html);
        userType(data);
        return getHtml();
      };

      // line tool: text typed at line start
      expect(rec("<div>#|</div>")).toBe("<h1>|<br></h1>");
      expect(rec("<div>###|</div>")).toBe("<h3>|<br></h3>");
      expect(rec("<div>>|</div>")).toBe("<blockquote>|<br></blockquote>");
      expect(rec("<div>``|</div>", "`")).toBe("<pre>|<br></pre>");
      expect(rec("<blockquote>>|</blockquote>")).toBe("<blockquote>&gt; |</blockquote>"); // applied already
      expect(rec("<div>a >|</div>")).toBe("<div>a &gt; |</div>"); // not at line start

      // inline tool: text of group `text` is formatted on typed closing marker, markers are removed
      expect(rec("<div>a **bol|</div>", "d")).toBe("<div>a **bold|</div>");
      expect(rec("<div>a **bold*|</div>", "*")).toBe("<div>a <b>bold|</b></div>");
      const btnBold = el.querySelector("[tool=bold]");
      expect(btnBold.getAttribute("aria-pressed")).toBe("false"); // the next typed text goes out of it
      userType("c");
      expect(getHtml()).toBe("<div>a <b>bold</b>c|</div>");
      expect(rec("<div>x _a b|</div>", "_")).toBe("<div>x <em>a b|</em></div>");
      expect(rec("<div>_a|</div>", "_")).toBe("<div><em>a|</em></div>"); // again: flag `g` is ignored
      expect(rec("<div>x *a|</div>", "*")).toBe("<div>x <em>a|</em></div>"); // group `text` is formatted, not the 1st one
      // text split by formats, formatted already
      expect(rec("<div>**a <i>b</i>*|</div>", "*")).toBe("<div><b>a </b><i><b>b|</b></i></div>");
      expect(rec("<div><b>**a*|</b></div>", "*")).toBe("<div><b>a|</b></div>");
      // not recognized
      expect(rec("<div>snake_case|</div>", "_")).toBe("<div>snake_case_|</div>"); // in word
      expect(rec("<div>**|</div>", "**")).toBe("<div>****|</div>"); // empty
      expect(rec("<div>** a *|</div>", "*")).toBe("<div>** a **|</div>"); // whitespace at edges
      expect(rec("<pre>**a*|</pre>", "*")).toBe("<pre>**a**|</pre>"); // code block

      // formats with markdown aren't recognized text: they follow pending rules & are continued on Enter
      expect(rec("<div><b>ab|</b></div>", "c")).toBe("<div><b>abc|</b></div>");
      expect(rec("<div><b>-|</b></div>")).toBe("<ul><li>|<br></li></ul>");
      userType("z");
      expect(getHtml()).toBe("<ul><li><b>z|</b><br></li></ul>");
      setHtml("<div><b>bold</b></div><div><b>|<br></b></div>");
      inp.dispatchEvent(new InputEvent("input", { inputType: "insertParagraph", bubbles: true }));
      expect(getHtml()).toBe("<div><b>bold</b></div><div><b>|<br></b></div>");

      // separate undo step: Escape right after it returns typed text
      setHtml("<div>a **b*|</div>");
      await h.wait(1);
      userType("*");
      expect(getHtml()).toBe("<div>a <b>b|</b></div>");
      expect(inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))).toBe(
        false
      );
      await h.wait(1);
      expect(inp.innerHTML).toBe("<div>a **b**</div>");

      // tool isn't rendered
      el.$options.toolbar = [["italic"]];
      await h.wait(1);
      expect(rec("<div>**a*|</div>", "*")).toBe("<div>**a**|</div>");
      expect(rec("<div>>|</div>")).toBe("<div>&gt; |</div>");
    } finally {
      header.values.forEach((v) => delete v.recognize);
      delete blockquote.recognize;
      delete code.recognize;
      delete bold.recognize;
      delete italic.recognize;
    }
  });

  test("Escape right after recognizing undoes it like Ctrl+Z (value isn't cleared via Escape)", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** @returns true if Escape isn't prevented */
    const esc = () =>
      inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

    // recognized link: plain text is returned (recognizing is paused like after Ctrl+Z)
    setHtml("<div>a@b.|</div>");
    await h.wait(1);
    userType("c");
    expect(getHtml()).toBe('<div><a href="mailto:a@b.c">a@b.c|</a></div>');
    expect(esc()).toBe(false);
    await h.wait(1);
    expect(inp.innerHTML).toBe("<div>a@b.c</div>");

    // list: separate undo step returns typed text
    setHtml("<div>-|</div>");
    await h.wait(1);
    userType(" ");
    expect(getHtml()).toBe("<ul><li>|<br></li></ul>");
    await h.wait(1);
    expect(typeText(null, "historyUndo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe("<div>- </div>"); // jsdom: selection isn't restored (see mockAreaInput)
    setHtml("<div>1.|</div>");
    await h.wait(1);
    userType(" ");
    expect(esc()).toBe(false);
    await h.wait(1);
    expect(inp.innerHTML).toBe("<div>1. </div>");
    expect(esc()).toBe(true); // nothing to undo: value isn't cleared
    await h.wait();
    expect(inp.innerHTML).toBe("<div>1. </div>");

    // not right after it: caret moved, other input, blur
    const recognized = async () => {
      setHtml("<div>-|</div>");
      await h.wait(1);
      userType(" ");
    };
    await recognized();
    window.getSelection().collapse(inp.querySelector("li"), 1);
    document.dispatchEvent(new Event("selectionchange"));
    expect(esc()).toBe(true);
    await recognized();
    typeText(null, "deleteContentForward");
    expect(esc()).toBe(true);
    await recognized();
    inp.blur();
    await h.wait(1);
    inp.focus();
    expect(esc()).toBe(true);
    await h.wait();
    expect(inp.innerHTML).toBe("<ul><li><br></li></ul>");
  });

  test("slash commands", async () => {
    useSocial();
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    // slash commands: menu at word start, chosen format replaces typed text
    const rect = { x: 0, y: 0, top: 0, left: 0, right: 1, bottom: 9, width: 1, height: 9 };
    Range.prototype.getBoundingClientRect = () => rect; // jsdom: menu is placed near caret
    const btn = el.querySelector("[tool=command]");
    const items = () => [...el.querySelectorAll("wup-popup[menu] li")].filter((li) => !li.hidden);
    const choose = async (html, typed) => {
      setHtml(html);
      if (!html) {
        // empty line: caret in empty text (otherwise userType has no text to type into)
        const t = inp.appendChild(document.createElement("div")).appendChild(document.createTextNode(""));
        window.getSelection().collapse(t, 0);
      }
      userType("/");
      expect(btn.getAttribute("aria-expanded")).toBe("true");
      typed && userType(typed);
      inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      await h.wait(1);
      return inp.innerHTML;
    };
    expect(await choose("", "1")).toBe("<h1><br></h1>"); // empty line keeps placeholder
    expect(await choose("<div>item |</div>", "bul")).toBe("<ul><li>item </li></ul>");
    expect(await choose("<div>a |</div>", "quo")).toBe("<blockquote>a </blockquote>");
    setHtml("<div>https:|</div>");
    userType("/"); // not at word start
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    setHtml("<div>a |</div>");
    userType("/");
    userType("lin");
    expect(items().map((li) => li.textContent)).toEqual(["LinkCtrl+K", "UnderlineCtrl+U"]); // with shortcuts
    inp.blur(); // closes menu
    await h.wait(1);
    inp.focus();

    // menu lists tools of toolbar (hidden ones too)
    const { $tools } = WUPTextRichControl;
    $tools.marked = {
      kind: "inline",
      placeholder: "text",
      className: "my-icon-mark",
      is: (e) => e.tagName === "MARK" || undefined,
      create: "mark",
    };
    const spyErr = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      el.$options.hideHotKeysHint = true;
      el.$options.toolbar = [
        ["bold", { size: ["lg", false, "xx"] }, { list: "ordered" }, { header: [1] }, "unknown"],
        ["email", "mention", "marked", "command", "btnClear"],
      ];
      await h.wait(1);
      const cmd = () => el.querySelector("[tool=command]"); // re-rendered with toolbar
      setHtml("<div>a |</div>");
      userType("/");
      expect(items().map((li) => li.textContent)).toEqual([
        "Numbered list",
        "Heading 1",
        "Email",
        "Mention",
        "marked",
        "Bold",
        "Font size: Default",
        "Font size: Large",
        "Font size: Xx",
      ]); // by groups: blocks, inserts, inline formats; `false` value first
      expect(el.querySelector("wup-popup[menu] li[tool=marked]").classList.contains("my-icon-mark")).toBe(true); // icon
      expect(items().map((li) => li.hasAttribute("sep"))).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 0].map(Boolean)); // between groups
      inp.blur();
      await h.wait(1);
      inp.focus();
      /** Chooses item of command menu by typed text & returns html with selection */
      const pick = async (html, typed) => {
        setHtml(html);
        userType("/");
        userType(typed);
        expect(cmd().getAttribute("aria-expanded")).toBe("true");
        inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        await h.wait(1);
        return getHtml();
      };
      // placeholder: recognized & selected to type over it
      expect(await pick("<div>a |</div>", "ema")).toBe(
        '<div>a [<a href="mailto:name@example.com">name@example.com]</a></div>'
      );
      userType("j"); // replaces element: text isn't recognized anymore
      expect(getHtml()).toBe("<div>a j|</div>");
      expect(await pick("<div>a |</div>", "menti")).toBe('<div>a [<span class="wup-mention">@name]</span></div>');
      // placeholder without recognize: formatted by tool
      expect(await pick("<div>a |</div>", "mark")).toBe("<div>a [<mark>text]</mark></div>");
      // tool without placeholder: applied like $format (pending for the next typed text)
      await pick("<div>a |</div>", "bol");
      userType("B");
      expect(getHtml()).toBe("<div>a <b>B|</b></div>");
      expect(await pick("<div>a |</div>", "lar")).toBe("<div>a |</div>");
      userType("L");
      expect(getHtml()).toBe('<div>a <span style="font-size: x-large;">L|</span></div>');
      // tool with menu: its trigger opens it
      $tools.mention.values = [{ value: "john", label: "John Smith" }];
      el.$options.toolbar = [["mention", "command"]];
      await h.wait(1);
      expect(await pick("<div>a |</div>", "menti")).toBe("<div>a @|</div>");
      expect(items().map((li) => li.textContent)).toEqual(["John Smith"]);
      // $format without value asks via menu
      setHtml("<div>a |</div>");
      el.$format("command");
      await h.wait(1);
      expect(cmd().getAttribute("aria-expanded")).toBe("true");
      el.applyCommand("unknown"); // ignored
    } finally {
      delete $tools.marked;
      delete $tools.mention.values;
      el.$options.hideHotKeysHint = false;
      spyErr.mockRestore();
    }
  });

  test("$defaults.toolbar = null hides toolbar", async () => {
    const { toolbar } = WUPTextRichControl.$defaults;
    WUPTextRichControl.$defaults.toolbar = null;
    try {
      const c = document.body.appendChild(document.createElement("wup-textrich"));
      await h.wait(1);
      expect(c.$options.toolbar).toBe(null);
      expect(c.$refToolbar.hidden).toBe(true);
      c.remove();
    } finally {
      WUPTextRichControl.$defaults.toolbar = toolbar;
    }
  });

  test("hideOnToolbar: tool works without button", async () => {
    const { link } = WUPTextRichControl.$tools;
    link.hideOnToolbar = true;
    try {
      el.$options.toolbar = [["bold", "email"], ["link"]];
      await h.wait(1);
      const bar = el.$refToolbar;
      const groups = bar.querySelectorAll("[role=group]");
      expect(groups.length).toBe(2);
      expect([groups[0].hidden, groups[1].hidden]).toEqual([false, true]); // group with hidden tools only
      expect(bar.hidden).toBe(false);
      const hint = document.getElementById(el.$refInput.getAttribute("aria-describedby"));
      expect(hint.textContent).toBeTruthy();

      // keyboard: hidden buttons are skipped
      el.$refInput.focus();
      const key = (k, opts) =>
        document.activeElement.dispatchEvent(
          new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts })
        );
      key("F10", { code: "F10", altKey: true });
      expect(document.activeElement.getAttribute("tool")).toBe("bold");
      key("ArrowRight");
      expect(document.activeElement.getAttribute("tool")).toBe("bold");

      // shortcut of hidden tool: popup is placed near editor
      setHtml("<div>a |b</div>");
      key("k", { code: "KeyK", ctrlKey: true });
      await h.wait(1);
      expect(el.querySelector("wup-popup")?.$options.target).toBe(el.$refInput);

      // toolbar with hidden tools only is hidden
      el.$options.toolbar = [["link", "email"]];
      await h.wait(1);
      expect(bar.hidden).toBe(true);
      expect(hint.textContent).toBe("");
    } finally {
      delete link.hideOnToolbar;
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
      expect(getHtml()).toBe('<div>a <span class="placeholder">{email}</span> |</div>'); // see the next test
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

  test("token chosen in menu of trigger is followed by space (not before whitespace or punctuation)", async () => {
    const cleanup = usePlaceholder();
    const tool = WUPTextRichControl.$tools.placeholder;
    try {
      el.$options.toolbar = [["placeholder"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const token = '<span class="placeholder">{email}</span>';
      /** Sets html with caret, types trigger & filter, chooses item via Enter @returns html */
      const choose = async (html) => {
        setHtml(html);
        userType("{");
        userType("em");
        await h.wait(1); // typing is a separate undo step
        inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        await h.wait(1);
        return getHtml();
      };

      // the end of line: caret goes after space (Chrome draws caret inside token at its end)
      expect(await choose("<div>a |</div>")).toBe(`<div>a ${token} |</div>`);
      // the same undo step
      expect(typeText(null, "historyUndo")).toBe(true);
      await h.wait(1);
      expect(inp.innerHTML).toBe("<div>a {em</div>");
      // typed text is separated from token
      await choose("<div>a |</div>");
      userType("x");
      expect(getHtml()).toBe(`<div>a ${token} x|</div>`);
      // before word & line break (Shift+Enter)
      expect(await choose("<div>a |b</div>")).toBe(`<div>a ${token} |b</div>`);
      expect(await choose("<div>a |<br>b</div>")).toBe(`<div>a ${token} |<br>b</div>`);
      // whitespace or punctuation after it: without space
      expect(await choose("<div>a | b</div>")).toBe(`<div>a ${token}| b</div>`);
      expect(await choose("<div>(|)</div>")).toBe(`<div>(${token}|)</div>`);
      expect(await choose("<div>Dear |, hi</div>")).toBe(`<div>Dear ${token}|, hi</div>`);

      // custom `format` inserts something else instead of token: without space
      tool.format = ({ editor }) => editor.$insert(document.createTextNode("{x}"));
      expect(await choose("<div>a |</div>")).toBe("<div>a {x}|</div>");
      tool.format = ({ editor }) => editor.$insert(Object.assign(document.createElement("b"), { textContent: "x" }));
      expect(await choose("<div>a |</div>")).toBe("<div>a <b>x</b>|</div>");
    } finally {
      cleanup();
      delete tool.format;
    }
  });

  test("paste", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();

    setHtml("<div>a|</div>");
    expect(userPaste("<b>b</b><script>alert(1)</script>")).toBe(true);
    expect(getHtml()).toBe("<div>a<b>b</b>|</div>");
    expect(userPaste("", undefined, "")).toBe(false); // nothing to paste: browser handles it
    // plain text (see $options.copyPasteFormatted): copied html has page styles; html is used without text (image etc.)
    setHtml("<div><b>ab|c</b></div>");
    expect(userPaste('<span style="font-size: small;">type </span>', undefined, "type ")).toBe(true);
    expect(getHtml()).toBe("<div><b>abtype |c</b></div>");
    /** Fires `beforeinput` of drop with html & plain text */
    const drop = () => {
      const ev = new InputEvent("beforeinput", { inputType: "insertFromDrop", bubbles: true, cancelable: true });
      Object.defineProperty(ev, "dataTransfer", { value: { getData: (t) => (t === "text/html" ? "<b>b</b>" : "b") } });
      inp.dispatchEvent(ev);
    };
    setHtml("<div>a|</div>");
    drop();
    expect(getHtml()).toBe("<div>ab|</div>");
    // with formats
    el.$options.copyPasteFormatted = true;
    setHtml("<div>a|</div>");
    drop();
    expect(getHtml()).toBe("<div>a<b>b</b>|</div>");
    setHtml("<div>a|</div>");
    userPaste('<span style="font-size: small;">b</span>', undefined, "b");
    expect(getHtml()).toBe('<div>a<span style="font-size: small;">b</span>|</div>');
    el.$options.copyPasteFormatted = false;
    // inline content goes into formats at caret (the same format isn't nested); Chrome marks copied selection that
    // ends at line end, it isn't line
    setHtml("<div><b>ab|cde</b></div>");
    expect(userPaste('<div><b>XY</b></div><br class="Apple-interchange-newline">')).toBe(true);
    expect(getHtml()).toBe("<div><b>abXY|cde</b></div>");
    // Chrome copies spaces at edges as `&nbsp;`: they're spaces
    setHtml("<div><b>ab|c</b></div>");
    userPaste("<span>tools<span>&nbsp;</span></span>");
    expect(getHtml()).toBe("<div><b>abtools |c</b></div>");
    // pending formats like for typed text: Bold left via ArrowRight, Bold turned on, formats of replaced selection
    setHtml("<div><b>abc|</b></div>");
    inp.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    userPaste("", undefined, "qwe");
    expect(getHtml()).toBe("<div><b>abc</b>qwe|</div>");
    setHtml("<div>a|</div>");
    el.$format("bold");
    userPaste("", undefined, "qwe");
    expect(getHtml()).toBe("<div>a<b>qwe</b>|</div>");
    setHtml("<div>a<b>[bc]</b></div>");
    userPaste("", undefined, "qwe");
    expect(getHtml()).toBe("<div>a<b>qwe</b>|</div>");
    // plain text: line per line of text, the last line break is skipped (copied line ends with it)
    setHtml("<div><b>ab|cde</b></div>");
    expect(userPaste("", undefined, "XY\r\n")).toBe(true);
    expect(getHtml()).toBe("<div><b>abXY|cde</b></div>");
    setHtml("<div><b>ab|cde</b></div>");
    userPaste("", undefined, "X\n\nY");
    expect(getHtml()).toBe("<div><b>ab</b></div><div>X</div><div><br></div><div>Y|</div><div><b>cde</b></div>");
    // block: caret goes to the end of its content
    setHtml("<div>a|b</div>");
    userPaste("<ul><li>x</li></ul>");
    expect(getHtml()).toBe("<div>a</div><ul><li>x|</li></ul><div>b</div>");
    // target range is selected at first
    setHtml("<div>abc</div>");
    const t = inp.firstChild.firstChild;
    expect(userPaste("<i>x</i>", { startContainer: t, startOffset: 1, endContainer: t, endOffset: 2 })).toBe(true);
    expect(getHtml()).toBe("<div>a<em>x</em>|c</div>");
    // nothing to paste: selection is deleted only
    setHtml("<div>a[b]c</div>");
    expect(userPaste("<script>alert(1)</script>")).toBe(true);
    expect(inp.innerHTML).toBe("<div>ac</div>");
    // into list item: lists are flattened into lines of item (empty line too)
    setHtml("<ul><li>x|</li></ul>");
    userPaste("<ul><li>a</li><li>b<ol><li>c</li></ol></li></ul><p>d</p>");
    expect(getHtml()).toBe("<ul><li>xa\nb\nc\nd|</li></ul>");
    setHtml("<ul><li>x|</li></ul>");
    userPaste("<p>a</p><p><br></p><p>b</p>");
    expect(getHtml()).toBe("<ul><li>xa\n\nb|</li></ul>");
    // into code block: plain text instead of html
    setHtml("<pre>a|b</pre>");
    expect(userPaste("<p><b>x</b></p><p>y</p>", undefined, "x\ny")).toBe(true);
    expect(getHtml()).toBe("<pre>ax\ny|b</pre>");
    setHtml("<pre>a[b]c</pre>");
    userPaste("<b></b>", undefined, ""); // nothing to paste: selection is deleted only
    expect(inp.innerHTML).toBe("<pre>ac</pre>");
  });

  test("pasted text is recognized: link, email; url over selected text makes it link", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const a = (href, text = href) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    /** Sets html with caret, pastes html & returns html */
    const paste = (html, pasted, text) => {
      setHtml(html);
      userPaste(pasted, undefined, text);
      return getHtml();
    };

    // every url & email of pasted html
    expect(paste("<div>see |</div>", "https://a.com, <b>a@b.co</b>.<p>(www.c.org)</p>")).toBe(
      `<div>see </div><div>${a("https://a.com")}, <b><a href="mailto:a@b.co">a@b.co</a></b>.</div><div>(${a(
        "https://www.c.org",
        "www.c.org"
      )})|</div>`
    );
    // text before caret is joined (`see https://` + `a.com`), not touched one isn't recognized
    expect(paste("<div>https://x.com see https://|</div>", "a.com")).toBe(
      `<div>https://x.com see ${a("https://a.com", "https://a.com|")}</div>`
    );
    // pasted link stays as is; code block isn't recognized
    expect(paste("<div>|</div>", '<a href="https://x.com">https://y.com</a> z')).toBe(
      `<div>${a("https://x.com", "https://y.com")} z|</div>`
    );
    expect(paste("<pre>|</pre>", "https://a.com", "https://a.com")).toBe("<pre>https://a.com|</pre>");

    // separate undo step: Escape right after it returns pasted text
    setHtml("<div>a |</div>");
    await h.wait(1);
    userPaste("https://b.com");
    expect(getHtml()).toBe(`<div>a ${a("https://b.com", "https://b.com|")}</div>`); // like typed one
    await h.wait(1);
    expect(inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))).toBe(
      false
    );
    await h.wait(1);
    expect(inp.innerHTML).toBe("<div>a https://b.com</div>");

    // plain text
    expect(paste("<div>a |</div>", "", "https://b.com c")).toBe(`<div>a ${a("https://b.com")} c|</div>`);

    // url over selected text: it becomes link (selection stays)
    expect(paste("<div>see [docs] here</div>", "", " https://a.com ")).toBe(
      `<div>see [${a("https://a.com", "docs]")} here</div>`
    );
    expect(paste("<div>[mail]</div>", "", "a@b.co")).toBe('<div><a href="mailto:a@b.co">[mail]</a></div>');
    // link is changed
    expect(paste(`<div>${a("https://x.com", "[do]cs")}</div>`, "", "https://a.com")).toBe(
      `<div>${a("https://a.com", "[do]cs")}</div>`
    );
    // otherwise pasted text replaces selection
    expect(paste("<div>[docs]</div>", "see https://a.com", "see https://a.com")).toBe(
      `<div>see ${a("https://a.com", "https://a.com|")}</div>`
    );
    expect(paste("<pre>[docs]</pre>", "x", "https://a.com")).toBe("<pre>https://a.com|</pre>");
    setHtml("<div>[docs]</div>");
    expect(typeText(null, "insertFromPaste")).toBe(false); // without dataTransfer: browser pastes it

    const cleanup = useImage();
    WUPTextRichControl.$tools.underline.recognize = /\d+ \d+$/;
    try {
      el.$options.toolbar = [["link", "underline"]]; // tools are applied on toolbar render
      await h.wait(1);
      // text is split by embeds, line breaks & nested lists (their items are own lines)
      expect(
        paste(
          "<div>|</div>",
          '<ul><li>https://a.com<img src="a.png">www.b.com<br>c.com<ul><li>a 1 2 3</li></ul></li></ul>'
        )
      ).toBe(
        `<ul><li>${a("https://a.com")}<img src="a.png">${a(
          "https://www.b.com",
          "www.b.com"
        )}\nc.com<ul><li>a 1 <u>2 3|</u></li></ul></li></ul>` // the last recognized text wins like on typing
      );
      // nothing to recognize
      el.$options.toolbar = [["bold"]];
      await h.wait(1);
      expect(paste("<div>|</div>", "https://a.com")).toBe("<div>https://a.com|</div>");
      expect(paste("<div>[docs]</div>", "https://a.com", "https://a.com")).toBe("<div>https://a.com|</div>");
    } finally {
      cleanup();
      delete WUPTextRichControl.$tools.underline.recognize;
    }
  });

  test("$insert: content replaces selection like paste", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    // editor isn't focused: selection placed via code is kept
    setHtml("<div>a|b</div>");
    el.$insert("x");
    expect(document.activeElement).toBe(inp);
    expect(getHtml()).toBe("<div>ax|b</div>");
    expect(el.$value).toBe("<div>axb</div>"); // updated at once (value of input is mocked: html of editor)

    // html is sanitized: only formats of $tools are kept
    setHtml("<div>a [b] c</div>");
    el.$insert('<b>Hello</b>, <img src="x" onerror="alert(1)"><span style="color: red;">world</span>');
    expect(getHtml()).toBe("<div>a <b>Hello</b>, world| c</div>");
    // node is inserted as is
    setHtml("<div>a[b]c</div>");
    el.$insert(Object.assign(document.createElement("mark"), { textContent: "x" }));
    expect(getHtml()).toBe("<div>a<mark>x</mark>|c</div>");
    // text is recognized like pasted one
    setHtml("<div>see |</div>");
    el.$insert("https://a.com");
    expect(getHtml()).toBe(
      '<div>see <a href="https://a.com" target="_blank" rel="noopener noreferrer">https://a.com|</a></div>'
    );

    // code block gets text: lines of html are `\n`
    setHtml("<pre>a|</pre>");
    await h.wait(1);
    el.$insert("<p>x</p><p><b>y</b></p>");
    expect(getHtml()).toBe("<pre>ax\ny|</pre>");
    // separate undo step
    await h.wait(1);
    expect(typeText(null, "historyUndo")).toBe(true);
    await h.wait(1);
    expect(inp.innerHTML).toBe("<pre>a</pre>");
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

  test("Backspace at the start of formatted line removes its format", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    /** Sets html & fires `beforeinput` of Backspace
     * @returns [isPrevented, html] */
    const back = (html) => {
      setHtml(html);
      const ev = new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true });
      ev.getTargetRanges = () => []; // range deleted by browser
      return [!inp.dispatchEvent(ev), getHtml()];
    };

    // heading, quote, code block: paragraph (alignment is kept); the next Backspace joins lines as usual
    expect(back("<div>a</div><h2>|b</h2>")).toEqual([true, "<div>a</div><div>|b</div>"]);
    expect(back('<blockquote style="text-align: center;">|b</blockquote>')).toEqual([
      true,
      '<div style="text-align: center;">|b</div>',
    ]);
    expect(back("<pre>|b</pre>")).toEqual([true, "<div>|b</div>"]);
    // list item: paragraph out of list, nested item goes to the parent list
    expect(back("<ul><li>a</li><li>|b</li><li>c</li></ul>")).toEqual([
      true,
      "<ul><li>a</li></ul><div>|b</div><ul><li>c</li></ul>",
    ]);
    expect(back("<ul><li>a<ul><li>|b</li></ul></li></ul>")).toEqual([true, "<ul><li>a</li><li>|b</li></ul>"]);
    expect(back("<ol><li>|<br></li></ol>")).toEqual([true, "<div>|<br></div>"]); // empty item
    // not at line start, plain paragraph or selected text: browser deletes as usual
    expect(back("<h2>a|b</h2>")[0]).toBe(false);
    expect(back("<div>a</div><div>|b</div>")[0]).toBe(false);
    expect(back("<h2>[a]b</h2>")[0]).toBe(false);
  });

  test("line format is a block of lines: Enter adds line inside it, on empty line closes it", async () => {
    await h.wait(1);
    el.$refInput.focus();
    /** Sets html & fires `beforeinput` of Enter (Shift+Enter if `isSoft`)
     * @returns [isPrevented, html] */
    const enter = (html, isSoft) => {
      setHtml(html);
      return [typeText(null, isSoft ? "insertLineBreak" : "insertParagraph"), getHtml()];
    };

    // line break inside block: the extra one at the end shows empty line
    expect(enter("<blockquote>a|b</blockquote>")).toEqual([true, "<blockquote>a\n|b</blockquote>"]);
    expect(enter("<blockquote>ab|</blockquote>")).toEqual([true, "<blockquote>ab\n|\n</blockquote>"]);
    expect(enter("<pre>a[b]</pre>")).toEqual([true, "<pre>a\n|\n</pre>"]); // selection is replaced (browser adds `<br>`)
    // empty line: it's removed, block is closed & caret goes into paragraph after it (the rest goes into copy of block)
    expect(enter("<blockquote>a\n|\n</blockquote><div>b</div>")).toEqual([
      true,
      "<blockquote>a</blockquote><div>|<br></div><div>b</div>",
    ]);
    expect(enter("<pre>a\n|<br></pre>")).toEqual([true, "<pre>a</pre><div>|<br></div>"]);
    expect(enter("<blockquote>a\n|\nb</blockquote>")).toEqual([
      true,
      "<blockquote>a</blockquote><div>|<br></div><blockquote>b</blockquote>",
    ]);
    expect(enter("<h2>|\nb</h2>")).toEqual([true, "<div>|<br></div><h2>b</h2>"]);
    // the previous empty line stays visible: with the extra line break
    expect(enter("<blockquote>a\n\n|\n</blockquote>")).toEqual([
      true,
      "<blockquote>a\n\n</blockquote><div>|<br></div>",
    ]);
    // empty block becomes paragraph
    expect(enter('<blockquote style="text-align: center;">|<br></blockquote>')).toEqual([
      true,
      '<div style="text-align: center;">|<br></div>',
    ]);
    // heading: Enter adds paragraph (browser), on empty line or in empty heading - paragraph
    expect(enter("<h2>ab|</h2>")[0]).toBe(false);
    expect(enter("<h2>a[b]</h2>")[0]).toBe(false);
    expect(enter("<h2>ab\n|\n</h2>")).toEqual([true, "<h2>ab</h2><div>|<br></div>"]);
    expect(enter("<h2>|<br></h2>")).toEqual([true, "<div>|<br></div>"]);
    expect(enter("<h2>ab|</h2>", true)).toEqual([true, "<h2>ab\n|\n</h2>"]);
    // list: Enter adds the next item (browser), on empty line or in empty item - paragraph out of list
    expect(enter("<ul><li>a|</li></ul>")[0]).toBe(false);
    expect(enter("<ul><li>a[b]</li></ul>")[0]).toBe(false);
    expect(enter("<ul><li>a\n|\n</li><li>b</li></ul>")).toEqual([
      true,
      "<ul><li>a</li></ul><div>|<br></div><ul><li>b</li></ul>",
    ]);
    expect(enter("<ul><li>a</li><li>|<br></li></ul>")).toEqual([true, "<ul><li>a</li></ul><div>|<br></div>"]);
    // Shift+Enter: line break only (in any line, like Chrome: Firefox adds `<br>`, Safari - paragraph)
    expect(enter("<pre>a\n|\n</pre>", true)).toEqual([true, "<pre>a\n\n|\n</pre>"]);
    expect(enter("<ul><li>a|</li></ul>", true)).toEqual([true, "<ul><li>a\n|\n</li></ul>"]);
    expect(enter("<ul><li>a|<ul><li>b</li></ul></li></ul>", true)).toEqual([
      true,
      "<ul><li>a\n|<ul><li>b</li></ul></li></ul>",
    ]);
    expect(enter("<div>a|b</div>", true)).toEqual([true, "<div>a\n|b</div>"]);
    expect(enter("a|", true)).toEqual([true, "<div>a\n|\n</div>"]); // loose content (the 1st typed line) goes into line
    // empty line: extra line break instead of its `<br>` (otherwise 2 empty lines are shown)
    expect(enter("<div>|<br></div>", true)).toEqual([true, "<div>\n|\n</div>"]);
    expect(enter("<div><b>|<br></b></div>", true)).toEqual([true, "<div><b>\n|\n</b></div>"]);
    expect(enter("<div>|</div>", true)).toEqual([true, "<div>\n|\n</div>"]);
    // Safari fires `insertParagraph` for Shift+Enter
    setHtml("<div>a|</div>");
    const keyEnter = (shiftKey) =>
      el.$refInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", shiftKey, bubbles: true, cancelable: true })
      );
    keyEnter(true);
    expect(typeText(null, "insertParagraph")).toBe(true);
    expect(getHtml()).toBe("<div>a\n|\n</div>");
    keyEnter(false);
    expect(typeText(null, "insertParagraph")).toBe(false); // Enter: browser adds paragraph
    // paragraph, loose content or selection goes out of line: browser handles it
    expect(enter("<div>a|</div>")[0]).toBe(false);
    expect(enter("a|")[0]).toBe(false);
    expect(enter("<blockquote>a[b</blockquote><div>c]</div>")[0]).toBe(false);
    expect(enter("<div>a[b</div><div>c]</div>", true)[0]).toBe(false);
  });

  test("browser formatting is replaced by tools", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const spy = jest.spyOn(el, "goFormat");
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
    // url pasted after prefill: doubled protocol is removed (the pasted one is kept)
    await h.userInsertText(txt.$refInput, "http://x.com/");
    await h.wait();
    expect([txt.$value, txt.$refInput.value]).toEqual(["http://x.com/", "http://x.com/"]);
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

    // caret inside link: its url is edited, empty value removes link
    txt = await ask('<div>a <a href="https://x.com/">l|ink</a> c</div>');
    expect(txt.$value).toBe("https://x.com/");
    expect(document.activeElement).toBe(txt.$refInput);
    txt.$value = "https://y.com/";
    await press(txt, "Enter");
    await h.wait();
    expect(getHtml()).toBe(
      '<div>a <a href="https://y.com/" target="_blank" rel="noopener noreferrer">l|ink</a> c</div>'
    );
    txt = await ask(getHtml());
    txt.$value = undefined;
    await press(txt, "Enter");
    await h.wait();
    expect(txt.isConnected).toBe(false); // not required
    expect(getHtml()).toBe("<div>a l|ink c</div>");

    // canceled by Escape or focus out
    txt = await ask("<div>a [b] c</div>");
    await press(txt, "Escape");
    expect(txt.isConnected).toBe(false);
    expect(getHtml()).toBe("<div>a [b] c</div>");
    txt = await ask("<div>a [b] c</div>");
    expect(document.activeElement).toBe(txt.$refInput);
    txt.$refInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); // browser window blur: input stays active
    await h.wait();
    expect(txt.isConnected).toBe(true);
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
      expect(inp.querySelector("a").getAttribute("href")).toBe("https://y.com/");
      expect(a.isConnected).toBe(false); // replaced via create
      // cleared url removes link
      move(inp.firstChild);
      move(inp.querySelector("a"));
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

  test("link popup uses `ask` & `create` of tool: url is replaced in place", async () => {
    const { link } = WUPTextRichControl.$tools;
    try {
      el.$options.toolbar = [["link"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const move = (t) => t.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
      const press = (key, opts, t = inp) =>
        t.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true, ...opts }));
      const popup = () => [...el.querySelectorAll("wup-popup")].at(-1) ?? null;
      const html = (url) => `<div>a <a href="${url}" target="_blank" rel="noopener noreferrer">li|nk</a></div>`;

      // hover: url via `create` (`www.` gets protocol), caret stays inside link
      setHtml('<div>a <a href="https://x.com/">li|nk</a></div>');
      move(inp.querySelector("a"));
      await h.wait();
      const txt = popup().querySelector("wup-text");
      txt.$value = "www.y.com";
      press("Enter", {}, txt.$refInput);
      await h.wait();
      expect(getHtml()).toBe(html("https://www.y.com"));
      document.dispatchEvent(new Event("selectionchange")); // jsdom doesn't fire it: control saves selection

      // custom `ask` via $ask: hover popup on hover, focused popup via $hotKeyAsk
      const ask = jest.fn((t, c, url) => c.$ask(t, url, { label: "My url" }));
      WUPTextRichControl.$tools.link = { ...link, ask };
      move(inp.firstChild);
      move(inp.querySelector("a"));
      await h.wait();
      expect(ask).toBeCalledWith(inp.querySelector("a"), el, "https://www.y.com");
      expect(popup().querySelector("wup-text").$options.label).toBe("My url");
      expect(popup().contains(document.activeElement)).toBe(false);
      press("Escape");
      await h.wait();
      expect(popup()).toBe(null);
      press("ArrowDown", { altKey: true });
      await h.wait();
      expect(ask).toBeCalledTimes(2);
      expect(popup().contains(document.activeElement)).toBe(true);
      press("Escape", {}, popup().querySelector("input"));
      await h.wait();
      expect(getHtml()).toBe(html("https://www.y.com"));

      // custom `ask` without popup (modal etc.): the same url changes nothing, empty one removes link
      ask.mockImplementation((_t, _c, url) => Promise.resolve(url));
      press("ArrowDown", { altKey: true });
      await h.wait();
      expect(getHtml()).toBe(html("https://www.y.com"));
      ask.mockImplementation(() => Promise.resolve(""));
      press("ArrowDown", { altKey: true });
      await h.wait();
      expect(getHtml()).toBe("<div>a li|nk</div>");
    } finally {
      WUPTextRichControl.$tools.link = link;
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

  test("$hotKeyAsk: Alt+ArrowDown opens popup of element at caret (token, embed, link)", async () => {
    const cleanup = usePlaceholder();
    const ask = jest.fn(() => Promise.resolve("b.png"));
    const cleanupImg = useImage(ask);
    const { $hotKeyAsk } = WUPTextRichControl;
    try {
      el.$options.toolbar = [["placeholder", "image", "link", "bold"]];
      await h.wait(1);
      const inp = el.$refInput;
      inp.focus();
      const ph = (v) => `<span class="placeholder">{${v}}</span>`;
      const popup = () => [...el.querySelectorAll("wup-popup")].at(-1) ?? null;
      /** Presses Alt + key on target @returns true if it's prevented */
      const press = (key, opts, t = inp) =>
        !t.dispatchEvent(
          new KeyboardEvent("keydown", { key, code: key, altKey: true, bubbles: true, cancelable: true, ...opts })
        );
      /** Presses Alt+ArrowDown & returns selected item of opened menu, then closes it via Escape (caret isn't moved) */
      const menuAt = async (html) => {
        setHtml(html);
        expect(press("ArrowDown")).toBe(true);
        await h.wait(1);
        const item = popup().querySelector("[aria-selected=true]")?.textContent;
        expect(press("Escape", { altKey: false })).toBe(true);
        await h.wait();
        expect(popup()).toBe(null);
        expect(getHtml()).toBe(html);
        return item;
      };

      // token: caret inside, at its edges (out of it, nested one), in caret holder
      expect(await menuAt(`<div>a ${ph("first|Name")} b</div>`)).toBe("First Name");
      expect(await menuAt(`<div>a ${ph("firstName")}| b</div>`)).toBe("First Name");
      expect(await menuAt(`<div>a |${ph("email")} b</div>`)).toBe("Email");
      expect(await menuAt(`<div><b>${ph("email")}</b>| b</div>`)).toBe("Email");
      expect(await menuAt(`<div>a |<b>${ph("firstName")}</b></div>`)).toBe("First Name");
      setHtml('<div>a <span class="placeholder">{email}|</span></div>');
      expect(press("ArrowRight", { altKey: false })).toBe(true); // token is left via holder
      expect(press("ArrowDown")).toBe(true);
      await h.wait(1);
      expect(popup().hasAttribute("menu")).toBe(true);
      // keyboard chooses value: it replaces token
      setHtml(`<div>a ${ph("first|Name")} b</div>`);
      expect(press("ArrowDown")).toBe(true);
      await h.wait(1);
      expect(press("ArrowDown", { altKey: false })).toBe(true);
      expect(press("Enter", { altKey: false })).toBe(true);
      await h.wait();
      expect(popup()).toBe(null);
      expect(getHtml()).toBe(`<div>a ${ph("email")}| b</div>`);

      // nothing at caret: key works as usual
      setHtml(`<div>a|b ${ph("email")}</div>`);
      expect(press("ArrowDown")).toBe(false);
      setHtml(`<div>[a]b ${ph("email")}</div>`);
      expect(press("ArrowDown")).toBe(false);
      setHtml("<div>[<b>a</b>]</div>"); // selected element isn't matched
      expect(press("ArrowDown")).toBe(false);
      window.getSelection().removeAllRanges();
      expect(press("ArrowDown")).toBe(false);
      window.getSelection().collapse(el.querySelector("[tool=bold]"), 0); // out of editor
      expect(press("ArrowDown")).toBe(false);
      setHtml(`<div>a ${ph("first|Name")}</div>`);
      el.querySelector("[tool=bold]").focus();
      expect(press("ArrowDown", {}, el.querySelector("[tool=bold]"))).toBe(false); // toolbar isn't editor
      inp.focus();
      expect(press("ArrowDown", { shiftKey: true })).toBe(false); // other shortcut
      expect(popup()).toBe(null);

      // embed with `ask`: selected, caret after & before it
      setHtml('<div>[<img src="a.png">]</div>');
      expect(press("ArrowDown")).toBe(true);
      expect(ask).toBeCalledWith(inp.querySelector("img"), el, "a.png");
      await h.wait(1);
      expect(getHtml()).toBe('<div><img src="b.png">|</div>');
      setHtml('<div>a <img src="a.png">|</div>');
      expect(press("ArrowDown")).toBe(true);
      setHtml('<div>a |<img src="a.png"></div>');
      expect(press("ArrowDown")).toBe(true);
      expect(ask).toBeCalledTimes(3);
      await h.wait(1);

      // link: url popup with focused text control
      setHtml('<div>a <a href="https://x.com/">li|nk</a></div>');
      expect(press("ArrowDown")).toBe(true);
      await h.wait();
      const txt = popup().querySelector("wup-text");
      expect(txt.$value).toBe("https://x.com/");
      expect(popup().contains(document.activeElement)).toBe(true);
      txt.$value = "https://y.com/";
      expect(press("Enter", { altKey: false }, txt.$refInput)).toBe(true);
      await h.wait();
      expect(inp.querySelector("a").getAttribute("href")).toBe("https://y.com/");
      expect(getHtml()).toBe(
        '<div>a <a href="https://y.com/" target="_blank" rel="noopener noreferrer">li|nk</a></div>'
      );

      // custom shortcut
      WUPTextRichControl.$hotKeyAsk = ["Control", "Enter"];
      setHtml(`<div>a ${ph("first|Name")}</div>`);
      expect(press("ArrowDown")).toBe(false);
      expect(press("Enter", { altKey: false, ctrlKey: true })).toBe(true);
      await h.wait(1);
      expect(popup().hasAttribute("menu")).toBe(true);
      expect(press("Escape", { altKey: false })).toBe(true);
      await h.wait();

      // readonly: tokens & embeds aren't editable
      WUPTextRichControl.$hotKeyAsk = $hotKeyAsk;
      el.$options.readOnly = true;
      await h.wait(1);
      setHtml(`<div>a ${ph("first|Name")}</div>`);
      expect(press("ArrowDown")).toBe(false);
    } finally {
      WUPTextRichControl.$hotKeyAsk = $hotKeyAsk;
      cleanupImg();
      cleanup();
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
    inp.dispatchEvent(new FocusEvent("blur")); // browser window blur: editor stays active
    await h.wait();
    expect(menu()).toBeTruthy();
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
    WUPTextRichControl.$tools.image = {
      kind: "embed",
      values: [{ value: "a.png", hotKey: ["Control", "Alt", "I"] }],
      is: () => undefined,
      create: "img",
    };
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

  test("className & classNameTag of tool and values", async () => {
    WUPTextRichControl.$tools.mark = {
      kind: "inline",
      create: "mark",
      // eslint-disable-next-line no-nested-ternary
      is: (e) => (e.tagName === "MARK" ? (e.classList.contains("red") ? "red" : "yellow") : undefined),
      className: "ic-mark",
      values: [
        { value: "yellow", className: "ic-yellow", classNameTag: "yellow" },
        { value: "red", className: "ic-red", classNameTag: "red" },
      ],
    };
    try {
      el.$options.toolbar = [["mark", { mark: "red" }, "bold"]];
      await h.wait(1);
      el.$refInput.focus();
      // button of value: classes of tool & value
      const btn = el.querySelector('[tool="mark:red"]');
      expect(btn.className).toBe("ic-mark ic-red");
      // dropdown with icons: classes of tool & current value
      const dropdown = el.querySelector("[tool=mark]");
      expect(dropdown.hasAttribute("icon")).toBe(true);
      setHtml("<div>a[b]c</div>");
      el.$format("mark", "yellow", true);
      expect(getHtml()).toBe('<div>a[<mark class="yellow">b]</mark>c</div>'); // classNameTag of value
      document.dispatchEvent(new Event("selectionchange"));
      expect(dropdown.className).toBe("ic-mark ic-yellow");
      expect(btn.getAttribute("aria-pressed")).toBe("false");
    } finally {
      delete WUPTextRichControl.$tools.mark;
    }
  });

  test("tool without `is`: element is detected by tag of `create` & classNameTag", async () => {
    const spyErr = jest.spyOn(console, "error").mockImplementation(() => {});
    const { $tools } = WUPTextRichControl;
    $tools.hl = { kind: "inline", create: "span", classNameTag: "hl" };
    $tools.color = {
      kind: "inline",
      create: "span", // without class of tool: value is detected by its class
      values: [
        { value: "red", classNameTag: "red" },
        { value: false, label: "Default" }, // isn't applied: without class
      ],
    };
    $tools.chip = { kind: "inline", create: "span" }; // otherwise every span is format (font size etc.)
    $tools.marker = { kind: "inline", create: "mark", values: [{ value: "a" }] }; // otherwise value isn't detected
    try {
      el.$options.toolbar = [["hl", "color", "chip", "marker"]];
      await h.wait(1);
      expect(spyErr.mock.calls.map((c) => c[0])).toEqual([
        "WUP-TEXTRICH. Tool 'chip' misses is or classNameTag",
        "WUP-TEXTRICH. Tool 'marker' misses is or classNameTag",
      ]);
      el.$refInput.focus();
      /** Returns pressed state of `hl` & label of `color` */
      const state = () => [
        el.querySelector("[tool=hl]").getAttribute("aria-pressed"),
        el.querySelector("[tool=color]").textContent,
      ];
      setHtml("<div>a[b]c</div>");
      el.$format("hl");
      expect(getHtml()).toBe('<div>a[<span class="hl">b]</span>c</div>');
      document.dispatchEvent(new Event("selectionchange"));
      expect(state()).toEqual(["true", "Default"]);

      setHtml("<div>a[b]c</div>");
      el.$format("color", "red");
      expect(getHtml()).toBe('<div>a[<span class="red">b]</span>c</div>');
      document.dispatchEvent(new Event("selectionchange"));
      expect(state()).toEqual(["false", "Red"]);
      // span without class of tool or value isn't format: invalid `chip` too
      expect(
        WUPTextRichControl.$sanitize(
          '<span>a</span><span class="hl">b</span><span class="red">c</span><span class="x">d</span>'
        )
      ).toBe('a<span class="hl">b</span><span class="red">c</span>d');
    } finally {
      ["hl", "color", "chip", "marker"].forEach((k) => delete $tools[k]);
    }
  });

  test("toolbar shows formats of the next line if selection starts at the end of line element", async () => {
    el.$options.toolbar = [["header", "bold"]];
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    const header = el.querySelector("[tool=header]");
    /** Sets html & selects from the end of the 1st line element to char of the last text */
    const formatsAt = (html) => {
      inp.innerHTML = html;
      const t = inp.lastChild.lastChild;
      window.getSelection().setBaseAndExtent(inp.firstChild, inp.firstChild.childNodes.length, t, 1);
      document.dispatchEvent(new Event("selectionchange"));
      return [header.textContent, el.querySelector("[tool=bold]").getAttribute("aria-pressed")];
    };

    // otherwise formats of the 1st line (its text is before selection): `Normal`
    expect(formatsAt("<div>a</div><h2>b</h2>")).toEqual(["Heading 2", "false"]);
    expect(formatsAt("<div><b>a</b></div><h2>b</h2>")).toEqual(["Heading 2", "false"]);
    expect(formatsAt('<div>a<img src="a.png"></div><h3><b>b</b></h3>')).toEqual(["Heading 3", "true"]);
  });

  test("toolbar", async () => {
    await h.wait(1);
    const inp = el.$refInput;
    inp.focus();
    // unknown tool & tools without members required by `kind` aren't rendered
    const spyErr = jest.spyOn(console, "error").mockImplementation(() => {});
    const { $tools } = WUPTextRichControl;
    const noop = () => {};
    $tools.hl = { kind: "inline", is: () => undefined, format: noop }; // format doesn't replace create of inline
    $tools.dir = { kind: "lineStyle", is: () => undefined };
    $tools.img = { kind: "embed" };
    $tools.action = { label: "Action" };
    $tools.note = { kind: "line", is: () => undefined, format: noop }; // format replaces create
    try {
      el.$options.toolbar = [["bold", "unknown", "hl", "dir", "img", "action"], ["note"]];
      await h.wait(1);
      expect(spyErr.mock.calls.map((c) => c[0])).toEqual([
        "WUP-TEXTRICH. Tool 'unknown' isn't defined in $tools",
        "WUP-TEXTRICH. Tool 'hl' misses create",
        "WUP-TEXTRICH. Tool 'dir' misses set",
        "WUP-TEXTRICH. Tool 'img' misses is & create",
        "WUP-TEXTRICH. Tool 'action' misses format",
      ]);
      expect(el.$refToolbar.innerHTML).toBe(
        '<div role="group"><button type="button" tabindex="-1" tool="bold" aria-label="Bold" aria-keyshortcuts="Control+B" w-tooltip="Bold (Ctrl+B)" aria-pressed="false"></button></div><div role="group"><button type="button" tabindex="-1" tool="note" aria-label="note" w-tooltip="" aria-pressed="false"></button></div>'
      );
      // $format: error instead of crash
      spyErr.mockClear();
      setHtml("<div>[a]</div>");
      el.$format("img");
      el.$format("unknown");
      expect(getHtml()).toBe("<div>[a]</div>");
      expect(spyErr.mock.calls.map((c) => c[0])).toEqual([
        "WUP-TEXTRICH. Tool 'img' misses is & create",
        "WUP-TEXTRICH. Tool 'unknown' isn't defined in $tools",
      ]);
    } finally {
      ["hl", "dir", "img", "action", "note"].forEach((k) => delete $tools[k]);
    }
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

    // null hides toolbar (not replaced with default one) & hint how to reach it
    const hint = document.getElementById(inp.getAttribute("aria-describedby"));
    expect(hint.textContent).toBe("press Alt + F10 to focus toolbar");
    el.$options.toolbar = null;
    await h.wait(1);
    expect(el.$options.toolbar).toBe(null);
    expect(el.$refToolbar.innerHTML).toBe("");
    expect(hint.textContent).toBe("");
    el.$options.toolbar = [];
    await h.wait(1);
    expect(el.$refToolbar.innerHTML).toBe("");
    window.testToolbar = null;
    el.setAttribute("w-toolbar", "window.testToolbar");
    await h.wait(1);
    expect(el.$options.toolbar).toBe(null);
    el.removeAttribute("w-toolbar"); // default toolbar
    await h.wait(1);
    expect(el.$refToolbar.childElementCount).toBe(WUPTextRichControl.$defaults.toolbar.length);
    expect(hint.textContent).toBe("press Alt + F10 to focus toolbar");
    delete window.testToolbar;

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
    WUPTextRichControl.$tools.bold.hotKey = ["Control", "Shift", "B"];
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
    WUPTextRichControl.$tools.btnClear.hotKey = ["Control", "Shift", "Delete"];
    try {
      el.$options.toolbar = [["btnClear"]];
      await h.wait(1);
      el.$value = "abc";
      await h.wait(1);
      expect(press("Delete", { shiftKey: true })).toBe(true);
      await h.wait(1);
      expect(el.$value).toBe(undefined);
    } finally {
      delete WUPTextRichControl.$tools.btnClear.hotKey;
    }

    // current value isn't in values: the 1st shortcut selects the last value
    const format = jest.fn();
    WUPTextRichControl.$tools.font = {
      hotKey: { prev: ["Control", "Alt", "Shift", "F"], next: ["Control", "Alt", "Shift", "G"] },
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
    el.$format("bold");
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
      require("web-ui-pack/controls/textRich/textRich");
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
    expect(c.setHotKeys(b, { prev: ["Control", "Alt", "Shift", "C"], next: ["Control", "Escape"] })).toBe(
      "⌥⇧⌘C / ⌘Esc"
    );
    expect(b.getAttribute("aria-keyshortcuts")).toBe("Meta+Alt+Shift+C Meta+Escape");
    expect(c.setHotKeys(b, ["Alt", "Shift", "5"])).toBe("⌥⇧5");
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
