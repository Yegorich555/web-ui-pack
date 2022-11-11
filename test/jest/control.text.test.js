import { WUPTextControl } from "web-ui-pack";
import { initTestBaseControl } from "./baseControlTest";
import testTextControl from "./control.textTest";
import * as h from "../testHelper";

/** @type WUPTextControl */
let el;
initTestBaseControl({ type: WUPTextControl, htmlTag: "wup-text", onInit: (e) => (el = e) });

describe("control.text", () => {
  testTextControl(() => el);

  test("validation: mask", async () => {
    // todo test it
    el.$options.mask = "$ 000";
    el.$value = "";
    el.focus();
    expect(el.$refInput.value).toBe("$ ");
    expect(el.$value).toBe("$ ");
    await h.wait();
    expect(el.$refError).not.toBeDefined(); // todo issue here because it sees that value not empty but it's not correct

    el.blur();
    await h.wait(1);
    expect(el.$refInput.value).toBe("");
    expect(el.$value).toBe(undefined); // because only prefix user left and it means nothing

    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    expect(el.$value).toBe("$ 2");
    el.blur();
    await h.wait();
    expect(el.$value).toBe("$ 2");
    expect(el.$isValid).toBe(false);
    expect(el.$refError).toBeDefined();
    expect(el.$refError).toMatchInlineSnapshot();

    await h.userTypeText(el.$refInput, "34", { clearPrevious: false });
    expect(el.$value).toBe("$ 234");
    el.blur();
    await h.wait();
    expect(el.$isValid).toBe(true);

    el.$options.validations = { mask: false }; // user can disable defaults
    el.$value = "";
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    el.blur();
    await h.wait();
    expect(el.$value).toBe("$ 2");
    expect(el.$isValid).toBe(false); // because mask-validation is disabled via options

    // cover case when validation mask is enabled but mask is missed
    el.$value = "$ 2";
    el.$options.mask = undefined;
    el.$options.validations = { mask: true };
    await h.wait();
    expect(el.$isValid).toBe(true);
  });
});
