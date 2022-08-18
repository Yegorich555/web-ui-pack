import { ValidationCases } from "./baseControl";
import WUPTextControl from "./text";

// it's required to extend default validationRules
declare global {
  namespace WUPText {
    interface ValidationMap {
      isNumber: boolean;
    }
  }
}

WUPTextControl.$defaults.validationRules.isNumber = (v) => !/^[0-9]*$/.test(v) && "Please enter a valid number";
WUPTextControl.$defaults.validationCase = ValidationCases.onInit | ValidationCases.onChangeSmart;

// create control for testing
const el = document.createElement("wup-text");
el.$options.name = "testMe";
el.$initValue = "Some value";
el.$options.validations = {
  required: true,
  max: 2,
  min: (v) => (!v || v.length > 500) && "This is error",
  extra: (v) => (!v || v.includes(" ")) && "Extra rule: spaces are not allowed",
  isNumber: true,
};
console.warn("try custom validation", { validateResult: el.$validate() });
