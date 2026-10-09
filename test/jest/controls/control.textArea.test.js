import { WUPTextAreaControl } from "web-ui-pack";
import { charsBefore, pointAt } from "web-ui-pack/controls/textArea.input";
import { initTestBaseControl } from "./baseControlTest";
import testTextAreaControl, { mockAreaInput } from "./control.textAreaTest";
import * as h from "../../testHelper";

/** @type WUPTextAreaControl */
let el;
initTestBaseControl({
  type: WUPTextAreaControl,
  htmlTag: "wup-textarea",
  onInit: (e) => {
    el = e;
    mockAreaInput(el);
  },
});

describe("control.textArea", () => {
  testTextAreaControl(() => el);

  test("custom input props", async () => {
    const area = document.body.appendChild(document.createElement("wup-textarea"));
    el = area.$refInput;
    el.setAttribute("tabindex", "0");
    expect(() => (el.selectionStart = 0)).not.toThrow();
    await h.wait(1);
    el.focus();
    expect(document.activeElement).toBe(el);

    expect(el.selectionStart).not.toBe(undefined);
    expect(el.selectionEnd).not.toBe(undefined);
    expect(el.setSelectionRange).not.toBe(undefined);
    expect(() => (el.selectionStart = 0)).not.toThrow();
    expect(() => (el.selectionEnd = 0)).not.toThrow();
    expect(() => el.setSelectionRange(0, 0)).not.toThrow();
    jest.spyOn(window, "getSelection").mockImplementationOnce(() => null);
    expect(el.selectionStart).toBe(null);
    jest.spyOn(window, "getSelection").mockImplementationOnce(() => null);
    expect(el.selectionEnd).toBe(null);

    await h.userTypeText(el, "abc", { clearPrevious: false });
    expect(area.$value?.length).toBe(3); // order is wrong because jsdom doesn't support window.getSelection properly
    el.selection = null;
    expect(el.selection).toStrictEqual({ start: 0, end: 0 });
  });

  test("value of input is plain text", () => {
    const inp = document.createElement("wup-areainput"); // value of control's input is mocked by mockAreaInput
    const toValue = (html) => {
      inp.innerHTML = html;
      inp._cached = undefined; // it's reset on input
      return inp.value;
    };
    // Chrome adds <div> on Enter & <br> to show empty line
    expect(toValue("a &lt; b &amp; c<div>j</div><div><br></div><div><b>h</b><br>i</div>")).toBe("a < b & c\nj\n\nh\ni");
    expect(toValue("<div>a</div><p>b<br></p><ul><li>c</li></ul>")).toBe("a\nb\nc"); // without line break before the 1st line

    inp.value = "x <b>y</b> &amp; z\nnext";
    expect(inp.innerHTML).toBe("x &lt;b&gt;y&lt;/b&gt; &amp;amp; z\nnext"); // html isn't parsed
    expect(inp.value).toBe("x <b>y</b> &amp; z\nnext");
    inp.value = "a\n";
    expect(inp.innerHTML).toBe("a\n<br>"); // otherwise browser doesn't show the last empty line
    expect(inp.value).toBe("a\n");
  });

  test("positions of selection: line break & embed are counted as 1 char", () => {
    const inp = document.createElement("wup-areainput");
    inp.innerHTML = "<span embed=''><b>xx</b></span>a<div><br></div><div>b<br>c</div>";
    const isEmbed = (e) => e.hasAttribute("embed"); // content of embed is skipped
    const [, line1, line2] = inp.children;
    const points = [...Array(9).keys()].map((pos) => pointAt(inp, pos, isEmbed));
    expect(points).toStrictEqual([
      [inp, 0], // before embed
      [inp, 1], // after embed
      [inp.childNodes[1], 1],
      [line1, 0], // empty line
      [line2.firstChild, 0], // start of line: into its text
      [line2.firstChild, 1],
      [line2, 2], // after <br>
      [line2.lastChild, 1],
      [line2.lastChild, 1], // out of range: at the end
    ]);
    const positions = points.map(([n, offset]) => charsBefore(inp, n, offset, isEmbed));
    expect(positions).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 7]);
  });

  test("key modifiers disabled", async () => {
    el.focus();
    await h.wait(1);
    const isPrevented = !el.$refInput.dispatchEvent(
      new InputEvent("beforeinput", { inputType: "formatBold", bubbles: true, cancelable: true })
    );
    expect(isPrevented).toBe(true);
  });
});

// WARN: these tests are simulation only for coverage; see real e2e test
