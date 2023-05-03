import WUPBaseElement from "./baseElement";
import WUPPopupElement from "./popup/popupElement";
import { Animations, HideCases, ShowCases } from "./popup/popupElement.types";
import { WUPcssButton, WUPcssMenu } from "./styles";

const tagName = "wup-dropdown";
// todo use same options from WUPPOpupDefaults so user can redefine popupDefault without affecting directly
declare global {
  namespace WUP.Dropdown {
    interface Defaults /* extends WUP.Popup.Defaults */ {
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
    }
    interface Options extends Defaults {}
    interface Attributes extends WUP.Base.toJSX<Options> {}
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

  static $defaults: WUP.Dropdown.Defaults = {
    // ...WUPPopupElement.$defaults,
    animation: Animations.drawer,
    showCase: ShowCases.onClick | ShowCases.onHover,
    hideOnClick: true,
  };

  $options: WUP.Dropdown.Options = {
    ...this.#ctr.$defaults,
  };

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
      this.$refPopup.$options.minWidthByTarget = true;
      this.$refPopup.$options.minHeightByTarget = true;
      this.$refPopup.$options.showCase = this.$options.showCase;
      this.$refPopup.$options.animation = this.$options.animation;
      // WARN: this is default rule impossible to override via defaults
      if (!this.$refPopup.hasAttribute("placement")) {
        this.$refPopup.$options.placement = [
          WUPPopupElement.$placements.$bottom.$start,
          WUPPopupElement.$placements.$bottom.$end,
          WUPPopupElement.$placements.$top.$start,
          WUPPopupElement.$placements.$top.$end,
          WUPPopupElement.$placements.$bottom.$start.$resizeHeight,
          WUPPopupElement.$placements.$bottom.$end.$resizeHeight,
          WUPPopupElement.$placements.$top.$start.$resizeHeight,
          WUPPopupElement.$placements.$top.$end.$resizeHeight,
        ];
      }
      this.$refPopup.goHide = this.goHidePopup.bind(this);
    }
    super.gotReady();
  }

  protected goHidePopup(hideCase: HideCases): boolean | Promise<boolean> {
    // todo impossible to hide by click on target if opened by hover
    if (hideCase === HideCases.onPopupClick && !this._opts.hideOnClick) {
      return false;
    }
    return WUPPopupElement.prototype.goHide.call(this.$refPopup!, hideCase);
  }
}

customElements.define(tagName, WUPDropdownElement);
