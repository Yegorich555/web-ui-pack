/* eslint-disable prefer-rest-params */
import React from "react";
import { Form, TextControl, FormControls as FormsStore } from "web-ui-pack";
import * as h from "../testHelper";

let dom = h.initDom(); // assignment only for Intellisense
beforeAll(() => {
  dom = h.initDom();
});

afterAll(() => {
  dom.destroyDom();
  dom = null;
});

describe("form", () => {
  const spyRegisterForm = jest.spyOn(FormsStore, "registerForm");
  const spyRegisterInput = jest.spyOn(FormsStore, "tryRegisterInput");
  test("render according to props", () => {
    dom
      .expectRender(<Form />)
      .toMatchInlineSnapshot(
        `"<form autocomplete=\\"off\\" novalidate=\\"\\"><div><button type=\\"submit\\">SUBMIT</button></div></form>"`
      );
    dom
      .expectRender(<Form autoComplete="on" />)
      .toMatchInlineSnapshot(
        `"<form autocomplete=\\"on\\" novalidate=\\"\\"><div><button type=\\"submit\\">SUBMIT</button></div></form>"`
      );

    dom
      .expectRender(<Form className="someClass" />)
      .toMatchInlineSnapshot(
        `"<form autocomplete=\\"off\\" novalidate=\\"\\" class=\\"someClass\\"><div><button type=\\"submit\\">SUBMIT</button></div></form>"`
      );
    dom
      .expectRender(<Form title="Some title here" />)
      .toMatchInlineSnapshot(
        `"<form autocomplete=\\"off\\" novalidate=\\"\\"><h2>Some title here</h2><div><button type=\\"submit\\">SUBMIT</button></div></form>"`
      );
    dom
      .expectRender(<Form textSubmit="Click Me" />)
      .toMatchInlineSnapshot(
        `"<form autocomplete=\\"off\\" novalidate=\\"\\"><div><button type=\\"submit\\">Click Me</button></div></form>"`
      );
    dom
      .expectRender(
        <Form
          textSubmit={
            // eslint-disable-next-line react/jsx-wrap-multilines
            <>
              <span>Click</span>
              <span> Me</span>
            </>
          }
        />
      )
      .toMatchInlineSnapshot(
        `"<form autocomplete=\\"off\\" novalidate=\\"\\"><div><button type=\\"submit\\"><span>Click</span><span> Me</span></button></div></form>"`
      );
    dom
      .expectRender(
        <Form title="Some title here">
          <div>Some box here</div>
        </Form>
      )
      .toMatchInlineSnapshot(
        `"<form autocomplete=\\"off\\" novalidate=\\"\\"><h2>Some title here</h2><div>Some box here</div><div><button type=\\"submit\\">SUBMIT</button></div></form>"`
      );
  });

  test("integration with TextControl", async () => {
    let form = null;
    let control = null;

    dom
      .expectRender(
        <Form
          title="Title here"
          ref={el => {
            form = el;
          }}
        >
          <TextControl />
        </Form>
      )
      .toMatchInlineSnapshot(
        `"<form autocomplete=\\"off\\" novalidate=\\"\\"><h2>Title here</h2><label for=\\"uipack_1\\"><span></span><span><input id=\\"uipack_1\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label><div><button type=\\"submit\\">SUBMIT</button></div></form>"`
      );
    // todo: why doesn't this work after the second render
    const spySubmit = jest.spyOn(form, "submit");
    const spyValidate = jest.spyOn(form, "validate");

    expect(FormsStore.forms.size).toBe(1);
    // js-Set doesn't have values accessed by index
    expect(FormsStore.forms.values().next().value).toBe(form);
    expect(form.inputs.length).toBe(0); // 0 - because there is no name for textControl

    dom.render(
      <Form
        ref={el => {
          form = el;
        }}
      >
        <TextControl
          key={1}
          // todo if name changed we can update input because it wasn't changed
          name="postalCode"
          ref={el => {
            control = el;
          }}
        />
      </Form>
    );

    // checking form and input registration
    expect(spyRegisterForm).toHaveBeenCalledTimes(1);
    expect(form.inputs.length).toBe(1);
    expect(spyRegisterInput).toHaveBeenCalledTimes(1);
    expect(form.inputs[0]).toBe(control);

    // checking submit-firing
    const btnSubmit = dom.element.querySelector("button[type='submit']");
    expect(btnSubmit).toBeDefined();

    dom.dispatchEvent(btnSubmit, new MouseEvent("click", { bubbles: true }));
    expect(spySubmit).toHaveBeenCalledTimes(1);
    expect(spyValidate).toHaveBeenCalledTimes(1);
    expect(spyValidate).toHaveLastReturnedWith(false);
    expect(form.state.error).toBe(Form.errOneRequired);
    expect(dom.element.innerHTML).toMatchInlineSnapshot(
      `"<form autocomplete=\\"off\\" novalidate=\\"\\"><label for=\\"uipack_2\\"><span></span><span><input id=\\"uipack_2\\" aria-invalid=\\"false\\" aria-required=\\"false\\" value=\\"\\"></span></label><div>At least one value is required</div><div><button type=\\"submit\\">SUBMIT</button></div></form>"`
    );

    // checking submit-callback and model-generating
    const onValidSubmit = jest.fn();
    dom.render(
      <Form
        ref={el => {
          form = el;
        }}
        onValidSubmit={onValidSubmit}
      >
        <TextControl
          key={1}
          name="postalCode"
          ref={el => {
            control = el;
          }}
        />
      </Form>
    );
    const input = document.querySelector("input");
    dom.userTypeText(input, "t");
    dom.dispatchEvent(btnSubmit, new MouseEvent("click", { bubbles: true }));
    expect(onValidSubmit).toBeCalledTimes(1);
    expect(onValidSubmit.mock.calls[0][0]).toEqual({ postalCode: "t" });

    // todo check nested model here

    // checking init-model
    onValidSubmit.mockReset();
    dom.render(
      <Form initModel={{ postalCode: "some" }}>
        <TextControl key={2} name="postalCode" />
      </Form>
    );
    expect(document.querySelector("input").value).toBe("some");

    // checking init-value
    dom.render(
      <Form initModel={{ postalCode: "some" }} onValidSubmit={onValidSubmit}>
        <TextControl key={3} name="postalCode" initValue="another" />
      </Form>
    );
    expect(document.querySelector("input").value).toBe("another");

    dom.dispatchEvent(btnSubmit, new MouseEvent("click", { bubbles: true }));
    expect(onValidSubmit.mock.calls[0][0]).toEqual({ postalCode: "another" });
  });

  test("removing from FormsStore byUnMount", () => {
    const spyRemoveForm = jest.spyOn(FormsStore, "removeForm");
    const spyRemoveInput = jest.spyOn(FormsStore, "tryRemoveInput");
    dom.render(<Form />);
    expect(spyRemoveInput).toBeCalledTimes(1);
    expect(FormsStore.forms.values().next().value.inputs.length).toBe(0);

    dom.render(<div />);
    expect(spyRemoveForm).toBeCalledTimes(1);
    expect(FormsStore.forms.values().next().value).toBeUndefined();
  });

  test("multipleForms", () => {
    dom.render(
      <>
        <Form>
          <TextControl name="postalCode" />
        </Form>
        <Form>
          <TextControl name="postalCode2" />
        </Form>
      </>
    );
    const iForms = FormsStore.forms.values();
    let { inputs } = iForms.next().value;
    expect(inputs.length).toBe(1);
    expect(inputs[0].props.name).toBe("postalCode");

    inputs = iForms.next().value.inputs;
    expect(inputs.length).toBe(1);
    expect(inputs[0].props.name).toBe("postalCode2");
  });

  test("validation: invalid control", () => {
    jest.useFakeTimers();
    const controlProps = { name: "txt", validations: { required: true } };
    const controlProps2 = { name: "txt2", validations: { required: true } };
    const form = new Form({
      children: [
        { type: TextControl, props: controlProps },
        { type: TextControl, props: controlProps2 }
      ]
    });
    form.setState = h.mockSetState(form);
    const spyFormSetError = jest.spyOn(form, "setError");

    const control = new TextControl(controlProps);
    control.setState = h.mockSetState(control);
    expect(form.inputs.length).toBe(1);

    const control2 = new TextControl(controlProps2);
    control2.setState = h.mockSetState(control2);
    expect(form.inputs.length).toBe(2);

    Form.isValidateUntilFirstError = true;
    const modelOrFalse = form.validate();
    expect(modelOrFalse).toBe(false);
    expect(form.setState).not.toBeCalled();
    expect(form.state.error).not.toBeDefined();
    expect(control.setState).toBeCalled();
    jest.advanceTimersToNextTimer();
    expect(control.state.error).toBeDefined();
    expect(control2.state.error).toBeUndefined();
    expect(spyFormSetError).toBeCalledTimes(1);

    Form.isValidateUntilFirstError = false;
    expect(form.validate()).toBe(false);
    jest.advanceTimersToNextTimer();
    expect(control.state.error).toBeDefined();
    expect(control2.state.error).toBeDefined();
  });

  test("submit", async () => {
    jest.useFakeTimers();
    const e = { preventDefault: () => {} };
    const controlProps = { name: "txt", initValue: "val" };
    const onValidSubmit = jest.fn(() => "good");
    const form = new Form({ onValidSubmit, children: { type: TextControl, props: controlProps } });
    form.setState = h.mockSetState(form);
    const control = new TextControl(controlProps);
    control.setState = h.mockSetState(control);
    expect(form.inputs.length).toBe(1);

    form.submit(e);
    expect(onValidSubmit).toBeCalledTimes(1);
    expect(onValidSubmit).toHaveBeenCalledWith({ txt: "val" });
    jest.advanceTimersToNextTimer();
    expect(form.state.success).toBe("good");

    // testing console.warn
    form.props.onValidSubmit = null;
    h.wrapConsoleWarn(() => {
      form.submit(e);
      expect(console.warn).toBeCalledTimes(1);
    });

    // testing tryShowSubmitResult
    form.setState.mockClear();

    form.tryShowSubmitResult();
    expect(form.setState).not.toBeCalled();

    form.tryShowSubmitResult(null, { message: true });
    expect(form.setState).not.toBeCalled();

    form.tryShowSubmitResult("good");
    expect(form.setState).toHaveBeenLastCalledWith({ isPending: false, success: "good", error: undefined });

    form.tryShowSubmitResult(null, "bad");
    expect(form.setState).toHaveBeenLastCalledWith({ isPending: false, success: undefined, error: "bad" });

    form.tryShowSubmitResult(null, { message: "bad2" });
    expect(form.setState).toHaveBeenLastCalledWith({ isPending: false, success: undefined, error: "bad2" });

    // testing onValidSubmit returns promise
    form.setState({ isPending: false, error: null, success: null });
    jest.advanceTimersByTime();
    jest.useRealTimers(); // jest fakeTimers doesn't work inside promise
    Form.promiseDelayMs = 1;
    const spyOnShowResult = jest.spyOn(form, "tryShowSubmitResult");

    // promise.resolve
    form.props.onValidSubmit = jest.fn(() => Promise.resolve("good"));
    form.submit(e);
    expect(form.setState).toHaveBeenLastCalledWith({ isPending: true });
    form.submit(e); // no new submit if previous wasn't finished
    expect(form.props.onValidSubmit).toBeCalledTimes(1);
    await new Promise(resolve => setTimeout(resolve, 1));
    expect(spyOnShowResult).toHaveBeenLastCalledWith("good");

    // promise.reject
    const consoleErr = console.error;
    console.error = () => {};
    form.props.onValidSubmit = jest.fn(() => Promise.reject("bad"));
    form.submit(e);
    expect(form.setState).toHaveBeenLastCalledWith({ isPending: true });
    await new Promise(resolve => setTimeout(resolve, 1));
    expect(spyOnShowResult).toHaveBeenLastCalledWith(undefined, "bad");
    console.error = consoleErr;
    // todo expectRender here

    // testing when submitted and UnMounted before promise finished
    // promise.resolve
    form.props.onValidSubmit = jest.fn(() => Promise.resolve("good"));
    form.submit(e);
    form.setState.mockClear();
    form.componentWillUnmount();
    await new Promise(resolve => setTimeout(resolve, 1));
    expect(form.setState).not.toBeCalled();

    // promise.reject
    console.error = () => {};
    form.props.onValidSubmit = jest.fn(() => Promise.reject("bad"));
    form.submit(e);
    form.setState.mockClear();
    form.componentWillUnmount();
    await new Promise(resolve => setTimeout(resolve, 1));
    expect(form.setState).not.toBeCalled();
    console.error = consoleErr;
  });

  test("control without name", () => {
    const form = new Form({});
    form.inputs.push(new TextControl({}));
    h.mockConsoleWarn();
    form.inputs.push(new TextControl({ name: "here", initValue: 5 }));
    h.unMockConsoleWarn();
    const model = form.validate();
    expect(model).toEqual({ here: 5 });
  });

  // todo defaultProps
});
