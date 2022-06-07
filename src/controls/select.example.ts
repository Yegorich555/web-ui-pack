import WUPSelectControl from "./select";

// it's required to extend default validationRules
declare global {
  namespace WUPSelect {
    interface ValidationMap {
      isNumber: boolean;
    }
  }
}

WUPSelectControl.$defaults.validationRules.isNumber = (v) => !/^[0-9]*$/.test(v) && "Please enter a valid number";

// create control for testing
const el = document.createElement("wup-select");
el.$options.name = "testMe";
el.$initValue = "Some value";
el.$options.validations = {
  required: true,
  min: (v) => v.length > 500 && "This is error",
  extra: (v) => v.includes(" ") && "Extra rule: spaces are not allowed",
  isNumber: true,
};
console.warn("try custom validation", { validateResult: el.$validate() });

// const t: WUPSelect.
