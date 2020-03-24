/* eslint-disable prefer-rest-params */
import { BaseControl } from "web-ui-pack";

const prevConsole = console.warn;
console.warn = jest.fn();
afterAll(() => {
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
    expect(BaseControl.checkIsInvalid(2, { someRule: true })).toBe(false);
    expect(typeof BaseControl.checkIsInvalid(null, { required: true })).toBe("string");
    expect(BaseControl.checkIsInvalid(null, { required: "msg" })).toBe("msg");
  });
});
