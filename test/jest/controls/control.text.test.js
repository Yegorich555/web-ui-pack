import { WUPTextControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
import * as h from "../../testHelper";

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

  test("validation: _mask", async () => {
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

  test("validation: _parse", async () => {
    class TestTextElement extends WUPTextControl {
      canParseInput() {
        return true;
      }

      parseInput() {
        throw new Error();
      }
    }
    customElements.define("test-text-el", TestTextElement);
    el = document.body.appendChild(document.createElement("test-text-el"));
    // el.$value = "Im valid";
    await h.wait(1);
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    await h.wait();
    expect(el.$isValid).toBe(false);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Invalid value</span>"`
    );
    expect(el.$value).toBe(undefined);
    // when user lefts control need to show error anyway
    el.blur();
    await h.wait();
    expect(el.$refInput.value).toBe("2");
    expect(el.$isValid).toBe(false);
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Invalid value</span>"`
    );

    el.$value = "";
    await h.wait();
    expect(el.$refInput.value).toBe("");
    expect(el.$isValid).toBe(true);

    // when need to show mask-error once
    TestTextElement.prototype.canParseInput = () => false;
    el.$options.mask = "$ 000";
    el.focus();
    await h.wait();
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    expect(el.$value).toBe(""); // because canParse = false
    await h.wait();
    expect(el.$isValid).toBe(false);
    expect(el.$refError).toBeFalsy(); // because _wasValidNotEmpty = false + onChangeSmart

    el.$value = "$ 123";
    await h.wait();
    expect(el.$isValid).toBe(true);
    h.setInputCursor(el.$refInput, "$ 123|");
    await h.userRemove(el.$refInput);
    expect(el.$refInput.value).toBe("$ 12");
    await h.wait();
    expect(el.$refError?.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden"></span><span>Incomplete value</span>"`
    );
  });

  test("prefix", async () => {
    el.$options.prefix = "$ ";
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span prefix="">$ </span></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );
    el.$value = "abc";
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span prefix="">$ </span></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );
    await h.userTypeText(el.$refInput, "hello");
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span prefix="">$ </span></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );
  });

  test("postfix", async () => {
    el.$options.postfix = " USD";
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span postfix=""><i></i> USD</span></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );
    el.$value = "abc";
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span postfix=""><i>abc</i> USD</span></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );
    await h.userTypeText(el.$refInput, "hello");
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span postfix=""><i>hello</i> USD</span></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );

    // depends on prefix
    el.$options.prefix = "$ ";
    await h.wait(1);
    expect(el.$refPostfix.innerHTML).toMatchInlineSnapshot(`"<i>$ hello</i> USD"`);

    // depends on maskholder
    el.$value = "";
    el.$options.mask = "000-000";
    el.$options.maskholder = "xxx-xxx";
    await h.wait(1);
    expect(el.$refPostfix.innerHTML).toMatchInlineSnapshot(`"<i>$ </i> USD"`);

    await h.userTypeText(el.$refInput, "12", { clearPrevious: false });
    expect(el.$refPostfix.innerHTML).toMatchInlineSnapshot(`"<i>$ 12x-xxx</i> USD"`);
    el.blur();
    await h.wait(1);
    expect(el.$refPostfix.innerHTML).toMatchInlineSnapshot(`"<i>$ 12</i> USD"`);

    el.$value = "1";
    await h.wait(1);
    expect(el.$refPostfix.innerHTML).toMatchInlineSnapshot(`"<i>$ 1</i> USD"`);
  });

  test("user can remove all", async () => {
    el.$value = "he";
    await h.wait(1);
    // removing all
    while (el.$refInput.value) {
      await h.userRemove(el.$refInput);
    }
    expect(el.$refError).toBe(undefined);
    expect(el.$value).toBe(undefined);

    // just for coverage
    expect(el.parse("")).toBe(undefined);
  });
});
