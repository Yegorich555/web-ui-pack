import { WUPSpinElement } from "web-ui-pack";
import { spinUseType2 } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin2Element extends WUPSpinElement {
  static get $style(): string {
    return super.$style; // it's important part otherwise spinUseType2  isrewritten by default WUPSpinElement
  }
}
spinUseType2(WUPSpin2Element);

const tagName = "wup-spin2";
customElements.define(tagName, WUPSpin2Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin2Element;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}
