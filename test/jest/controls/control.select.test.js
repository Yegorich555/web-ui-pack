import { WUPSelectControl } from "web-ui-pack";
import { ShowCases } from "web-ui-pack/controls/baseCombo";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

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
    validationsSkip: ["_parse", "_mask"],
    attrs: { items: { skip: true } },
    $options: { items: { skip: true } },
    onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("attr [initValue] (extra tests)", async () => {
    el.$options.items = [
      { value: 2, text: "Dark" },
      { value: null, text: "Default" },
      { value: 3, text: "Green" },
    ];
    el.setAttribute("initvalue", "");
    await h.wait();
    expect(el.$initValue).toBe(null);
    expect(el.$value).toBe(null);
    expect(el.$refInput.value).toBe("Default");
    expect(el.getAttribute("initvalue")).toBe("");

    // checking when items empty
    el.$options.items = [];
    el.removeAttribute("initvalue");
    el.setAttribute("initvalue", ""); // to trigger set value again
    await h.wait();
    expect(el.$value).toBe(undefined);
    expect(el.$initValue).toBe(undefined);
    expect(el.$refInput.value).toBeFalsy();

    delete el._cachedItems;

    const onErr = jest.spyOn(el, "throwError").mockImplementationOnce(() => {});
    el.setAttribute("items", "");
    jest.advanceTimersByTime(1);
    el.$initValue = undefined;
    expect(el.$options.items?.length).toBe(0);
    expect((await el.getItems())?.length).toBe(0);
    expect(onErr.mock.lastCall[0]).toMatchInlineSnapshot(
      `"Value not found according to attribute [items] in 'window.'"`
    );
  });

  test("pending state", async () => {
    el.changePending(true);
    expect(el.$isPending).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" aria-busy="true" readonly=""><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-spin style="display: none;"><div></div></wup-spin></wup-select>"`
    );

    el.changePending(true);
    expect(el.$isPending).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" aria-busy="true" readonly=""><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-spin style="display: none;"><div></div></wup-spin></wup-select>"`
    );

    el.changePending(false);
    expect(el.$isPending).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-select>"`
    );

    // checking if value applied properly when items is promise
    await h.wait();
    document.activeElement.blur();
    await h.wait();
    const mockRequest = jest.fn();
    el.$options.items = () => {
      mockRequest();
      return new Promise((resolve) => setTimeout(() => resolve(getItems()), 100));
    };
    el.$value = 10;
    await h.wait(10);
    expect(el.$refInput.value).toBe("");
    expect(el.$isPending).toBe(true);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })); // keydown events must be skipped because of pending
    el.$showMenu(); // showMenu must be skipped because of pending
    // await h.userClick(el); // WARN; somehow it blocks Promise.resolve - it's test-issue
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$refInput.value).toBe("Donny");
    expect(mockRequest).toBeCalledTimes(1);

    // checking cached items
    el.$value = 20;
    await h.wait(10);
    expect(mockRequest).toBeCalledTimes(1);
    expect(el.$isPending).toBe(false); // no pending because items were cached
    expect(el.$refInput.value).toBe("Mikky");

    // when menu is opening but user moved focus to another;
    el.blur();
    await h.wait();
    el.$options.items = () => {
      mockRequest();
      return new Promise((resolve) => setTimeout(() => resolve(getItems()), 100));
    };
    await h.wait(1);
    el.focus();
    await h.wait(10);
    expect(el.$isOpen).toBe(true);
    el.blur();
    await h.wait();
    expect(el.$isOpen).toBe(false);
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
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup).toBeDefined();
    await h.wait();
    expect(onHide).toBeCalledTimes(0);
    expect(onShow).toBeCalledTimes(1);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items"><li role="option">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select opened=""><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" aria-owns="txt2" aria-controls="txt2"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup menu="" style="min-width: 100px;"><ul id="txt2" role="listbox" aria-label="Items"><li role="option">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup></wup-select>"`
    );

    // closing by Esc
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$refPopup).toBeDefined(); // disposed only by focus out
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" aria-owns="txt2" aria-controls="txt2"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup menu="" style="min-width: 100px;"><ul id="txt2" role="listbox" aria-label="Items"><li role="option">Donny</li><li role="option" aria-selected="false">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup></wup-select>"`
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

    // checking when default Enter behavior is prevented
    el._focusedMenuItem.addEventListener("click", (e) => e.preventDefault(), { once: true });
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // hide by outside click
    el.$showMenu();
    await h.wait();
    expect(el.$isOpen).toBe(true);
    el.focus(); // without focus click events are not handled
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // open by click control
    await h.userClick(el);
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpen).toBe(true);

    // hide by click control again
    await h.userClick(el);
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpen).toBe(false);

    // opening by text in input
    await h.userTypeText(el.$refInput, "S");
    await h.wait();
    expect(el.$isOpen).toBe(true);

    // try to show again - for coverage
    await el.$showMenu();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    // stay open even by popupClick
    el.focus(); // without focus click events are not handled
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
    el.blur();
    el.$options.readOnlyInput = true;
    await h.wait();
    expect(el.$refInput.readOnly).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-owns="txt2" aria-controls="txt2" readonly=""><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-select>"`
    );
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isOpen).toBe(true); // because got focus by user click
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isOpen).toBe(false);

    el.$options.readOnlyInput = false;
    await h.wait(1);
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isOpen).toBe(false); // no-effect because by default click on input is filtered

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
    el.focus();
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

    // cover hide after show when menu is opening
    el.$options.items = () => new Promise((res) => setTimeout(() => res(getItems()), 100));
    await h.wait(1);
    el.$showMenu();
    expect(el.$isOpen).toBe(true);
    await h.wait(10);
    el.$hideMenu();
    expect(el.$isOpen).toBe(false);
    await h.wait();

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
      `"<wup-popup menu="" style="min-width: 100px;"><ul id="txt2" role="listbox" aria-label="Items"><li role="option">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup>"`
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
      `"<wup-popup menu="" style="min-width: 100px;"><ul id="txt3" role="listbox" aria-label="Items"><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul></wup-popup>"`
    );

    // click on No-Items
    const onErr = h.mockConsoleError();
    expect(() => el.$refPopup.querySelector("li").click()).not.toThrow();
    expect(onErr).not.toBeCalled();
    h.unMockConsoleError();

    await setItems(() => Promise.resolve(getItems()));
    expect(el.$refPopup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup menu="" style="min-width: 100px;"><ul id="txt4" role="listbox" aria-label="Items"><li role="option">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup>"`
    );

    // menu navigation by arrowKeys
    expect(el.$isOpen).toBe(true);
    const menuIds = ["txt5", "txt6", "txt7", "txt8"]; // WARN it's depeneds on test code before
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

    // Home/End keys works ordinary when menu is closed
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);

    // Home/End keys works ordinary when menu is opened
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[2]);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[0]);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[3]);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await h.wait();

    // open again and pressEsc to close menu
    expect(el.$isOpen).toBe(false);
    el.$value = undefined;
    await h.wait(1);
    expect(el._selectedMenuItem).toBe(null);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[3]);
    expect(el.querySelector("[aria-selected='true']")?.id).toBe(undefined);
    expect(el.querySelectorAll("[aria-selected='true']").length).toBe(0);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toBe(getItems()[3].value);
    expect(el.$isOpen).toBe(false);

    // if resetValue still works
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).not.toBe(getItems()[2].value);

    // open again and check if selectedValue is correct
    el.$value = getItems()[3].value;
    await h.wait();
    expect(el.$isFocused).toBe(true);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.querySelector("[aria-selected='true']")?.id).toBe(menuIds[3]);
    expect(el.querySelectorAll("[aria-selected='true']").length).toBe(1);

    HTMLElement.prototype.scrollIntoViewIfNeeded = was;

    // when user changed text No Items
    const wasText = WUPSelectControl.$textNoItems;
    WUPSelectControl.$textNoItems = "";
    await setItems([]);
    expect(el.$refPopup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup menu="" hidden="" style="min-width: 100px;"><ul id="txt10" role="listbox" aria-label="Items"></ul></wup-popup>"`
    );
    WUPSelectControl.$textNoItems = wasText;

    // when items is function with promise
    await setItems(() => Promise.resolve(getItems()));
    el.testMe = false;
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt11" role="listbox" aria-label="Items"><li role="option">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option" aria-selected="true">Splinter</li></ul>"`
    );

    // when items is function without promise
    await setItems(() => getItems().slice(0, 2));
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt12" role="listbox" aria-label="Items"><li role="option">Donny</li><li role="option">Mikky</li></ul>"`
    );

    // when items has custom render
    await setItems([
      {
        value: 123,
        text: (val, li, i) => {
          li.textContent = `testVal-${val}_${i}`;
          return li.textContent;
        },
      },
    ]);
    el.$value = 123;
    await h.wait();
    expect(el.$refInput.value).toBe("testVal-123_0");

    // cover impossible case
    const el2 = document.body.appendChild(document.createElement("wup-select"));
    await h.wait(1);
    expect(() => el2.focusMenuItemByKeydown(new KeyboardEvent("keydown", { key: "ArrowDown" }))).not.toThrow();
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
      `"<ul id="txt2" role="listbox" aria-label="Items"><li role="option">Donny</li><li role="option">Dona Rose</li><li role="option">Leo</li></ul>"`
    );

    await h.userTypeText(el.$refInput, "d");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items"><li role="option" aria-selected="false" id="txt3" focused="">Donny</li><li role="option">Dona Rose</li><li role="option" style="display: none;">Leo</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toBe(10); // because selected Donny
    expect(el.$refInput.value).toBe("Donny");

    // ordinary filter: 2 items starts with 'do' ignoring case
    await h.userTypeText(el.$refInput, "do");
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
    await h.userTypeText(el.$refInput, "123");
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items"><li role="option" aria-selected="false" id="txt3" style="display: none;">Donny</li><li role="option" aria-selected="true" id="txt4" style="display: none;">Dona Rose</li><li role="option" style="display: none;">Leo</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
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
    await h.userTypeText(el.$refInput, "rose"); // filter by second word
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
    const err = h.mockConsoleError();
    el.$options.items = [];
    await h.wait();
    expect(el.$isFocused).toBe(true);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt5" role="listbox" aria-label="Items"><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(err).toBeCalledTimes(1); // because value not found in items
    expect(el.$refInput.value).toMatchInlineSnapshot(`"Error: not found for 20"`);

    err.mockClear();
    el.$options.name = "names";
    el.$value = null;
    await h.wait();
    expect(err).toBeCalledTimes(1); // because value not found in items
    expect(el.$refInput.value).toMatchInlineSnapshot(`"Error: not found for "`);
    h.unMockConsoleError();
  });

  test("submit by Enter key", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    await h.wait();

    el.focus();
    await h.wait();
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

    // el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
    // await h.wait(1);
    // expect(onSubmit).toBeCalledTimes(2);
    // el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
    // await h.wait(1);
    // expect(onSubmit).toBeCalledTimes(3);
    // expect(el.$isOpen).toBe(true);
  });

  test("select by click on menu-item", async () => {
    el.focus();
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$value).toBe(undefined);

    const arrLi = el.$refPopup.querySelectorAll("li");
    expect(arrLi.length).toBe(4);
    await h.userClick(arrLi[1]);
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toBe(20);

    await h.userClick(el);
    await h.wait();
    expect(el.$isOpen).toBe(true);
    await h.userClick(arrLi[2]);
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toBe(30);

    // click on item inside li
    const span = arrLi[1].appendChild(document.createElement("span"));
    await h.userClick(el);
    await h.wait();
    await h.userClick(span);
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toBe(20);
  });

  test("no opening by click on btnClear", async () => {
    el.$value = 10;
    await h.wait(1);
    el.focus();
    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$isFocused).toBe(true);

    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$isFocused).toBe(true);

    el.$refLabel.click();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isOpen).toBe(true); // no hide if was click on button-clear
  });

  describe("options", () => {
    test("showCase", async () => {
      // showCase: focus
      el.focus();
      await h.wait();
      await h.wait();
      expect(el.$isOpen).toBe(true);

      document.activeElement.blur();
      await h.wait();
      expect(el.$isOpen).toBe(false);

      el.$options.showCase &= ~ShowCases.onFocus; // remove option
      el.focus();
      await h.wait();
      expect(el.$isOpen).toBe(false);

      el.blur();
      await h.wait();
      el.focus();
      el.click(); // simulate mouseClick + focus
      await h.wait();
      expect(el.$isOpen).toBe(true);

      // showCase: onInput
      await h.userTypeText(el.$refInput, "d");
      expect(el.$isOpen).toBe(true);

      el.$hideMenu();
      el.$options.showCase &= ~ShowCases.onInput; // remove option
      await h.wait();
      await h.userTypeText(el.$refInput, "a");
      await h.wait();
      expect(el.$isOpen).toBe(false);

      // showCase: Click
      el.click();
      await h.wait();
      expect(el.$isOpen).toBe(true);
      el.focus();
      await h.wait(1);

      await h.userClick(el);
      await h.wait();
      expect(el.$isOpen).toBe(false);
      el.$options.showCase &= ~ShowCases.onClick; // remove option
      el.click();
      await h.wait();
      expect(el.$isOpen).toBe(false);

      el.$showMenu();
      await h.wait();
      el.click();
      await h.wait();
      expect(el.$isOpen).toBe(true); // no-hidding when click option is disabled

      el.$hideMenu();
      await h.wait();
      // showCase: inputClick
      el.$options.showCase |= ShowCases.onClick; // enable click again
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isOpen).toBe(false); // because click by input is disabled
      el.$options.showCase |= ShowCases.onClickInput;
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isOpen).toBe(true);
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isOpen).toBe(false);

      // showCase: ArrowKeys
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isOpen).toBe(true);
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isOpen).toBe(false);
      el.$options.showCase &= ~ShowCases.onPressArrowKey; // remove option
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isOpen).toBe(false);
    });

    test("allowNewValue", async () => {
      el.$options.allowNewValue = true;
      const onChange = jest.fn();
      el.addEventListener("$change", onChange);
      await h.wait();
      expect(el.$options.allowNewValue).toBe(true);

      const check = async (arr, event) => {
        for (let i = 0; i < arr.length; ++i) {
          onChange.mockClear();
          await h.userTypeText(el.$refInput, arr[i].userText);
          await h.wait();
          await h.wait();
          expect(el.$refInput.value).toBe(arr[i].userText);
          event();
          await h.wait();
          expect(el.$value).toBe(arr[i].expectedValue);
          expect(el.$refInput.value).toBe(arr[i].userText);
          expect(onChange).toBeCalledTimes(1);
          expect(el.$isOpen).toBe(false); // closed by enter or focusOut
        }
      };

      // user can select value by pressing enter
      await check(
        [
          { userText: "Someone new", expectedValue: "Someone new" }, // user can create another value
          { userText: "Don", expectedValue: "Don" }, // user can create a new value that mathes by filters
          { userText: "Donny", expectedValue: 10 }, // user can select exact value without ArrowKeys
          { userText: "Leo", expectedValue: 30 }, // check it again
          { userText: "", expectedValue: undefined },
          { userText: "Smt new", expectedValue: "Smt new" },
        ],
        () =>
          el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
      );

      // when open again filtering must be cleared
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isOpen).toBe(true);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt2" role="listbox" aria-label="Items"><li role="option" style="" aria-selected="false" id="txt3" focused="">Donny</li><li role="option" style="">Mikky</li><li role="option" style="" aria-selected="false">Leo</li><li role="option" style="">Splinter</li><li role="option" aria-disabled="true" aria-selected="false" style="display: none;">No Items</li></ul>"`
      );

      // user can select value by focus left
      await check(
        [
          { userText: "Someone new", expectedValue: "Someone new" }, // user can create another value
          { userText: "Don", expectedValue: "Don" }, // user can create a new value that mathes by filters
          { userText: "Donny", expectedValue: 10 }, // user can select exact value without ArrowKeys
          { userText: "Leo", expectedValue: 30 }, // check it again
          { userText: "", expectedValue: undefined },
        ],
        () => document.activeElement.blur()
      );

      el.$value = 10;
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny");
      el.$value = null;
      await h.wait(1);
      expect(el.$refInput.value).toBe("");
    });
  });
});

// manual testcase (close menu by outside click): to reproduce focus > pressEsc > typeText > try close by outside click
