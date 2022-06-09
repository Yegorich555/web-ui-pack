import { WUPSpinElement } from "web-ui-pack";
import { spinUseType4 } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin4Element extends WUPSpinElement {
  static get $style(): string {
    return super.$style; // it's important part otherwise spinUseType4  isrewritten by default WUPSpinElement
  }
}
spinUseType4(WUPSpin4Element);

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
