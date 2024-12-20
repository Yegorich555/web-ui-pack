import { WUPSpinElement } from "web-ui-pack";
import { spinUseDotRing } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin5Element extends WUPSpinElement {}
spinUseDotRing(WUPSpin5Element);

const tagName = "wup-spin5";
customElements.define(tagName, WUPSpin5Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin5Element;
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
