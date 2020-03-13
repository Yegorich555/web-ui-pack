/* eslint-disable jest/expect-expect */
import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import reactTestUtils from "react-dom/test-utils";
import { TextControl } from "web-ui-pack";

TextControl.focusDebounce = 0;
const waitBlurDebounce = () => new Promise(r => setTimeout(r, TextControl.focusDebounce));
async function dispatchOnBlur(element) {
  reactTestUtils.act(() => {
    element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  });

  await waitBlurDebounce();
}

const lastCall = jestFn => {
  return jestFn.mock.calls[jestFn.mock.calls.length - 1];
};

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

// todo check static properties are overrided!
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
  }

  test("onChanged event", async () => {
    const mockOnChanged = jest.fn();
    let control = null;
    reactTestUtils.act(() => {
      render(
        <TextControl
          ref={el => {
            control = el;
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

    userTypeText(input, "v");
    expect(mockOnChanged).toHaveBeenCalledTimes(1);
    expect(mockOnChanged).toHaveBeenCalledWith("v", control);
    expect(input.value).toBe("v");

    // check trimStart
    mockOnChanged.mockClear();
    userTypeText(input, " ");
    expect(mockOnChanged).toHaveBeenCalledTimes(1); // new event because previous value wasn't [""]
    expect(mockOnChanged).toHaveBeenCalledWith("", control);
    expect(input.value).toBe("");

    mockOnChanged.mockClear();
    userTypeText(input, " ");
    expect(mockOnChanged).toHaveBeenCalledTimes(0); // no firing event because no changes
    expect(input.value).toBe("");

    userTypeText(input, " text");
    expect(input.value).toBe("text");

    // check onChanged when trim() by onBlur
    mockOnChanged.mockClear();
    userTypeText(input, "tv ");
    expect(mockOnChanged).toHaveBeenCalledTimes(3);

    mockOnChanged.mockClear();
    reactTestUtils.act(() => {
      input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    });

    await waitBlurDebounce();
    expect(mockOnChanged).toHaveBeenCalledTimes(1); // onChanged must be fired because 'tv ' is trimmed to 'tv' by onBlur
    expect(mockOnChanged).toHaveBeenCalledWith("tv", control);

    // check NO onChanged when nothing trim by onBlur
    mockOnChanged.mockClear();
    userTypeText(input, "tv");
    expect(mockOnChanged).toHaveBeenCalledTimes(2);

    mockOnChanged.mockClear();
    reactTestUtils.act(() => {
      input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    });

    await waitBlurDebounce();
    expect(mockOnChanged).toHaveBeenCalledTimes(0); // onChanged must not to be fired because there is no trimming (value changing)
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
    await dispatchOnBlur(input);
    expect(mockFocusLeft).toHaveBeenCalledTimes(1);
    expect(mockFocusLeft).toHaveBeenCalledWith("text", ref);
  });

  test("validation", async () => {
    let ref = null;
    reactTestUtils.act(() => {
      render(
        <TextControl
          id={1}
          ref={el => {
            ref = el;
          }}
        />,
        container
      );
    });
    const input = document.querySelector("input");
    const setValue = jest.spyOn(ref, "setValue");

    // test no-validations
    userTypeText(input, " v");
    expect(setValue).toHaveBeenCalledTimes(2);
    expect(lastCall(setValue)[0]).toBe("v");
    expect(ref.state.error).toBe(undefined);

    // test validations required
    reactTestUtils.act(() => {
      render(
        <TextControl
          id={1}
          ref={el => {
            ref = el;
          }}
          validations={{ required: true }}
        />,
        container
      );
    });

    setValue.mockClear();
    userTypeText(input, " ");
    expect(setValue).toHaveBeenCalledTimes(1);
    expect(lastCall(setValue)[0]).toBe("");
    expect(ref.state.error).toBe(TextControl.defaultValidations.required.msg);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<label for=\\"1\\" data-required=\\"true\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"true\\" aria-required=\\"true\\" value=\\"\\"></span><span role=\\"alert\\">This field is required</span></label>"`
    );

    // test validations.min
    reactTestUtils.act(() => {
      render(
        <TextControl
          id={1}
          ref={el => {
            ref = el;
          }}
          validations={{ min: 2 }}
        />,
        container
      );
    });
    setValue.mockClear();
    userTypeText(input, "d");
    expect(ref.state.error).toBe(TextControl.defaultValidations.min.msg(2));
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"true\\" aria-required=\\"false\\" value=\\"d\\"></span><span role=\\"alert\\">Min length is 2 characters</span></label>"`
    );
    userTypeText(input, "dv");
    expect(ref.state.error).toBe(undefined);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"dv\\"></span></label>"`
    );

    // test validations.max
    reactTestUtils.act(() => {
      render(
        <TextControl
          id={1}
          ref={el => {
            ref = el;
          }}
          validations={{ max: 2 }}
        />,
        container
      );
    });
    setValue.mockClear();
    userTypeText(input, "d");
    expect(ref.state.error).toBe(undefined);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"d\\"></span></label>"`
    );
    userTypeText(input, "dvt");
    expect(ref.state.error).toBe(TextControl.defaultValidations.max.msg(2));
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"true\\" aria-required=\\"false\\" value=\\"dvt\\"></span><span role=\\"alert\\">Max length is 2 characters</span></label>"`
    );

    // test validateOnChange=false
    userTypeText(input, "12");
    TextControl.commonOptions.validateOnChange = false;
    expect(ref.state.error).toBe(undefined);
    userTypeText(input, "123");
    expect(ref.state.error).toBe(undefined);

    // test also validateOnBlur=false
    TextControl.commonOptions.validateOnBlur = false;
    userTypeText(input, "123");
    expect(ref.state.error).toBe(undefined);
    await dispatchOnBlur(input);
    expect(ref.state.error).toBeDefined();
    TextControl.commonOptions.validateOnChange = true;
    TextControl.commonOptions.validateOnBlur = true;

    // end validations
  });
});
