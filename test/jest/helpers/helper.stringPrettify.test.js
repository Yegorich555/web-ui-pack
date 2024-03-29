import { stringPrettify } from "web-ui-pack/indexHelpers";

describe("helper.stringPrettify", () => {
  test("camelCase", () => {
    expect(stringPrettify("somePropValue")).toEqual("Some Prop Value");
    expect(stringPrettify("TestMe")).toEqual("Test Me");
  });
  test("russian-camelCase", () => {
    expect(stringPrettify("хорошоСделано")).toEqual("Хорошо Сделано");
  });
  test("snakeCase", () => {
    expect(stringPrettify("some_prop_value")).toEqual("Some prop value");
    expect(stringPrettify("some_Prop_value")).toEqual("Some Prop value");
  });
  test("kebabCase", () => {
    expect(stringPrettify("some-prop-value")).toEqual("Some-prop-value");
    expect(stringPrettify("some-prop-value", true)).toEqual("Some prop value");
    expect(stringPrettify("some-prop-Value", true)).toEqual("Some prop Value");
  });
  test("mixCase", () => {
    expect(stringPrettify("some_prop-valueHere")).toEqual("Some prop-value Here");
    expect(stringPrettify("some_prop-valueHere", true)).toEqual("Some prop value Here");
  });
});
