/* eslint-disable no-prototype-builtins */
/* eslint-disable jest/no-export */
// import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import reactTestUtils from "react-dom/test-utils";

export function lastCall(jestFn) {
  return jestFn.mock.calls[jestFn.mock.calls.length - 1];
}

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

export function testComponentFuncBind(Type) {
  describe("componentFuncBind", () => {
    const skipNames = [
      "constructor",
      "componentDidMount",
      "componentDidCatch",
      "componentWillUnmount",
      "shouldComponentUpdate",
      "componentDidUpdate",
      "render",
      "toJSON",
      "setDomEl",
    ];
    const arrowRegex = /^[^{]+?=>/;
    const protoNames = Object.getOwnPropertyNames(Type.prototype)
      .filter((a) => !skipNames.includes(a))
      .filter((a) => typeof Object.getOwnPropertyDescriptor(Type.prototype, a).value === "function");

    const obj = new Type({});
    const objNames = Object.getOwnPropertyNames(obj)
      .filter((a) => !skipNames.includes(a))
      .filter((a) => typeof Object.getOwnPropertyDescriptor(obj, a).value === "function");

    it("no arrow functions", () => {
      // doesn't for work for deep-inheritted: const arrowFunc = objNames.filter(a => !protoNames.includes(a));
      const arrowFunc = objNames.filter((a) => arrowRegex.test(obj[a].toString()));
      expect(arrowFunc).toHaveLength(0);
    });

    it("each function are bound", () => {
      const notBoundFunc = protoNames.filter((a) => !objNames.includes(a));
      expect(notBoundFunc).toHaveLength(0);
      // one more test
      const notBoundFunc2 = protoNames.filter(
        // re-binding impossible if it was previosly: https://stackoverflow.com/questions/35686850/determine-if-a-javascript-function-is-a-bound-function
        (k) => typeof obj[k] === "function" && !obj[k].bind({}).hasOwnProperty("prototype")
      );
      expect(notBoundFunc2).toHaveLength(0);
    });
    obj.componentWillUnmount && obj.componentWillUnmount();
  });
}

export function testStaticInheritence(Type) {
  describe("componentStatic", () => {
    const skipNames = [
      "length", //
      "prototype",
      "name",
      "common",
      "excludedRenderProps",
    ];
    const stat = Object.getOwnPropertyNames(Type) //
      .filter((a) => !skipNames.includes(a));
    const statProto = Object.getOwnPropertyNames(Object.getPrototypeOf(Type)) //
      .filter((a) => !skipNames.includes(a));

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
