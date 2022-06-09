import { WUPSpinElement } from "web-ui-pack";
import { spinUseType3 } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin3Element extends WUPSpinElement {
  static get $style(): string {
    return super.$style; // it's important part otherwise spinUseType3  isrewritten by default WUPSpinElement
  }
}
spinUseType3(WUPSpin3Element);

const tagName = "wup-spin3";
customElements.define(tagName, WUPSpin3Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin3Element;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}
