import { stringPrettify } from "web-ui-pack/indexHelpers";

describe("helper.stringPrettify", () => {
  test("camelCase", () => {
    expect(stringPrettify("somePropValue")).toEqual("Some Prop Value");
    expect(stringPrettify("TestMe")).toEqual("Test Me");
    expect(stringPrettify("abcAzpqZpq")).toEqual("Abc Azpq Zpq");
    expect(stringPrettify("abcAzpqZpq", false)).toEqual("Abc azpq zpq");

    expect(stringPrettify("SMSReminder")).toEqual("SMS Reminder");
    expect(stringPrettify("ReminderSMS")).toEqual("Reminder SMS");

    expect(stringPrettify("SMSReminder", false)).toEqual("SMS reminder");
    expect(stringPrettify("reminderSMS")).toEqual("Reminder SMS");
    expect(stringPrettify("reminderSMS", false)).toEqual("Reminder SMS");
  });
  test("snakeCase", () => {
    expect(stringPrettify("some_prop_value")).toEqual("Some Prop Value");
    expect(stringPrettify("some_Prop_value")).toEqual("Some Prop Value");
    expect(stringPrettify("some_prop_value", false)).toEqual("Some prop value");
  });
  test("kebabCase", () => {
    expect(stringPrettify("some-prop-value")).toEqual("Some-prop-value");
    expect(stringPrettify("some-prop-value", true, true)).toEqual("Some Prop Value");
    expect(stringPrettify("some-prop-value", false, true)).toEqual("Some prop value");
  });
  test("mixCase", () => {
    expect(stringPrettify("some_prop-valueHere")).toEqual("Some Prop-value Here");
    expect(stringPrettify("some_prop-valueHere", false)).toEqual("Some prop-value here");
    expect(stringPrettify("some_prop-valueHere", true, true)).toEqual("Some Prop Value Here");
  });
});
