/* eslint-disable import/prefer-default-export */
import WUPBaseElement from "./baseElement";

export class WUPPopupElement extends WUPBaseElement {
  options = {};
}

customElements.define("wup-popup", WUPPopupElement);
