// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import { BaseControl } from "web-ui-pack";
import * as h from "../testHelper";

const prevConsole = console.warn;
console.warn = jest.fn();
let dom = h.initDom(); // assignment only for Intellisense
beforeAll(() => {
  dom = h.initDom();
});

afterAll(() => {
  dom.destroyDom();
  dom = null;
  console.warn = prevConsole;
});

describe("baseControl", () => {
  h.testComponentFuncBind(BaseControl);
  test("useless name", () => {
    // BaseControl is abstract but for testing it's fine
    const control = new BaseControl({ name: "someName" });
    expect(control.form).toBeUndefined();
  });

  test("toJSON", () => {
    // BaseControl is abstract but for testing it's fine
    const control = new BaseControl({});
    expect(() => control.toJSON()).not.toThrow();
    control.form = {};
    expect(() => control.toJSON()).not.toThrow();
  });

  test("isEmpty", () => {
    expect(BaseControl.isEmpty(undefined)).toBe(true);
  });

  test("isChanged", () => {
    const control = new BaseControl({ initValue: "v" });
    expect(control.state.value).toBe("v");
    expect(control.isChanged).toBe(false);
    control.state.value = "d";
    expect(control.isChanged).toBe(true);
  });

  test("checkIsInvalid", () => {
    // checking - rule is not defined
    const checkIsInvalid = (v, prop) => BaseControl.common.checkIsInvalid(v, BaseControl.defaultValidations, prop);
    expect(checkIsInvalid(2, { someRule: true })).toBe(false);
    expect(typeof checkIsInvalid(null, { required: true })).toBe("string");
    expect(checkIsInvalid(null, { required: "msg" })).toBe("msg");
    // checking errorMsg is not defined
    BaseControl.defaultValidations.required.msg = null;
    expect(typeof checkIsInvalid(null, { required: true })).toBe("string");
  });

  test("changingInitProps", () => {
    jest.useFakeTimers();
    const spyRender = jest.fn();
    let ctrl;
    class Test extends BaseControl {
      constructor(props) {
        super(props);
        ctrl = this;
      }
      renderInput() {
        spyRender(this.state.value);
        return null;
      }
    }
    dom.render(<Test initValue={5} />);
    expect(spyRender).toBeCalledTimes(1);
    expect(spyRender).toHaveBeenLastCalledWith(5);

    dom.render(<Test initValue={7} />);
    expect(spyRender).toBeCalledTimes(2);
    expect(spyRender).toHaveBeenLastCalledWith(7);

    // no form - no updates by name
    spyRender.mockClear();
    dom.render(<Test initValue={7} name="addr" />);
    expect(spyRender).not.toBeCalled();

    // reset control
    dom.render(<Test />);
    spyRender.mockClear();

    const spyInitValue = jest.fn();
    ctrl.form = {
      getInitValue(name) {
        spyInitValue(name);
        if (name === "addr2") {
          return "sm2";
        }
        return "sm";
      }
    };

    dom.render(<Test name="addr2" />);
    expect(spyRender).toBeCalledTimes(1);
    expect(spyRender).toHaveBeenLastCalledWith("sm2");
    expect(spyInitValue).toBeCalledTimes(1);
    expect(spyInitValue).toHaveBeenLastCalledWith("addr2");

    // no changes - no updates
    dom.render(<Test initValue={1} name="addr" />);
    spyRender.mockClear();
    dom.render(<Test initValue={1} name="addr" />);
    expect(spyRender).not.toBeCalled();

    // isChanged - no updates
    ctrl.state.value = "d";
    expect(ctrl.isChanged).toBe(true);
    dom.render(<Test initValue={999} />);
    expect(spyRender).not.toBeCalled();

    jest.useRealTimers();
  });
});
