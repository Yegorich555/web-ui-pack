import { WUPTextAreaControl } from "web-ui-pack";
import { testBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
import * as h from "../../testHelper";

/** Mocks input props of contenteditable since they don't work in jsdom */
// eslint-disable-next-line jest/no-export
export function mockAreaInput(el: WUPTextAreaControl): void {
  const inp = el.$refInput;
  Object.defineProperty(inp, "value", {
    get: () => inp.innerHTML,
    set: (v) => {
      inp.innerHTML = v;
      inp.selectionStart = v.length;
      inp.selectionEnd = v.length;
    },
  });
  Object.defineProperty(inp, "selectionStart", { value: 0, writable: true });
  Object.defineProperty(inp, "selectionEnd", { value: 0, writable: true });
  Object.defineProperty(inp, "select", {
    value: () => {
      inp.selectionStart = 0;
      inp.selectionEnd = inp.value.length;
    },
    writable: true,
  });
  Object.defineProperty(inp, "setSelectionRange", {
    value: (start: number, end: number) => {
      inp.selectionStart = start;
      inp.selectionEnd = end;
    },
    writable: true,
  });
}

// eslint-disable-next-line jest/no-export
export default function testTextAreaControl(
  getEl: () => WUPTextAreaControl,
  opts: Parameters<typeof testBaseControl>[0]
) {
  testTextControl(getEl, {
    ...opts,
    noInputSelection: true,
    attrs: {
      "w-mask": null,
      "w-maskholder": null,
      "w-prefix": null,
      "w-postfix": null,
      "w-hidefooter": { value: true },
      "w-allowresizeh": { value: true, equalValue: "" },
      "w-allowresizew": { value: true, equalValue: "" },
      ...opts?.attrs,
    },
  });

  test("Enter key works properly", async () => {
    const el = getEl();
    const form = document.body.appendChild(document.createElement("wup-form"));
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    form.appendChild(el);

    // Enter must add multiline instead of submit
    el.focus();
    await h.wait(1);
    const isPrevented = !el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
    await h.wait(1);
    expect(isPrevented).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);
  });

  test("option allowResizeH & allowResizeW", async () => {
    const el = getEl();
    const inp = el.$refInput;
    const attrs = () => ["w-allowresizeh", "w-allowresizew"].map((a) => el.getAttribute(a));
    expect(attrs()).toStrictEqual([null, null]);

    el.$options.allowResizeH = true;
    el.$options.allowResizeW = true;
    await h.wait(1);
    expect(attrs()).toStrictEqual(["", ""]); // for styling

    inp.style.height = "100px"; // set by browser on resizing by user
    inp.style.width = "200px";
    el.$options.allowResizeH = false;
    await h.wait(1);
    expect(attrs()).toStrictEqual([null, ""]);
    expect(inp.getAttribute("style")).toBe("width: 200px;"); // size set by user is reset

    el.$options.allowResizeW = false;
    await h.wait(1);
    expect(attrs()).toStrictEqual([null, null]);
    expect(inp.getAttribute("style")).toBe("");
  });

  test("readonly & disabled: input isn't editable", async () => {
    const el = getEl();
    const inp = el.$refInput;
    const attrs = () =>
      ["contenteditable", "tabindex", "aria-readonly", "aria-disabled"].map((a) => inp.getAttribute(a));
    // plain text: browser pastes & drops it without formats; rich text: formats of its tools
    const editable = inp.tagName === "WUP-RICHINPUT" ? "true" : "plaintext-only";
    expect(attrs()).toStrictEqual([editable, null, null, null]);

    el.$options.readOnly = true;
    await h.wait(1);
    expect(attrs()).toStrictEqual(["false", "0", "true", null]); // focusable to select & copy text

    el.$options.disabled = true;
    await h.wait(1);
    expect(attrs()).toStrictEqual(["false", null, "true", "true"]); // not focusable

    el.$options.readOnly = false;
    await h.wait(1);
    expect(attrs()).toStrictEqual(["false", null, null, "true"]);

    el.$options.disabled = false;
    await h.wait(1);
    expect(attrs()).toStrictEqual([editable, null, null, null]);

    // readonly before input is connected
    const inp2 = document.createElement("wup-areainput") as WUPTextAreaControl["$refInput"];
    inp2.readOnly = true;
    document.body.appendChild(inp2);
    expect(inp2.getAttribute("contenteditable")).toBe("false");
    inp2.remove();
  });
}
