/* eslint-disable import/prefer-default-export */
import { IWUPBaseElement } from "./baseElement";

export class WUPPopupElement extends HTMLDivElement implements IWUPBaseElement {
  options = {};
}

customElements.define("wup-popup", WUPPopupElement);
