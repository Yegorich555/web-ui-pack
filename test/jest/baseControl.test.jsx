/* eslint-disable prefer-rest-params */
import React from "react";
import { BaseControl } from "web-ui-pack";
import * as h from "./testHelper";

let dom = h.initDom(); // assignment only for Intellisense
beforeAll(() => {
  dom = h.initDom();
});

afterAll(() => {
  dom.destroyDom();
  dom = null;
});

describe("baseControl", () => {
  test("useless name", () => {
    const prevConsole = console.warn;
    console.warn = jest.fn();

    // BaseControl is abstract but for testing it's fine
    const control = new BaseControl({ name: "someName" });
    expect(control.form).toBeUndefined();

    console.warn = prevConsole;
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
    const prevConsole = console.warn;
    console.warn = jest.fn();

    expect(BaseControl.checkIsInvalid(2, { someRule: true })).toBe(false);
    expect(typeof BaseControl.checkIsInvalid(null, { required: true })).toBe("string");
    expect(BaseControl.checkIsInvalid(null, { required: "msg" })).toBe("msg");

    console.warn = prevConsole;
  });

  // todo test with papeeter
  // test("autoFocus", () => {
  //   dom.render(<TextControl id="textId" autoFocus />);
  //   console.warn(document.activeElement);
  //   expect(document.activeElement.id).toBe("textId");
  // });
});
