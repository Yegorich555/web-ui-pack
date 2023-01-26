import { WUPTextareaControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
import * as h from "../../testHelper";

/** @type WUPTextareaControl */
let el;
initTestBaseControl({
  type: WUPTextareaControl,
  htmlTag: "wup-textarea",
  onInit: (e) => {
    el = e;
    // WARN: it doesn't work in jsdom
    Object.defineProperty(el.$refInput, "value", {
      get: () => el.$refInput.innerHTML,
      set: (v) => {
        el.$refInput.innerHTML = v;
        el.$refInput.selectionStart = v.length;
        el.$refInput.selectionEnd = v.length;
      },
    });
    Object.defineProperty(el.$refInput, "selectionStart", { value: 0, writable: true });
    Object.defineProperty(el.$refInput, "selectionEnd", { value: 0, writable: true });
    Object.defineProperty(el.$refInput, "select", {
      value: () => {
        el.$refInput.selectionStart = 0;
        el.$refInput.selectionEnd = el.$refInput.value.length;
      },
      writable: true,
    });
    Object.defineProperty(el.$refInput, "setSelectionRange", {
      value: (start, end) => {
        el.$refInput.selectionStart = start;
        el.$refInput.selectionEnd = end;
      },
      writable: true,
    });
  },
});

describe("control.textarea", () => {
  testTextControl(() => el, {
    validations: {},
    noInputSelection: true,
    attrs: { mask: { skip: true }, maskholder: { skip: true }, prefix: { skip: true }, postfix: { skip: true } },
    $options: { mask: { skip: true }, maskholder: { skip: true }, prefix: { skip: true }, postfix: { skip: true } },
    // validationsSkip: [],
  });

  test("Enter key works properly", async () => {
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
  });
});

// WARN: these tests are simulation only for coverage; see real e2e test
