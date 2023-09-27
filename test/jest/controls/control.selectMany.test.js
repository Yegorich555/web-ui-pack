/* eslint-disable prefer-destructuring */
import { WUPSelectManyControl } from "web-ui-pack";
import { ShowCases } from "web-ui-pack/controls/baseCombo";
import { isAnimEnabled } from "web-ui-pack/helpers/animate";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

const getItems = () => [
  { value: 10, text: "Donny" },
  { value: 20, text: "Mikky" },
  { value: 30, text: "Leo" },
  { value: 40, text: "Splinter" },
];

/** @type WUPSelectManyControl */
let el;
initTestBaseControl({
  type: WUPSelectManyControl,
  htmlTag: "wup-selectmany",
  onInit: (e) => {
    el = e;
    el.$options.items = getItems();
    el.$options.showCase |= ShowCases.onFocusAuto; // without this impossible to test with manual triggering focus()

    window.$1Value = [10];
    window.$2Value = [20, 40];
    window.$3Value = [30];

    const height = 50;
    const width = 100;
    const x = 140;
    const y = 100;
    jest.spyOn(el, "getBoundingClientRect").mockReturnValue({
      x,
      left: x,
      y,
      top: y,
      bottom: y + height,
      right: x + width,
      height,
      width,
      toJSON: () => "",
    });
  },
});

function handledKeydown(key = "", opts = undefined) {
  return !el.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...opts }));
}

