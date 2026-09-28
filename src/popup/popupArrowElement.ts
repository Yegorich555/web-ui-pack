const tag = "wup-popup-arrow";
let isFirst = true;

declare global {
  interface HTMLElementTagNameMap {
    [tag]: WUPPopupArrowElement; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /**  Internal arrow element for {@link WUPPopupElement} */
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
      s.textContent = "@wup-include useArrow"; // WARN: it's replaced with css of the mixin from popupArrowElement.scss via stylesLoader.js
      document.head.prepend(s);
    }
  }
}

customElements.define(tag, WUPPopupArrowElement);
