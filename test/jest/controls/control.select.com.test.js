/* eslint-disable no-irregular-whitespace */
import { WUPSelectControl } from "web-ui-pack";
import WUPBaseComboControl, { MenuOpenCases } from "web-ui-pack/controls/baseCombo";
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
    el.$options.openCase |= MenuOpenCases.onFocusAuto; // without this impossible to test with manual triggering focus()

    h.setupLayout(el, { x: 140, y: 100, h: 50, w: 100 });
  },
});

describe("control.select common", () => {
  test("$open/$close menu", async () => {
    el.$initValue = 20;
    expect(el.$isOpened).toBe(false);
    const onShow = jest.fn();
    const onHide = jest.fn();
    el.addEventListener("$openMenu", onShow);
    el.addEventListener("$closeMenu", onHide);
    el.$onOpenMenu = jest.fn();
    el.$onCloseMenu = jest.fn();

    // opening by focus
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpened).toBe(true);
    expect(el.$refPopup).toBeDefined();
    await h.wait();
    expect(onHide).toBeCalledTimes(0);
    expect(onShow).toBeCalledTimes(1);
    expect(el.$onOpenMenu).toBeCalledTimes(1);
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul>"`
    );
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select opened=""><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="true" autocomplete="off" aria-autocomplete="list" aria-owns="txt2" aria-controls="txt2"><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup menu="" open="" style="min-width: 100px; display: none;" w-animation="drawer" show=""><ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option" aria-selected="true">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup></wup-select>"`
    );

    // closing by Esc
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$refPopup).toBeDefined(); // disposed only by focus out
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-autocomplete="list" aria-owns="txt2" aria-controls="txt2"><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup menu="" style="min-width: 100px;" w-animation="drawer"><ul id="txt2" role="listbox" aria-label="Items" tabindex="-1"><li role="option">Donny</li><li role="option" aria-selected="false">Mikky</li><li role="option">Leo</li><li role="option">Splinter</li></ul></wup-popup></wup-select>"`
    );
    expect(onHide).toBeCalledTimes(1);
    expect(el.$onCloseMenu).toBeCalledTimes(1);
    expect(onShow).toBeCalledTimes(1);

    // opening by call $open()
    jest.clearAllMocks();
    el.$openMenu();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(onHide).toBeCalledTimes(0);
    expect(onShow).toBeCalledTimes(1);

    // closing by call $close()
    el.$closeMenu();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(onHide).toBeCalledTimes(1);
    expect(onShow).toBeCalledTimes(1);

    // opening by keyboard
    jest.clearAllMocks();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpened).toBe(true);
    // again
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(onShow).toBeCalledTimes(1);

    // closing by select (by enter)
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$refPopup).toBeDefined();

    // opening by keyboard
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // checking when default Enter behavior is prevented
    el._focusedMenuItem.addEventListener("click", (e) => e.preventDefault(), { once: true });
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // hide by outside click
    el.$openMenu();
    expect(el.$isFocused).toBe(true);
    await h.wait();
    expect(el.$isOpened).toBe(true);
    HTMLInputElement.prototype.focus.call(el.$refInput); // without focus click events are not handled
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.activeElement.blur();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$isFocused).toBe(false);
    expect(el.$refPopup).toBeFalsy(); // when user clicks outside happens document click and in this case popup must be remove in another way

    // open by click control
    await h.userClick(el);
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpened).toBe(true);

    // hide by click control again
    await h.userClick(el);
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    expect(el.$isOpened).toBe(false);

    // opening by text in input
    await h.userTypeText(el.$refInput, "S");
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // try to show again - for coverage
    await el.$openMenu();
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // stay open even by popupClick
    HTMLInputElement.prototype.focus.call(el.$refInput); // without focus click events are not handled
    el.$refPopup.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpened).toBe(true);

    el.$closeMenu();
    await h.wait();

    // no opening when readonly
    el.$options.readOnly = true;
    el.$openMenu();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    // not opening when click on input without readonly (to allow user edit input value without menu)
    el.$options.readOnly = false;
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$isFocused).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpened).toBe(false);

    // opening when click on input with readonly (to allow user edit input value without menu)
    el.blur();
    el.$options.readOnlyInput = true;
    await h.wait();
    expect(el.$refInput.readOnly).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-select><label for="txt1"><span><input placeholder=" " type="text" id="txt1" role="combobox" aria-haspopup="listbox" aria-expanded="false" autocomplete="off" aria-owns="txt5" aria-controls="txt5" readonly=""><strong></strong></span><button wup-icon="" clear="back" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-select>"`
    );
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isOpened).toBe(true); // because got focus by user click
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isOpened).toBe(false);

    el.$options.readOnlyInput = false;
    await h.wait(1);
    await h.userClick(el.$refInput);
    await h.wait();
    expect(el.$isOpened).toBe(false); // no-effect because by default click on input is filtered

    // checking with disabled
    el.$openMenu();
    await h.wait(1);
    expect(el.$isOpened).toBe(true);
    el.$options.disabled = true;
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    el.$options.disabled = false;
    await h.wait();

    // not closing when click on input without readonly (to allow user edit input value without menu)
    el.$openMenu();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(el.$isFocused).toBe(true);
    expect(el.$refInput.value).toBeTruthy();
    el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // checking when hiding is not finished and opened again
    el.$closeMenu();
    el.$openMenu();
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // checking showMenu takes time and popup is removed because of $options.readOnly applied
    el.$closeMenu();
    await h.wait();
    el.$openMenu();
    el.$options.readOnly = true;
    await h.wait();
    expect(el.$refPopup).not.toBeDefined();
    expect(el.$isOpened).toBe(false);

    // removing by blur
    el.$closeMenu(); // close before to check if it works when need remove when closed
    await h.wait();
    expect(document.activeElement).toBe(el.$refInput);
    document.activeElement.blur();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$refPopup).not.toBeDefined();

    // checking when refPopup is removed
    el.$closeMenu();
    await h.wait();

    // checking when not-focused
    el.$options.readOnly = false;
    document.activeElement.blur();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    el.$openMenu();
    await h.wait();
    expect(el.$isOpened).toBe(true);

    el.$closeMenu();
    await h.wait();

    // checking if sync-call works as expected
    el.$openMenu();
    HTMLInputElement.prototype.focus.call(el.$refInput);
    el.blur();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.getAttribute("opened")).toBeFalsy();
    el.focus();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el.$isOpened).toBe(true);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait(1);
    el.blur();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$refPopup).toBeFalsy();

    // cover hide after show while menu is opening
    expect(el.$refPopup).toBeFalsy();
    const renderMenu = jest.spyOn(WUPSelectControl.prototype, "renderMenu");
    el.$openMenu();
    await h.wait(1);
    expect(renderMenu).toBeCalledTimes(1);
    el.$closeMenu();
    await h.wait(10);
    expect(el.$isOpened).toBe(false);
    await h.wait();
    expect(el.$isOpened).toBe(false);

    // case: popups are visible and not closed (if change focus by Tab)
    h.setupCssCompute((elt) => elt.tagName === "WUP-POPUP", { transitionDuration: "0.3s" });

    /** @type WUPSelectControl */
    const el2 = document.body.appendChild(document.createElement(el.tagName));
    await h.wait();
    const goOpenMenu = jest.spyOn(el, "goOpenMenu");
    expect(el.$isFocused).toBe(false);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait(1); // start animation
    expect(el.$isOpened).toBe(true);
    expect(goOpenMenu).toBeCalled();

    HTMLInputElement.prototype.focus.call(el2.$refInput);
    await h.wait();
    expect(el2.$isOpened).toBe(true);
    expect(el.$isOpened).toBe(false);

    el2.$closeMenu();
    await h.wait();
    expect(el2.$isOpened).toBe(false);
    expect(el2.$isFocused).toBe(true);
    expect(el2.$refPopup).toBeDefined();
    el2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await h.wait();
    expect(el2.$isOpened).toBe(true);
    expect(el.$isOpened).toBe(false);

    // test if $openMenu() resolve only when popup is show-end
    document.body.innerHTML = "";
    el = document.body.appendChild(document.createElement(el.tagName));
    await h.wait();
    expect(el.$refPopup).toBeFalsy();
    onShow.mockClear();
    el.$openMenu().then(onShow);
    await h.wait(100);
    expect(el.$isOpened).toBe(true);
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
    expect(el.$isOpened).toBe(true);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(onSubmit).not.toBeCalled();
    expect(el.$isOpened).toBe(false);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(onSubmit).toBeCalledTimes(1);

    onSubmit.mockClear();
    el.$openMenu();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", altKey: true, bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1);
    expect(el.$isOpened).toBe(true);

    // el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
    // await h.wait(1);
    // expect(onSubmit).toBeCalledTimes(2);
    // el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
    // await h.wait(1);
    // expect(onSubmit).toBeCalledTimes(3);
    // expect(el.$isOpened).toBe(true);
  });

  test("select by click on menu-item", async () => {
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(el.$value).toBe(undefined);

    const arrLi = el.$refPopup.querySelectorAll("li");
    expect(arrLi.length).toBe(4);
    await h.userClick(arrLi[1]);
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$value).toBe(20);

    await h.userClick(el);
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(() =>
      arrLi[2].parentElement.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true }))
    ).not.toThrow();
    await h.userClick(arrLi[2]);
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$value).toBe(30);

    // click on item inside li
    const span = arrLi[1].appendChild(document.createElement("span"));
    await h.userClick(el);
    await h.wait();
    await h.userClick(span);
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$value).toBe(20);
  });

  test("clear by Backspace+Enter", async () => {
    el.$value = getItems()[0].value;
    HTMLInputElement.prototype.focus.call(el.$refInput);
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // remove whole text + press Enter => set value to undefined
    expect(el.$isRequired).toBe(false);
    expect(el.$refInput.value).toBe(getItems()[0].text);
    h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`); // select all
    expect(await h.userRemove(el.$refInput)).toBe("|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(undefined); // value resets when input empty & notRequired
    expect(el.$refInput.value).toBe("");
    expect(el.$isOpened).toBe(false);

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
    el.$openMenu();
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
    expect(el.$isOpened).toBe(false);
    expect(await h.userRemove(el.$refInput)).toBe("|");
    await h.wait(1);
    expect(el.$isOpened).toBe(true);
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
    el.$openMenu();
    expect(el.$isRequired).toBe(true);
    await h.wait(1);
    expect(el.$refInput.value).toBe(getItems()[1].text);
    h.setInputCursor(el.$refInput, `|${el.$refInput.value}|`); // select all
    expect(await h.userRemove(el.$refInput)).toBe("|");
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    // expect(el.$value).toBe(getItems()[1].value); // value reverted because isRequired
    // expect(el.$refInput.value).toBe(getItems()[1].text);
    expect(el.$value).toBe(undefined);
    expect(el.$refInput.value).toBe("");
    expect(el.$isOpened).toBe(false);
  });

  test("no opening by click on btnClear", async () => {
    el.$value = 10;
    await h.wait(1);
    HTMLInputElement.prototype.focus.call(el.$refInput);
    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$isFocused).toBe(true);

    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.$isFocused).toBe(true);

    el.$refLabel.click();
    await h.wait();
    expect(el.$isOpened).toBe(true);

    el.$refBtnClear.click();
    await h.wait();
    expect(el.$isOpened).toBe(true); // no hide if was click on button-clear
  });

  describe("options", () => {
    test("openCase", async () => {
      // openCase: focus
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      await h.wait();
      expect(el.$isOpened).toBe(true);

      document.activeElement.blur();
      await h.wait();
      expect(el.$isOpened).toBe(false);

      el.$options.openCase &= ~MenuOpenCases.onFocus; // remove option
      el.$options.openCase &= ~MenuOpenCases.onFocusAuto; // remove option
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait();
      expect(el.$isOpened).toBe(false);

      el.blur();
      await h.wait();
      HTMLInputElement.prototype.focus.call(el.$refInput);
      el.click(); // simulate mouseClick + focus
      await h.wait();
      expect(el.$isOpened).toBe(true);

      // openCase: onInput
      await h.userTypeText(el.$refInput, "d");
      expect(el.$isOpened).toBe(true);

      el.$closeMenu();
      el.$options.openCase &= ~MenuOpenCases.onInput; // remove option
      await h.wait();
      await h.userTypeText(el.$refInput, "a");
      await h.wait();
      expect(el.$isOpened).toBe(false);

      // openCase: Click
      el.click();
      await h.wait();
      expect(el.$isOpened).toBe(true);
      HTMLInputElement.prototype.focus.call(el.$refInput);
      await h.wait(1);

      await h.userClick(el);
      await h.wait();
      expect(el.$isOpened).toBe(false);

      // case when user select text in input but mouseUp outside input
      expect(el.$isOpened).toBe(false);
      el.$refInput.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
      el.$refInput.dispatchEvent(new MouseEvent("mousemove", { cancelable: true, bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
      el.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true })); // click inside control but outside input
      await h.wait();
      expect(el.$isOpened).toBe(false);
      // again with outside control
      el.$refInput.dispatchEvent(new MouseEvent("mousedown", { cancelable: true, bubbles: true }));
      el.$refInput.dispatchEvent(new MouseEvent("mousemove", { cancelable: true, bubbles: true }));
      document.body.dispatchEvent(new MouseEvent("mouseup", { cancelable: true, bubbles: true }));
      document.body.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true })); // click outside control
      await h.wait();
      expect(el.$isOpened).toBe(false);

      el.$options.openCase &= ~MenuOpenCases.onClick; // remove option
      el.click();
      await h.wait();
      expect(el.$isOpened).toBe(false);

      el.$openMenu();
      await h.wait();
      expect(el.$isOpened).toBe(true); // no-hiding when click option is disabled
      el.click();
      await h.wait();
      expect(el.$isOpened).toBe(true); // no-hiding when click option is disabled

      el.$closeMenu();
      await h.wait();
      // openCase: inputClick
      el.$options.openCase |= MenuOpenCases.onClick; // enable click again
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isOpened).toBe(false); // because click by input is disabled
      el.$options.openCase |= MenuOpenCases.onClickInput;
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isOpened).toBe(true);
      await h.userClick(el.$refInput);
      await h.wait();
      expect(el.$isOpened).toBe(false);

      // openCase: ArrowKeys
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isOpened).toBe(true);
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isOpened).toBe(false);
      el.$options.openCase &= ~MenuOpenCases.onPressArrowKey; // remove option
      el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await h.wait();
      expect(el.$isOpened).toBe(false);
    });

    test("openCase: focusAuto", async () => {
      el.$options.openCase |= MenuOpenCases.onFocusAuto;
      const canShow = jest.spyOn(WUPBaseComboControl.prototype, "canOpenMenu");
      el.focus();
      await h.wait(1);
      expect(canShow).toBeCalledTimes(1);
      expect(canShow.mock.lastCall[0]).toBe(MenuOpenCases.onFocusAuto);

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

      el.$options.readOnlyInput = false;
      el.$options.items = Promise.resolve(getItems());
      jest.advanceTimersByTime(1); // WARN: jest can catch exception here after tests are finished
      expect(el.$isPending).toBe(true);
      expect(el.$refInput.readOnly).toBe(true); // because isPending
      await h.wait();
      expect(el.$isPending).toBe(false);
      expect(el.$isReadOnly).toBe(false);
      expect(el.$refInput.readOnly).toBe(false);
    });
  });

  test("tryScroll", async () => {
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
    expect(li._scrolled).toBeCalledTimes(1);
    expect(li2._scrolled).toBeCalledTimes(1);

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
