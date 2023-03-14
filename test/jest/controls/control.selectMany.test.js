import { WUPSelectManyControl } from "web-ui-pack";
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

function handledKeydown(key = "") {
  return !el.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true }));
}

describe("control.selectMany", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "window.$1Value", value: [10] },
      { attrValue: "window.$2Value", value: [20, 40] },
      { attrValue: "window.$3Value", value: [30] },
    ],
    validations: {},
    validationsSkip: ["_parse", "_mask"],
    attrs: { items: { skip: true }, multiple: { skip: true } },
    $options: { items: { skip: true } },
    onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("items rendering", async () => {
    el.$options.hideSelected = true;
    el.$initValue = [10, 30];
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span item="" aria-hidden="true">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" class="wup-hidden"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
    );

    el.focus(); // opening menu by focus
    await h.wait(1);
    expect(el.$isOpen).toBe(true);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span item="" aria-hidden="true">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" class="" aria-describedby="txt2" aria-owns="txt3" aria-controls="txt3"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><section aria-live="off" aria-atomic="true" class="wup-hidden" id="txt2">Donny,Leo</section><wup-popup menu="" style="min-width: 100px;"><ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option">Splinter</li></ul></wup-popup>"`
    );
    await h.wait();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span item="" aria-hidden="true">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" class="" aria-owns="txt3" aria-controls="txt3"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup menu="" style="min-width: 100px;"><ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option">Splinter</li></ul></wup-popup>"`
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
    expect(el.$isOpen).toBe(true);
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
    await h.wait(1);
    await h.userTypeText(el.$refInput, "s");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="" aria-selected="false" id="txt8" focused="">Splinter</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toStrictEqual([10, 30, 20, 40]); // because selected Splinter
    expect(el.$refInput.value).toBe("");
    expect(el.$isOpen).toBe(false); // because no-items anymore
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;" aria-selected="false" id="txt8">Splinter</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );

    // expected no-items
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refInput.outerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" class="" aria-owns="txt3" aria-controls="txt3">"`
    );
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;" aria-selected="false" id="txt8">Splinter</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );

    await h.userClick(el.$refItems[0]); // remove item by click
    await h.wait();
    expect(el.$isOpen).toBe(true);
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
      `"<span item="" aria-hidden="true">Leo</span><span item="" aria-hidden="true">Mikky</span><span item="" aria-hidden="true">Splinter</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" class="wup-hidden" aria-owns="txt11" aria-controls="txt11"><strong></strong>"`
    );
    const item = el.$refItems[0];
    await h.userTap(item);
    await h.wait();
    expect(el.$isFocused).toBe(true);
    expect(el.$isOpen).toBe(true); // 1st tap only to focus control
    // item must be not-removed
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Leo</span><span item="" aria-hidden="true">Mikky</span><span item="" aria-hidden="true">Splinter</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" class="" aria-owns="txt14" aria-controls="txt14"><strong></strong>"`
    );

    await h.userTap(item);
    await h.wait();
    // 2nd tap removes item
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Mikky</span><span item="" aria-hidden="true">Splinter</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" class="" aria-owns="txt14" aria-controls="txt14"><strong></strong>"`
    );

    // input hidden if readOnlyInput and values exist
    el.blur();
    el.$options.readOnlyInput = true;
    el.focus();
    await h.wait(1);
    expect(el.$refInput.outerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" class="wup-hidden" aria-owns="txt17" aria-controls="txt17" aria-describedby="txt16" readonly="">"`
    );
    el.$options.readOnlyInput = false;

    await h.userTypeText(el.$refInput, "Mik");
    // simulate blur-by outside click
    document.body.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
    el.blur();
    await h.wait(100);
    expect(el.$refInput.value).toBe("Mik");
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
    await h.wait(1);
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" class="wup-hidden"><strong></strong>"`
    );

    // remove item by click
    jest.spyOn(el.$refItems[0], "offsetWidth", "get").mockReturnValue("33px");
    await h.userClick(el.$refItems[0], undefined);
    expect(el.$value).toStrictEqual([30]);
    // animation for [removed]
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true" removed="">Donny</span><span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" class="" aria-describedby="txt2 txt3"><strong></strong>"`
    );
    await h.wait();
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<span item="" aria-hidden="true">Leo</span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" class=""><strong></strong>"`
    );
    expect(el.$isOpen).toBe(false); // because not-open by value-change

    // without animation
    jest.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: true })); // simulate 'prefers-reduced-motion' === true
    expect(isAnimEnabled()).toBe(false);
    jest.spyOn(el.$refItems[0], "offsetWidth", "get").mockReturnValue("33px");
    await h.userClick(el.$refItems[0], undefined);
    expect(el.$value).toStrictEqual(undefined);
    // without animation for [removed]
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" class=""><strong></strong>"`
    );
    await h.wait();
    expect(el.$refInput.parentElement.innerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" class=""><strong></strong>"`
    );
    expect(el.$isOpen).toBe(false); // because not-open by value-change
  });

  test("menu: focus behavior", async () => {
    el.$options.hideSelected = true;
    el.$value = [getItems()[0].value];
    el.focus();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );
    expect(el.querySelector("[focused]")).toBeFalsy();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(el.querySelector("[focused]").textContent).toBe(getItems()[1].text); // 2nd item because 1st is hidden - because selected

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toStrictEqual([10, 20]);
    expect(el.$isOpen).toBe(true);
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
    el.focus();
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );

    await h.userTypeText(el.$refInput, "m");
    await h.wait(100);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toStrictEqual([10, 20]);
    expect(el.$refInput.value).toBe("");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true" style="">Donny</li><li role="option" aria-selected="true" id="txt4" focused="">Mikky</li><li role="option" style="">Leo</li><li role="option" style="">Splinter</li></ul>"`
    );

    el.selectValue(30); // just for coverage
    await h.wait(100);
    expect(el.$value).toStrictEqual([10, 20, 30]);
  });

  test("keyboard support", async () => {
    el.focus();
    await h.wait(1);
    expect(handledKeydown("ArrowLeft")).toBe(false); // because no value - no items
    expect(handledKeydown("ArrowRight")).toBe(false);
    expect(handledKeydown("Backspace")).toBe(false);
    expect(handledKeydown("Delete")).toBe(false);
    el.blur();
    await h.wait();

    el.$value = [10, 40];
    el.focus();
    await h.wait();
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Donny</span>",
        "<span item="" aria-hidden="true">Splinter</span>",
      ]
    `);
    expect(handledKeydown("ArrowRight")).toBe(false); // nothing to focus
    await h.userTypeText(el.$refInput, "mi");
    expect(handledKeydown("ArrowLeft")).toBe(false); // because carret at the end of input

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
        "<span item="" id="txt10" focused="" role="option">Donny</span>",
        "<span item="" id="txt9" aria-hidden="true">Mikky</span>",
      ]
    `);
    expect(handledKeydown("Delete")).toBe(true); // delete 1st, focus on next
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" id="txt9" focused="" role="option">Mikky</span>",
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
        "<span item="" id="txt13" focused="" role="option">Donny</span>",
      ]
    `);
    expect(el.$value).toStrictEqual([10]);
    expect(handledKeydown("Enter")).toBe(true); // delete item because Enter == click
    await h.wait(10);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`[]`);
    expect(el.$value).toBe(undefined);

    // focus between menu & items
    el.$value = [30, 40];
    el.focus();
    await h.wait();
    // focusing item
    expect(handledKeydown("ArrowLeft")).toBe(true);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" id="txt16" focused="" role="option">Splinter</span>",
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
        "<span item="" id="txt16" aria-hidden="true">Splinter</span>",
      ]
    `);
    expect(el._menuItems.all.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<li role="option" style="">Donny</li>",
        "<li role="option" id="txt5">Mikky</li>",
        "<li role="option" style="" aria-selected="true" id="txt17" focused="">Leo</li>",
        "<li role="option" style="" aria-selected="true">Splinter</li>",
      ]
    `);
    // focusing item
    expect(handledKeydown("ArrowLeft")).toBe(true);
    expect(el.$refItems.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<span item="" aria-hidden="true">Leo</span>",
        "<span item="" id="txt16" focused="" role="option">Splinter</span>",
      ]
    `);
    expect(el._menuItems.all.map((a) => a.outerHTML)).toMatchInlineSnapshot(`
      [
        "<li role="option" style="">Donny</li>",
        "<li role="option" id="txt5">Mikky</li>",
        "<li role="option" style="" aria-selected="true" id="txt17">Leo</li>",
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
        "<span item="" id="txt16" aria-hidden="true">Splinter</span>",
      ]
    `);

    // Enter key & menu-item focused
    el.$value = [30];
    el.focus();
    await h.wait();
    expect(handledKeydown("ArrowDown")).toBe(true);
    expect(handledKeydown("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]").outerHTML).toMatchInlineSnapshot(
      `"<li role="option" aria-selected="false" id="txt22" focused="">Splinter</li>"`
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
        "<li role="option" aria-selected="true" id="txt21">Leo</li>",
        "<li role="option" aria-selected="true" id="txt22" focused="">Splinter</li>",
      ]
    `);
  });

  test("option [allowNewValue]", async () => {
    el.$options.allowNewValue = true;
    el.$value = [40];
    await h.wait(1);
    el.focus();
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
    expect(el.$isOpen).toBe(true);
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
});
