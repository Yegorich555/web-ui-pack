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
}

export function unMockConsoleWarn() {
  console.warn = origConsoleWarn;
}

export function wrapConsoleWarn(fn) {
  mockConsoleWarn();
  try {
    fn();
  } catch (ex) {
    unMockConsoleWarn();
    throw ex;
  }
  unMockConsoleWarn();
}

export function initDom() {
  const container = {
    render: el => {
      reactTestUtils.act(() => {
        render(el, container.element);
      });
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
    },
    dispatchEvent(element, event) {
      reactTestUtils.act(() => {
        element.dispatchEvent(event);
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
