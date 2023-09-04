import { WUPNumberControl } from "web-ui-pack";
import localeInfo from "web-ui-pack/objects/localeInfo";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

beforeAll(() => {
  localeInfo.refresh("en-US"); // setup "en-US" locale
});

/** @type WUPNumberControl */
let el;
initTestBaseControl({ type: WUPNumberControl, htmlTag: "wup-num", onInit: (e) => (el = e) });

describe("control.number", () => {
  testBaseControl({
    initValues: [
      { attrValue: "123", value: 123 },
      { attrValue: "345.6", value: 345.6 },
      { attrValue: "34.32", value: 34.32 },
    ],
    validations: {
      min: { set: 5, failValue: 4, trueValue: 5 },
      max: { set: 1000, failValue: 1001, trueValue: 1000 },
    },
    attrs: {
      mask: { value: "abc" },
      maskholder: { value: "abc" },
      prefix: { value: "$" },
      postfix: { value: "USD" },
      clearbutton: { value: true },
      debouncems: { value: 5 },
      selectonfocus: { value: true },
      format: { value: {} },
    },
    validationsSkip: ["_parse", "_mask"],
  });

  test("options format", async () => {
    el.focus();
    await h.wait();
    expect(el.$refInput.getAttribute("inputmode")).toBe("numeric"); // inputmode must be always numeric (even without mask)

    el.$value = 1234;
    expect(el.$refInput.value).toBe("1,234");
    h.setInputCursor(el.$refInput, "1,234|");
    expect(await h.userTypeText(el.$refInput, "5", { clearPrevious: false })).toBe("12,345|");
    expect(await h.userTypeText(el.$refInput, "6", { clearPrevious: false })).toBe("123,456|");
    expect(await h.userTypeText(el.$refInput, "7", { clearPrevious: false })).toBe("1,234,567|");
    expect(await h.userRemove(el.$refInput, { removeCount: 5 })).toBe("12|");
    expect(await h.userTypeText(el.$refInput, "ab", { clearPrevious: false })).toBe("12b|");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("12|");

    h.setInputCursor(el.$refInput, "34ab|12");
    el.$refInput.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertFromPaste", bubbles: true })) &&
      el.$refInput.dispatchEvent(new InputEvent("input", { inputType: "insertFromPaste", bubbles: true }));
    expect(h.getInputCursor(el.$refInput)).toBe("3,4|12");

    h.setInputCursor(el.$refInput, "|123");
    expect(await h.userTypeText(el.$refInput, "4", { clearPrevious: false })).toBe("4|,123");
    expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("4|23"); // expect: user deletes num instead of sep
    h.setInputCursor(el.$refInput, "4,|123", { skipEvent: true });
    expect(await h.userRemove(el.$refInput)).toBe("|123"); // expect: user deletes num instead of sep

    el.$value = 1234;
    el.$options.format = { minDecimal: 2 };
    await h.wait(1);
    expect(el.$refInput.value).toBe("1,234.00");
    el.$value = 234.56;
    expect(el.$refInput.value).toBe("234.56");
    el.$value = 4.567;
    expect(el.$refInput.value).toBe("4.56");
    h.setInputCursor(el.$refInput, "4.56|");
    expect(await h.userTypeText(el.$refInput, "7", { clearPrevious: false })).toBe("4.567|");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("4.56|");
    expect(await h.userRemove(el.$refInput)).toBe("4.5|0");
    expect(await h.userRemove(el.$refInput)).toBe("4|.00");
    expect(await h.userRemove(el.$refInput)).toBe("|0.00");
    h.setInputCursor(el.$refInput, "|0.00|");
    expect(el.$refInput.selectionStart).not.toBe(el.$refInput.selectionEnd);
    expect(await h.userRemove(el.$refInput)).toBe("|");

    el.$value = 4.5678;
    el.$options.format = { maxDecimal: 3 };
    await h.wait(1);
    expect(el.$refInput.value).toBe("4.567");
    el.$value = 4;
    expect(el.$refInput.value).toBe("4");
    expect(await h.userTypeText(el.$refInput, ".7", { clearPrevious: false })).toBe("4.7|");
    expect(await h.userRemove(el.$refInput)).toBe("4.|");
    expect(await h.userRemove(el.$refInput)).toBe("4|"); // user can delete sepDecimal

    el.$options.format = { sepDecimal: ",", minDecimal: 2, sep1000: "" };
    el.$value = 4.7;
    await h.wait(1);
    expect(el.$refInput.value).toBe("4,70");
    el.$value = 1234;
    expect(el.$refInput.value).toBe("1234,00");
    el.$value = 1234.567;
    expect(el.$refInput.value).toBe("1234,56");
    el.$value = 4.0;
    await h.wait(1);
    h.setInputCursor(el.$refInput, "4,|00");
    expect(await h.userTypeText(el.$refInput, "3", { clearPrevious: false })).toBe("4,3|0");

    // maxSafeInteger
    el.$options.format = { sep1000: "" };
    el.$value = Number.MAX_SAFE_INTEGER;
    expect(await h.userTypeText(el.$refInput, "9", { clearPrevious: false })).toBe(`${Number.MAX_SAFE_INTEGER}9|`); // show&hide after 100ms
    await h.wait(150);
    expect(el.$value).toBe(Number.MAX_SAFE_INTEGER);
    expect(el.$refInput.value).toBe(Number.MAX_SAFE_INTEGER.toString());

    // can type negative
    el.$value = -12;
    expect(el.$refInput.value).toBe("-12");
    expect(await h.userTypeText(el.$refInput, "9", { clearPrevious: false })).toBe(`-129|`);

    // attr doesn't depend on format
    el.$options.format = { sep1000: "", sepDecimal: "," };
    el.setAttribute("initvalue", "1234.5");
    await h.wait(1);
    expect(el.$initValue).toBe(1234.5);

    el.setAttribute("initvalue", "");
    await h.wait(1);
    expect(el.$initValue).toBe(undefined);

    el.setAttribute("initvalue", "ab123");
    await h.wait(1);
    expect(el.$initValue).toBe(undefined);

    // infinite loop in parseInput
    el.$options.format = { sepDecimal: ".", maxDecimal: 2, minDecimal: 0 };
    await h.wait(1);
    el.$refInput.value = "11.530000000000001";
    el.$refInput.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertFromPaste", bubbles: true })) &&
      el.$refInput.dispatchEvent(new InputEvent("input", { inputType: "insertFromPaste", bubbles: true }));
    expect(h.getInputCursor(el.$refInput)).toBe("11.53|");
    expect(el.$value).toBe(11.53);

    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options = { ...el.$options, format: { maxDecimal: 2 } }; // previously was issue with spread
    el.$initValue = 2.13;
    await h.wait(1);
    expect(el.$refInput.value).toBe("2.13");
  });

  test("history undo/redo", async () => {
    el.$options.format = { maxDecimal: 2 };
    el.focus();
    await h.wait();

    expect(await h.userTypeText(el.$refInput, "1234.5", { clearPrevious: false })).toBe("1,234.5|"); // #1 type long text
    expect(await h.userRemove(el.$refInput)).toBe("1,234.|"); // #2 remove last char
    expect(await h.userRemove(el.$refInput)).toBe("1,234|"); // #3 remove last char
    h.setInputCursor(el.$refInput, "1,|234", { skipEvent: true });
    expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("1|34"); // #4 remove middle char
    await h.userTypeText(el.$refInput, "a", { clearPrevious: false });
    await h.wait(150);
    expect(el.$value).toBe(134);
    // cover Ctrl+Z
    expect(h.getInputCursor(el.$refInput)).toBe("1|34");
    expect(await h.userUndo(el.$refInput)).toBe("1,|234"); // #3
    expect(await h.userUndo(el.$refInput)).toBe("1,234.|"); // #2
    expect(el.$value).toBe(1234);
    expect(await h.userUndo(el.$refInput)).toBe("1,234.5|"); // #1

    // cover Ctrl+Shift+Z
    expect(await h.userRedo(el.$refInput)).toBe("1,234.|");
    expect(await h.userRedo(el.$refInput)).toBe("1,234|");
    expect(el.$value).toBe(1234);
    expect(await h.userRedo(el.$refInput)).toBe("1|34");
    expect(el.$value).toBe(134);
  });

  test("with mask", async () => {
    el.$options.mask = "##-##";
    el.focus();
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "1", { clearPrevious: false })).toBe("1|");
    expect(await h.userTypeText(el.$refInput, "2", { clearPrevious: false })).toBe("12-|");
    expect(el.$value).toBe(12);
    expect(await h.userTypeText(el.$refInput, "3", { clearPrevious: false })).toBe("12-3|");
    expect(el.$value).toBe(123);
    expect(await h.userTypeText(el.$refInput, "4", { clearPrevious: false })).toBe("12-34|");
    expect(el.$value).toBe(1234);

    el.$value = 5678;
    expect(el.$refInput.value).toBe("56-78");

    // just for coverage
    expect(el.parseInput("")).toBe(undefined);
  });

  test("role spinner & inc/dec", async () => {
    el.focus();
    await h.wait();
    expect(el.$refInput.getAttribute("role")).toBe("spinbutton");

    // dec -1
    let isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })); // scrollDown
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(-1);
    expect(el.$refInput.value).toBe("-1");

    el.$options.format = { maxDecimal: 2 };
    el.$value = 1000.53;
    await h.wait(1);

    isPrevented = !el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
    );
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(999.53);
    expect(el.$refInput.value).toBe("999.53");

    // inc +1
    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(1000.53);

    isPrevented = !el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(1001.53);
    expect(el.$refInput.value).toBe("1,001.53");

    // Alt +0.1
    el.$value = 11.53;
    await h.wait(1);
    el.$refInput.selectionEnd = 0;
    el.$refInput.selectionStart = 0;
    expect(el.$refInput.value).toBe("11.53");
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true, bubbles: true, cancelable: true }));
    await h.wait(1);

    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(11.63);
    expect(h.getInputCursor(el.$refInput)).toBe("11.63|");

    isPrevented = !el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(11.73);

    isPrevented = !el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
    );
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(11.63);

    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })); // scrollDown
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(11.53);

    el.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt", bubbles: true, cancelable: true }));

    // Alt not allowed when decimal not allowed
    el.$options.format = { maxDecimal: 0 };
    el.$value = 11;
    await h.wait(1);
    el.$onChange = jest.fn();
    expect(el.$refInput.value).toBe("11");
    // +0.1
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true, bubbles: true, cancelable: true }));
    el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    await h.wait(1);
    expect(el.$value).toBe(11);
    // +0.1
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(11);
    // -0.1
    el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })); // scrollDown
    await h.wait(1);
    expect(el.$value).toBe(11);
    // -0.1
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(11);
    // summary
    expect(el.$onChange).not.toBeCalled();
    expect(el.$refInput.value).toBe("11");
    // alt prevented when value changed
    isPrevented = !el.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt", bubbles: true, cancelable: true }));
    expect(isPrevented).toBe(true);
    // alt not-prevented when no-changes
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true, bubbles: true, cancelable: true }));
    isPrevented = !el.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt", bubbles: true, cancelable: true }));
    expect(isPrevented).toBe(false);

    // Shift +10
    el.$options.format = { maxDecimal: 2 };
    el.$value = 11.53;
    await h.wait(1);
    expect(el.$refInput.value).toBe("11.53");
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", shiftKey: true, bubbles: true, cancelable: true }));
    expect(el.$onChange).toBeCalled();

    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(21.53);

    isPrevented = !el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(31.53);

    isPrevented = !el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
    );
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(21.53);

    await h.wait();
    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })); // scrollDown
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(11.53);
    el.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true, cancelable: true }));

    // Ctrl +100
    await h.wait(1);
    expect(el.$refInput.value).toBe("11.53");
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Control", ctrlKey: true, bubbles: true, cancelable: true }));
    await h.wait(1);
    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(111.53);

    isPrevented = !el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(211.53);

    isPrevented = !el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
    );
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(111.53);

    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })); // scrollDown
    expect(isPrevented).toBe(true);
    await h.wait(1);
    expect(el.$value).toBe(11.53);
    el.dispatchEvent(new KeyboardEvent("keyup", { key: "Control", bubbles: true, cancelable: true }));
    await h.wait(2);

    // just for coverage
    el.focus();
    el.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "b",
        bubbles: true,
        cancelable: true,
        altKey: true,
        shiftKey: true,
        ctrlKey: true,
      })
    );
    el.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "b",
        bubbles: true,
        cancelable: true,
        altKey: true,
        shiftKey: true,
        ctrlKey: true,
      })
    );

    // history undo must work
    expect(el.$refInput.value).toBe("11.53");
    expect(await h.userUndo(el.$refInput)).toBe("111.53|");

    // MAX_SAFE_INTEGER
    await h.wait();
    el.$value = Number.MAX_SAFE_INTEGER; // 9007199254740991
    expect(el.$refInput.value).toBe(`9,007,199,254,740,991`);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(Number.MAX_SAFE_INTEGER);
    expect(el.$refInput.value).toBe(`9,007,199,254,740,992`);
    await h.wait(150);
    expect(el.$refInput.value).toBe(`9,007,199,254,740,991`);

    // MIN_SAFE_INTEGER;
    el.$value = Number.MIN_SAFE_INTEGER;
    expect(el.$refInput.value).toBe(`-9,007,199,254,740,991`);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$value).toBe(Number.MIN_SAFE_INTEGER);
    expect(el.$refInput.value).toBe(`-9,007,199,254,740,992`);
    await h.wait(150);
    expect(el.$refInput.value).toBe(`-9,007,199,254,740,991`);

    // case when input somehow prevented
    el.$value = 111.53;
    el.gotBeforeInput = (e) => e.preventDefault();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(el.$refInput.value).toBe("111.53"); // no changed because was prevented

    // no action when readonly
    el.$options.readOnly = true;
    await h.wait(1);
    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })); // scrollDown
    await h.wait(1);
    expect(isPrevented).toBe(false);
    isPrevented = !el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
    );
    await h.wait(1);
    expect(isPrevented).toBe(false);
    expect(el.$refInput.value).toBe("111.53");
  });

  test("1000s separtor", () => {
    el.$value = 123;
    expect(el.$refInput.value).toBe("123");

    el.$value = 1234;
    expect(el.$refInput.value).toBe("1,234");

    el.$value = 15234;
    expect(el.$refInput.value).toBe("15,234");

    el.$value = 1506234;
    expect(el.$refInput.value).toBe("1,506,234");

    el.$value = -123;
    expect(el.$refInput.value).toBe("-123");

    el.$value = -1234;
    expect(el.$refInput.value).toBe("-1,234");

    el.$value = -1506234;
    expect(el.$refInput.value).toBe("-1,506,234");
  });

  test("storage with falsy value", async () => {
    el.$options.storageKey = "nm";
    el.$value = 0;
    await h.wait(1);
    expect(window.localStorage.getItem("nm")).toBe("0");
    el = document.body.appendChild(document.createElement(el.tagName));
    expect(el.$value).toBe(undefined);
    el.$options.storageKey = "nm";
    await h.wait(1);
    expect(el.$value).toBe(0);

    window.localStorage.clear();
  });
});
