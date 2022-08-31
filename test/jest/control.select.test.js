import { WUPSelectControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../testHelper";

const getItems = () => [
  { value: 10, text: "Donny" },
  { value: 20, text: "Mikky" },
  { value: 30, text: "Leo" },
  { value: 40, text: "Splinter" },
];

/** @type WUPSelectControl */
let el;
initTestBaseControl({
  type: WUPSelectControl,
  htmlTag: "wup-select",
  onInit: (e) => {
    el = e;
    el.$options.items = getItems();
  },
});

describe("control.select", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "10", value: 10 },
      { attrValue: "20", value: 20 },
      { attrValue: "30", value: 30 },
    ],
    validations: {},
    attrs: { items: { skip: true } },
    $options: { items: { skip: true } },
    onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("$show/$hide menu", async () => {
    el.$initValue = 20;
    expect(el.$isOpen).toBe(false);
    const onShow = jest.fn();
    const onHide = jest.fn();
    el.addEventListener("$showMenu", onShow);
    el.addEventListener("$hideMenu", onHide);

    // opening by focus
    el.focus();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup).toBeDefined();
    await h.wait();
    await h.wait(1);
    await h.wait(1);
    expect(onHide).toBeCalledTimes(0);
    expect(onShow).toBeCalledTimes(1);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\">Donny</li><li role=\\"option\\" aria-selected=\\"true\\" id=\\"txt4\\">Mikky</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\">Leo</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt6\\">Splinter</li></ul>"`
    );
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select opened=\\"\\"><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" role=\\"combobox\\" aria-haspopup=\\"listbox\\" aria-expanded=\\"true\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" aria-owns=\\"txt2\\" aria-controls=\\"txt2\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label><wup-popup menu=\\"\\" style=\\"display: none;\\"><ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\">Donny</li><li role=\\"option\\" aria-selected=\\"true\\" id=\\"txt4\\">Mikky</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\">Leo</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt6\\">Splinter</li></ul></wup-popup></wup-select>"`
    );

    // closing by Esc
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await h.wait();
    await h.wait(1);
    expect(el.$isOpen).toBe(false);
    expect(el.$refPopup).toBeDefined(); // disposed only by focus out
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" role=\\"combobox\\" aria-haspopup=\\"listbox\\" aria-expanded=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" aria-owns=\\"txt2\\" aria-controls=\\"txt2\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label><wup-popup menu=\\"\\" style=\\"\\"><ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\">Donny</li><li role=\\"option\\" aria-selected=\\"true\\" id=\\"txt4\\">Mikky</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\">Leo</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt6\\">Splinter</li></ul></wup-popup></wup-select>"`
    );
    expect(onHide).toBeCalledTimes(1);
    expect(onShow).toBeCalledTimes(1);

    // opening by call $show()
    jest.clearAllMocks();
    el.$showMenu();
    await h.wait();
    await h.wait(1);
    expect(el.$isOpen).toBe(true);
    expect(onHide).toBeCalledTimes(0);
    expect(onShow).toBeCalledTimes(1);

    // closing by call $hide()
    el.$hideMenu();
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(onHide).toBeCalledTimes(1);
    expect(onShow).toBeCalledTimes(1);

    // opening by keyboard
    jest.clearAllMocks();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    // again
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(onShow).toBeCalledTimes(1);

    // closing by select (by enter)
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$refPopup).toBeDefined();

    // opening by keyboard
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);

    // hide by outside click
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // open by click control
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    await h.wait();
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpen).toBe(true);

    // hide by click control again
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    await h.wait();
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpen).toBe(false);

    // opening by text in input
    await h.typeInputText(el.$refInput, "S");
    await h.wait();
    expect(el.$isOpen).toBe(true);

    // try to show again - for coverage
    await el.$showMenu();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    // stay open even by popupClick
    el.$refPopup.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);

    el.$hideMenu();
    await h.wait();

    // no opening when readonly
    el.$options.readOnly = true;
    el.$showMenu();
    await h.wait();
    await h.wait();
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    el.$options.readOnly = false;
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$isFocused).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // checking with disabled
    el.$options.disabled = true;
    await h.wait();
    expect(el.$refPopup).not.toBeDefined();

    el.$options.disabled = false;
    await h.wait();

    // not closing when click on input without readonly (to allow user edit input value without menu)
    el.$showMenu();
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$isFocused).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);

    // checking when hiding is not finished and opened again
    el.$hideMenu();
    el.$showMenu();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    // removing by blur
    el.$hideMenu(); // close before to check if it works when need remove when closed
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    document.activeElement.blur();
    await h.wait();
    await h.wait(1);
    expect(el.$isOpen).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    // checking when refPopup is removed
    el.$hideMenu();
    await h.wait();
  });

  test("submit by Enter key", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    await h.wait();

    el.focus();
    expect(el.$isOpen).toBe(true);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(onSubmit).not.toBeCalled();
    expect(el.$isOpen).toBe(false);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(onSubmit).toBeCalledTimes(1);
  });
});

// todo e2e: click on title again or on input doesn't close popup
