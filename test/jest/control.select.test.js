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
    expect(onHide).toBeCalledTimes(0);
    expect(onShow).toBeCalledTimes(1);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\">Donny</li><li role=\\"option\\" aria-selected=\\"true\\" id=\\"txt4\\">Mikky</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\">Leo</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt6\\">Splinter</li></ul>"`
    );
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select opened=\\"\\"><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" role=\\"combobox\\" aria-haspopup=\\"listbox\\" aria-expanded=\\"true\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" aria-owns=\\"txt2\\" aria-controls=\\"txt2\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label><wup-popup menu=\\"\\" style=\\"min-width: 100px;\\"><ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\">Donny</li><li role=\\"option\\" aria-selected=\\"true\\" id=\\"txt4\\">Mikky</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\">Leo</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt6\\">Splinter</li></ul></wup-popup></wup-select>"`
    );

    // closing by Esc
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$refPopup).toBeDefined(); // disposed only by focus out
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" role=\\"combobox\\" aria-haspopup=\\"listbox\\" aria-expanded=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" aria-owns=\\"txt2\\" aria-controls=\\"txt2\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label><wup-popup menu=\\"\\" style=\\"min-width: 100px;\\"><ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\">Donny</li><li role=\\"option\\" aria-selected=\\"true\\" id=\\"txt4\\">Mikky</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\">Leo</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt6\\">Splinter</li></ul></wup-popup></wup-select>"`
    );
    expect(onHide).toBeCalledTimes(1);
    expect(onShow).toBeCalledTimes(1);

    // opening by call $show()
    jest.clearAllMocks();
    el.$showMenu();
    await h.wait();
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
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpen).toBe(true);

    // hide by click control again
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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
    expect(el.$isOpen).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    // not opening when click on input without readonly (to allow user edit input value without menu)
    el.$options.readOnly = false;
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$isFocused).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // opening when click on input with readonly (to allow user edit input value without menu)
    el.$options.readOnlyInput = true;
    await h.wait();
    expect(el.$refInput.readOnly).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" role=\\"combobox\\" aria-haspopup=\\"listbox\\" aria-expanded=\\"false\\" autocomplete=\\"off\\" aria-owns=\\"txt7\\" aria-controls=\\"txt7\\" readonly=\\"\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-select>"`
    );
    el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    el.$options.readOnlyInput = false;
    await h.wait();

    // checking with disabled
    el.$showMenu();
    expect(el.$isOpen).toBe(true);
    el.$options.disabled = true;
    await h.wait();
    expect(el.$isOpen).toBe(false);
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

    // checking showMenu takes time and popup is removed because of $options.readOnly applied
    el.$hideMenu();
    await h.wait();
    el.$showMenu();
    el.$options.readOnly = true;
    await h.wait();
    expect(el.$refPopup).not.toBeDefined();
    expect(el.$isOpen).toBe(false);

    // removing by blur
    el.$hideMenu(); // close before to check if it works when need remove when closed
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    document.activeElement.blur();
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    // checking when refPopup is removed
    el.$hideMenu();
    await h.wait();

    // checking when not-focused
    el.$options.readOnly = false;
    document.activeElement.blur();
    await h.wait();
    expect(el.$isOpen).toBe(false);
    el.$showMenu();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    el.$hideMenu();
    await h.wait();

    // checking if sync-call works as expected
    el.$showMenu();
    el.$hideMenu();
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.getAttribute("opened")).toBeFalsy();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    el.blur();
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // case: popups are visible and not closed (if change focus by Tab)
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem.tagName === "WUP-POPUP") {
        /** @type CSSStyleDeclaration */
        return { animationDuration: "0.3s", animationName: "WUP-POPUP-a1" };
      }
      return orig(elem);
    });

    /** @type WUPSelectControl */
    const el2 = document.body.appendChild(document.createElement(el.tagName));
    await h.wait();
    const goShowMenu = jest.spyOn(el, "goShowMenu");
    expect(el.$isFocused).toBe(false);
    el.focus();
    await h.wait(1); // start animation
    expect(el.$isOpen).toBe(true);
    expect(goShowMenu).toBeCalled();

    el2.focus();
    await h.wait();
    expect(el2.$isOpen).toBe(true);
    expect(el.$isOpen).toBe(false);

    el2.$hideMenu();
    await h.wait();
    expect(el2.$isOpen).toBe(false);
    expect(el2.$isFocused).toBe(true);
    expect(el2.$refPopup).toBeDefined();
    el2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el2.$isOpen).toBe(true);
    expect(el.$isOpen).toBe(false);

    // test if $showMenu() resolve only when popup is show-end
    document.body.innerHTML = "";
    /** @type WUPSelectControl */
    el = document.body.appendChild(document.createElement(el.tagName));
    await h.wait();
    expect(el.$refPopup).toBeFalsy();
    onShow.mockClear();
    el.$showMenu().then(onShow);
    await h.wait(100);
    expect(el.$isOpen).toBe(true);
    expect(onShow).not.toBeCalled(); // because of animation
    await h.wait();
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
  });

  test("menu navigation", async () => {
    const was = HTMLElement.prototype.scrollIntoViewIfNeeded;
    HTMLElement.prototype.scrollIntoViewIfNeeded = () => undefined; // just for coverage
    el.focus();
    await h.wait();
    expect(el.$refPopup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup menu=\\"\\" style=\\"min-width: 100px;\\"><ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\">Donny</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt4\\">Mikky</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\">Leo</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt6\\">Splinter</li></ul></wup-popup>"`
    );

    const setItems = async (items) => {
      el.$hideMenu();
      await h.wait();
      el.$options.items = items;
      await h.wait();
      el.$showMenu();
      await h.wait();
    };

    await setItems([]);
    expect(el.$refPopup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup menu=\\"\\" style=\\"min-width: 100px;\\"><ul id=\\"txt7\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-disabled=\\"true\\" aria-selected=\\"false\\">No Items</li></ul></wup-popup>"`
    );

    await setItems(() => Promise.resolve(getItems()));
    expect(el.$refPopup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup menu=\\"\\" style=\\"min-width: 100px;\\"><ul id=\\"txt8\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt9\\">Donny</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt10\\">Mikky</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt11\\">Leo</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt12\\">Splinter</li></ul></wup-popup>"`
    );

    // menu navigation by arrowKeys
    expect(el.$isOpen).toBe(true);
    const menuIds = ["txt9", "txt10", "txt11", "txt12"];
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[0]);
    expect(el.querySelectorAll("[aria-selected='true']").length).toBe(0);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[1]);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[2]);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[1]);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[2]);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[3]);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[0]);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[3]);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[2]);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toBe(getItems()[2].value);
    expect(el.$isOpen).toBe(false);

    // open again and pressEsc to close menu
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[3]);
    expect(el.querySelector("[aria-selected='true']")?.id).toBe(menuIds[2]);
    expect(el.querySelectorAll("[aria-selected='true']").length).toBe(1);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toBe(getItems()[2].value); // no changes
    expect(el.$isOpen).toBe(false);

    // checking if resetValue still works
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).not.toBe(getItems()[2].value);

    // open again and check if selectedValue is correct
    el.$value = getItems()[3].value;
    await h.wait();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.querySelector("[aria-selected='true']")?.id).toBe(menuIds[3]);
    expect(el.querySelectorAll("[aria-selected='true']").length).toBe(1);

    HTMLElement.prototype.scrollIntoViewIfNeeded = was;
  });

  test("menu filtering by input", async () => {
    el.$options.items = [
      { value: 10, text: "Donny" },
      { value: 20, text: "Dona Rose" },
      { value: 30, text: "Leo" },
    ];
    await h.wait();
    expect(el.$value).toBeFalsy();
    el.focus();
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\">Donny</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt4\\">Dona Rose</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\">Leo</li></ul>"`
    );

    await h.typeInputText(el.$refInput, "d");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\" focused=\\"\\">Donny</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt4\\">Dona Rose</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\" style=\\"display: none;\\">Leo</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toBe(10); // because selected Donny
    expect(el.$refInput.value).toBe("Donny");

    // ordinary filter: 2 items starts with 'do' ignoring case
    await h.typeInputText(el.$refInput, "do");
    expect(el.$refInput.value).toBe("do");
    expect(el.$isOpen).toBe(true); // open when user opens filter
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toBe(20); // because selected DoneRose
    expect(el.$refInput.value).toBe("Dona Rose");

    // when 'No items' are shown
    const was = el.$value;
    await h.typeInputText(el.$refInput, "123");
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id=\\"txt2\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt3\\" style=\\"display: none;\\">Donny</li><li role=\\"option\\" aria-selected=\\"true\\" id=\\"txt4\\" style=\\"display: none;\\">Dona Rose</li><li role=\\"option\\" aria-selected=\\"false\\" id=\\"txt5\\" style=\\"display: none;\\">Leo</li><li role=\\"option\\" aria-disabled=\\"true\\" aria-selected=\\"false\\">No Items</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toBe(was); // previous value because no selected according to filter
    expect(el.$refInput.value).toBe("Dona Rose");

    // filter by other words
    el.$value = 10;
    await h.wait();
    expect(el.$refInput.value).toBe("Donny");
    await h.typeInputText(el.$refInput, "rose"); // filter by second word
    expect(el.$isOpen).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toBe(was); // previous value because no selected according to filter
    expect(el.$refInput.value).toBe("Dona Rose");

    // when items are empty
    el.$options.items = [];
    await h.wait();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id=\\"txt6\\" role=\\"listbox\\" aria-label=\\"Items\\"><li role=\\"option\\" aria-disabled=\\"true\\" aria-selected=\\"false\\">No Items</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
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

    onSubmit.mockClear();
    el.$showMenu();
    await h.wait();
    expect(el.$isOpen).toBe(true);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", altKey: true, bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1);
    expect(el.$isOpen).toBe(true);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(2);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(3);
    expect(el.$isOpen).toBe(true);
  });
});

// todo e2e: click on title again or on input doesn't close popup
// todo test option showCase
// testcase (close menu by outside click): to reproduce focus > pressEsc > typeText > try close by outside click
