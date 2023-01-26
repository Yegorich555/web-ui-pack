import { WUPSpinElement } from "web-ui-pack";
import { spinUseHash } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin8Element extends WUPSpinElement {}
spinUseHash(WUPSpin8Element);

const tagName = "wup-spin8";
customElements.define(tagName, WUPSpin8Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin8Element;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}
