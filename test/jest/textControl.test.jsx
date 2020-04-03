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

// todo check static properties are overrided!
describe("textControl", () => {
  h.testComponentFuncBind(TextControl);

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
    // todo make id is changable
    dom
      .expectRender(<TextControl id={1} />)
      .toMatchInlineSnapshot(
        `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label>"`
      );
    dom
      .expectRender(<TextControl id={1} label="Some Label" />)
      .toMatchInlineSnapshot(
        `"<label for=\\"1\\"><span>Some Label</span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label>"`
      );
    dom
      .expectRender(<TextControl id={1} name="Your Name" />)
      .toMatchInlineSnapshot(
        `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label>"`
      );
    dom
      .expectRender(<TextControl id={1} htmlInputProps={{ placeholder: "placeholder text here" }} />)
      .toMatchInlineSnapshot(
        `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\" placeholder=\\"placeholder text here\\"></span></label>"`
      );
    // checking data-required='true' when validations required: true
    dom
      .expectRender(<TextControl id={1} validations={{ required: true }} />)
      .toMatchInlineSnapshot(
        `"<label for=\\"1\\" data-required=\\"true\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"true\\" value=\\"\\"></span></label>"`
      );
    // checking data-required='false' when validations required: false
    dom
      .expectRender(<TextControl id={1} validations={{ required: false }} />)
      .toMatchInlineSnapshot(
        `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label>"`
      );
    // key points that input is new: we need this for reinit-component
    // todo make initValue is changable
    dom
      .expectRender(<TextControl key={1} id={1} initValue="value here" />)
      .toMatchInlineSnapshot(
        `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"value here\\"></span></label>"`
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
      `"<label for=\\"1\\" data-required=\\"true\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"true\\" aria-required=\\"true\\" value=\\"\\"></span><span role=\\"alert\\">This field is required</span></label>"`
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
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"true\\" aria-required=\\"false\\" value=\\"d\\"></span><span role=\\"alert\\">Min length is 2 characters</span></label>"`
    );
    dom.userTypeText(input, "dv");
    expect(ref.state.error).toBe(undefined);
    expect(dom.element.innerHTML).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"dv\\"></span></label>"`
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
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"d\\"></span></label>"`
    );
    dom.userTypeText(input, "dvt");
    expect(ref.state.error).toBe(TextControl.defaultValidations.max.msg(2));
    expect(dom.element.innerHTML).toMatchInlineSnapshot(
      `"<label for=\\"1\\"><span></span><span><input id=\\"1\\" aria-invalid=\\"true\\" aria-required=\\"false\\" value=\\"dvt\\"></span><span role=\\"alert\\">Max length is 2 characters</span></label>"`
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
