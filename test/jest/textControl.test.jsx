/* eslint-disable jest/expect-expect */
import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
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
  act(() => {
    render(smt, container);
  });
  return expect(container.innerHTML);
}

describe("textControl", () => {
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
  test("initValue", () => {
    expect(new TextControl({}).state.value).toBe("");
    expect(new TextControl({ initValue: undefined }).state.value).toBe("");
    expect(new TextControl({ initValue: null }).state.value).toBe("");
    expect(new TextControl({ initValue: "str" }).state.value).toBe("str");
  });

  test("emptyValue", () => {
    const previous = TextControl.emptyValue;
    TextControl.emptyValue = "";
    expect(new TextControl({}).value).toBe("");
    expect(new TextControl({ initValue: "str" }).value).toBe("str");
    expect(new TextControl({ initValue: null }).value).toBe("");

    TextControl.emptyValue = null;
    expect(new TextControl({}).value).toBe(null);
    expect(new TextControl({ initValue: "str" }).value).toBe("str");
    expect(new TextControl({ initValue: "" }).value).toBe(null);
    TextControl.emptyValue = previous;
  });
});
