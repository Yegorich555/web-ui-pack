/* eslint-disable no-prototype-builtins */
/* eslint-disable jest/no-export */
// import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import reactTestUtils from "react-dom/test-utils";

export function mockSetState(el) {
  return jest.fn((state, callback) =>
    setTimeout(() => {
      Object.assign(el.state, state);
      callback && callback();
    })
  );
}

const origConsoleWarn = console.warn;
export function mockConsoleWarn() {
  console.warn = jest.fn();
  return console.warn;
}

export function unMockConsoleWarn() {
  console.warn = origConsoleWarn;
}

const origConsoleError = console.error;
export function mockConsoleError() {
  console.error = jest.fn();
  return console.error;
}

export function unMockConsoleError() {
  console.error = origConsoleError;
}

export function wrapConsoleWarn(fn) {
  const mockConsole = mockConsoleWarn();
  try {
    fn();
  } catch (ex) {
    unMockConsoleWarn();
    throw ex;
  }
  unMockConsoleWarn();
  return mockConsole;
}

const skipNames = new Set(["apply", "bind", "call", "toString", "click", "focus", "blur"]);
function setHTMLProps(t) {
  const proto = Object.getPrototypeOf(t);
  if (proto && !Object.prototype.hasOwnProperty.call(proto, "__proto__")) {
    Object.getOwnPropertyNames(proto).forEach((a) => {
      if (typeof Object.getOwnPropertyDescriptor(proto, a).value === "function") {
        skipNames.add(a);
      }
    });
    setHTMLProps(proto);
  }
}
setHTMLProps(HTMLElement.prototype);

function findOwnFunctions(obj, proto) {
  const result = Object.getOwnPropertyNames(proto)
    .filter((a) => !skipNames.has(a))
    .filter((a) => typeof Object.getOwnPropertyDescriptor(proto, a).value === "function")
    .map((k) => ({
      name: k,
      isArrow: false,
      isBound: obj[k].name.startsWith("bound ") && !obj[k].hasOwnProperty("prototype"),
    }));
  return result;
}

