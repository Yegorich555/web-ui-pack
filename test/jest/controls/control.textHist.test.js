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
});
