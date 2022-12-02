import { WUPTextControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
import * as h from "../testHelper";

/** @type WUPTextControl */
let el;
initTestBaseControl({ type: WUPTextControl, htmlTag: "wup-text", onInit: (e) => (el = e) });

describe("control.text", () => {
  testTextControl(() => el);

  test("onFocusGot with autofocus", async () => {
    el = document.body.appendChild(document.createElement("wup-text"));
    const spy = jest.spyOn(el, "gotFocus");
    el.focus();
    await h.wait(1);
    expect(spy).toBeCalledTimes(1);
  });

  test("validation: mask", async () => {
    el.$options.mask = "$ 000";
    el.focus();
    await h.wait(1);
    expect(el.$refInput.value).toBe("$ ");
    expect(el.$value).toBe(undefined); // mask prefix is applied but value not
    await h.wait();
    expect(el.$refError).not.toBeDefined();

    el.blur();
    await h.wait(1);
    expect(el.$refInput.value).toBe("");
    expect(el.$value).toBe(undefined); // because only prefix user left and it means nothing

    el.testMe = true;
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    expect(el.$value).toBe("$ 2");
    await h.wait();
    expect(el.$refError).toBeUndefined(); // despite on control is invalid ValidationCases.onChangeSmart is applied
    el.blur();
    await h.wait();
    expect(el.$value).toBe("$ 2");
    expect(el.$isValid).toBe(false);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Incomplete value</span>"`
    );

    el.focus();
    h.setInputCursor(el.$refInput, "$ 2|");
    await h.userTypeText(el.$refInput, "34", { clearPrevious: false });
    expect(el.$value).toBe("$ 234");
    el.blur();
    await h.wait();
    expect(el.$isValid).toBe(true);

    el.$options.validations = { _mask: "Hello" }; // user can change defaults
    el.$value = "";
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    el.blur();
    await h.wait();
    expect(el.$value).toBe("$ 2");
    expect(el.$isValid).toBe(false);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(`"<span class="wup-hidden"></span><span>Hello</span>"`);
  });
});
