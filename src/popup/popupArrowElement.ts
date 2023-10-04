const tag = "wup-popup-arrow";
let isFirst = true;

declare global {
  interface HTMLElementTagNameMap {
    [tag]: WUPPopupArrowElement; // add element to document.createElement
  }

  namespace JSX {
    interface IntrinsicElements {
      /**  Internal arrow element for {@link WUPPopupElement}
       *  @see {@link WUPCircleElement} */
      [tag]: WUP.Base.JSXProps<WUPPopupArrowElement>; // add element to tsx/jsx intellisense
    }
  }
}

/** Internal arrow element for {@link WUPPopupElement} */
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
            filter: drop-shadow(0 3px 2px var(--popup-shadow));
          }
          wup-popup-arrow::before {
            content: "";
            display: block;
            width: 100%; height: 100%;
            clip-path: polygon(0 1px, 0 0, 100% 0, 100% 1px, 50% 100%);
            margin-top: -1px;
            background: var(--popup-bg, #fff);
          }
        `;
      document.head.prepend(s);
    }
  }
}

customElements.define(tag, WUPPopupArrowElement);