export function findAllFunctions(obj) {
  // const proto = Object.getPrototypeOf(obj);
  // const result = findOwnFunctions(obj, proto);
  /** @type ReturnType<typeof findOwnFunctions(obj, proto)> */
  const result = [];
  const search = (v) => {
    const proto = Object.getPrototypeOf(v);
    if (!!proto && !Object.prototype.hasOwnProperty.call(proto, "__proto__")) {
      result.push(...findOwnFunctions(obj, proto));
      search(proto);
    }
  };

  search(obj);

  // find arrow functions
  const arrowRegex = /^[^{]+?=>/;
  Object.getOwnPropertyNames(obj)
    .filter((a) => !skipNames.has(a))
    .filter((a) => typeof Object.getOwnPropertyDescriptor(obj, a).value === "function")
    .filter((a) => arrowRegex.test(obj[a].toString()))
    .forEach((k) =>
      result.push({
        name: k,
        isArrow: true,
        isBound: true, // it's not actually true but for testing it's ok
      })
    );

  return {
    all: result,
    names: result.map((r) => r.name),
    arrow: result.filter((r) => r.isArrow).map((r) => r.name),
    bound: result.filter((r) => r.isBound && !r.isArrow).map((r) => r.name),
    notBound: result.filter((r) => !r.isBound && !r.isArrow).map((r) => r.name),
  };
}

export function testComponentFuncBind(obj) {
  describe("componentFuncBind", () => {
    const fns = findAllFunctions(obj);
    it("no arrow functions", () => {
      // doesn't for work for deep-inheritted: const arrowFunc = objNames.filter(a => !protoNames.includes(a));
      expect(fns.arrow).toHaveLength(0);
    });

    it("each function are bound", () => {
      expect(fns.notBound).toHaveLength(0);
    });
  });
}

const skipNamesStatic = new Set([
  "length", //
  "prototype",
  "name",
]);

export function testStaticInheritence(Type) {
  describe("componentStatic", () => {
    const stat = Object.getOwnPropertyNames(Type) //
      .filter((a) => !skipNamesStatic.includes(a));
    const statProto = Object.getOwnPropertyNames(Object.getPrototypeOf(Type)) //
      .filter((a) => !skipNamesStatic.includes(a));

    it("overrides static", () => {
      const arrowNotOverrided = statProto.filter((a) => !stat.includes(a));
      expect(arrowNotOverrided).toHaveLength(0);
    });
  });
}

export function testControlCommon(Type) {
  testComponentFuncBind(Type);
  testStaticInheritence(Type);
  test("returnEmptyValue & isEmpty", () => {
    expect(Type.isEmpty(Type.returnEmptyValue)).toBe(true);
  });
}

export const keys = {
  Enter: 13,
  Esc: 27,
  End: 35,
  Home: 36,
  ArrowUp: 38,
  ArrowLeft: 37,
  ArrowRight: 39,
  ArrowDown: 40,
};

export function initDom() {
  const container = {
    act: (fn) => reactTestUtils.act(fn),
    render: (el) => {
      reactTestUtils.act(() => {
        render(el, container.element);
      });
      return container.element;
    },
    /** wait for render is finished; apply jest.useFakeTimers before this function */
    renderWait: (el) => {
      container.render(el);
      jest.advanceTimersToNextTimer();
    },
    expectRender: (el) => {
      container.render(el);
      return expect(container.element.innerHTML);
    },
    /**
     * @param {Element} inputOrSelector
     * @param {string} text
     */
    userTypeText(inputOrSelector, text) {
      if (typeof inputOrSelector === "string") {
        inputOrSelector = document.querySelector(inputOrSelector);
      }
      inputOrSelector.value = "";
      for (let i = 0; i < text.length; ++i) {
        const keyCode = text.charCodeAt(i);
        reactTestUtils.act(() => {
          inputOrSelector.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode }));
          inputOrSelector.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true, keyCode }));
          inputOrSelector.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, keyCode }));
          inputOrSelector.value += text[i];
          reactTestUtils.Simulate.change(inputOrSelector);
          // it's actual only for react; in js-native onChange happens by onBlur
          // input.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }
      if (!text.length) {
        reactTestUtils.act(() => {
          reactTestUtils.Simulate.change(inputOrSelector);
        });
      }
    },
    userPressKey(elementOrSelector, keyCode) {
      if (typeof elementOrSelector === "string") {
        elementOrSelector = document.querySelector(elementOrSelector);
      }
      const key = Object.keys(keys).find((k) => keys[k] === keyCode);
      reactTestUtils.act(() => {
        elementOrSelector.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode, key }));
        elementOrSelector.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true, keyCode, key }));
        elementOrSelector.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, keyCode, key }));
      });
    },
    userClick(elementOrSelector) {
      if (typeof elementOrSelector === "string") {
        elementOrSelector = document.querySelector(elementOrSelector);
      }
      reactTestUtils.act(() => {
        elementOrSelector.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        elementOrSelector.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        elementOrSelector.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    },
    dispatchEvent(elementOrSelector, event) {
      if (typeof elementOrSelector === "string") {
        elementOrSelector = document.querySelector(elementOrSelector);
      }
      if (elementOrSelector.type === "focus") {
        elementOrSelector.focus();
      } else if (elementOrSelector.type === "blur") {
        elementOrSelector.blur();
      } else {
        reactTestUtils.act(() => {
          elementOrSelector.dispatchEvent(event);
        });
      }
    },

    element: undefined,
    destroyDom: () => {
      unmountComponentAtNode(container.element);
      container.element.remove();
      container.element = null;
    },
  };
  container.element = document.createElement("div");
  document.body.appendChild(container.element);
  return container;
}
