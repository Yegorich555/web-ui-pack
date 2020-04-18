import React from "react";
import { TextControl } from "web-ui-pack";
import * as h from "../testHelper";

let dom = h.initDom(); // assignment only for Intellisense
beforeAll(() => {
  dom = h.initDom();
});

afterAll(() => {
  dom.destroyDom();
  dom = null;
});

describe("textControl", () => {
  h.testControlCommon(TextControl);
  test("initValue", () => {
    expect(new TextControl({}).state.value).toBe("");
    expect(new TextControl({ initValue: undefined }).state.value).toBe("");
    expect(new TextControl({ initValue: null }).state.value).toBe("");
    expect(new TextControl({ initValue: "str" }).state.value).toBe("str");
  });

  const previous = TextControl.returnEmptyValue;
  test("emptyValue", () => {
    TextControl.returnEmptyValue = "";
    expect(new TextControl({}).value).toBe("");
    expect(new TextControl({ initValue: "str" }).value).toBe("str");
    expect(new TextControl({ initValue: null }).value).toBe("");

    TextControl.returnEmptyValue = null;
    expect(new TextControl({}).value).toBe(null);
    expect(new TextControl({ initValue: "str" }).value).toBe("str");
    expect(new TextControl({ initValue: "" }).value).toBe(null);
  });
  TextControl.returnEmptyValue = previous;

  test("render according to props", () => {
    dom
      .expectRender(<TextControl id={1} />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></label></fieldset></div>"`
      );
    dom
      .expectRender(<TextControl id={1} label="Some Label" />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><legend aria-hidden=\\"true\\">Some Label</legend><label><span>Some Label</span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></label></fieldset></div>"`
      );
    dom
      .expectRender(<TextControl id={1} name="Your Name" />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></label></fieldset></div>"`
      );
    dom
      .expectRender(<TextControl id={1} htmlInputProps={{ placeholder: "placeholder text here" }} />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\" placeholder=\\"placeholder text here\\"></label></fieldset></div>"`
      );
    // checking data-required='true' when validations required: true
    dom
      .expectRender(<TextControl id={1} validations={{ required: true }} />)
      .toMatchInlineSnapshot(
        `"<div data-required=\\"true\\"><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"true\\" value=\\"\\"></label></fieldset></div>"`
      );
    // checking data-required='false' when validations required: false
    dom
      .expectRender(<TextControl id={1} validations={{ required: false }} />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></label></fieldset></div>"`
      );
    // key points that input is new: we need this for reinit-component
    dom
      .expectRender(<TextControl key={1} id={1} initValue="value here" />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"value here\\"></label></fieldset></div>"`
      );
    dom
      .expectRender(<TextControl key={1} id={1} disabled />)
      .toMatchInlineSnapshot(
        `"<div disabled=\\"\\"><fieldset disabled=\\"\\"><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></label></fieldset></div>"`
      );
  });

  test("onChanged event", async () => {
    const mockOnChanged = jest.fn();
    let control = null;

    dom.render(
      <TextControl
        ref={el => {
          control = el;
        }}
        key={2}
        onChanged={mockOnChanged}
        initValue="test"
      />
    );
    const input = document.querySelector("input");
    expect(input.value).toBe("test");

    dom.userTypeText(input, "v");
    expect(mockOnChanged).toHaveBeenCalledTimes(1);
    expect(mockOnChanged).toHaveBeenCalledWith("v", control);
    expect(input.value).toBe("v");

    // check trimStart
    mockOnChanged.mockClear();
    dom.userTypeText(input, " ");
    expect(mockOnChanged).toHaveBeenCalledTimes(1); // new event because previous value wasn't [""]
    expect(mockOnChanged).toHaveBeenCalledWith("", control);
    expect(input.value).toBe("");

    mockOnChanged.mockClear();
    dom.userTypeText(input, " ");
    expect(mockOnChanged).toHaveBeenCalledTimes(0); // no firing event because no changes
    expect(input.value).toBe("");

    dom.userTypeText(input, " text");
    expect(input.value).toBe("text");

    // check onChanged when trim() by onBlur
    mockOnChanged.mockClear();
    dom.userTypeText(input, "tv ");
    expect(mockOnChanged).toHaveBeenCalledTimes(3);

    mockOnChanged.mockClear();
    await h.dispatchOnBlur(input);
    expect(mockOnChanged).toHaveBeenCalledTimes(1); // onChanged must be fired because 'tv ' is trimmed to 'tv' by onBlur
    expect(mockOnChanged).toHaveBeenCalledWith("tv", control);

    // check NO onChanged when nothing trim by onBlur
    mockOnChanged.mockClear();
    dom.userTypeText(input, "tv");
    expect(mockOnChanged).toHaveBeenCalledTimes(2);

    mockOnChanged.mockClear();
    await h.dispatchOnBlur(input);
    expect(mockOnChanged).toHaveBeenCalledTimes(0); // onChanged must not to be fired because there is no trimming (value changing)
  });

  test("onFocusLeft event", async () => {
    const mockFocusLeft = jest.fn();
    let ref = null;
    dom.render(
      <TextControl
        ref={el => {
          ref = el;
        }}
        key={3}
        onFocusLeft={mockFocusLeft}
      />
    );
    const input = document.querySelector("input");

    dom.userTypeText(input, "text ");
    await h.dispatchOnBlur(input);
    expect(mockFocusLeft).toHaveBeenCalledTimes(1);
    expect(mockFocusLeft).toHaveBeenCalledWith("text", ref);
  });

  test("validation", async () => {
    let ref = null;
    dom.render(
      <TextControl
        id={1}
        ref={el => {
          ref = el;
        }}
      />
    );
    const input = document.querySelector("input");
    const setValue = jest.spyOn(ref, "setValue");

    // test no-validations
    dom.userTypeText(input, " v");
    expect(setValue).toHaveBeenCalledTimes(2);
    expect(h.lastCall(setValue)[0]).toBe("v");
    expect(ref.state.error).toBe(undefined);

    // test validations required
    dom.render(
      <TextControl
        id={1}
        ref={el => {
          ref = el;
        }}
        validations={{ required: true }}
      />
    );

    setValue.mockClear();
    dom.userTypeText(input, " ");
    expect(setValue).toHaveBeenCalledTimes(1);
    expect(h.lastCall(setValue)[0]).toBe("");
    expect(ref.state.error).toBe(TextControl.defaultValidations.required.msg);
    expect(dom.element.innerHTML).toMatchInlineSnapshot(
      `"<div data-required=\\"true\\" data-invalid=\\"true\\"><fieldset><label><span></span><input aria-invalid=\\"true\\" aria-required=\\"true\\" value=\\"\\" aria-describedby=\\"err16\\"></label></fieldset><div role=\\"alert\\" id=\\"err16\\">This field is required</div></div>"`
    );

    // test validations.min
    dom.render(
      <TextControl
        id={1}
        ref={el => {
          ref = el;
        }}
        validations={{ min: 2 }}
      />
    );

    setValue.mockClear();
    dom.userTypeText(input, "d");
    expect(ref.state.error).toBe(TextControl.defaultValidations.min.msg(2));
    expect(dom.element.innerHTML).toMatchInlineSnapshot(
      `"<div data-invalid=\\"true\\"><fieldset><label><span></span><input aria-invalid=\\"true\\" aria-required=\\"false\\" value=\\"d\\" aria-describedby=\\"err16\\"></label></fieldset><div role=\\"alert\\" id=\\"err16\\">Min length is 2 characters</div></div>"`
    );
    dom.userTypeText(input, "dv");
    expect(ref.state.error).toBe(undefined);
    expect(dom.element.innerHTML).toMatchInlineSnapshot(
      `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"dv\\"></label></fieldset></div>"`
    );

    // test validations.max
    dom.render(
      <TextControl
        id={1}
        ref={el => {
          ref = el;
        }}
        validations={{ max: 2 }}
      />,
      dom.element
    );

    setValue.mockClear();
    dom.userTypeText(input, "d");
    expect(ref.state.error).toBe(undefined);
    expect(dom.element.innerHTML).toMatchInlineSnapshot(
      `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"d\\"></label></fieldset></div>"`
    );
    dom.userTypeText(input, "dvt");
    expect(ref.state.error).toBe(TextControl.defaultValidations.max.msg(2));
    expect(dom.element.innerHTML).toMatchInlineSnapshot(
      `"<div data-invalid=\\"true\\"><fieldset><label><span></span><input aria-invalid=\\"true\\" aria-required=\\"false\\" value=\\"dvt\\" aria-describedby=\\"err16\\"></label></fieldset><div role=\\"alert\\" id=\\"err16\\">Max length is 2 characters</div></div>"`
    );

    // checking direct calling functions
    expect(ref.validate()).toBe(false);

    // test validateOnChange=false
    dom.userTypeText(input, "12");
    TextControl.common.validateOnChange = false;
    expect(ref.state.error).toBe(undefined);
    dom.userTypeText(input, "123");
    expect(ref.state.error).toBe(undefined);

    // test validateOnBlur=false
    TextControl.common.validateOnBlur = false;
    dom.userTypeText(input, "123");
    expect(ref.state.error).toBe(undefined);
    await h.dispatchOnBlur(input);
    expect(ref.state.error).toBeDefined();
    TextControl.common.validateOnChange = true;
    TextControl.common.validateOnBlur = true;

    // end validations
  });
});
