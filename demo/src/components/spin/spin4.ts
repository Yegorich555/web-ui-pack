import { WUPSpinElement } from "web-ui-pack";
import { spinUseType4 } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin4Element extends WUPSpinElement {}
spinUseType4(WUPSpin4Element);

console.warn(WUPSpin4Element.$style, WUPSpinElement.$style);

const tagName = "wup-spin4";
customElements.define(tagName, WUPSpin4Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin4Element;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}
