import { WUPSpinElement } from "web-ui-pack";
import { spinUseTwinDualRing } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin7Element extends WUPSpinElement {}
spinUseTwinDualRing(WUPSpin7Element);

const tagName = "wup-spin7";
customElements.define(tagName, WUPSpin7Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin7Element;
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
