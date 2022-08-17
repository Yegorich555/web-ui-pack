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

// to define new rule add new property to validationRules
WUPTextControl.$defaults.validationRules.isNumber = (v) => (!v || !/^[0-9]*$/.test(v)) && "Please enter a valid number";
const el = document.createElement("wup-text");
el.$options.validations = { isNumber: true };
// or add function to validations of element directlty
const el = document.createElement("wup-text");
el.$options.validations = {
  isNumber: (v) => (!v || !/^[0-9]*$/.test(v)) && "Please enter a valid number",
};

// to redefine default error message need to redefine the whole rule
const minOrig = WUPTextControl.$defaults.validationRules.min!;
WUPTextControl.$defaults.validationRules.min = (v, setV) => minOrig(v, setV) && `Your custom error message`;

/* ATTENTION: all rules must return error-message when value is [undefined].
It's required to show errorMessages as whole list via $options.validationShowAll (mostly used for PasswordControl) */
