import { JSXCustomProps } from "../baseElement";

const tag = "wup-popup-arrow";
let isFirst = true;

export default class WUPPopupArrowElement extends HTMLElement {
  static tagName: "wup-popup-arrow" = tag;

  constructor() {
    super();
    if (isFirst) {
      isFirst = false;
      const s = document.createElement("style");
      s.textContent = `
          wup-popup-arrow {
            z-index: 90001;
            position: fixed;
            top: 0; left: 0;
            width:1.2rem; height:0.6rem;
            overflow: visible;
            filter: drop-shadow(0 3px 2px #00000033);
          }
          wup-popup-arrow:before {
            content: "";
            display: block;
            width: 100%; height: 100%;
            clip-path: polygon(0 1px, 0 0, 100% 0, 100% 1px, 50% 100%);
            margin-top: -1px;
            background: white;
          }
        `;
      document.head.prepend(s);
    }
  }
}

customElements.define(tag, WUPPopupArrowElement);

declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tag]: WUPPopupArrowElement;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tag]: JSXCustomProps<WUPPopupArrowElement>;
    }
  }
}
