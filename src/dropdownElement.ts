import WUPBaseElement from "./baseElement";
import { objectClone } from "./indexHelpers";
import WUPPopupElement from "./popup/popupElement";
import { Animations, HideCases, ShowCases } from "./popup/popupElement.types";
import { WUPcssButton, WUPcssMenu } from "./styles";

const tagName = "wup-dropdown";
declare global {
  namespace WUP.Dropdown {
    interface Defaults extends WUP.Popup.Defaults {
      /** Animation that applied to popup;
       * @defaultValue `Animations.drawer`
       * @tutorial Troubleshooting
       * * to change option for specific element change it for `<wup-popup/>` direclty after timeout
       * @example setTimeout(() => this.$refPopup.$options.animation = Animations.stack) */
      animation: Animations;
      /** Case when popup need to show;
       * @defaultValue `ShowCases.onClick`
       * @tutorial Troubleshooting
       * * to change option for specific element change it for `<wup-popup/>` directly after timeout
       * @example setTimeout(() => this.$refPopup.$options.showCase = ShowCases.onFocus | ShowCases.onClick) */
      showCase: ShowCases;
      /** Hide on popup click
       * @defaultValue true */
      hideOnClick: boolean;
      /** Placement rules relative to target;
       * @defaultValue `[
            WUPPopupElement.$placements.$bottom.$start,
            WUPPopupElement.$placements.$bottom.$end,
            WUPPopupElement.$placements.$top.$start,
            WUPPopupElement.$placements.$top.$end,
            WUPPopupElement.$placements.$bottom.$start.$resizeHeight,
            WUPPopupElement.$placements.$bottom.$end.$resizeHeight,
            WUPPopupElement.$placements.$top.$start.$resizeHeight,
            WUPPopupElement.$placements.$top.$end.$resizeHeight ]` */
      placement: Array<WUP.Popup.Place.PlaceFunc>;
    }
    interface Options extends Defaults {}
    interface Attributes {}
    interface JSXProps<C = WUPDropdownElement> extends WUP.Base.JSXProps<C>, Attributes {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPDropdownElement; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Dropdown.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

// todo example of usage
/** Example of usage */
export default class WUPDropdownElement extends WUPBaseElement {
  #ctr = this.constructor as typeof WUPDropdownElement;

  static get $style(): string {
    return `${super.$style}
      :host {
        contain: style;
        display: inline-block;
      }${WUPcssButton(":host>button")}
      :host>button {
        min-width: initial;
        margin: 0;
        padding: 0.7em;
      }${WUPcssMenu(":host [menu]")}`;
  }

  /** Default options applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Dropdown.Defaults = {
    ...WUPPopupElement.$defaults,
    animation: Animations.drawer,
    showCase: ShowCases.onClick | ShowCases.onHover,
    hideOnClick: true,
    placement: [
      WUPPopupElement.$placements.$bottom.$start,
      WUPPopupElement.$placements.$bottom.$end,
      WUPPopupElement.$placements.$top.$start,
      WUPPopupElement.$placements.$top.$end,
      WUPPopupElement.$placements.$bottom.$start.$resizeHeight,
      WUPPopupElement.$placements.$bottom.$end.$resizeHeight,
      WUPPopupElement.$placements.$top.$start.$resizeHeight,
      WUPPopupElement.$placements.$top.$end.$resizeHeight,
    ],
  };

  /** Options inherited from `static.$defauls` and applied to element. Use this to change behavior per item OR use `$defaults` to change globally
   * @tutorial Troubleshooting
   * * Popup-related options are not observed so to change it use `WUPDropdownElement.$defaults` or `element.$refPopup.$options` direclty */
  $options: WUP.Dropdown.Options = objectClone(this.#ctr.$defaults);
  protected override _opts = this.$options;

  /** Reference to nested HTMLElement tied with $options.label */
  $refTitle = this.firstElementChild as HTMLElement;
  /** Reference to popupMenu */
  $refPopup = this.lastElementChild as WUPPopupElement;

  protected override gotReady(): void {
    this.$refTitle = this.firstElementChild as HTMLElement;
    this.$refPopup = this.lastElementChild as WUPPopupElement;
    if (this.$refTitle === this.$refPopup || !this.$refPopup.$show) {
      this.throwError("Invalid structure. Expected 1st element: <any/>, last element: <wup-popup/>");
    } else {
      this.$refPopup.setAttribute("menu", "");
      Object.assign(this.$refPopup.$options, this.$options);
      this.$refPopup.$options.minWidthByTarget = true;
      this.$refPopup.$options.minHeightByTarget = true;
      this.$refPopup.goHide = this.goHidePopup.bind(this);
    }
    super.gotReady();
  }

  /** Custom function to override default `WUPPopupElement.prototype.goHide` */
  protected goHidePopup(hideCase: HideCases): boolean | Promise<boolean> {
    if (hideCase === HideCases.onPopupClick && !this._opts.hideOnClick) {
      return false;
    }
    return WUPPopupElement.prototype.goHide.call(this.$refPopup!, hideCase);
  }
}

customElements.define(tagName, WUPDropdownElement);
