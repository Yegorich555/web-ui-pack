/* eslint-disable jest/expect-expect */
import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import reactTestUtils from "react-dom/test-utils";
import { TextControl } from "web-ui-pack";

let container = null;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

function testRender(smt) {
  reactTestUtils.act(() => {
    render(smt, container);
  });
  return expect(container.innerHTML);
}

describe("textControl", () => {
  test("initValue", () => {
    expect(new TextControl({}).state.value).toBe("");
    expect(new TextControl({ initValue: undefined }).state.value).toBe("");
    expect(new TextControl({ initValue: null }).state.value).toBe("");
    expect(new TextControl({ initValue: "str" }).state.value).toBe("str");
  });

  const previous = TextControl.emptyValue;
  test("emptyValue", () => {
    TextControl.emptyValue = "";
    expect(new TextControl({}).value).toBe("");
    expect(new TextControl({ initValue: "str" }).value).toBe("str");
    expect(new TextControl({ initValue: null }).value).toBe("");

    TextControl.emptyValue = null;
    expect(new TextControl({}).value).toBe(null);
    expect(new TextControl({ initValue: "str" }).value).toBe("str");
    expect(new TextControl({ initValue: "" }).value).toBe(null);
  });
  TextControl.emptyValue = previous;

  test("render according to props", () => {
    // todo make id is changable
    testRender(<TextControl id={1} />).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label>"`
    );
    testRender(<TextControl id={1} label="Some Label" />).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span>Some Label</span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label>"`
    );
    testRender(<TextControl id={1} name="Your Name" />).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label>"`
    );
    testRender(<TextControl id={1} htmlInputProps={{ placeholder: "placeholder text here" }} />).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\" placeholder=\\"placeholder text here\\"></span></label>"`
    );
    // checking data-required='true' when validations required: true
    testRender(<TextControl id={1} validations={{ required: true }} />).toMatchInlineSnapshot(
      `"<label for=\\"1\\" data-required=\\"true\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"true\\" value=\\"\\"></span></label>"`
    );
    // checking data-required='false' when validations required: false
    testRender(<TextControl id={1} validations={{ required: false }} />).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label>"`
    );
    // key points that input is new: we need this for reinit-component
    // todo make initValue is changable
    testRender(<TextControl key={1} id={1} initValue="value here" />).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"value here\\"></span></label>"`
    );
  });

  /**
   * @param {Element} input
   * @param {string} text
   */
  function userTypeText(input, text) {
    // it's possible for react but it doesn't provide full userInteractivity
    // input.value = "v";
    // reactTestUtils.Simulate.change(input);
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
  }

  test("onChanged event", () => {
    const mockOnChanged = jest.fn();
    let ref = null;
    reactTestUtils.act(() => {
      render(
        <TextControl
          ref={el => {
            ref = el;
          }}
          key={2}
          onChanged={mockOnChanged}
          initValue="test"
        />,
        container
      );
    });
    const input = document.querySelector("input");
    expect(input.value).toBe("test");
    input.value = "";

    userTypeText(input, "v");
    expect(mockOnChanged).toHaveBeenCalledTimes(1);
    expect(mockOnChanged.mock.calls[0][0]).toBe("v");
    expect(mockOnChanged.mock.calls[0][1]).toBe(ref);
    expect(input.value).toBe("v");

    input.value = "";
    userTypeText(input, " text");
    expect(input.value).toBe("text");
  });

  test("onFocusLeft event", async () => {
    const mockFocusLeft = jest.fn();
    let ref = null;
    reactTestUtils.act(() => {
      render(
        <TextControl
          ref={el => {
            ref = el;
          }}
          key={3}
          onFocusLeft={mockFocusLeft}
        />,
        container
      );
    });
    const input = document.querySelector("input");

    userTypeText(input, "text ");
    reactTestUtils.act(() => {
      input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    });

    await new Promise(r => setTimeout(r, 101));
    expect(mockFocusLeft).toHaveBeenCalledTimes(1);
    expect(mockFocusLeft.mock.calls[0][0]).toBe("text");
    expect(mockFocusLeft.mock.calls[0][1]).toBe(ref);
  });
});
