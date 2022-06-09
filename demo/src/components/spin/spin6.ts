import { WUPSpinElement } from "web-ui-pack";
import { spinUseType6 } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin6Element extends WUPSpinElement {
  static get $style(): string {
    return super.$style; // it's important part otherwise spinUseType4  isrewritten by default WUPSpinElement
  }
}
spinUseType6(WUPSpin6Element);

const tagName = "wup-spin6";
customElements.define(tagName, WUPSpin6Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin6Element;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}
