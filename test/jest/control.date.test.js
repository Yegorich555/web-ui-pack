/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPDateControl } from "web-ui-pack";
import { PickersEnum } from "web-ui-pack/controls/calendar";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../testHelper";

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2022, 10 + 1, 16, 23, 49));
});

/** @type WUPDateControl */
let el;
initTestBaseControl({
  type: WUPDateControl,
  htmlTag: "wup-date",
  onInit: (e) => {
    el = e;

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

describe("control.date", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "2022-02-28", value: new Date("2022-02-28") },
      { attrValue: "2022-03-16", value: new Date("2022-03-16") },
      { attrValue: "2022-05-20", value: new Date("2022-05-20") },
    ],
    validations: {
      min: { set: new Date("2022-05-20"), failValue: new Date("2022-04-01"), trueValue: new Date("2022-06-01") },
      max: { set: new Date("2022-10-28"), failValue: new Date("2022-10-29"), trueValue: new Date("2022-09-20") },
      exclude: { set: [new Date("2022-07-15")], failValue: new Date("2022-07-15"), trueValue: new Date("2022-07-16") },
    },
    attrs: {
      min: { value: "2022-05-20" },
      max: { value: "2022-05-21" },
      exclude: { refGlobal: [new Date("2009-02-06")] },
      mask: { skip: true },
      maskholder: { skip: true },
      format: { skip: true },
    },
    $options: {
      mask: { skip: true },
      maskholder: { skip: true },
    },
    validationsSkip: ["_parse", "_mask"],
  });

  describe("extra options", () => {
    test("format", async () => {
      await h.wait(1);
      expect(el.$options.format).toBe("yyyy-mm-dd");
      expect(el.$options.mask).toBe("0000-00-00");
      expect(el.$options.maskholder).toBe("yyyy-mm-dd");

      el.$options.format = "YYYY-MM-DD";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("0000-00-00");
      expect(el.$options.maskholder).toBe("YYYY-MM-DD");

      el.$options.format = "M/D/YYYY";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("#0/#0/0000");
      expect(el.$options.maskholder).toBe("MM/DD/YYYY");

      // user can override defaults
      el.$options.mask = "00-00-0000";
      await h.wait(1);
      expect(el.$options.mask).toBe("00-00-0000");
      expect(el.$options.maskholder).toBe("MM/DD/YYYY");

      el.$options.maskholder = "mm/dd/yyyy";
      await h.wait(1);
      expect(el.$options.maskholder).toBe("mm/dd/yyyy");
    });

    test("attr [startWith]", async () => {
      const set = async (s) => {
        el.remove();
        el.setAttribute("startwith", s);
        document.body.appendChild(el);
        await h.wait(1);
        el.focus();
        await h.wait();
      };

      await set("day");
      expect(el.$options.startWith).toBe(PickersEnum.Day);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Day);

      await set("month");
      expect(el.$options.startWith).toBe(PickersEnum.Month);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Month);

      await set("year");
      expect(el.$options.startWith).toBe(PickersEnum.Year);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Year);

      await set("");
      expect(el.$options.startWith).toBeFalsy();

      el.$options.startWith = PickersEnum.Month;
      el.blur();
      await h.wait(1);
      el.focus();
      await h.wait();
      expect(el.$options.startWith).toBe(PickersEnum.Month);
      expect(el.$refPopup.firstChild.$options.startWith).toBe(PickersEnum.Month);
    });
    // test("min/max/exclude affects on validations", async()=>{
    // todo implement
    // });

    // test("options utc", async()=>{
    // todo implement
    // });
  });

  // test("$show/$hide menu", async () => {
  //   el.$initValue = new Date("2022-02-28");
  //   expect(el.$isOpen).toBe(false);
  //   const onShow = jest.fn();
  //   const onHide = jest.fn();
  //   el.addEventListener("$showMenu", onShow);
  //   el.addEventListener("$hideMenu", onHide);

  //   // opening by focus
  //   el.focus();
  //   expect(document.activeElement).toBe(el.$refInput);
  //   expect(el.$isOpen).toBe(true);
  //   expect(el.$refPopup).toBeDefined();
  //   await h.wait();
  //   expect(onHide).toBeCalledTimes(0);
  //   expect(onShow).toBeCalledTimes(1);
  //   expect(el.$refPopup.innerHTML).toMatchInlineSnapshot();
  //   expect(el.outerHTML).toMatchInlineSnapshot();

  //   // closing by Esc
  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(el.$refPopup).toBeDefined(); // disposed only by focus out
  //   expect(el.outerHTML).toMatchInlineSnapshot();
  //   expect(onHide).toBeCalledTimes(1);
  //   expect(onShow).toBeCalledTimes(1);

  //   // opening by call $show()
  //   jest.clearAllMocks();
  //   el.$showMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   expect(onHide).toBeCalledTimes(0);
  //   expect(onShow).toBeCalledTimes(1);

  //   // closing by call $hide()
  //   el.$hideMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(onHide).toBeCalledTimes(1);
  //   expect(onShow).toBeCalledTimes(1);

  //   // opening by keyboard
  //   jest.clearAllMocks();
  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   // again
  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   expect(onShow).toBeCalledTimes(1);

  //   // closing by select (by enter)
  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(el.$refPopup).toBeDefined();

  //   // opening by keyboard
  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);

  //   // checking when default Enter behavior is prevented
  //   el._focusedMenuItem.addEventListener("click", (e) => e.preventDefault(), { once: true });
  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);

  //   // hide by outside click
  //   el.$showMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);

  //   // open by click control
  //   el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   await h.wait();
  //   expect(document.activeElement).toBe(el.$refInput);
  //   expect(el.$isOpen).toBe(true);

  //   // hide by click control again
  //   el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   await h.wait();
  //   expect(document.activeElement).toBe(el.$refInput);
  //   expect(el.$isOpen).toBe(false);

  //   // opening by text in input
  //   await h.userTypeText(el.$refInput, "2");
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);

  //   // try to show again - for coverage
  //   await el.$showMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);

  //   // stay open even by popupClick
  //   el.$refPopup.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);

  //   el.$hideMenu();
  //   await h.wait();

  //   // no opening when readonly
  //   el.$options.readOnly = true;
  //   el.$showMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(el.$refPopup).not.toBeDefined();

  //   // not opening when click on input without readonly (to allow user edit input value without menu)
  //   el.$options.readOnly = false;
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(el.$isFocused).toBe(true);
  //   expect(el.$refInput.value).toBeTruthy();
  //   el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);

  //   // opening when click on input with readonly (to allow user edit input value without menu)
  //   el.$options.readOnlyInput = true;
  //   await h.wait();
  //   expect(el.$refInput.readOnly).toBe(true);
  //   expect(el.$refInput.value).toBeTruthy();
  //   expect(el.outerHTML).toMatchInlineSnapshot();
  //   el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   el.$options.readOnlyInput = false;
  //   await h.wait();

  //   // checking with disabled
  //   el.$showMenu();
  //   expect(el.$isOpen).toBe(true);
  //   el.$options.disabled = true;
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(el.$refPopup).not.toBeDefined();

  //   el.$options.disabled = false;
  //   await h.wait();

  //   // not closing when click on input without readonly (to allow user edit input value without menu)
  //   el.$showMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   expect(el.$isFocused).toBe(true);
  //   expect(el.$refInput.value).toBeTruthy();
  //   el.$refInput.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);

  //   // checking when hiding is not finished and opened again
  //   el.$hideMenu();
  //   el.$showMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);

  //   // checking showMenu takes time and popup is removed because of $options.readOnly applied
  //   el.$hideMenu();
  //   await h.wait();
  //   el.$showMenu();
  //   el.$options.readOnly = true;
  //   await h.wait();
  //   expect(el.$refPopup).not.toBeDefined();
  //   expect(el.$isOpen).toBe(false);

  //   // removing by blur
  //   el.$hideMenu(); // close before to check if it works when need remove when closed
  //   await h.wait();
  //   expect(document.activeElement).toBe(el.$refInput);
  //   document.activeElement.blur();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(el.$refPopup).not.toBeDefined();

  //   // checking when refPopup is removed
  //   el.$hideMenu();
  //   await h.wait();

  //   // checking when not-focused
  //   el.$options.readOnly = false;
  //   document.activeElement.blur();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   el.$showMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);

  //   el.$hideMenu();
  //   await h.wait();

  //   // checking if sync-call works as expected
  //   el.$showMenu();
  //   el.$hideMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  //   expect(el.getAttribute("opened")).toBeFalsy();
  //   el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  //   el.blur();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(false);
  // });

  // test("menu navigation", async () => {
  //   // todo inherit from calendar
  // });

  // test("submit by Enter key", async () => {
  //   const form = document.body.appendChild(document.createElement("wup-form"));
  //   form.appendChild(el);
  //   const onSubmit = jest.fn();
  //   form.$onSubmit = onSubmit;
  //   await h.wait();

  //   el.focus();
  //   expect(el.$isOpen).toBe(true);

  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  //   await h.wait();
  //   expect(onSubmit).not.toBeCalled();
  //   expect(el.$isOpen).toBe(false);

  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  //   await h.wait();
  //   expect(onSubmit).toBeCalledTimes(1);

  //   onSubmit.mockClear();
  //   el.$showMenu();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", altKey: true, bubbles: true, cancelable: true }));
  //   await h.wait(1);
  //   expect(onSubmit).toBeCalledTimes(1);
  //   expect(el.$isOpen).toBe(true);

  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
  //   await h.wait(1);
  //   expect(onSubmit).toBeCalledTimes(2);
  //   el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
  //   await h.wait(1);
  //   expect(onSubmit).toBeCalledTimes(3);
  //   expect(el.$isOpen).toBe(true);
  // });

  // test("select by menu item click", async () => {
  //   el.focus();
  //   await h.wait();
  //   expect(el.$isOpen).toBe(true);
  //   expect(el.$value).toBe(undefined);

  //   // todo implement

  //   // const arrLi = el.$refPopup.querySelectorAll("li");
  //   // expect(arrLi.length).toBe(4);
  //   // await h.userClick(arrLi[1]);
  //   // await h.wait();
  //   // expect(el.$isOpen).toBe(false);
  //   // expect(el.$value).toBe(20);

  //   // await h.userClick(el);
  //   // await h.wait();
  //   // expect(el.$isOpen).toBe(true);
  //   // await h.userClick(arrLi[2]);
  //   // await h.wait();
  //   // expect(el.$isOpen).toBe(false);
  //   // expect(el.$value).toBe(30);
  // });
});

// testcase: changing value outside calendar hides popup
// testcase: startWith: year. User must be able goto dayPicker with pressing Enter