describe("control.selectMany", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "window.$1Value", value: [10] },
      { attrValue: "window.$2Value", value: [20, 40], urlValue: "20_40" },
      { attrValue: "window.$3Value", value: [30] },
    ],
    validations: {
      minCount: { set: 2, failValue: [10], trueValue: [10, 20] },
      maxCount: { set: 3, failValue: [10, 20, 30, 40], trueValue: [10] },
    },
    validationsSkip: ["_parse", "_mask"],
    attrs: {
      "w-mask": { value: "abc" },
      "w-maskholder": { value: "abc" },
      "w-prefix": { value: "$" },
      "w-postfix": { value: "USD" },
      "w-clearbutton": { value: true },
      "w-debouncems": { value: 5 },
      "w-selectonfocus": { value: true },
      "w-allownewvalue": { value: true },
      "w-showcase": { value: 1 },
      "w-readonlyinput": { value: true },
      "w-multiple": { skip: true },
      "w-items": { value: getItems() },
      "w-sortable": { value: true },
      "w-hideselected": { value: true },
    },
    onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("items rendering", async () => {
    el.$options.hideSelected = true;
    el.$initValue = [10, 30];
    await h.wait(10);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span item="" aria-hidden="true">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
    );

    HTMLInputElement.prototype.focus.call(el.$refInput); // opening menu by focus
    await h.wait(2);
    expect(el.$isShown).toBe(true);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span item="" aria-hidden="true">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" aria-describedby="txt2" aria-owns="txt3" aria-controls="txt3"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><section aria-live="off" aria-atomic="true" class="wup-hidden" id="txt2">Donny,Leo</section><wup-popup menu="" style="min-width: 100px;"><ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option">Splinter</li></ul></wup-popup>"`
    );
    await h.wait();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span item="" aria-hidden="true">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" aria-owns="txt3" aria-controls="txt3"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup menu="" style="min-width: 100px;"><ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option">Splinter</li></ul></wup-popup>"`
    );
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option">Splinter</li></ul>"`
    );

    await h.userTypeText(el.$refInput, "M");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" focused="">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;">Splinter</li></ul>"`
    );
    await h.userClick(el.$refPopup.querySelectorAll("li")[1]); // select first visible
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$value).toStrictEqual([10, 30, 20]);
    expect(el.$refInput.value).toBe(""); // input is cleared after selection
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="">Splinter</li></ul>"`
    );

    el.$value = undefined;
    await h.wait();
    await h.userClick(el.$refPopup.querySelectorAll("li")[1]); // select 1st visible
    expect(el.$value).toStrictEqual([20]);

    el.$value = [10, 30, 20];
    await h.wait(10);
    await h.userTypeText(el.$refInput, "s");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="" aria-selected="false" id="txt8" focused="">Splinter</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toStrictEqual([10, 30, 20, 40]); // because selected Splinter
    expect(el.$refInput.value).toBe("");
    // deprecated feature: expect(el.$isShown).toBe(false); // because no-items anymore
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;" aria-selected="false" id="txt8">Splinter</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );

    // expected no-items
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$refInput.outerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" aria-owns="txt3" aria-controls="txt3">"`
    );
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;" aria-selected="false" id="txt8">Splinter</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );

    await h.userClick(el.$refItems[0]); // remove item by click
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$value).toStrictEqual([30, 20, 40]); // because selected Splinter
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;" aria-selected="false" id="txt8">Splinter</li><li role="option" aria-disabled="true" aria-selected="false" style="display: none;">No Items</li></ul>"`
    );

    el.$options.disabled = true;
    await h.userClick(el.$refItems[0]);
    expect(el.$value).toStrictEqual([30, 20, 40]);
    el.$options.disabled = false;

    el.$options.readOnly = true;
    await h.userClick(el.$refItems[0]);
    expect(el.$value).toStrictEqual([30, 20, 40]);
    el.$options.readOnly = false;

    await h.userClick(el.$refInput.parentElement); // just for coverage
    expect(el.$value).toStrictEqual([30, 20, 40]);

    // touch-click on item doesn't remove item but allow to focus control first - othewise user can't focus on touchscreens
    el.blur();
    await h.wait();
    jest
      .spyOn(window, "matchMedia")
      .mockImplementationOnce((s) => ({ matches: s !== "(hover: hover) and (pointer: fine)" })); // simulate touchscreen
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Leo</span><span item="" aria-hidden="true">Mikky</span><span item="" aria-hidden="true">Splinter</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" aria-owns="txt12" aria-controls="txt12"><strong></strong>"`
    );
    const item = el.$refItems[0];
    await h.userTap(item);
    await h.wait();
    expect(el.$isFocused).toBe(true);
    expect(el.$isShown).toBe(true); // 1st tap only to focus control
    // item must be not-removed
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Leo</span><span item="" aria-hidden="true">Mikky</span><span item="" aria-hidden="true">Splinter</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" aria-owns="txt14" aria-controls="txt14"><strong></strong>"`
    );

    await h.userTap(item);
    await h.wait();
    // 2nd tap removes item
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Mikky</span><span item="" aria-hidden="true">Splinter</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" aria-owns="txt14" aria-controls="txt14"><strong></strong>"`
    );

    // input hidden if readOnlyInput and values exist
    el.blur();
    el.$options.readOnlyInput = true;
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait(2);
    expect(el.$refInput.outerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-owns="txt17" aria-controls="txt17" aria-describedby="txt16" readonly="">"`
    );
    el.$options.readOnlyInput = false;

    await h.userTypeText(el.$refInput, "Mik");
    // simulate blur-by outside click
    document.body.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    el.blur();
    await h.wait(100);
    expect(el.$refInput.value).toBe(" ");
    document.body.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    document.body.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true }));
    document.body.focus();
    await h.wait();
    expect(el.$refInput.value).toBe(" ");

    expect(() => el.clearFilterMenuItems()).not.toThrow(); // for coverage
  });

  test("animation for removed item", async () => {
    el.$options.hideSelected = true;
    jest.spyOn(window, "matchMedia").mockImplementation((s) => ({ matches: s !== "(prefers-reduced-motion)" })); // simulate 'prefers-reduced-motion' === false
    expect(isAnimEnabled()).toBe(true);

    const orig = window.getComputedStyle;
    /** @type CSSStyleDeclaration */
    const objStyle = {
      getPropertyValue() {
        return " 200ms";
      },
    };
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        return objStyle;
      }
      return orig(elem);
    });

    el.$initValue = [10, 30];
    await h.wait(10);
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list"><strong></strong>"`
    );

    // remove item by click
    jest.spyOn(el.$refItems[0], "offsetWidth", "get").mockReturnValue("33px");
    expect(el.$isShown).toBe(false);
    await h.wait();
    await h.userClick(el.$refItems[0], undefined);
    expect(el.$value).toStrictEqual([30]);
    expect(el.$initValue).toStrictEqual([10, 30]);
    // animation for [removed]
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true" removed="">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" aria-describedby="txt2"><strong></strong>"`
    );
    expect(el.$isShown).toBe(false); // because not-open by value-change
    await h.wait();
    expect(el.$isShown).toBe(false); // because not-open by value-change

    await h.wait();
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list"><strong></strong>"`
    );

    // without animation
    jest.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: true })); // simulate 'prefers-reduced-motion' === true
    expect(isAnimEnabled()).toBe(false);
    jest.spyOn(el.$refItems[0], "offsetWidth", "get").mockReturnValue("33px");
    await h.userClick(el.$refItems[0]);
    expect(el.$value).toStrictEqual(undefined);
    await h.wait();
    // without animation for [removed]
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list"><strong></strong>"`
    );
    await h.wait();
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list"><strong></strong>"`
    );
    expect(el.$isShown).toBe(false); // because not-open by value-change
  });

  test("menu: focus behavior", async () => {
    el.$options.hideSelected = true;
    el.$value = [getItems()[0].value];
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$isShown).toBe(true);

    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );
    expect(el.querySelector("[focused]")).toBeFalsy();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(el.querySelector("[focused]").textContent).toBe(getItems()[1].text); // 2nd item because 1st is hidden - because selected

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toStrictEqual([10, 20]);
    expect(el.$isShown).toBe(true);
    expect(el.querySelector("[focused]")).toBeFalsy();

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(el.querySelector("[focused]").textContent).toBe(getItems()[2].text); // 3rd item
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(el.querySelector("[focused]").textContent).toBe(getItems()[3].text); // last item
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(el.querySelector("[focused]").textContent).toBe(getItems()[2].text); // 3rd item
  });

  test("option [hideSelected]", async () => {
    el.$options.hideSelected = false; // tests with 'true' see above
    el.$value = [getItems()[0].value];
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );

    await h.userTypeText(el.$refInput, "m");
    await h.wait(100);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toStrictEqual([10, 20]);
    expect(el.$refInput.value).toBe("");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true" style="">Donny</li><li role="option" aria-selected="true" id="txt4" focused="">Mikky</li><li role="option" style="">Leo</li><li role="option" style="">Splinter</li></ul>"`
    );

    el.selectValue(30); // just for coverage
    await h.wait(100);
    expect(el.$value).toStrictEqual([10, 20, 30]);
  });

  test("keyboard support", async () => {
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait(1);
    expect(handledKeydown("ArrowLeft")).toBe(false); // because no value - no items
    expect(handledKeydown("ArrowRight")).toBe(false);
    expect(handledKeydown("Backspace")).toBe(false);
    expect(handledKeydown("Delete")).toBe(false);
    el.blur();
    await h.wait();

    el.$value = [10, 40];
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
      ]
    `);
    expect(handledKeydown("ArrowRight")).toBe(false); // nothing to focus
    await h.userTypeText(el.$refInput, "mi");
    expect(handledKeydown("ArrowLeft")).toBe(false); // because caret at the end of input

    el.$refInput.selectionStart = 0;
    el.$refInput.selectionEnd = 0;
    expect(handledKeydown("ArrowLeft")).toBe(true); // focus last item
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" id="txt6" focused="" role="option">Splinter</span>",
      ]
    `);
    expect(handledKeydown("ArrowLeft")).toBe(true); // focus 1st item
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt7" focused="" role="option">Donny</span>",
        "<span item="" id="txt6" aria-hidden="true">Splinter</span>",
      ]
    `);
    expect(handledKeydown("ArrowLeft")).toBe(false); // stay on the same position

    expect(handledKeydown("ArrowRight")).toBe(true);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt7" aria-hidden="true">Donny</span>",
        "<span item="" id="txt6" focused="" role="option">Splinter</span>",
      ]
    `);
    expect(handledKeydown("ArrowRight")).toBe(true);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt7" aria-hidden="true">Donny</span>",
        "<span item="" id="txt6" aria-hidden="true">Splinter</span>",
      ]
    `);
    expect(handledKeydown("ArrowRight")).toBe(false); // stay on the same position

    // Backspace key
    expect(handledKeydown("Delete")).toBe(false); // nothing to delete when carret at the right
    expect(handledKeydown("Backspace")).toBe(true); // 1st time - focus, 2nd - delete
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt7" aria-hidden="true">Donny</span>",
        "<span item="" id="txt6" focused="" role="option">Splinter</span>",
      ]
    `);
    expect(handledKeydown("Backspace")).toBe(true); // 1st time - focus, 2nd - delete
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt7" focused="" role="option">Donny</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([10]);
    expect(handledKeydown("Backspace")).toBe(true); // again
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`[]`);

    // Delete key
    el.$value = [10, 20];
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
      ]
    `);
    expect(handledKeydown("ArrowLeft")).toBe(true);
    expect(handledKeydown("ArrowLeft")).toBe(true); // focus 1st
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt11" focused="" role="option">Donny</span>",
        "<span item="" id="txt10" aria-hidden="true">Mikky</span>",
      ]
    `);
    expect(handledKeydown("Delete")).toBe(true); // delete 1st, focus on next
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt10" focused="" role="option">Mikky</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([20]);
    expect(handledKeydown("Delete")).toBe(true);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`[]`);

    // Enter key
    el.$value = [10, 20];
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
      ]
    `);
    expect(handledKeydown("ArrowLeft")).toBe(true); // focus last
    expect(handledKeydown("Enter")).toBe(true); // delete item because Enter == click
    await h.wait(10);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt15" focused="" role="option">Donny</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([10]);
    expect(handledKeydown("Enter")).toBe(true); // delete item because Enter == click
    await h.wait(10);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`[]`);
    expect(el.$value).toBe(undefined);

    // focus between menu & items
    el.$value = [30, 40];
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    // focusing item
    expect(handledKeydown("ArrowLeft")).toBe(true);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" id="txt18" focused="" role="option">Splinter</span>",
      ]
    `);
    expect(el._menuItems.all.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<li role="option" style="">Donny</li>",
        "<li role="option" id="txt5">Mikky</li>",
        "<li role="option" style="" aria-selected="true">Leo</li>",
        "<li role="option" style="" aria-selected="true">Splinter</li>",
      ]
    `);
    // focusing menu-item
    expect(handledKeydown("ArrowDown")).toBe(true);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" id="txt18" aria-hidden="true">Splinter</span>",
      ]
    `);
    expect(el._menuItems.all.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<li role="option" style="">Donny</li>",
        "<li role="option" id="txt5">Mikky</li>",
        "<li role="option" style="" aria-selected="true" id="txt19" focused="">Leo</li>",
        "<li role="option" style="" aria-selected="true">Splinter</li>",
      ]
    `);
    // focusing item
    expect(handledKeydown("ArrowLeft")).toBe(true);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" id="txt18" focused="" role="option">Splinter</span>",
      ]
    `);
    expect(el._menuItems.all.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<li role="option" style="">Donny</li>",
        "<li role="option" id="txt5">Mikky</li>",
        "<li role="option" style="" aria-selected="true" id="txt19">Leo</li>",
        "<li role="option" style="" aria-selected="true">Splinter</li>",
      ]
    `);

    // clearing state on blur
    expect(el.$isFocused).toBe(true);
    el.blur();
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" id="txt18" aria-hidden="true">Splinter</span>",
      ]
    `);

    // Enter key & menu-item focused
    el.$value = [30];
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(handledKeydown("ArrowDown")).toBe(true);
    expect(handledKeydown("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]").outerHTML).toMatchInlineSnapshot(
      `"<li role="option" aria-selected="false" id="txt24" focused="">Splinter</li>"`
    );
    expect(handledKeydown("Enter")).toBe(true); // select item because Enter == click
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
      ]
    `);
    expect(el._menuItems.all.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<li role="option">Donny</li>",
        "<li role="option">Mikky</li>",
        "<li role="option" aria-selected="true" id="txt23">Leo</li>",
        "<li role="option" aria-selected="true" id="txt24" focused="">Splinter</li>",
      ]
    `);
  });

  test("option [allowNewValue]", async () => {
    el.$options.allowNewValue = true;
    el.$value = [40];
    await h.wait(10);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Splinter</span>",
      ]
    `);

    const onChange = jest.fn();
    el.addEventListener("$change", onChange);
    await h.userTypeText(el.$refInput, "hello-123");
    expect(handledKeydown("Enter")).toBe(true);
    await h.wait();
    expect(el.$value).toStrictEqual([40, "hello-123"]);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Splinter</span>",
        "<span item="" aria-hidden="true">hello-123</span>",
      ]
    `);
    expect(el.$refInput.value).toBe("");
    expect(el.$isShown).toBe(true);
    expect(onChange).toBeCalledTimes(1);

    expect(handledKeydown("Enter")).toBe(true);
    await h.wait(1);
    expect(el.$value).toStrictEqual([40, "hello-123"]);
    expect(onChange).toBeCalledTimes(1); // no-changes when input is empty

    await h.userTypeText(el.$refInput, "hello-123");
    expect(handledKeydown("Enter")).toBe(true);
    await h.wait(1);
    expect(el.$value).toStrictEqual([40, "hello-123"]);
    expect(onChange).toBeCalledTimes(1); // no-duplicates

    await h.userTypeText(el.$refInput, "Halo");
    expect(handledKeydown("Enter")).toBe(true);
    await h.wait(1);
    expect(el.$value).toStrictEqual([40, "hello-123", "Halo"]);
    expect(onChange).toBeCalledTimes(2); // allow > 1

    el.$value = undefined;
    await h.wait(1);
    onChange.mockClear();
    await h.userTypeText(el.$refInput, "grey");
    expect(handledKeydown("Enter")).toBe(true);
    await h.wait(1);
    expect(el.$value).toStrictEqual(["grey"]); // cover case when $value is undefined
    expect(onChange).toBeCalledTimes(1);
  });

  test("sortable: keyboard", async () => {
    const onChanged = jest.fn();
    el.$value = [10, 20, 30];
    el.$options.sortable = true;
    await h.wait(10);
    el.addEventListener("$change", onChanged);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    el.$hideMenu();
    await h.wait();
    expect(handledKeydown("ArrowLeft", { shiftKey: true })).toBe(false); // because not item focused

    el.$refInput.selectionStart = 0;
    el.$refInput.selectionEnd = 0;
    expect(handledKeydown("ArrowLeft")).toBe(true); // focus last item
    await h.wait(1);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" id="txt4" focused="" role="option">Leo</span>",
      ]
    `);

    // move to left
    expect(handledKeydown("ArrowLeft", { shiftKey: true })).toBe(true);
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" id="txt4" focused="" role="option">Leo</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([10, 30, 20]);
    expect(onChanged).toBeCalledTimes(1);
    await h.wait(1);

    // move to left
    expect(handledKeydown("ArrowLeft", { shiftKey: true })).toBe(true);
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt4" focused="" role="option">Leo</span>",
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([30, 10, 20]);
    expect(onChanged).toBeCalledTimes(2);
    await h.wait(1);

    // move to left
    expect(handledKeydown("ArrowLeft", { shiftKey: true })).toBe(true);
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" id="txt4" focused="" role="option">Leo</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([10, 20, 30]);
    expect(onChanged).toBeCalledTimes(3);
    await h.wait(1);

    onChanged.mockClear();
    // move to right
    expect(handledKeydown("ArrowRight", { shiftKey: true })).toBe(true);
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt4" focused="" role="option">Leo</span>",
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([30, 10, 20]);
    expect(onChanged).toBeCalledTimes(1);
    await h.wait(1);

    // move to right
    expect(handledKeydown("ArrowRight", { shiftKey: true })).toBe(true);
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" id="txt4" focused="" role="option">Leo</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([10, 30, 20]);
    expect(onChanged).toBeCalledTimes(2);
    await h.wait(1);

    // move to right
    expect(handledKeydown("ArrowRight", { shiftKey: true })).toBe(true);
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" id="txt4" focused="" role="option">Leo</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([10, 20, 30]);
    expect(onChanged).toBeCalledTimes(3);
    await h.wait(1);

    expect(handledKeydown("W", { shiftKey: true })).toBe(false);
  });

  test("sortable: drag&drop", async () => {
    const onChanged = jest.fn();
    el.$value = [10, 20, 30, 40];
    el.$options.sortable = true;
    await h.wait(10);
    el.addEventListener("$change", onChanged);
    const hi = 30;
    const w = 60;
    h.setupLayout(el, { x: 0, y: 0, h: hi * 2, w: w * 3 });
    const updateLayout = () => {
      // 1st line
      // WARN: Items doesn't change own position
      h.setupLayout(el.$refItems[0], { x: 0, y: 0, h: hi, w }); // 1st
      h.setupLayout(el.$refItems[1], { x: w, y: 0, h: hi, w }); // 2nd
      h.setupLayout(el.$refItems[2], { x: w * 2, y: 0, h: hi, w }); // 3rd
      // 2nd line
      h.setupLayout(el.$refItems[3], { x: 0, y: hi, h: hi, w }); // 1st
    };
    updateLayout();
    let trg = el.$refItems[0];
    const getChildren = () => Array.prototype.slice.call(trg.parentElement.children).map((a) => a.outerHTML);

    // ordinary mouse move
    trg.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    expect(el).toMatchSnapshot();
    // move to center of trg
    h.userMouseMove(trg, { x: trg.offsetWidth / 2, y: trg.offsetHeight / 2 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(0px, 0px);">Donny</span>",
        "<span item="" aria-hidden="true" drop="">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);
    expect(el).toMatchSnapshot();

    /** @type HTMLElement */
    let dragEl;
    /* Simulate getBoundingClientRect for draggable element */
    const bindDragEl = () => {
      dragEl = trg.parentElement.querySelector("[drag]");
      jest.spyOn(dragEl, "getBoundingClientRect").mockImplementation(() => {
        const width = +/([0-9]+)/.exec(dragEl.style.width)[1];
        const height = +/([0-9]+)/.exec(dragEl.style.height)[1];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, prefer-const
        let [_, x, y] = /([0-9]+)\D+([0-9]+)/.exec(dragEl.style.transform);
        x = Number(x);
        y = Number(y);
        return { x, y, width, height, top: y, left: x, right: width + x, bottom: height + y };
      });
    };
    bindDragEl(); // simulate getBoundingClientRect for draggable element

    // move to right of 2nd item
    updateLayout();
    let r = el.$refItems[1].getBoundingClientRect();
    h.userMouseMove(dragEl, { x: r.right, y: trg.offsetHeight / 2 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(90px, 0px);">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true" drop="">Donny</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);

    // checking thottling here
    updateLayout();
    r = el.$refItems[2].getBoundingClientRect();
    h.userMouseMove(trg, { x: r.right, y: trg.offsetHeight / 2 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(150px, 0px);">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true" drop="">Donny</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `); // no -effect because throttling
    await h.wait(5);
    expect(onChanged).toBeCalledTimes(0); // because user don't mouseup

    // move to the end of 1st line after throtling
    await h.wait(); // wait for throttling to get new position at the right side of 2nd item
    updateLayout();
    h.userMouseMove(trg, { x: r.right - 2, y: trg.offsetHeight / 2 + 5 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(148px, 5px);">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true" drop="">Donny</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);
    await h.wait(5);
    expect(onChanged).toBeCalledTimes(0); // because user don't mouseup

    // move to the 2nd - right side
    await h.wait(); // wait for throttling
    updateLayout();
    h.userMouseMove(trg, { x: w * 2, y: 0 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(90px, -15px);">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true" drop="">Donny</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);
    // move to the 1st - left side
    await h.wait(); // wait for throttling
    updateLayout();
    h.userMouseMove(trg, { x: 0, y: 0 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(-30px, -15px);">Donny</span>",
        "<span item="" aria-hidden="true" drop="">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);

    // moving to 2nd line; left side
    await h.wait(); // wait for throttling to get new position at the right side of 2nd item
    updateLayout();
    h.userMouseMove(trg, { x: 0, y: trg.offsetHeight + 5 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(-30px, 20px);">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true" drop="">Donny</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);
    await h.wait(5);
    expect(onChanged).toBeCalledTimes(0); // because user don't mouseup

    // moving to 2nd line; right side
    await h.wait(); // wait for throttling to get new position at the right side of 2nd item
    h.userMouseMove(trg, { x: trg.offsetWidth, y: trg.offsetHeight + 5 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(30px, 20px);">Donny</span>",
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<span item="" aria-hidden="true" drop="">Donny</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);
    await h.wait(5);
    expect(onChanged).toBeCalledTimes(0); // because user doesn't mouseup
    updateLayout();
    bindDragEl();

    const { nextFrame } = h.useFakeAnimation(); // animation for return mirrored element
    trg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(1);
    expect(el.$value).toStrictEqual([20, 30, 40, 10]);
    expect(dragEl.outerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(30px, 20px);">Donny</span>"`
    );
    await nextFrame(5);
    expect(dragEl.outerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(0px, 30px);">Donny</span>"`
    );
    await nextFrame(50);
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Mikky</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<span item="" aria-hidden="true">Donny</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);

    expect(el).toMatchSnapshot();

    // test removing when outside
    trg = el.$refItems[0];
    trg.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    // move outside of control
    h.userMouseMove(trg, { x: 5, y: 5 });
    bindDragEl(); // simulate getBoundingClientRect for draggable element
    h.userMouseMove(trg, { x: 1000, y: 1000 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true" drag="" style="width: 60px; height: 30px; transform: translate(970px, 985px);" remove="">Mikky</span>",
        "<span item="" aria-hidden="true" drop="">Mikky</span>",
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
        "<span item="" aria-hidden="true">Donny</span>",
        "<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list">",
        "<strong></strong>",
      ]
    `);
    trg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(50);
    expect(onChanged).toBeCalledTimes(2);
    expect(el.$value).toStrictEqual([30, 40, 10]);
    expect(el).toMatchSnapshot();

    // cancel without move
    trg = el.$refItems[0];
    let was = el.outerHTML;
    trg.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(50);
    expect(el.outerHTML).toBe(was);

    // no-action when readonly
    el.$options.readOnly = true;
    await h.wait(1);
    was = el.outerHTML;
    trg.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(trg, { x: 1000, y: 1000 });
    expect(el.outerHTML).toBe(was);
    trg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(50);
    expect(el.outerHTML).toBe(was);
    el.$options.readOnly = false;

    // no-action when disabled
    el.$options.disabled = true;
    await h.wait(1);
    was = el.outerHTML;
    trg.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(trg, { x: 1000, y: 1000 });
    expect(el.outerHTML).toBe(was);
    trg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(50);
    expect(el.outerHTML).toBe(was);
    el.$options.disabled = false;
    await h.wait(1);

    // no-action when click outside items
    was = el.outerHTML;
    const fakeTrg = trg.parentElement;
    fakeTrg.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    fakeTrg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(fakeTrg, { x: 1000, y: 1000 });
    expect(el.outerHTML).toBe(was);
    fakeTrg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    fakeTrg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(50);
    expect(el.outerHTML).toBe(was);
    await h.wait();

    // handling touch events
    onChanged.mockClear();
    // case when touch event impossible to prevent because browser decides to scroll
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("touchstart", { cancelable: true, bubbles: true }));
    h.userMouseMove(trg, { x: 0, y: 0 });
    expect(el.querySelector("[drag]")).toBeFalsy();
    trg.dispatchEvent(new MouseEvent("touchmove", { cancelable: false, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointercancel", { cancelable: false, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("touchend", { cancelable: false, bubbles: true }));
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(0);

    // case when touch event possible to prevent
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("touchstart", { cancelable: true, bubbles: true }));
    const isPrevented = !trg.dispatchEvent(new MouseEvent("touchmove", { cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true);
    h.userMouseMove(trg, { x: w, y: 0 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    bindDragEl();
    trg.dispatchEvent(new MouseEvent("touchend", { cancelable: false, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(50);
    expect(onChanged).toBeCalledTimes(1);

    // test disposing - no sort listener when option is disabled
    el.$options.sortable = false;
    await h.wait(1);
    was = el.outerHTML;
    trg.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(trg, { x: 1000, y: 1000 });
    expect(el.outerHTML).toBe(was);
    trg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(50);
    expect(el.outerHTML).toBe(was);

    // test menu is hidden after click + sorting
    el.blur();
    await h.wait();
    trg.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(trg, { x: w, y: hi / 2 });
    trg.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    // simulate focusing when user makes mouse down > move+sort > up
    el.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true }));
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await nextFrame(50);
    await expect(h.userTypeText(el.$refInput, "l")).resolves.not.toThrow();
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup).toMatchInlineSnapshot(`
      <wup-popup
        menu=""
        style="min-width: 180px;"
      >
        <ul
          aria-label="Items"
          aria-multiselectable="true"
          id="txt6"
          role="listbox"
          tabindex="-1"
        >
          <li
            aria-selected="true"
            role="option"
            style="display: none;"
          >
            Donny
          </li>
          <li
            role="option"
            style="display: none;"
          >
            Mikky
          </li>
          <li
            aria-selected="true"
            focused=""
            id="txt7"
            role="option"
          >
            Leo
          </li>
          <li
            aria-selected="true"
            role="option"
            style="display: none;"
          >
            Splinter
          </li>
        </ul>
      </wup-popup>
    `);
  });
});
