import { WUPSpinElement } from "web-ui-pack";
import { spinUseSpliceRing } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin6Element extends WUPSpinElement {}
spinUseSpliceRing(WUPSpin6Element);

const tagName = "wup-spin6";
customElements.define(tagName, WUPSpin6Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin6Element;
  }
}

declare module "react" {
  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: React.JSX.IntrinsicElements["wup-spin"];
    }
  }
}
