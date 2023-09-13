/* eslint-disable no-irregular-whitespace */
import { WUPSelectControl } from "web-ui-pack";
import { ShowCases } from "web-ui-pack/controls/baseCombo";
import observer from "web-ui-pack/helpers/observer";
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
      "w-multiple": { value: true },
      "w-items": { value: getItems() },
    },
    initValues: [
      { attrValue: "10", value: 10 },
      { attrValue: "20", value: 20 },
      { attrValue: "30", value: 30 },
    ],
    validations: {},
    validationsSkip: ["_parse", "_mask", "minCount", "maxCount"], // min & max tested with selectMany
    onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("attr [initValue] (extra tests)", async () => {
    el.$options.items = [
      { value: 2, text: "Dark" },
      { value: null, text: "Default" },
      { value: 3, text: "Green" },
    ];
    el.setAttribute("w-initvalue", "");
    await h.wait();
    expect(el.$initValue).toBe(null);
    expect(el.$value).toBe(null);
    expect(el.$refInput.value).toBe("Default");
    expect(el.getAttribute("w-initvalue")).toBe("");

    // checking when items empty
    h.mockConsoleError();
    el.$options.items = [];
    el.removeAttribute("w-initvalue");
    el.setAttribute("w-initvalue", ""); // to trigger set value again
    await h.wait();
    expect(el.$value).toBe(undefined);
    expect(el.$initValue).toBe(undefined);
    expect(el.$refInput.value).toBeFalsy();
    h.unMockConsoleError();
    delete el._cachedItems;

    const onErr = jest.spyOn(el, "throwError").mockImplementationOnce(() => {});
    el.setAttribute("w-items", "");
    jest.advanceTimersByTime(1);
    el.$initValue = undefined;
    expect(el.$options.items?.length).toBe(0);
    expect((await el.getItems())?.length).toBe(0);
    expect(onErr.mock.lastCall[0]).toMatchInlineSnapshot(
      `"Value not found according to attribute [items] in 'window.'"`
    );

    // when need to parse but items must be fetched before
    document.body.innerHTML = "";
    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.items = new Promise((res) => setTimeout(() => res(getItems(), 100)));
    el.setAttribute("w-initvalue", "10");
    await h.wait();
    expect(el.$isPending).toBe(false);
    expect(el.$initValue).toBe(10);
    expect(el.$value).toBe(10);
    expect(el.$refInput.value).toBe("Donny");
  });

  test("$options.items & $value", () => {
    el = document.body.appendChild(document.createElement(el.tagName));
    const onErr = h.mockConsoleError();
    // before ready
    el.$options.items = [{ text: "Helica", value: 10 }];
    el.$value = 10;
    jest.advanceTimersByTime(2);
    expect(onErr).not.toBeCalled();
    expect(el.$refInput.value).toBe("Helica");
    // after ready
    el.$options.items = [{ text: "Harry", value: 11 }];
    el.$value = 11;
    jest.advanceTimersByTime(2);
    expect(onErr).not.toBeCalled();
    expect(el.$refInput.value).toBe("Harry");

    const item = { text: "Helica", value: 5 };
    el.$options.items = [item];
    jest.advanceTimersByTime(2);
    expect(onErr).toBeCalledTimes(1); // because it doesn't fit value 11
    expect(el.$options.items[0]).toBe(item); // nested items must be not observed
    expect(observer.isObserved(el.$options.items)).toBe(true); // but Array items itself must be observed

    // complex values with id's
    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.items = [
      { text: "Helica", value: { id: 1, name: "He" } },
      { text: "Diana", value: { id: 2, name: "Di" } },
    ];
    el.$value = { id: 2 };
    jest.advanceTimersByTime(2);
    expect(el.$refInput.value).toBe("Diana");
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
    await h.wait(1);
    expect(el.$refInput.value).toBe("");
    el.$value = 10;
    await h.wait(10);
    expect(el.$isPending).toBe(true);
    expect(el.$refInput.value).toBe("");
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })); // keydown events must be skipped because of pending
    el.$showMenu(); // showMenu must be skipped because of pending
    // await h.userClick(el); // WARN; somehow it blocks Promise.resolve - it's test-issue
    await h.wait();
    expect(el.$isShown).toBe(false);
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
    expect(el.$isShown).toBe(false);
    el.blur();
    await h.wait();
    expect(el.$isShown).toBe(false);

    el.$options.items = () => Promise.resolve(null);
    await h.wait();
    expect(el._cachedItems).toStrictEqual([]); // empty array to avoid future bugs if somehow fetch returns nothing

    // cover case when somehow items not fetched before
    el = document.body.appendChild(document.createElement(el.tagName));
    expect(el.getItems()).toStrictEqual([]);
    expect(() => jest.advanceTimersByTime(1)).toThrow(); // because items not fetched yet but gotItems is called
  });

  test("$show/$hide menu", async () => {
    el.$initValue = 20;
    expect(el.$isShown).toBe(false);
    const onShow = jest.fn();
    const onHide = jest.fn();
    el.addEventListener("$showMenu", onShow);
    el.addEventListener("$hideMenu", onHide);
    el.$onShowMenu = jest.fn();
    el.$onHideMenu = jest.fn();

    // opening by focus
    el.focus();
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup).toBeDefined();
    await h.wait();
    expect(onHide).toBeCalledTimes(0);
    expect(onShow).toBeCalledTimes(1);
    expect(el.$onShowMenu).toBeCalledTimes(1);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select opened=""><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" aria-owns="txt2" aria-controls="txt2"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup menu="" style="min-width: 100px;"><ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup></wup-select>"`
    );

    // closing by Esc
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$refPopup).toBeDefined(); // disposed only by focus out
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" aria-owns="txt2" aria-controls="txt2"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup menu="" style="min-width: 100px;"><ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option" aria-selected="false">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup></wup-select>"`
    );
    expect(onHide).toBeCalledTimes(1);
    expect(el.$onHideMenu).toBeCalledTimes(1);
    expect(onShow).toBeCalledTimes(1);

    // opening by call $show()
    jest.clearAllMocks();
    el.$showMenu();
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(onHide).toBeCalledTimes(0);
    expect(onShow).toBeCalledTimes(1);

    // closing by call $hide()
    el.$hideMenu();
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(onHide).toBeCalledTimes(1);
    expect(onShow).toBeCalledTimes(1);

    // opening by keyboard
    jest.clearAllMocks();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);
    // again
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(onShow).toBeCalledTimes(1);

    // closing by select (by enter)
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$refPopup).toBeDefined();

    // opening by keyboard
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);

    // checking when default Enter behavior is prevented
    el._focusedMenuItem.addEventListener("click", (e) => e.preventDefault(), { once: true });
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);

    // hide by outside click
    el.$showMenu();
    await h.wait();
    expect(el.$isShown).toBe(true);
    el.focus(); // without focus click events are not handled
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);

    // open by click control
    await h.userClick(el);
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isShown).toBe(true);

    // hide by click control again
    await h.userClick(el);
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isShown).toBe(false);

    // opening by text in input
    await h.userTypeText(el.$refInput, "S");
    await h.wait();
    expect(el.$isShown).toBe(true);

    // try to show again - for coverage
    await el.$showMenu();
    await h.wait();
    expect(el.$isShown).toBe(true);

    // stay open even by popupClick
    el.focus(); // without focus click events are not handled
    el.$refPopup.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);

    el.$hideMenu();
    await h.wait();

    // no opening when readonly
    el.$options.readOnly = true;
    el.$showMenu();
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    // not opening when click on input without readonly (to allow user edit input value without menu)
    el.$options.readOnly = false;
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$isFocused).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);

    // opening when click on input with readonly (to allow user edit input value without menu)
    el.blur();
    el.$options.readOnlyInput = true;
    await h.wait();
    expect(el.$refInput.readOnly).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-owns="txt2" aria-controls="txt2" readonly=""><strong></strong></span><button clear="back" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-select>"`
    );
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isShown).toBe(true); // because got focus by user click
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isShown).toBe(false);

    el.$options.readOnlyInput = false;
    await h.wait(1);
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isShown).toBe(false); // no-effect because by default click on input is filtered

    // checking with disabled
    el.$showMenu();
    expect(el.$isShown).toBe(true);
    el.$options.disabled = true;
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    el.$options.disabled = false;
    await h.wait();

    // not closing when click on input without readonly (to allow user edit input value without menu)
    el.$showMenu();
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$isFocused).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);

    // checking when hiding is not finished and opened again
    el.$hideMenu();
    el.$showMenu();
    await h.wait();
    expect(el.$isShown).toBe(true);

    // checking showMenu takes time and popup is removed because of $options.readOnly applied
    el.$hideMenu();
    await h.wait();
    el.$showMenu();
    el.$options.readOnly = true;
    await h.wait();
    expect(el.$refPopup).not.toBeDefined();
    expect(el.$isShown).toBe(false);

    // removing by blur
    el.$hideMenu(); // close before to check if it works when need remove when closed
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    document.activeElement.blur();
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    // checking when refPopup is removed
    el.$hideMenu();
    await h.wait();

    // checking when not-focused
    el.$options.readOnly = false;
    document.activeElement.blur();
    await h.wait();
    expect(el.$isShown).toBe(false);
    el.$showMenu();
    await h.wait();
    expect(el.$isShown).toBe(true);

    el.$hideMenu();
    await h.wait();

    // checking if sync-call works as expected
    el.$showMenu();
    el.focus();
    el.$hideMenu();
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.getAttribute("opened")).toBeFalsy();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait(1);
    el.blur();
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$refPopup).toBeFalsy();

    // cover hide after show while menu is opening
    expect(el.$refPopup).toBeFalsy();
    const renderMenu = jest.spyOn(WUPSelectControl.prototype, "renderMenu");
    el.$showMenu();
    expect(renderMenu).toBeCalledTimes(1);
    el.$hideMenu();
    await h.wait(10);
    expect(el.$isShown).toBe(false);
    await h.wait();
    expect(el.$isShown).toBe(false);

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
    expect(el.$isShown).toBe(true);
    expect(goShowMenu).toBeCalled();

    el2.focus();
    await h.wait();
    expect(el2.$isShown).toBe(true);
    expect(el.$isShown).toBe(false);

    el2.$hideMenu();
    await h.wait();
    expect(el2.$isShown).toBe(false);
    expect(el2.$isFocused).toBe(true);
    expect(el2.$refPopup).toBeDefined();
    el2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el2.$isShown).toBe(true);
    expect(el.$isShown).toBe(false);

    // test if $showMenu() resolve only when popup is show-end
    document.body.innerHTML = "";
    el = document.body.appendChild(document.createElement(el.tagName));
    await h.wait();
    expect(el.$refPopup).toBeFalsy();
    onShow.mockClear();
    el.$showMenu().then(onShow);
    await h.wait(100);
    expect(el.$isShown).toBe(true);
    expect(onShow).not.toBeCalled(); // because of animation
    await h.wait();
    await h.wait();
    expect(onShow).toBeCalledTimes(1);
  });

  test("menu navigation", async () => {
    el.focus();
    await h.wait();
    expect(el.$refPopup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup menu="" style="min-width: 100px;"><ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup>"`
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
      `"<wup-popup menu="" style="min-width: 100px;"><ul id="txt3" role="listbox" aria-label="Items" tabindex="-1"><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul></wup-popup>"`
    );

    // click on No-Items
    const onErr = h.mockConsoleError();
    expect(() => el.$refPopup.querySelector("li").click()).not.toThrow();
    expect(onErr).not.toBeCalled();
    h.unMockConsoleError();

    await setItems(() => Promise.resolve(getItems()));
    expect(el.$refPopup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup menu="" style="min-width: 100px;"><ul id="txt4" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup>"`
    );

    // menu navigation by arrowKeys
    expect(el.$isShown).toBe(true);
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
    expect(el.$isShown).toBe(false);

    // Home/End keys works ordinary when menu is closed
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);

    // Home/End keys works ordinary when menu is opened
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);
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
    expect(el.$isShown).toBe(false);
    el.$value = undefined;
    await h.wait(1);
    expect(el._selectedMenuItem).toBe(null);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$refInput.getAttribute("aria-activedescendant")).toBe(menuIds[3]);
    expect(el.querySelector("[aria-selected='true']")?.id).toBe(undefined);
    expect(el.querySelectorAll("[aria-selected='true']").length).toBe(0);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toBe(getItems()[3].value);
    expect(el.$isShown).toBe(false);

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
    expect(el.$isShown).toBe(true);
    expect(el.querySelector("[aria-selected='true']")?.id).toBe(menuIds[3]);
    expect(el.querySelectorAll("[aria-selected='true']").length).toBe(1);

    // when user changed text No Items
    h.mockConsoleError();
    const wasText = WUPSelectControl.$textNoItems;
    WUPSelectControl.$textNoItems = "";
    await setItems([]);
    expect(el.$refPopup.outerHTML).toMatchInlineSnapshot(
      `"<wup-popup menu="" hidden="" style="min-width: 100px;"><ul id="txt10" role="listbox" aria-label="Items" tabindex="-1"></ul></wup-popup>"`
    );
    WUPSelectControl.$textNoItems = wasText;

    // when items is function with promise
    await setItems(() => Promise.resolve(getItems()));
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt11" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option" aria-selected="true">Splinter</li></ul>"`
    );

    // when items is function without promise
    await setItems(() => getItems().slice(0, 2));
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt12" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option">Mikky</li></ul>"`
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
    h.unMockConsoleError();
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
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option">Dona Rose</li><li role="option">Leo</li></ul>"`
    );

    await h.userTypeText(el.$refInput, "d");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option" aria-selected="false" id="txt3" focused="">Donny</li><li role="option">Dona Rose</li><li role="option" style="display: none;">Leo</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toBe(10); // because selected Donny
    expect(el.$refInput.value).toBe("Donny");

    // ordinary filter: 2 items starts with 'do' ignoring case
    await h.userTypeText(el.$refInput, "do");
    expect(el.$refInput.value).toBe("do");
    expect(el.$isShown).toBe(true); // open when user opens filter
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toBe(20); // because selected DoneRose
    expect(el.$refInput.value).toBe("Dona Rose");

    // when 'No items' are shown
    const was = el.$value;
    await h.userTypeText(el.$refInput, "123");
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option" aria-selected="false" id="txt3" style="display: none;">Donny</li><li role="option" aria-selected="true" id="txt4" style="display: none;">Dona Rose</li><li role="option" style="display: none;">Leo</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toBe(was); // previous value because no selected according to filter
    expect(el.$refInput.value).toBe("Dona Rose");
    // again with button clear
    el.$options.clearActions = 0;
    await h.wait(1);
    await h.userTypeText(el.$refInput, "123");
    expect(el.$isShown).toBe(true);
    el.clearValue();
    expect(el.$refInput.value).toBe("");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option" aria-selected="false" id="txt3" style="">Donny</li><li role="option" aria-selected="false" id="txt4" style="">Dona Rose</li><li role="option" style="">Leo</li><li role="option" aria-disabled="true" aria-selected="false" style="display: none;">No Items</li></ul>"`
    );

    // filter by other words
    el.$value = 10;
    await h.wait();
    expect(el.$refInput.value).toBe("Donny");
    await h.userTypeText(el.$refInput, "rose"); // filter by second word
    expect(el.$isShown).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toBe(was); // previous value because no selected according to filter
    expect(el.$refInput.value).toBe("Dona Rose");

    // when items are empty
    const err = h.mockConsoleError();
    el.$options.items = [];
    await h.wait();
    err.mockClear();
    expect(el.$isFocused).toBe(true);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt6" role="listbox" aria-label="Items" tabindex="-1"><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(err).toBeCalledTimes(1); // because value not found in items
    expect(el.$refInput.value).toMatchInlineSnapshot(`"Error: not found for 20"`);

    err.mockClear();
    el.$options.name = "names";
    el.$value = null;
    await h.wait();
    expect(err).toBeCalledTimes(1); // because value not found in items
    expect(el.$refInput.value).toMatchInlineSnapshot(`"Error: not found for "`);
    h.unMockConsoleError();

    // case when menu is hidden 1st time and opened 2nd by input
    document.body.innerHTML = "";
    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.items = () => new Promise((res) => setTimeout(() => res(getItems()), 100));
    const onCanShow = jest.spyOn(el, "canShowMenu").mockReturnValue(false);
    await h.wait(1);
    el.focus();
    await h.wait();
    expect(el.$isShown).toBe(false);
    onCanShow.mockRestore();
    await expect(h.userTypeText(el.$refInput, "D")).resolves.not.toThrow();
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt8" role="listbox" aria-label="Items" tabindex="-1"><li role="option" aria-selected="false" id="txt9" focused="">Donny</li><li role="option" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" style="display: none;">Splinter</li></ul>"`
    );
  });

  test("submit by Enter key", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    await h.wait();

    el.focus();
    await h.wait();
    expect(el.$isShown).toBe(true);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(onSubmit).not.toBeCalled();
    expect(el.$isShown).toBe(false);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(onSubmit).toBeCalledTimes(1);

    onSubmit.mockClear();
    el.$showMenu();
    await h.wait();
    expect(el.$isShown).toBe(true);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", altKey: true, bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1);
    expect(el.$isShown).toBe(true);

    // el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
    // await h.wait(1);
    // expect(onSubmit).toBeCalledTimes(2);
    // el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
    // await h.wait(1);
    // expect(onSubmit).toBeCalledTimes(3);
    // expect(el.$isShown).toBe(true);
  });

  test("select by click on menu-item", async () => {
    el.focus();
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(el.$value).toBe(undefined);

    const arrLi = el.$refPopup.querySelectorAll("li");
    expect(arrLi.length).toBe(4);
    await h.userClick(arrLi[1]);
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toBe(20);

    await h.userClick(el);
    await h.wait();
    expect(el.$isShown).toBe(true);
    expect(() =>
      arrLi[2].parentElement.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true }))
    ).not.toThrow();
    await h.userClick(arrLi[2]);
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toBe(30);

    // click on item inside li
    const span = arrLi[1].appendChild(document.createElement("span"));
    await h.userClick(el);
    await h.wait();
    await h.userClick(span);
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$value).toBe(20);
  });

  test("clear by Backspace+Enter", async () => {
    el.$value = getItems()[0].value;
    el.focus();
    await h.wait();
    expect(el.$isShown).toBe(true);

    // remove whole text + press Enter => set value to undefined
    expect(el.$isRequired).toBe(false);
    expect(el.$refInput.value).toBe(getItems()[0].text);
    h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`); // select all
    expect(await h.userRemove(el.$refInput)).toBe("|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(undefined); // value resets when input empty & notRequired
    expect(el.$refInput.value).toBe("");
    expect(el.$isShown).toBe(false);

    // remove partially text + press Enter => reset to prev value
    el.$value = getItems()[0].value;
    await h.wait(1);
    expect(el.$refInput.value).toBe(getItems()[0].text);
    h.setInputCursor(el.$refInput, `${el.$refInput.value}|`);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(getItems()[0].value); // value reverted because partially removed
    expect(el.$refInput.value).toBe(getItems()[0].text);

    // remove whole text + focusOut => clear value
    el.$value = getItems()[0].value;
    el.$showMenu();
    await h.wait(1);
    h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`);
    expect(await h.userRemove(el.$refInput)).toBe("|");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option" aria-selected="false">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );
    el.blur();
    await h.wait(1);
    expect(el.$refInput.value).toBe("");
    expect(el.$value).toBe(undefined);
    // again but when menu closed - in this case filterMenuItems not fired & menu opened again by removeText
    el.$value = getItems()[0].value;
    el.focus();
    await h.wait(1);
    h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$isShown).toBe(false);
    expect(await h.userRemove(el.$refInput)).toBe("|");
    await h.wait(1);
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1"><li role="option" aria-selected="false">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );
    el.blur();
    await h.wait(1);
    expect(el.$refInput.value).toBe("");
    expect(el.$value).toBe(undefined);

    // remove whole text + press Enter when required => reset to prev value
    el.$options.validations = { required: true };
    el.$value = getItems()[1].value;
    await h.wait(1);
    el.$showMenu();
    expect(el.$isRequired).toBe(true);
    await h.wait(1);
    expect(el.$refInput.value).toBe(getItems()[1].text);
    h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`); // select all
    expect(await h.userRemove(el.$refInput)).toBe("|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(getItems()[1].value); // value reverted because isRequired
    expect(el.$refInput.value).toBe(getItems()[1].text);
    expect(el.$isShown).toBe(false);
  });

  test("no opening by click on btnClear", async () => {
    el.$value = 10;
    await h.wait(1);
    el.focus();
    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$isFocused).toBe(true);

    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.$isFocused).toBe(true);

    el.$refLabel.click();
    await h.wait();
    expect(el.$isShown).toBe(true);

    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isShown).toBe(true); // no hide if was click on button-clear
  });

  describe("options", () => {
    test("showCase", async () => {
      // showCase: focus
      el.focus();
      await h.wait();
      await h.wait();
      expect(el.$isShown).toBe(true);

      document.activeElement.blur();
      await h.wait();
      expect(el.$isShown).toBe(false);

      el.$options.showCase &= ~ShowCases.onFocus; // remove option
      el.focus();
      await h.wait();
      expect(el.$isShown).toBe(false);

      el.blur();
      await h.wait();
      el.focus();
      el.click(); // simulate mouseClick + focus
      await h.wait();
      expect(el.$isShown).toBe(true);

      // showCase: onInput
      await h.userTypeText(el.$refInput, "d");
      expect(el.$isShown).toBe(true);

      el.$hideMenu();
      el.$options.showCase &= ~ShowCases.onInput; // remove option
      await h.wait();
      await h.userTypeText(el.$refInput, "a");
      await h.wait();
      expect(el.$isShown).toBe(false);

      // showCase: Click
      el.click();
      await h.wait();
      expect(el.$isShown).toBe(true);
      el.focus();
      await h.wait(1);

      await h.userClick(el);
      await h.wait();
      expect(el.$isShown).toBe(false);

      // case when user select text in input but mouseUp outside input
      expect(el.$isShown).toBe(false);
      el.$refInput.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
      el.$refInput.dispatchEvent(new MouseEvent("mousemove", { cancelable: true, bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
      el.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true })); // click inside control but outside input
      await h.wait();
      expect(el.$isShown).toBe(false);
      // again with outside control
      el.$refInput.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
      el.$refInput.dispatchEvent(new MouseEvent("mousemove", { cancelable: true, bubbles: true }));
      document.body.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
      document.body.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true })); // click outside control
      await h.wait();
      expect(el.$isShown).toBe(false);

      el.$options.showCase &= ~ShowCases.onClick; // remove option
      el.click();
      await h.wait();
      expect(el.$isShown).toBe(false);

      el.$showMenu();
      await h.wait();
      el.click();
      await h.wait();
      expect(el.$isShown).toBe(true); // no-hiding when click option is disabled

      el.$hideMenu();
      await h.wait();
      // showCase: inputClick
      el.$options.showCase |= ShowCases.onClick; // enable click again
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isShown).toBe(false); // because click by input is disabled
      el.$options.showCase |= ShowCases.onClickInput;
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isShown).toBe(true);
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isShown).toBe(false);

      // showCase: ArrowKeys
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isShown).toBe(true);
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isShown).toBe(false);
      el.$options.showCase &= ~ShowCases.onPressArrowKey; // remove option
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isShown).toBe(false);
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
          expect(el.$isShown).toBe(false); // closed by enter or focusOut
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
      expect(el.$isShown).toBe(true);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option" style="" aria-selected="false" id="txt3" focused="">Donny</li><li role="option" style="">Mikky</li><li role="option" style="" aria-selected="false">Leo</li><li role="option" style="">Splinter</li><li role="option" aria-disabled="true" aria-selected="false" style="display: none;">No Items</li></ul>"`
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

    test("multiple", async () => {
      const onChange = jest.fn();
      el.addEventListener("$change", onChange);
      el.$options.items = getItems();
      el.$options.multiple = true;
      await h.wait(1);

      // type 1st text-value
      expect(await h.userTypeText(el.$refInput, "don", { clearPrevious: false })).toBe("don|");
      await h.wait(1);
      expect(onChange).toBeCalledTimes(0);
      expect(await h.userTypeText(el.$refInput, "ny,", { clearPrevious: false })).toBe("Donny, |"); // extra space must be added
      await h.wait(1);
      expect(el.$value).toStrictEqual([10]);
      expect(onChange).toBeCalledTimes(1);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true" id="txt3" focused="">Donny</li><li role="option" style="">Mikky</li><li role="option" style="">Leo</li><li role="option" style="">Splinter</li></ul>"`
      );

      // try again on 2nd value
      expect(await h.userTypeText(el.$refInput, "l", { clearPrevious: false })).toBe("Donny, l|");
      await h.wait(1);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true" id="txt3" style="display: none;">Donny</li><li role="option" style="display: none;">Mikky</li><li role="option" style="" aria-selected="false" id="txt4" focused="">Leo</li><li role="option" style="display: none;">Splinter</li></ul>"`
      );
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$value).toStrictEqual([10, 30]);
      expect(h.getInputCursor(el.$refInput)).toBe("Donny, Leo, |"); // extra space must be added
      expect(onChange).toBeCalledTimes(2);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true" id="txt3" style="">Donny</li><li role="option" style="">Mikky</li><li role="option" style="" aria-selected="true" id="txt4" focused="">Leo</li><li role="option" style="">Splinter</li></ul>"`
      );

      // try to delete last item
      await h.userRemove(el.$refInput, { removeCount: 1, key: "Backspace" }); // removing ',' removes also previous item
      await h.wait(10);
      expect(el.$value).toStrictEqual([10]);
      expect(h.getInputCursor(el.$refInput)).toBe("Donny, |"); // item is removed by single "Delete"
      expect(onChange).toBeCalledTimes(3);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true" id="txt3" style="" focused="">Donny</li><li role="option" style="">Mikky</li><li role="option" style="" id="txt4">Leo</li><li role="option" style="">Splinter</li></ul>"`
      );

      // removing again
      await h.userRemove(el.$refInput, { removeCount: 1, key: "Backspace" }); // removing ',' removes also previous item
      await h.wait(10);
      expect(el.$value).toBe(undefined);
      expect(h.getInputCursor(el.$refInput)).toBe("|"); // item is removed by single "Delete"
      expect(onChange).toBeCalledTimes(4);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" id="txt3" style="">Donny</li><li role="option" style="">Mikky</li><li role="option" style="" id="txt4">Leo</li><li role="option" style="">Splinter</li></ul>"`
      );

      // type in the middle - declineInput
      el.$value = [10, 20, 30];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, Leo, ");
      h.setInputCursor(el.$refInput, "Donny, Mikky|, Leo, ");
      expect(await h.userTypeText(el.$refInput, "a", { clearPrevious: false })).toBe("Donny, Mikkya|, Leo, ");
      await h.wait(200);
      expect(h.getInputCursor(el.$refInput)).toBe("Donny, Mikky, Leo, |");
      // removing in the middle
      h.setInputCursor(el.$refInput, "Donny, Mikky|, Leo, ");
      await h.userRemove(el.$refInput);
      await h.wait(1);
      expect(el.$value).toStrictEqual([10, 30]);
      expect(h.getInputCursor(el.$refInput)).toBe("Donny, |Leo, "); // NiceToHave: move cursor to next/prev according to Backspace/Delete

      // initvalue
      el = document.body.appendChild(document.createElement("wup-select"));
      el.$options.items = getItems();
      window.initv = [20];
      el.setAttribute("w-initvalue", "window.initv");
      el.setAttribute("w-multiple", "");
      await h.wait();
      expect(el.$options.multiple).toBe(true);
      expect(el.$initValue).toStrictEqual([20]);
      expect(el.$refInput.value).toBe("Mikky");
      el.focus();
      await h.wait();
      expect(h.getInputCursor(el.$refInput)).toBe("Mikky, |");
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt6" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
      );
      expect(await h.userTypeText(el.$refInput, "l", { clearPrevious: false })).toBe("Mikky, l|");
      await h.wait();
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt6" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="display: none;">Donny</li><li role="option" aria-selected="true" style="display: none;">Mikky</li><li role="option" aria-selected="false" id="txt7" focused="">Leo</li><li role="option" style="display: none;">Splinter</li></ul>"`
      );
      el.blur();
      await h.wait();
      expect(el.$refInput.value).toBe("Mikky");

      // click-toggle behavior
      el.focus();
      await h.wait();
      expect(el.$isShown).toBe(true);
      await h.userClick(el.querySelector("li")); // select 1st item
      await h.wait(1);
      expect(el.$value).toStrictEqual([20, 10]);
      // all items must be visible
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt8" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
      );
      await h.userClick(el.querySelector("li")); // de-select 1st item
      await h.wait(1);
      expect(el.$value).toStrictEqual([20]);
      expect(el.$refInput.value).toBe("Mikky, ");
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt8" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="false">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
      );

      await h.userClick(el.querySelectorAll("li")[1]); // de-select 2nd item
      await h.wait(1);
      expect(el.$value).toStrictEqual(undefined);
      expect(el.$refInput.value).toBe("");
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt8" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="false">Donny</li><li role="option" aria-selected="false">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
      );

      await h.userClick(el.querySelectorAll("li")[0]); // select 1st item
      await h.wait(1);
      expect(el.$value).toStrictEqual([10]);
      expect(el.$refInput.value).toBe("Donny, ");
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt8" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" aria-selected="true">Donny</li><li role="option" aria-selected="false">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
      );
      el.selectValue(10); // de-select just for coverage
      // just for coverage
      expect(el.parseInput("donny, mikky, abc")).toStrictEqual([10, 20]); // abc skipped because no-match

      // with allownewvalue
      el.blur();
      el.$value = undefined;
      el.$options.allowNewValue = true;
      el.$options.items = [
        { value: 10, text: "Donny" },
        { value: 11, text: "Donny2" },
        { value: 20, text: "Mikky" },
        { value: 30, text: "Leo" },
      ];
      await h.wait();
      await h.userTypeText(el.$refInput, "abcd,");
      await h.wait(1);
      expect(el.$value).toStrictEqual(["abcd"]);
      expect(h.getInputCursor(el.$refInput)).toBe("abcd, |");
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt9" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" style="">Donny</li><li role="option" style="">Donny2</li><li role="option" style="">Mikky</li><li role="option" style="">Leo</li><li role="option" aria-disabled="true" aria-selected="false" style="display: none;">No Items</li></ul>"`
      );
      await h.userTypeText(el.$refInput, "hi,", { clearPrevious: false });
      await h.wait(1);
      expect(el.$value).toStrictEqual(["abcd", "hi"]);
      await h.userRemove(el.$refInput);
      await h.wait(1);
      expect(el.$value).toStrictEqual(["abcd"]);

      el.blur();
      await h.wait();
      await h.userTypeText(el.$refInput, "Don", { clearPrevious: false });
      await h.wait(1);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt10" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option">Donny</li><li role="option">Donny2</li><li role="option" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li></ul>"`
      );
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })); // focus 1st visible item in menu
      expect(el.querySelector("[focused]")?.textContent).toBe("Donny");
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
      await h.wait(1);
      expect(el.$value).toStrictEqual(["abcd", 10]);

      // possible issue: ArrowDown selects 2nd instead 1st
      el.blur();
      el.$value = [20];
      await h.wait();
      await h.userTypeText(el.$refInput, "don", { clearPrevious: false });
      await h.wait();
      expect(el.$refInput.value).toBe("Mikky, don");
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt12" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option">Donny</li><li role="option">Donny2</li><li role="option" aria-selected="true" style="display: none;">Mikky</li><li role="option" style="display: none;">Leo</li></ul>"`
      );
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })); // focus 1st visible item in menu
      expect(el.querySelector("[focused]")?.textContent).toBe("Donny");
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
      await h.wait(1);
      expect(el.$value).toStrictEqual([20, 10]);

      // remove in the middle
      el.$value = [10, 20];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, ");
      h.setInputCursor(el.$refInput, "Donny,| Mikky, ");
      expect(await h.userRemove(el.$refInput)).toBe("|Mikky, ");
      expect(el.$value).toStrictEqual([20]);
      expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("|");
      expect(el.$value).toBe(undefined);

      // type new char instead of selected
      el.$value = [10, 20];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, ");
      h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`);
      expect(await h.userTypeText(el.$refInput, "L")).toBe("L|");
      expect(el.$value).toBe(undefined);
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt12" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" id="txt13" style="display: none;">Donny</li><li role="option" style="display: none;">Donny2</li><li role="option" style="display: none;">Mikky</li><li role="option" style="">Leo</li></ul>"`
      );

      // remove cases
      el.$value = [10, 20];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, ");
      h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`);
      expect(await h.userRemove(el.$refInput)).toBe("|");

      el.$value = [10, 20];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, ");
      h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`);
      expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("|");

      el.$value = [10, 20];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, ");
      h.setInputCursor(el.$refInput, `|${el.$refInput.value}`);
      expect(await h.userRemove(el.$refInput)).toBe("|Donny, Mikky, ");
      h.setInputCursor(el.$refInput, `${el.$refInput.value}|`);
      expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("Donny, Mikky, |");

      el.$value = [10, 20, 30];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, Leo, ");
      h.setInputCursor(el.$refInput, "Donny, Mikky,| Leo, ");
      expect(await h.userRemove(el.$refInput)).toBe("Donny, |Leo, ");
      expect(el.$value).toStrictEqual([10, 30]);
      expect(await h.userRemove(el.$refInput)).toBe("|Leo, ");
      expect(el.$value).toStrictEqual([30]);
      expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("|");
      expect(el.$value).toStrictEqual(undefined);

      el.$value = [10, 20, 30];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, Leo, ");
      h.setInputCursor(el.$refInput, "Donny, Mi|kky, Leo, ");
      expect(await h.userRemove(el.$refInput)).toBe("Donny, |Leo, ");
      expect(el.$value).toStrictEqual([10, 30]);
      h.setInputCursor(el.$refInput, "Donny|, Leo, ");
      expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("Donny, |");
      expect(el.$value).toStrictEqual([10]);
      h.setInputCursor(el.$refInput, "Don|ny|, ");
      expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("|");
      expect(el.$value).toStrictEqual(undefined);

      el.$value = [10, 20];
      await h.wait(1);
      expect(el.$refInput.value).toBe("Donny, Mikky, ");
      expect(await h.userTypeText(el.$refInput, "abc", { clearPrevious: false })).toBe("Donny, Mikky, abc|");
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt12" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" id="txt13" style="display: none;" aria-selected="true">Donny</li><li role="option" style="display: none;">Donny2</li><li role="option" style="display: none;" aria-selected="true">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
      );
      h.setInputCursor(el.$refInput, "Donny|, Mikky, abc");
      expect(await h.userRemove(el.$refInput)).toBe("|Mikky, abc");
      expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
        `"<ul id="txt12" role="listbox" aria-label="Items" tabindex="-1" aria-multiselectable="true"><li role="option" id="txt13" style="display: none;">Donny</li><li role="option" style="display: none;">Donny2</li><li role="option" style="display: none;" aria-selected="true">Mikky</li><li role="option" style="display: none;">Leo</li><li role="option" aria-disabled="true" aria-selected="false">No Items</li></ul>"`
      );
    });

    test("readOnlyInput", async () => {
      el.$options.readOnlyInput = true;
      await h.wait(1);
      expect(el.$refInput.readOnly).toBe(true);

      el.$options.readOnlyInput = false;
      await h.wait(1);
      expect(el.$refInput.readOnly).toBe(false);

      el.$options.readOnlyInput = getItems().length - 2;
      await h.wait(1);
      expect(el.$refInput.readOnly).toBe(false);

      el.$options.readOnlyInput = getItems().length + 1;
      await h.wait(1);
      expect(el.$refInput.readOnly).toBe(true);

      // num-val must be ignored if allowNewValue: true
      el.$options.allowNewValue = true;
      await h.wait(1);
      expect(el.$refInput.readOnly).toBe(false);
      el.$options.allowNewValue = false;
      await h.wait(1);
      expect(el.$refInput.readOnly).toBe(true);

      el.$options.items = Promise.resolve(getItems());
      jest.advanceTimersByTime(1); // WARN: jest can catch exception here after tests are finished
      expect(el.$isPending).toBe(true);
      expect(el.$refInput.readOnly).toBe(true); // because isPending
      await h.wait();
      expect(el.$refInput.readOnly).toBe(false);
    });
  });

  test("history undo/redo", async () => {
    expect(el.$value).toBe(undefined);
    expect(await h.userTypeText(el.$refInput, "Leo", { clearPrevious: false })).toBe("Leo|");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option" style="display: none;">Donny</li><li role="option" style="display: none;">Mikky</li><li role="option" aria-selected="false" id="txt3" focused="">Leo</li><li role="option" style="display: none;">Splinter</li></ul>"`
    );
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
    await h.wait(1);
    expect(el.$value).toBe(30);

    el.$refInput.select();
    expect(await h.userRemove(el.$refInput)).toBe("|");
    expect(await h.userTypeText(el.$refInput, "Donny", { clearPrevious: false })).toBe("Donny|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
    await h.wait(1);
    expect(el.$value).toBe(10);

    expect(el._refHistory._hist).toMatchInlineSnapshot(`
      [
        "     Leo",
        "  Leo ",
        "     Donny",
      ]
    `);
    expect(await h.userUndo(el.$refInput)).toBe("|");
    expect(await h.userUndo(el.$refInput)).toBe("|Leo|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
    await h.wait(1);
    expect(el.$value).toBe(30);

    expect(await h.userRedo(el.$refInput)).toBe("|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
    await h.wait(1);
    expect(el.$value).toBe(undefined);

    expect(await h.userRedo(el.$refInput)).toBe("Donny|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
    await h.wait(1);
    expect(el.$value).toBe(10);

    // with multiple
    delete el._refHistory;
    el.blur();
    el.$options.multiple = true;
    el.$options.allowNewValue = true;
    el.$value = [10];
    await h.wait(1);
    el.focus();
    await h.wait(1);
    expect(el._refHistory).toBeDefined();

    expect(el.$refInput.value).toBe("Donny, ");
    expect(await h.userTypeText(el.$refInput, "leo", { clearPrevious: false })).toBe("Donny, leo|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
    await h.wait(1);
    expect(el.$value).toStrictEqual([10, 30]);
    expect(h.getInputCursor(el.$refInput)).toBe("Donny, Leo, |");

    expect(await h.userTypeText(el.$refInput, "123", { clearPrevious: false })).toBe("Donny, Leo, 123|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); // select focused item in menu
    await h.wait(1);
    expect(el.$value).toStrictEqual([10, 30, "123"]);
    expect(h.getInputCursor(el.$refInput)).toBe("Donny, Leo, 123, |");

    expect(el._refHistory._hist).toMatchInlineSnapshot(`
      [
        " , ",
        "  leo",
        "leo Leo, ",
        "  123",
        " , ",
      ]
    `);
    // undo
    expect(await h.userUndo(el.$refInput)).toBe("Donny, Leo, 123|");
    expect(el.$value).toStrictEqual([10, 30]);
    expect(await h.userUndo(el.$refInput)).toBe("Donny, Leo, |");
    expect(el.$value).toStrictEqual([10, 30]);
    expect(await h.userUndo(el.$refInput)).toBe("Donny, leo|");
    expect(el.$value).toStrictEqual([10]);
    // redo
    expect(await h.userRedo(el.$refInput)).toBe("Donny, Leo, |");
    expect(el.$value).toStrictEqual([10, 30]);
    expect(await h.userRedo(el.$refInput)).toBe("Donny, Leo, 123|");
    expect(el.$value).toStrictEqual([10, 30]);
    expect(await h.userRedo(el.$refInput)).toBe("Donny, Leo, 123, |");
    expect(el.$value).toStrictEqual([10, 30, "123"]);
  });

  test("tryScroll", async () => {
    const { nextFrame } = h.useFakeAnimation();
    const ul = document.body.appendChild(document.createElement("ul"));
    const li = ul.appendChild(document.createElement("li"));
    const li2 = ul.appendChild(document.createElement("li2"));
    li._scrolled = jest.fn();
    li2._scrolled = jest.fn();
    function onScrollProto() {
      this._scrolled();
    }
    const onScroll = jest.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(onScrollProto);

    // all at once - filtered
    el.tryScrollTo(li);
    el.tryScrollTo(li2);
    await nextFrame();
    expect(li._scrolled).toBeCalledTimes(1);
    expect(li2._scrolled).toBeCalledTimes(0);

    // after debounce 1ms
    jest.clearAllMocks();
    el.tryScrollTo(li);
    await h.wait(1);
    el.tryScrollTo(li2);
    await nextFrame();
    await nextFrame();
    expect(li._scrolled).toBeCalledTimes(1);
    expect(li2._scrolled).toBeCalledTimes(1);

    // simulate when parentScrollTop is different
    let scrollTop = 0;
    jest.spyOn(ul, "scrollTop", "get").mockImplementation(() => {
      scrollTop += 5;
      return scrollTop;
    });

    jest.clearAllMocks();
    el.tryScrollTo(li);
    await h.wait(1);
    expect(li._scrolled).toBeCalledTimes(1);
    await nextFrame();
    expect(li._scrolled).toBeCalledTimes(2);
    await nextFrame();
    expect(li._scrolled).toBeCalledTimes(3);

    jest.clearAllMocks();
    el.tryScrollTo(li2);
    await h.wait(1);
    expect(li2._scrolled).toBeCalledTimes(1);
    await nextFrame();
    expect(li2._scrolled).toBeCalledTimes(2);
    expect(li._scrolled).toBeCalledTimes(0);

    jest.spyOn(ul, "scrollTop", "get").mockImplementation(() => scrollTop);
    await nextFrame();
    await nextFrame();
    await nextFrame();
    await nextFrame();
    expect(li2._scrolled).toBeCalledTimes(3);
    expect(li._scrolled).toBeCalledTimes(0);

    // case when scrollIntoViewIfNeeded doesn't exist on component
    jest.clearAllMocks();
    HTMLElement.prototype.scrollIntoViewIfNeeded = jest.fn();
    el.tryScrollTo(li);
    await h.wait(1);
    expect(HTMLElement.prototype.scrollIntoViewIfNeeded).toBeCalledTimes(1);

    HTMLElement.prototype.scrollIntoViewIfNeeded = undefined;
    el.tryScrollTo(li2);
    await h.wait(1);
    expect(onScroll).toBeCalledTimes(1);
  });
});

// manual testcase (close menu by outside click): to reproduce focus > pressEsc > typeText > try close by outside click
