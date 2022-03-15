import { JSXCustomProps } from "./baseElement";

const tag = "wup-popup-arrow";
let styleElement: HTMLStyleElement | undefined;

export default class WUPPopupArrowElement extends HTMLElement {
  static tagName: "wup-popup-arrow" = tag;

  constructor() {
    super();
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.textContent = `
          wup-popup-arrow {
            z-index: 99999;
            position: fixed;
            top: 0; left: 0;
            width:1.2rem; height:0.6rem;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            transform-origin: center;
          }
          wup-popup-arrow:before {
            content: "";
            display: block;
            margin-top: -50%;
            width: 70.71067811865474%;
            padding-top: 70.71067811865474%;
            transform: rotate(45deg);
            box-sizing: content-box;
            box-shadow: 0 0 4px 0 #00000033;
          }
        `;
      document.head.prepend(styleElement);
    }
    this.setupStyle = this.setupStyle.bind(this);
    this.attachShadow({ mode: "open" });
  }

  setupStyle(str: string) {
    const styleEl = document.createElement("style");
    styleEl.textContent = `:host:before{${str}}`;
    (this.shadowRoot as ShadowRoot).appendChild(styleEl);
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
