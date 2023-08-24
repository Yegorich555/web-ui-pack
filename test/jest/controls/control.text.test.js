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

  test("$defaults.validations", async () => {
    // cover exception in showError
    await expect(async () => {
      el.$showError(null);
      await h.wait(1);
    }).rejects.toThrow();
    class TestVldElement extends WUPTextControl {
      $defaults = { ...WUPTextControl.$defaults };
      $options = { ...TestVldElement.$defaults };
      _opts = this.$options;
    }

    customElements.define("test-vld", TestVldElement);
    el = document.body.appendChild(document.createElement("test-vld"));

    TestVldElement.$defaults.validations = { required: true };
    expect(el.validations).toStrictEqual({ required: true });

    el.$options.validations = { min: 2 };
    expect(el.validations).toStrictEqual({ required: true, min: 2 });

    el.$options.validations = { required: false };
    expect(el.validations).toStrictEqual({ required: false });
    delete TestVldElement.$defaults.validations;
  });

  test("prefix", async () => {
    el.$options.prefix = "$ ";
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span prefix="">$ </span></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
    );
    el.$value = "abc";
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span prefix="">$ </span></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
    );
    await h.userTypeText(el.$refInput, "hello");
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span prefix="">$ </span></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
    );
  });

  test("postfix", async () => {
    el.$options.postfix = " USD";
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span postfix=""><i></i> USD</span></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
    );
    el.$value = "abc";
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span postfix=""><i>abc</i> USD</span></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
    );
    await h.userTypeText(el.$refInput, "hello");
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong><span postfix=""><i>hello</i> USD</span></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
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

  test("options.clearButton is changed", async () => {
    el.$options.clearButton = true;
    await h.wait(1);
    expect(el.$refBtnClear).toBeDefined();

    el.$options.clearButton = false;
    await h.wait(1);
    expect(el.$refBtnClear).toBeUndefined();

    el.$options.label = "sdas"; // trigger gotChanges
    await h.wait(1);
    expect(el.$refBtnClear).toBeUndefined();
  });

  test("options.clearActions", async () => {
    el.$options.clearActions = WUPTextControl.$defaults.clearActions;
    await h.wait(1);
    expect(el.$refBtnClear.outerHTML).toMatchInlineSnapshot(
      `"<button clear="" tabindex="-1" aria-hidden="true" type="button"></button>"`
    );
    el.$value = "hello";
    expect(el.$refBtnClear.outerHTML).toMatchInlineSnapshot(
      `"<button clear="" tabindex="-1" aria-hidden="true" type="button"></button>"`
    );
    el.$initValue = "hello";
    expect(el.$refBtnClear.outerHTML).toMatchInlineSnapshot(
      `"<button clear="" tabindex="-1" aria-hidden="true" type="button"></button>"`
    );
    el.$value = "123";
    expect(el.$refBtnClear.outerHTML).toMatchInlineSnapshot(
      `"<button clear="back" tabindex="-1" aria-hidden="true" type="button"></button>"`
    );
    el.$initValue = "123";
    expect(el.$refBtnClear.outerHTML).toMatchInlineSnapshot(
      `"<button clear="" tabindex="-1" aria-hidden="true" type="button"></button>"`
    );
  });

  test("common method $ariaSpeak()", async () => {
    const prev = el.outerHTML;
    el.$ariaSpeak("Hello");
    await h.wait(200);
    expect(el.querySelectorAll("section")).toMatchInlineSnapshot(`
      NodeList [
        <section
          aria-atomic="true"
          aria-live="off"
          class="wup-hidden"
          id="txt2"
        >
          Hello
        </section>,
      ]
    `);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-text><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off" aria-describedby="txt2"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><section aria-live="off" aria-atomic="true" class="wup-hidden" id="txt2">Hello</section></wup-text>"`
    );
    await h.wait(10000);
    expect(el.querySelector("section")).toMatchInlineSnapshot(`null`);
    expect(el.outerHTML).toBe(prev); // input state must be returned to prev

    // speak several times at once
    el.$ariaSpeak("Hello");
    el.$ariaSpeak("Anna");
    await h.wait(200);
    expect(el.querySelectorAll("section")).toMatchInlineSnapshot(`
      NodeList [
        <section
          aria-atomic="true"
          aria-live="off"
          class="wup-hidden"
          id="txt3"
        >
          Hello
        </section>,
        <section
          aria-atomic="true"
          aria-live="off"
          class="wup-hidden"
          id="txt4"
        >
          Anna
        </section>,
      ]
    `);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-text><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off" aria-describedby="txt3 txt4"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><section aria-live="off" aria-atomic="true" class="wup-hidden" id="txt3">Hello</section><section aria-live="off" aria-atomic="true" class="wup-hidden" id="txt4">Anna</section></wup-text>"`
    );
    await h.wait(10000);
    expect(el.querySelector("section")).toMatchInlineSnapshot(`null`);
    expect(el.outerHTML).toBe(prev); // input state must be returned to prev

    // aria-speak shouldn't destroy the "aria-describedby" attribute
    el.$refInput.setAttribute("aria-describedby", "someId");
    el.$ariaSpeak("abc");
    await h.wait(200);
    expect(el.$refInput.outerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" autocomplete="off" aria-describedby="someId txt5">"`
    );
    await h.wait(10000);
    expect(el.querySelector("section")).toMatchInlineSnapshot(`null`);
    expect(el.$refInput.outerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" autocomplete="off" aria-describedby="someId">"`
    );

    // extra case when attr removed outside during the speaking
    el.$ariaSpeak("abc");
    await h.wait(200);
    expect(el.$refInput.outerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" autocomplete="off" aria-describedby="someId txt6">"`
    );
    el.$refInput.removeAttribute("aria-describedby");
    expect(() => jest.advanceTimersByTime(10000)).not.toThrow();
    expect(el.outerHTML).toBe(prev); // input state must be returned to prev
  });
});
