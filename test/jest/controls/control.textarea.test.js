import { WUPTextareaControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
import * as h from "../../testHelper";

/** @type WUPTextareaControl */
let el;
initTestBaseControl({ type: WUPTextareaControl, htmlTag: "wup-textarea", onInit: (e) => (el = e) });

describe("control.textarea", () => {
  testTextControl(() => el, {
    validations: {},
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
});
