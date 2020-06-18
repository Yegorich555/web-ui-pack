import React from "react";
import { ComboboxControl } from "web-ui-pack";
import * as h from "../testHelper";

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

    test("show popup by focus", async () => {
      dom.render(<ComboboxControl options={options} />);
      dom.dispatchEvent(document.querySelector("input"), new FocusEvent("focus", { bubbles: true }));
      jest.runAllTimers();

      expect(scrollIntoViewMock).toBeCalledTimes(1);
      expect(document.querySelector('[aria-selected="true"]')).toBeTruthy();
      expect(document.querySelector('[aria-selected="true"]').textContent).toBe("t1");
      expect(dom.element.innerHTML).toMatchInlineSnapshot(
        `"<div><fieldset><label><span></span><input aria-invalid=\\"false\\" aria-required=\\"false\\" autocomplete=\\"off\\" aria-autocomplete=\\"list\\" role=\\"combobox\\" aria-expanded=\\"true\\" aria-owns=\\"lb\\" aria-controls=\\"lb\\" aria-haspopup=\\"listbox\\" value=\\"\\" aria-activedescendant=\\"li0\\"><button type=\\"button\\" tabindex=\\"-1\\" aria-hidden=\\"true\\"></button></label><ul id=\\"lb\\" role=\\"listbox\\"><li id=\\"li0\\" role=\\"option\\" aria-selected=\\"true\\">t1</li><li id=\\"li1\\" role=\\"option\\" aria-selected=\\"false\\">t2</li></ul></fieldset></div>"`
      );
    });
  });
});
