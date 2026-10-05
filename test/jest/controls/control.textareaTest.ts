import { WUPTextareaControl } from "web-ui-pack";
import { testBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
import * as h from "../../testHelper";

/** Mocks input props of contenteditable since they don't work in jsdom */
// eslint-disable-next-line jest/no-export
export function mockAreaInput(el: WUPTextareaControl): void {
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
export default function testTextareaControl(
  getEl: () => WUPTextareaControl,
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
}
