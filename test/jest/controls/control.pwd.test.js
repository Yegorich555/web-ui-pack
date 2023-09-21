import { WUPPasswordControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
import * as h from "../../testHelper";

/** @type WUPPasswordControl */
let testEl;
initTestBaseControl({ type: WUPPasswordControl, htmlTag: "wup-pwd", onInit: (e) => (testEl = e) });

describe("control.pwd", () => {
  testTextControl(() => testEl, {
    autoCompleteOff: "new-password",
    validations: {
      minNumber: { set: 2, failValue: "relax", trueValue: "relax123" },
      minUpper: { set: 2, failValue: "relax", trueValue: "RelaX" },
      minLower: { set: 1, failValue: "RELAX", trueValue: "RELAx" },
      special: { set: { min: 1, chars: "#!-_?,.@:;'" }, failValue: "relax", trueValue: "re-l-ax" },
    },
    validationsSkip: ["confirm"],
    attrs: {
      "w-storagekey": null, //
      "w-storage": null,
      "w-mask": null,
      "w-maskholder": null,
      "w-reverse": { value: true, equalValue: "" },
    },
  });

  test("validation confirm", async () => {
    const main = document.body.appendChild(document.createElement("wup-pwd"));
    main.$value = "Ab1";
    const second = document.body.appendChild(document.createElement("wup-pwd"));
    second.$options.validations = { confirm: true };

    await h.wait();
    second.$value = "A";
    expect(second.$isValid).toBe(false);
    expect(second.$validate()).toMatchInlineSnapshot(`"Passwords must be equal"`);

    second.$value = "Ab1";
    expect(second.$isValid).toBe(true);

    second.$options.validations = { confirm: false };
    await h.wait();
    second.$value = "A";
    expect(second.$validate()).toMatchInlineSnapshot(`false`);
    expect(second.$isValid).toBe(true);

    document.body.innerHTML = "";
    const secondWithout = document.body.appendChild(document.createElement("wup-pwd"));
    secondWithout.$options.validations = { confirm: true };
    secondWithout.$value = "B2";
    document.body.appendChild(document.createElement("wup-pwd")); // append after confirmPassword
    await h.wait();
    expect(secondWithout.$isValid).toBe(false);
    expect(secondWithout.$validate()).toMatchInlineSnapshot(`"Previous "wup-pwd" not found"`);
  });

  test("validation messages ends with -s", () => {
    // other tests in testTextControl
    testEl.$value = "A";
    testEl.$options.validations = { minNumber: 1 };
    expect(testEl.$validate()).toMatchInlineSnapshot(`"Must contain at least 1 number"`);

    testEl.$options.validations = { special: { min: 2, chars: "#!-_?,.@:;'" } };
    expect(testEl.$validate()).toMatchInlineSnapshot(`"Must contain at least 2 special characters: #!-_?,.@:;'"`);
  });

  test("btn eye", async () => {
    const anim = h.useFakeAnimation();
    const getSelection = () => ({ start: testEl.$refInput.selectionStart, end: testEl.$refInput.selectionEnd });
    const defValue = "Ab1234567!";
    testEl.$value = defValue;
    expect(testEl.$refInput.type).toBe("password");
    expect(testEl.outerHTML).toMatchInlineSnapshot(
      `"<wup-pwd><label for="txt1"><span><input placeholder=" " type="password" id="txt1" autocomplete="new-password"><strong></strong><span class="wup-hidden">press Alt + V to show/hide password</span></span><button clear="" tabindex="-1" aria-hidden="true" type="button" style=""></button><button eye="" aria-hidden="true" type="button" tabindex="-1"></button></label></wup-pwd>"`
    );

    testEl.$refBtnEye.click();
    await h.wait();
    expect(testEl.$refInput.type).toBe("text");
    expect(testEl.outerHTML).toMatchInlineSnapshot(
      `"<wup-pwd><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="new-password"><strong></strong><span class="wup-hidden">press Alt + V to show/hide password</span></span><button clear="" tabindex="-1" aria-hidden="true" type="button" style=""></button><button eye="off" aria-hidden="true" type="button" tabindex="-1"></button></label></wup-pwd>"`
    );
    let was = getSelection();
    await anim.nextFrame();
    expect(getSelection()).toEqual(was);

    was = getSelection();
    testEl.$refBtnEye.click();
    expect(testEl.$refInput.type).toBe("password");
    expect(testEl.outerHTML).toMatchInlineSnapshot(
      `"<wup-pwd><label for="txt1"><span><input placeholder=" " type="password" id="txt1" autocomplete="new-password"><strong></strong><span class="wup-hidden">press Alt + V to show/hide password</span></span><button clear="" tabindex="-1" aria-hidden="true" type="button" style=""></button><button eye="" aria-hidden="true" type="button" tabindex="-1"></button></label></wup-pwd>"`
    );
    await anim.nextFrame();
    expect(getSelection()).toEqual(was);

    // test when all selected
    testEl.$refInput.select();
    was = getSelection();
    testEl.$refBtnEye.click();
    await anim.nextFrame();
    expect(getSelection()).toEqual({ start: 0, end: defValue.length });
    // again
    testEl.$refBtnEye.click();
    await anim.nextFrame();
    expect(getSelection()).toEqual({ start: 0, end: defValue.length });

    // test toggleVisibility by keydown
    testEl.focus(); // keydown works only on focus event
    await anim.nextFrame();
    expect(testEl.$refInput.type).toBe("password");
    testEl.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, altKey: true, key: "v" }));
    expect(testEl.$refInput.type).toBe("text");
    testEl.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, altKey: true, key: "v" }));
    expect(testEl.$refInput.type).toBe("password");
    testEl.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "v" }));

    // test reverse
    expect(testEl.$refInput.type).toBe("password");
    testEl.$options.reverse = true;
    jest.advanceTimersByTime(1);
    expect(testEl.outerHTML).toMatchInlineSnapshot(
      `"<wup-pwd w-reverse=""><label for="txt1"><span><input placeholder=" " type="password" id="txt1" autocomplete="new-password"><strong></strong><span class="wup-hidden">press Alt + V to show/hide password</span></span><button clear="" tabindex="-1" aria-hidden="true" type="button" style=""></button><button eye="" aria-hidden="true" type="button" tabindex="-1"></button></label></wup-pwd>"`
    );

    testEl.$options.reverse = false;
    jest.advanceTimersByTime(1);
    expect(testEl.outerHTML).toMatchInlineSnapshot(
      `"<wup-pwd><label for="txt1"><span><input placeholder=" " type="password" id="txt1" autocomplete="new-password"><strong></strong><span class="wup-hidden">press Alt + V to show/hide password</span></span><button clear="" tabindex="-1" aria-hidden="true" type="button" style=""></button><button eye="" aria-hidden="true" type="button" tabindex="-1"></button></label></wup-pwd>"`
    );
  });

  test("storage not allowed", async () => {
    const onErr = h.mockConsoleError();
    const onSet = jest.spyOn(WUPPasswordControl.prototype, "storageSet");
    testEl.$options.storageKey = "pw";
    await h.wait(1);
    testEl.$value = "abcd";
    await h.wait(1);
    expect(onSet).toBeCalledTimes(1);
    expect(window.localStorage.getItem("pw")).toBeFalsy();
    expect(onErr).toBeCalledTimes(1);
  });
});
