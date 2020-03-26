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

  test("checkIsInvalid", () => {
    // checking - rule is not defined
    expect(BaseControl.checkIsInvalid(2, { someRule: true })).toBe(false);
    expect(typeof BaseControl.checkIsInvalid(null, { required: true })).toBe("string");
    expect(BaseControl.checkIsInvalid(null, { required: "msg" })).toBe("msg");
    // checking errorMsg is not defined
    BaseControl.defaultValidations.required.msg = null;
    expect(typeof BaseControl.checkIsInvalid(null, { required: true })).toBe("string");
  });

  test("autofocus", () => {
    // checking if autoFocus behavior works without errors
    const fn = jest.fn();
    class Control extends BaseControl {
      getRenderedInput() {
        return null;
      }

      componentDidMount() {
        super.componentDidMount();
        fn();
      }
    }

    dom.render(<Control autoFocus />);
    expect(fn).toBeCalledTimes(1);
  });
});
