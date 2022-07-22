import { WUPTextControl } from "web-ui-pack";
import * as h from "../testHelper";

/** @type WUPTextControl */
let el;
!WUPTextControl && console.error("missed");

beforeEach(() => {
  jest.useFakeTimers();
  let lastUniqueNum = 0;
  jest.spyOn(WUPTextControl, "$uniqueId", "get").mockImplementation(() => `txt${++lastUniqueNum}`);
  el = document.createElement("wup-text");
  document.body.appendChild(el);
  jest.advanceTimersByTime(1); // wait for ready
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("control.text", () => {
  h.baseTestComponent(() => document.createElement("wup-text"), { attrs: { initvalue: { skip: true } } });

  test("attr [initvalue] >> $initValue", () => {
    expect(el.$isReady).toBeTruthy();
    el.setAttribute("initvalue", "123");
    expect(el.getAttribute("initValue")).toBe("123");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe("123");

    el.$initValue = "some txt";
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe("some txt");
    expect(el.getAttribute("initvalue")).toBe(null);

    el.setAttribute("initvalue", "34");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe("34");
    expect(el.getAttribute("initvalue")).toBe("34");

    el.removeAttribute("initvalue");
    jest.advanceTimersByTime(1);
    expect(el.getAttribute("initvalue")).toBe(null);
    expect(el.$initValue).toBe(undefined);
  });

  test("$initValue", () => {
    el.$initValue = "txt";
    expect(el.$value).toBe("txt");
    expect(el.$isDirty).toBe(false);
    expect(el.$isChanged).toBe(false);

    el.$initValue = "23";
    expect(el.$value).toBe("23");
    expect(el.$isDirty).toBe(false);
    expect(el.$isChanged).toBe(false);

    el.$value = "testMe";
    expect(el.$initValue).toBe("23");
    expect(el.$value).toBe("testMe");
    expect(el.$isDirty).toBe(false);
    expect(el.$isChanged).toBe(true);

    el.$initValue = "123";
    expect(el.$value).toBe("testMe");
    expect(el.$isChanged).toBe(true);
  });

  describe("options", () => {
    test("autoComplete", () => {
      el.$options.autoComplete = "first-name";
      jest.advanceTimersByTime(1);
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" autocomplete=\\"first-name\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text>"`
      );

      el.$options.autoComplete = true;
      el.$options.name = "firstName";
      jest.advanceTimersByTime(1);
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" autocomplete=\\"firstName\\"><strong>First Name</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text>"`
      );

      el.$options.autoComplete = false;
      el.$options.name = undefined;
      jest.advanceTimersByTime(1);
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" autocomplete=\\"off\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text>"`
      );
    });

    test("autoFocus", () => {
      el = document.createElement(el.tagName);
      el.$options.autoFocus = true;
      document.body.appendChild(el);
      jest.advanceTimersByTime(1);
      expect(document.activeElement).toBe(el.$refInput);
    });

    test("clearActions", () => {
      // only clear
      el.$value = "34";
      el.$initValue = "some";
      el.$options.clearActions = 1 << 1; // clear
      jest.advanceTimersByTime(1);
      expect(el.$value).toBe("34");

      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe("34"); // rollback to previous value
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);

      el.$value = "test";
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe("test");
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);

      // only reset to init
      el.$value = "34";
      el.$initValue = "some";
      el.$options.clearActions = 1 << 2; // resetToInit
      jest.advanceTimersByTime(1);

      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe("some");
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe("34");
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe("some");
      expect(el.$refInput.selectionStart).toBe(0);
      expect(el.$refInput.selectionEnd).toBe(el.$refInput.value.length);

      // clear + resetToInit
      el.$value = "34";
      el.$initValue = "some";
      el.$options.clearActions = 0b1111111; // all
      jest.advanceTimersByTime(1);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe("some");
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);

      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe("some");
      expect(el.$refInput.selectionStart).toBe(0);
      expect(el.$refInput.selectionEnd).toBe(el.$refInput.value.length);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(el.$value).toBe(undefined);
    });
  });
});
