import { WUPSpinElement } from "web-ui-pack";
import { spinUseDotRoller } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin4Element extends WUPSpinElement {}
spinUseDotRoller(WUPSpin4Element);

const tagName = "wup-spin4";
customElements.define(tagName, WUPSpin4Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin4Element;
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
