import { WUPSelectManyControl } from "web-ui-pack";
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
  htmlTag: "wup-select-many",
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
    attrs: { items: { skip: true } },
    $options: { items: { skip: true } },
    onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("items rendering", async () => {
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

    await h.userTypeText(el.$refInput, "s");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="" aria-selected="false" id="txt6" focused="">Splinter</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toStrictEqual([10, 30, 20, 40]); // because selected Splinter
    expect(el.$refInput.value).toBe("");
    expect(el.$isOpen).toBe(false); // because no-items anymore
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;" aria-selected="false" id="txt6">Splinter</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );

    // expected no-items
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refInput.outerHTML).toMatchInlineSnapshot(
      `"<input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" class="" aria-owns="txt3" aria-controls="txt3" aria-activedescendant="txt8">"`
    );
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;" aria-selected="false" id="txt8" focused="">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;" aria-selected="false" id="txt6">Splinter</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );

    await h.userClick(el.$refItems[0]); // remove item by click
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$value).toStrictEqual([30, 20, 40]); // because selected Splinter
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="" aria-selected="false" id="txt8" focused="">Donny</li><li role="option" aria-selected="false" id="txt4" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;" aria-selected="false" id="txt6">Splinter</li><li role="option" aria-disabled="true" aria-selected="false" style="display: none;">No Items</li></ul>"`
    );
  });
});

// manual testcase (close menu by outside click): to reproduce focus > pressEsc > typeText > try close by outside click
