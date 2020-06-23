import React from "react";
import { ComboboxControl } from "web-ui-pack";
import * as h from "../testHelper";

// todo check "click by button set focus on input" in puppeteer
// todo check "scrollIntoViewIfNeeded" in puppeteer

let dom = h.initDom(); // assignment only for Intellisense
beforeAll(() => {
  dom = h.initDom();
});

afterAll(() => {
  dom.destroyDom();
  dom = null;
});

describe("comboboxControl", () => {
  h.testControlCommon(ComboboxControl);
  test("initValue", () => {
    expect(new ComboboxControl({}).state.value).toBe(undefined);
    expect(new ComboboxControl({ initValue: undefined }).state.value).toBe(undefined);
    expect(new ComboboxControl({ initValue: null }).state.value).toBe(null);
    expect(new ComboboxControl({ initValue: "str" }).state.value).toBe("str");
  });

  test("render according to props", () => {
    dom
      .expectRender(<ComboboxControl id={1} />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
    dom
      .expectRender(<ComboboxControl id={1} label="Some Label" />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><legend aria-hidden=\\"true\\">Some Label</legend><label><span>Some Label</span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
    dom
      .expectRender(<ComboboxControl id={1} name="Your Name" />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
    dom
      .expectRender(<ComboboxControl id={1} htmlInputProps={{ placeholder: "placeholder text here" }} />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\" placeholder=\\"placeholder text here\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
    // checking data-required='true' when validations required: true
    dom
      .expectRender(<ComboboxControl id={1} validations={{ required: true }} />)
      .toMatchInlineSnapshot(
        `"<div data-required=\\"true\\"><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"true\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
    // checking data-required='false' when validations required: false
    dom
      .expectRender(<ComboboxControl id={1} validations={{ required: false }} />)
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
    // key points that input is new: we need this for reinit-component
    h.wrapConsoleWarn(() => {
      dom
        .expectRender(<ComboboxControl key={1} id={1} initValue="555" />)
        .toMatchInlineSnapshot(
          `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"555\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
        );
      dom
        .expectRender(<ComboboxControl key={2} id={1} initValue={88} />)
        .toMatchInlineSnapshot(
          `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"88\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
        );
    });

    dom
      .expectRender(
        <ComboboxControl
          key={3}
          id={1}
          initValue={8}
          options={[
            { text: "t", value: 1 },
            { text: "a", value: 8 }
          ]}
        />
      )
      .toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"a\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );

    dom
      .expectRender(<ComboboxControl key={1} id={1} disabled />)
      .toMatchInlineSnapshot(
        `"<div disabled=\\"\\"><fieldset disabled=\\"\\"><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
  });

  describe("options-select behavior", () => {
    const options = [
      { text: "t1", value: 1 },
      { text: "t2", value: 2 }
    ];

    jest.useFakeTimers();
    const scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    test("popup by focus", () => {
      const mockChanged = jest.fn();
      const mockFocusLeft = jest.fn();
      dom.render(<ComboboxControl options={options} onChanged={mockChanged} onFocusLeft={mockFocusLeft} />);
      const input = document.querySelector("input");
      input.focus();
      jest.runAllTimers();

      expect(scrollIntoViewMock).toBeCalledTimes(1);
      expect(document.querySelector('[aria-selected="true"]')).toBeTruthy();
      expect(document.querySelector('[aria-selected="true"]').textContent).toBe("t1");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector('[aria-selected="true"]').id);
      expect(document.activeElement).toBe(input);
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"true\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\" aria-activedescendant=\\"li0\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label><ul id=\\"lb\\" role=\\"listbox\\"><li id=\\"li0\\" role=\\"option\\" aria-selected=\\"true\\">t1</li><li id=\\"li1\\" role=\\"option\\" aria-selected=\\"false\\">t2</li></ul></fieldset></div>"`
      );

      // close by blur
      dom.dispatchEvent("input", new FocusEvent("blur", { bubbles: true }));
      jest.runAllTimers();
      expect(mockChanged).toBeCalledTimes(1);
      expect(mockChanged.mock.calls[0][0]).toBe(1);
      expect(mockFocusLeft).toBeCalledTimes(1);
      expect(mockFocusLeft.mock.calls[0][0]).toBe(1);
      expect(document.querySelector("input").value).toBe("t1");
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"t1\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
    });

    test("popup by inputChange", () => {
      const mockChanged = jest.fn();
      const mockFocusLeft = jest.fn();
      dom.render(<ComboboxControl key={1} options={options} onChanged={mockChanged} onFocusLeft={mockFocusLeft} />);
      dom.userTypeText(document.querySelector("input"), "t");
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"true\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"t\\" aria-activedescendant=\\"li0\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label><ul id=\\"lb\\" role=\\"listbox\\"><li id=\\"li0\\" role=\\"option\\" aria-selected=\\"true\\">t1</li><li id=\\"li1\\" role=\\"option\\" aria-selected=\\"false\\">t2</li></ul></fieldset></div>"`
      );

      // close by enter
      dom.userPressKey("input", h.keys.Enter);
      expect(mockChanged).toBeCalledTimes(1);
      expect(mockChanged.mock.calls[0][0]).toBe(1);
      expect(mockFocusLeft).not.toBeCalled();
      expect(document.querySelector("input").value).toBe("t1");
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"t1\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );

      // open again
      dom.userTypeText(document.querySelector("input"), "t2");
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"true\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"t2\\" aria-activedescendant=\\"li1\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label><ul id=\\"lb\\" role=\\"listbox\\"><li id=\\"li1\\" role=\\"option\\" aria-selected=\\"true\\">t2</li></ul></fieldset></div>"`
      );
    });

    test("popup by buttonClick", () => {
      const mockChanged = jest.fn();
      const mockFocusLeft = jest.fn();
      dom.render(<ComboboxControl key={2} options={options} onChanged={mockChanged} onFocusLeft={mockFocusLeft} />);
      dom.userClick("button");
      jest.runAllTimers();

      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"true\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\" aria-activedescendant=\\"li0\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label><ul id=\\"lb\\" role=\\"listbox\\"><li id=\\"li0\\" role=\\"option\\" aria-selected=\\"true\\">t1</li><li id=\\"li1\\" role=\\"option\\" aria-selected=\\"false\\">t2</li></ul></fieldset></div>"`
      );
      const input = document.querySelector("input");
      expect(document.activeElement).toBe(input);

      // close without selection (by button click)
      dom.userClick("button");
      expect(document.activeElement).toBe(input);
      expect(mockChanged).not.toBeCalled();
      expect(mockFocusLeft).not.toBeCalled();
      expect(input.value).toBe("");
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );

      // open again
      dom.userClick("button");
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"true\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\" aria-activedescendant=\\"li0\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label><ul id=\\"lb\\" role=\\"listbox\\"><li id=\\"li0\\" role=\\"option\\" aria-selected=\\"true\\">t1</li><li id=\\"li1\\" role=\\"option\\" aria-selected=\\"false\\">t2</li></ul></fieldset></div>"`
      );

      // select second item from menu
      dom.dispatchEvent("li:nth-child(2)", new MouseEvent("click", { bubbles: true }));
      expect(mockChanged).toBeCalledTimes(1);
      expect(mockChanged.mock.calls[0][0]).toBe(2);
      expect(mockFocusLeft).not.toBeCalled();
      expect(input.value).toBe("t2");
      expect(document.activeElement).toBe(input);
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"t2\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset></div>"`
      );
    });

    test("whole keyboard interaction", () => {
      const mockChanged = jest.fn();
      const mockFocusLeft = jest.fn();
      dom.render(
        <ComboboxControl
          key={3}
          options={[
            { text: "tg3", value: 11 },
            { text: "tr1", value: 22 },
            { text: "tr2", value: 33 }
          ]}
          initValue={22}
          onChanged={mockChanged}
          onFocusLeft={mockFocusLeft}
        />
      );
      const input = document.querySelector("input");
      input.focus();
      jest.runAllTimers();
      expect(document.querySelector("ul")).toBeTruthy();
      expect(document.querySelectorAll("li").length).toBe(3);
      expect(document.querySelector("li:nth-child(2)").getAttribute("aria-selected")).toBe("true");

      dom.userTypeText(input, "tr");
      expect(document.querySelectorAll("li").length).toBe(2);
      expect(document.querySelector("li").getAttribute("aria-selected")).toBe("true");

      // case when user removes text
      dom.userTypeText(input, "");
      expect(document.querySelectorAll("li").length).toBe(3);
      expect(document.querySelector("[aria-selected='true']")).toBeFalsy();
      expect(document.querySelector("[aria-activedescendant]")).toBeFalsy();

      dom.userTypeText(input, "v");
      expect(document.querySelectorAll("li").length).toBe(1);
      expect(document.querySelector("li").textContent).toBe(ComboboxControl.textNoItems);
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"true\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"v\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label><ul id=\\"lb\\" role=\\"listbox\\"><li role=\\"option\\" aria-selected=\\"false\\" aria-disabled=\\"true\\">No Items</li></ul></fieldset></div>"`
      );

      // enter when no selectedItem => resetInput
      dom.userPressKey(input, h.keys.Enter);
      expect(document.querySelector("ul")).toBeFalsy();
      expect(mockChanged).toBeCalledTimes(1);
      expect(mockChanged.mock.calls[0][0]).toBe(ComboboxControl.defaultInitValue);
      expect(mockFocusLeft).not.toBeCalled();
      expect(input.value).toBe("");
      // expected nothing (sumbit actually) because popup is closed
      mockChanged.mockClear();
      dom.userPressKey(input, h.keys.Enter);
      expect(document.querySelector("ul")).toBeFalsy();
      expect(mockChanged).not.toBeCalled();
      expect(mockFocusLeft).not.toBeCalled();
      expect(input.value).toBe("");

      dom.userPressKey(input, h.keys.ArrowDown);
      expect(document.querySelectorAll("li").length).toBe(3);
      expect(document.querySelector("li").getAttribute("aria-selected")).toBe("true");
      dom.userPressKey(input, h.keys.ArrowDown);
      expect(document.querySelector("li:nth-child(2)").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li:nth-child(2)").id);
      dom.userPressKey(input, h.keys.ArrowDown);
      expect(document.querySelector("li:nth-child(3)").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li:nth-child(3)").id);
      dom.userPressKey(input, h.keys.ArrowDown);
      expect(document.querySelector("li").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li").id);

      dom.userPressKey(input, h.keys.Enter);
      expect(document.querySelector("ul")).toBeFalsy();
      expect(mockChanged).toBeCalledTimes(1);
      expect(mockChanged.mock.calls[0][0]).toBe(11);
      expect(mockFocusLeft).not.toBeCalled();
      expect(input.value).toBe("tg3");

      dom.userPressKey(input, h.keys.ArrowUp);
      expect(document.querySelectorAll("li").length).toBe(3);
      expect(document.querySelector("li:nth-child(3)").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li:nth-child(3)").id);
      dom.userPressKey(input, h.keys.ArrowUp);
      expect(document.querySelector("li:nth-child(2)").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li:nth-child(2)").id);
      dom.userPressKey(input, h.keys.ArrowUp);
      expect(document.querySelector("li").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li").id);
      dom.userPressKey(input, h.keys.ArrowUp);
      expect(document.querySelector("li:nth-child(3)").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li:nth-child(3)").id);

      dom.userPressKey(input, h.keys.Home);
      expect(document.querySelector("li").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li").id);
      dom.userPressKey(input, h.keys.Home);
      expect(document.querySelector("li").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li").id);

      dom.userPressKey(input, h.keys.End);
      expect(document.querySelector("li:nth-child(3)").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li:nth-child(3)").id);
      dom.userPressKey(input, h.keys.End);
      expect(document.querySelector("li:nth-child(3)").getAttribute("aria-selected")).toBe("true");
      expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelector("li:nth-child(3)").id);

      mockChanged.mockClear();
      dom.userPressKey(input, h.keys.Enter);
      expect(document.querySelector("ul")).toBeFalsy();
      expect(mockChanged).toBeCalledTimes(1);
      expect(mockChanged.mock.calls[0][0]).toBe(33);
      expect(mockFocusLeft).not.toBeCalled();
      expect(input.value).toBe("tr2");

      // no effect when menu is closed
      dom.userPressKey(input, h.keys.Home);
      dom.userPressKey(input, h.keys.End);
      expect(document.querySelector("ul")).toBeFalsy();

      // checking reset to null
      ComboboxControl.shouldEscClear = true;
      mockChanged.mockClear();
      dom.userPressKey(input, h.keys.Esc);
      expect(mockChanged).toBeCalledTimes(1);
      expect(mockChanged.mock.calls[0][0]).toBe(ComboboxControl.returnEmptyValue);
      expect(input.value).toBe("");

      // checking reset to previous
      ComboboxControl.shouldEscClear = false;
      mockChanged.mockClear();
      dom.userPressKey(input, h.keys.Esc);
      expect(mockChanged).toBeCalledTimes(1);
      expect(mockChanged.mock.calls[0][0]).toBe(22);
      expect(input.value).toBe("tr1");

      expect(mockFocusLeft).not.toBeCalled();
    });

    test("value not found in options", () => {
      const mockWarn = h.wrapConsoleWarn(() => {
        dom.render(<ComboboxControl options={[{ text: "t1", value: 11 }]} initValue={22} />);
        dom.userClick("button");
        jest.runAllTimers();
        expect(document.querySelector("input").value).toBe("22");
        expect(document.querySelector("li").getAttribute("aria-selected")).toBe("true");
      });
      expect(mockWarn).toBeCalled();
    });

    test("wrong constructor.getOptionId", () => {
      const mockChanged = jest.fn();
      let id = 0;
      const prev = ComboboxControl.getOptionId;
      ComboboxControl.getOptionId = () => `l${++id}`;
      const mockWarn = h.wrapConsoleWarn(() => {
        dom.render(
          <ComboboxControl key={1} options={[{ text: "t1", value: 11 }]} initValue={11} onChanged={mockChanged} />
        );
        dom.userClick("button");
        jest.runAllTimers();
        dom.userClick("li");
        jest.runAllTimers();
        expect(mockChanged).toBeCalledTimes(1);
        expect(mockChanged.mock.calls[0][0]).toBe(ComboboxControl.returnEmptyValue);
      });
      expect(mockWarn).toBeCalled();

      ComboboxControl.getOptionId = prev;
    });

    test("scrollIntoViewIfNeeded", () => {
      const mockfn = jest.fn();
      HTMLElement.prototype.scrollIntoViewIfNeeded = mockfn;
      dom.render(<ComboboxControl options={[{ text: "t1", value: 11 }]} initValue={11} />);
      dom.userClick("button");
      jest.runAllTimers();
      expect(document.querySelector("ul")).toBeTruthy();
      expect(mockfn).toBeCalledTimes(1);
    });

    test("validation", () => {
      let ref = null;
      dom.render(
        <ComboboxControl
          key={1}
          ref={el => (ref = el)}
          options={[{ text: "t1", value: "some" }]}
          validations={{ required: true }}
        />
      );
      dom.userClick("button");
      jest.runAllTimers();
      expect(document.querySelector("ul")).toBeTruthy();

      dom.userClick("button");
      jest.runAllTimers();
      expect(document.querySelector("ul")).toBeFalsy();

      expect(ref.state.error).toBe(ComboboxControl.defaultValidations.required.msg);
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div data-required=\\"true\\" data-invalid=\\"true\\"><fieldset><label><span></span><input aria-invalid=\\"true\\" aria-required=\\"true\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"false\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\" aria-describedby=\\"err18\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label></fieldset><div role=\\"alert\\" id=\\"err18\\">This field is required</div></div>"`
      );

      dom.userClick("button");
      jest.runAllTimers();
      expect(document.querySelector("ul")).toBeTruthy();

      dom.userClick("li");
      jest.runAllTimers();
      expect(ref.state.error).toBeFalsy();
      expect(ref.value).toBe("some");
    });

    test("options without text", () => {
      const mockfn = h.wrapConsoleWarn(() => {
        dom.render(<ComboboxControl key={2} options={[{ value: "t1" }]} initValue="t1" />);
        expect(document.querySelector("input").value).toBe("t1");
        dom.userClick("button");
        jest.runAllTimers();
        expect(document.querySelector("li").textContent).toBe("t1");
      });
      expect(mockfn).toBeCalledTimes(2);

      const mockfn2 = h.wrapConsoleWarn(() => {
        dom.render(<ComboboxControl key={3} options={[{ value: "t1" }, { value: null }]} initValue={null} />);
        expect(document.querySelector("input").value).toBe("");
        dom.userClick("button");
        jest.runAllTimers();
        expect(document.querySelector("li").textContent).toBe("t1");
        expect(document.querySelector("li:nth-child(2)").textContent).toBe("");
      });
      expect(mockfn2).toBeCalledTimes(2);
    });
  });
});
