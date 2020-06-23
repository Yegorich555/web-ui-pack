/* eslint-disable jest/no-export */
// import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import reactTestUtils from "react-dom/test-utils";
import { BaseControl } from "web-ui-pack";

BaseControl.common.focusDebounce = 0;
const waitBlurDebounce = () => new Promise(r => setTimeout(r, BaseControl.common.focusDebounce));
export async function dispatchOnBlur(element) {
  reactTestUtils.act(() => {
    element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  });

  await waitBlurDebounce();
}

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
      "setDomEl"
    ];
    const arrowRegex = /^[^{]+?=>/;
    const protoNames = Object.getOwnPropertyNames(Type.prototype)
      .filter(a => !skipNames.includes(a))
      .filter(a => typeof Object.getOwnPropertyDescriptor(Type.prototype, a).value === "function");

    const obj = new Type({});
    const objNames = Object.getOwnPropertyNames(obj)
      .filter(a => !skipNames.includes(a))
      .filter(a => typeof Object.getOwnPropertyDescriptor(obj, a).value === "function");

    it("no arrow functions", () => {
      // doesn't for work for deep-inheritted: const arrowFunc = objNames.filter(a => !protoNames.includes(a));
      const arrowFunc = objNames.filter(a => arrowRegex.test(obj[a].toString()));
      expect(arrowFunc).toHaveLength(0);
    });

    it("each function are bound", () => {
      const notBoundFunc = protoNames.filter(a => !objNames.includes(a));
      expect(notBoundFunc).toHaveLength(0);
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
      "excludedRenderProps"
    ];
    const stat = Object.getOwnPropertyNames(Type) //
      .filter(a => !skipNames.includes(a));
    const statProto = Object.getOwnPropertyNames(Object.getPrototypeOf(Type)) //
      .filter(a => !skipNames.includes(a));

    it("overrides static", () => {
      const arrowNotOverrided = statProto.filter(a => !stat.includes(a));
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
  ArrowUp: 38,
  ArrowLeft: 37,
  ArrowRight: 39,
  ArrowDown: 40
};

export function initDom() {
  const container = {
    act: fn => reactTestUtils.act(fn),
    render: el => {
      reactTestUtils.act(() => {
        render(el, container.element);
      });
      return container.element;
    },
    /** wait for render is finished; apply jest.useFakeTimers before this function */
    renderWait: el => {
      container.render(el);
      jest.advanceTimersToNextTimer();
    },
    expectRender: el => {
      container.render(el);
      return expect(container.element.innerHTML);
    },
    /**
     * @param {Element} input
     * @param {string} text
     */
    userTypeText(input, text) {
      // eslint-disable-next-line no-param-reassign
      input.value = "";
      for (let i = 0; i < text.length; ++i) {
        const keyCode = text.charCodeAt(i);
        reactTestUtils.act(() => {
          input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode }));
          input.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true, keyCode }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, keyCode }));
          // eslint-disable-next-line no-param-reassign
          input.value += text[i];
          reactTestUtils.Simulate.change(input);
          // it's actual only for react; in js-native onChange happens by onBlur
          // input.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }
      if (!text.length) {
        reactTestUtils.act(() => {
          reactTestUtils.Simulate.change(input);
        });
      }
    },
    userPressKey(elementOrSelector, keyCode) {
      if (typeof elementOrSelector === "string") {
        // eslint-disable-next-line no-param-reassign
        elementOrSelector = document.querySelector(elementOrSelector);
      }
      const key = Object.keys(keys).find(k => keys[k] === keyCode);
      reactTestUtils.act(() => {
        elementOrSelector.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode, key }));
        elementOrSelector.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true, keyCode, key }));
        elementOrSelector.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, keyCode, key }));
      });
    },
    dispatchEvent(elementOrSelector, event) {
      if (typeof elementOrSelector === "string") {
        // eslint-disable-next-line no-param-reassign
        elementOrSelector = document.querySelector(elementOrSelector);
      }
      if (elementOrSelector.type === "focus") {
        elementOrSelector.focus();
        return;
      }
      reactTestUtils.act(() => {
        elementOrSelector.dispatchEvent(event);
      });
    },

    element: undefined,
    destroyDom: () => {
      unmountComponentAtNode(container.element);
      container.element.remove();
      container.element = null;
    }
  };
  container.element = document.createElement("div");
  document.body.appendChild(container.element);
  return container;
}
