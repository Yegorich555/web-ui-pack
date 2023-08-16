import TextHistory from "web-ui-pack/controls/text.history";
import * as h from "../../testHelper";

/** @type HTMLInputElement */
let el;
/** @type TextHistory */
let hist;
beforeEach(() => {
  jest.useFakeTimers();
  el = document.body.appendChild(document.createElement("input"));
  el.type = "text";
  hist = new TextHistory(el);
  el.addEventListener("keydown", (e) => {
    hist.handleKeyDown(e);
  });
  el.addEventListener("beforeinput", (e) => {
    hist.handleBeforeInput(e);
  });
  el.addEventListener("input", (e) => {
    hist.handleInput(e);
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

describe("control.text.hist", () => {
  test("type text", async () => {
    // at the end
    expect(await h.userTypeText(el, "a")).toBe("a|");
    expect(await h.userUndo(el)).toBe("|");
    expect(await h.userRedo(el)).toBe("a|");

    expect(await h.userRedo(el)).toBe("a|");
    expect(await h.userRedo(el)).toBe("a|");
    expect(await h.userUndo(el)).toBe("|");
    expect(await h.userUndo(el)).toBe("|");
    expect(await h.userRedo(el)).toBe("a|");
    expect(await h.userRedo(el)).toBe("a|");

    expect(await h.userTypeText(el, "abc")).toBe("abc|");
    expect(await h.userUndo(el)).toBe("ab|");
    expect(await h.userUndo(el)).toBe("a|");
    expect(await h.userUndo(el)).toBe("|");
    expect(await h.userRedo(el)).toBe("a|");
    expect(await h.userRedo(el)).toBe("ab|");
    expect(await h.userRedo(el)).toBe("abc|");
    expect(await h.userUndo(el)).toBe("ab|");
    // middle
    h.setInputCursor(el, "a|b");
    expect(await h.userTypeText(el, "1", { clearPrevious: false })).toBe("a1|b");
    expect(await h.userUndo(el)).toBe("a|b");
    expect(await h.userRedo(el)).toBe("a1|b");
    expect(await h.userUndo(el)).toBe("a|b");
    // at start
    h.setInputCursor(el, "|ab");
    expect(await h.userTypeText(el, "2", { clearPrevious: false })).toBe("2|ab");
    expect(await h.userUndo(el)).toBe("|ab");
    expect(await h.userRedo(el)).toBe("2|ab");
    expect(await h.userRedo(el)).toBe("2|ab");
    // when text selected
    h.setInputCursor(el, "a|bc|d");
    expect(await h.userTypeText(el, "2", { clearPrevious: false })).toBe("a2|d");
    expect(await h.userUndo(el)).toBe("a|bc|d");
    expect(await h.userRedo(el)).toBe("a2|d");
  });

  test("delete text with Backspace", async () => {
    // at the end
    expect(await h.userTypeText(el, "abc")).toBe("abc|");
    expect(await h.userRemove(el, { key: "Backspace" })).toBe("ab|");
    expect(await h.userUndo(el)).toBe("abc|");
    expect(await h.userRedo(el)).toBe("ab|");
    // middle
    h.setInputCursor(el, "ab|c");
    expect(await h.userRemove(el, { key: "Backspace" })).toBe("a|c");
    expect(await h.userUndo(el)).toBe("ab|c");
    expect(await h.userRedo(el)).toBe("a|c");
    // when text selected
    h.setInputCursor(el, "a|bc|d");
    expect(await h.userRemove(el, { key: "Backspace" })).toBe("a|d");
    expect(await h.userUndo(el)).toBe("a|bc|d");
    expect(await h.userRedo(el)).toBe("a|d");
  });

  test("delete text with Delete", async () => {
    // at first
    expect(await h.userTypeText(el, "abc")).toBe("abc|");
    h.setInputCursor(el, "|abc");
    expect(await h.userRemove(el, { key: "Delete" })).toBe("|bc");
    expect(await h.userUndo(el)).toBe("|abc");
    expect(await h.userRedo(el)).toBe("|bc");
    // middle
    h.setInputCursor(el, "a|bc");
    expect(await h.userRemove(el, { key: "Delete" })).toBe("a|c");
    expect(await h.userUndo(el)).toBe("a|bc");
    expect(await h.userRedo(el)).toBe("a|c");
    // when text selected
    h.setInputCursor(el, "a|bc|d");
    expect(await h.userRemove(el, { key: "Delete" })).toBe("a|d");
    expect(await h.userUndo(el)).toBe("a|bc|d");
    expect(await h.userRedo(el)).toBe("a|d");
  });

  test("cases with input modifiers (mask etc.)", async () => {
    // removing last history: possible when need to declineInput changes
    expect(() => hist.removeLast()).not.toThrow();
    expect(await h.userInsertText(el, "ab")).toBe("ab|");
    expect(await h.userInsertText(el, "123")).toBe("ab123|");
    expect(await h.userInsertText(el, "f")).toBe("ab123f|");
    expect(await h.userInsertText(el, "04")).toBe("ab123f04|");
    expect(hist._hist.length).toBe(4);
    expect(await h.userUndo(el)).toBe("ab123f|");
    hist.removeLast();
    expect(hist._hist.length).toBe(2);
    expect(hist._histPos).toBe(1);
    h.setInputCursor(el, "ab123|", { skipEvent: true });
    expect(await h.userUndo(el)).toBe("ab|");
    expect(await h.userUndo(el)).toBe("|");

    // manual clearing
    expect(await h.userTypeText(el, "123")).toBe("123|");
    hist.append("");
    el.value = "";
    expect(await h.userUndo(el)).toBe("123|");
    expect(await h.userRedo(el)).toBe("|");
    expect(await h.userUndo(el)).toBe("123|");
    expect(await h.userUndo(el)).toBe("12|");
  });

  test("findDifference & updateLast", async () => {
    // appended
    expect(TextHistory.findDiff("ab", "ab.")).toStrictEqual({ inserted: { v: ".", pos: 2 }, removed: null });
    expect(TextHistory.findDiff("ab", ".ab")).toStrictEqual({ inserted: { v: ".", pos: 0 }, removed: null });
    expect(TextHistory.findDiff("ab", "a.b")).toStrictEqual({ inserted: { v: ".", pos: 1 }, removed: null });

    expect(TextHistory.findDiff("ab", "ab12")).toStrictEqual({ inserted: { v: "12", pos: 2 }, removed: null });
    expect(TextHistory.findDiff("ab", "34ab")).toStrictEqual({ inserted: { v: "34", pos: 0 }, removed: null });
    expect(TextHistory.findDiff("ab", "a56b")).toStrictEqual({ inserted: { v: "56", pos: 1 }, removed: null });

    // removed
    expect(TextHistory.findDiff("ab.", "ab")).toStrictEqual({ removed: { v: ".", pos: 2 }, inserted: null });
    expect(TextHistory.findDiff(".ab", "ab")).toStrictEqual({ removed: { v: ".", pos: 0 }, inserted: null });
    expect(TextHistory.findDiff("a.b", "ab")).toStrictEqual({ removed: { v: ".", pos: 1 }, inserted: null });

    expect(TextHistory.findDiff("ab12", "ab")).toStrictEqual({ removed: { v: "12", pos: 2 }, inserted: null });
    expect(TextHistory.findDiff("34ab", "ab")).toStrictEqual({ removed: { v: "34", pos: 0 }, inserted: null });
    expect(TextHistory.findDiff("a56b", "ab")).toStrictEqual({ removed: { v: "56", pos: 1 }, inserted: null });

    // replaced
    expect(TextHistory.findDiff("ab.", "ab1")).toStrictEqual({
      removed: { v: ".", pos: 2 },
      inserted: { v: "1", pos: 2 },
    });
    expect(TextHistory.findDiff("ab.", "ab12")).toStrictEqual({
      removed: { v: ".", pos: 2 },
      inserted: { v: "12", pos: 2 },
    });
    expect(TextHistory.findDiff("ab12", "ab.")).toStrictEqual({
      removed: { v: "12", pos: 2 },
      inserted: { v: ".", pos: 2 },
    });

    expect(TextHistory.findDiff(".ab", "12ab")).toStrictEqual({
      removed: { v: ".", pos: 0 },
      inserted: { v: "12", pos: 0 },
    });
    expect(TextHistory.findDiff("12ab", ".ab")).toStrictEqual({
      removed: { v: "12", pos: 0 },
      inserted: { v: ".", pos: 0 },
    });

    // changed if different places
    // todo cover tests here: changed if different places

    // simulate mask changes
    expect(await h.userTypeText(el, "12")).toBe("12|");
    const onInput = jest.fn();
    onInput.mockImplementationOnce(() => {
      el.value += ".";
    });
    el.addEventListener("input", onInput);
    expect(await h.userTypeText(el, "3", { clearPrevious: false })).toBe("123.|");
    expect(await h.userUndo(el)).toBe("12|");
    expect(await h.userRedo(el)).toBe("123.|");

    // simulate number format
    expect(await h.userTypeText(el, "123")).toBe("123|");
    onInput.mockImplementationOnce(() => {
      el.value = "1,234";
      el.setSelectionRange(el.value.length, el.value.length);
    });
    expect(await h.userTypeText(el, "4", { clearPrevious: false })).toBe("1,234|");
    expect(await h.userUndo(el)).toBe("123|");
    expect(await h.userRedo(el)).toBe("1,234|");
  });
});
