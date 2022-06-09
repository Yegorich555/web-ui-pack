import { WUPSpinElement } from "web-ui-pack";
import { spinUseType5 } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin5Element extends WUPSpinElement {}
spinUseType5(WUPSpin5Element);

const tagName = "wup-spin5";
customElements.define(tagName, WUPSpin5Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin5Element;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}
