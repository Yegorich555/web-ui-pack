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
});
