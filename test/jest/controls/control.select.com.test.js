/* eslint-disable no-irregular-whitespace */
import { WUPSelectControl } from "web-ui-pack";
import WUPBaseComboControl, { ShowCases } from "web-ui-pack/controls/baseCombo";
import { initTestBaseControl } from "./baseControlTest";
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
    el.$options.showCase |= ShowCases.onFocusAuto; // without this impossible to test with manual triggering focus()

    h.setupLayout(el, { x: 140, y: 100, h: 50, w: 100 });
  },
});

describe("control.select common", () => {
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
    HTMLInputElement.prototype.focus.call(el.$refInput);
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
    HTMLInputElement.prototype.focus.call(el.$refInput); // without focus click events are not handled
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
    HTMLInputElement.prototype.focus.call(el.$refInput); // without focus click events are not handled
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
    await h.wait(1);
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
    HTMLInputElement.prototype.focus.call(el.$refInput);
    el.blur();
    await h.wait();
    expect(el.$isShown).toBe(false);
    expect(el.getAttribute("opened")).toBeFalsy();
    el.focus();
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
    await h.wait(1);
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
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait(1); // start animation
    expect(el.$isShown).toBe(true);
    expect(goShowMenu).toBeCalled();

    HTMLInputElement.prototype.focus.call(el2.$refInput);
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

  test("submit by Enter key", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    await h.wait();

    HTMLInputElement.prototype.focus.call(el.$refInput);
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
    HTMLInputElement.prototype.focus.call(el.$refInput);
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
    HTMLInputElement.prototype.focus.call(el.$refInput);
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
    await h.wait(100);
    expect(el.$refInput.value).toBe(getItems()[0].text);
    h.setInputCursor(el.$refInput, `${el.$refInput.value}|`);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(getItems()[0].value); // value reverted because partially removed
    expect(el.$refInput.value).toBe(getItems()[0].text);

    // remove whole text + focusOut => clear value
    el.$value = getItems()[0].value;
    el.$showMenu();
    await h.wait(100);
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
    await h.wait();
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait(1);
    h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$isShown).toBe(false);
    expect(await h.userRemove(el.$refInput)).toBe("|");
    await h.wait(1);
    expect(el.$isShown).toBe(true);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt3" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );
    el.blur();
    await h.wait(1);
    expect(el.$refInput.value).toBe("");
    expect(el.$value).toBe(undefined);

    // remove whole text + press Enter when required => reset to prev value
    el.$options.validations = { required: true };
    el.$value = getItems()[1].value;
    await h.wait(100);
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
    HTMLInputElement.prototype.focus.call(el.$refInput);
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
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      await h.wait();
      expect(el.$isShown).toBe(true);

      document.activeElement.blur();
      await h.wait();
      expect(el.$isShown).toBe(false);

      el.$options.showCase &= ~ShowCases.onFocus; // remove option
      el.$options.showCase &= ~ShowCases.onFocusAuto; // remove option
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$isShown).toBe(false);

      el.blur();
      await h.wait();
      HTMLInputElement.prototype.focus.call(el.$refInput);
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
      HTMLInputElement.prototype.focus.call(el.$refInput);
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
      expect(el.$isShown).toBe(true); // no-hiding when click option is disabled
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

    test("showCase: focusAuto", async () => {
      el.$options.showCase |= ShowCases.onFocusAuto;
      const canShow = jest.spyOn(WUPBaseComboControl.prototype, "canShowMenu");
      el.focus();
      await h.wait(1);
      expect(canShow).toBeCalledTimes(1);
      expect(canShow.mock.lastCall[0]).toBe(ShowCases.onFocusAuto);

      // WARN: other tests possible only manually: see details directly in the code
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
