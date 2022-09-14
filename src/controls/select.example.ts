import WUPSpinElement, { spinUseDualRing } from "../spinElement";
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

/* change spinner */
class WUPSpin2Element extends WUPSpinElement {}
spinUseDualRing(WUPSpin2Element);
const tagName = "wup-spin2";
customElements.define(tagName, WUPSpin2Element);
declare global {
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin2Element;
  }
}

WUPSelectControl.prototype.renderSpin = function renderSpinCustom(): WUPSpinElement {
  const spin = document.createElement("wup-spin2");
  spin.$options.fit = true;
  spin.$options.overflowFade = true;
  spin.$options.overflowTarget = this;
  this.appendChild(spin);
  return spin;
};
