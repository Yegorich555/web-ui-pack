import { WUPSpinElement } from "web-ui-pack";
import { spinUseType5 } from "web-ui-pack/spinElement";

// Create new class is required to use several spinners for the page
export default class WUPSpin5Element extends WUPSpinElement {
  static get $style(): string {
    return super.$style; // it's important part otherwise spinUseType4  isrewritten by default WUPSpinElement
  }
}
spinUseType5(WUPSpin5Element);

const tagName = "wup-spin5";
customElements.define(tagName, WUPSpin5Element);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin5Element;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}

// const style = document.head.appendChild(document.createElement("style"));
// let s = "";
// const cnt = 12;
// for (let i = 1; i <= cnt; ++i) {
//   s += `wup-spin5 div:nth-child(${i}):after { transform: rotate(calc(360deg * ${(i - 1) / cnt})); }`;
// }

// style.textContent = s;
