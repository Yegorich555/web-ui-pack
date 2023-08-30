import WUPBaseElement from "./baseElement";
import WUPPopupElement from "./popup/popupElement";
import { Animations, HideCases, ShowCases } from "./popup/popupElement.types";
import { WUPcssButton, WUPcssMenu } from "./styles";

const tagName = "wup-dropdown";
declare global {
  namespace WUP.Dropdown {
    interface Defaults extends WUP.Popup.Options, Pick<WUP.Popup.Options, "minWidthByTarget" | "minHeightByTarget"> {
      /** Animation that applied to popup;
       * @defaultValue `Animations.drawer`
       * @tutorial Troubleshooting
       * * to change option for specific element change it for `<wup-popup/>` direclty after timeout
       * @example setTimeout(() => this.$refPopup.$options.animation = Animations.stack) */
      animation: Animations;
      /** Case when popup need to show;
       * @defaultValue `ShowCases.onClick | ShowCases.onFocus`
       * @tutorial Troubleshooting
       * * to change option for specific element change it for `<wup-popup/>` directly after timeout
       * @example setTimeout(() => this.$refPopup.$options.showCase = ShowCases.onFocus | ShowCases.onClick) */
      showCase: ShowCases;
      /** Hide on popup click
       * @defaultValue true */
      hideOnPopupClick: boolean;
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
      /** Sets minWidth 100% of targetWidth; it can't be more than css-style min-width
       * @defaultValue true */
      minWidthByTarget: boolean;
      /** Sets minHeight 100% of targetWidth; it can't be more than css-style min-height
       *  @defaultValue true */
      minHeightByTarget: boolean;
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
      /** Dropdown element
       *  @see {@link WUPDropdownElement} */
      [tagName]: WUP.Dropdown.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Dropdown element
 * @example
 * ```html
  <wup-dropdown class="custom">
    <button type="button">Click Me</button>
    <wup-popup placement="bottom-middle" animation="stack">
      <ul>
        <li><button type="button">A</button></li>
        <li><button type="button">B</button></li>
        <li><button type="button">C</button></li>
      </ul>
    </wup-popup>
  </wup-dropdown>
 * ```
 * @tutorial Troubleshooting
 * * in comparison with Combobox Dropdown doesn't contain input but can contain in popup any items (like nav-menu etc.) */
export default class WUPDropdownElement<
  TOptions extends WUP.Dropdown.Options = WUP.Dropdown.Options
> extends WUPBaseElement<TOptions> {
  #ctr = this.constructor as typeof WUPDropdownElement;

  static get $style(): string {
    return `${super.$style}
      :host {
        contain: style;
        display: inline-block;
      }${WUPcssButton(":host button")}
      :host button {
        min-width: initial;
        margin: 0;
        padding: 0.7em;
      }${WUPcssMenu(":host>[menu]")}`;
  }

  /** Default options applied to every element. Change it to configure default behavior
   * * @tutorial Troubleshooting
   * * Popup-related options are not observed so to change it use `WUPDropdownElement.$defaults` or `element.$refPopup.$options` direclty */
  static $defaults: WUP.Dropdown.Defaults = {
    ...WUPPopupElement.$defaults,
    animation: Animations.drawer,
    showCase: ShowCases.onClick | ShowCases.onFocus,
    hideOnPopupClick: true,
    minHeightByTarget: true,
    minWidthByTarget: true,
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

  /** Reference to nested HTMLElement tied with $options.label */
  $refTitle = this.firstElementChild as HTMLElement;
  /** Reference to popupMenu */
  $refPopup = this.lastElementChild as WUPPopupElement;
  /** Reference to list */
  $refMenu = this.lastElementChild as HTMLElement;

  protected override gotReady(): void {
    this.$refTitle = this.firstElementChild as HTMLElement;
    this.$refPopup = this.lastElementChild as WUPPopupElement;
    if (this.$refTitle === this.$refPopup || !this.$refPopup.$show) {
      this.throwError("Invalid structure. Expected 1st element: <any/>, last element: <wup-popup/>");
    } else {
      this.$refPopup.setAttribute("menu", "");
      this.$refPopup.goShow = this.goShowPopup.bind(this);
      this.$refPopup.goHide = this.goHidePopup.bind(this);
      Object.assign(this.$refPopup.$options, this.$options);

      // WA
      const menu = (this.$refPopup.querySelector("ul,ol,[items]") as HTMLElement) || this.$refPopup;
      menu.id = menu.id || this.#ctr.$uniqueId;
      this.$refMenu = menu;

      const lbl = this.$refTitle;
      lbl.setAttribute("aria-owns", menu.id);
      lbl.setAttribute("aria-controls", menu.id);
      lbl.setAttribute("aria-haspopup", "listbox");
      lbl.setAttribute("aria-expanded", false);

      // !menu.hasAttribute("role") && menu.setAttribute("role", "listbox");
      // li.setAttribute("role", "option");
      !menu.hasAttribute("tabindex") && menu.setAttribute("tabindex", -1); // otherwise Firefox move focus into it by keydown 'Tab'

      // lbl.id = lbl.id || this.#ctr.$uniqueId;
      // menu.setAttribute("aria-labelledby", lbl.id);
    }
    super.gotReady();
  }

  /** Custom function to override default `WUPPopupElement.prototype.goHide` */
  protected goShowPopup(showCase: ShowCases, ev: MouseEvent | FocusEvent | null): boolean | Promise<boolean> {
    const p = WUPPopupElement.prototype.goShow.call(this.$refPopup, showCase, ev);
    this.$refPopup.$options.target!.setAttribute("aria-expanded", true);
    return p;
  }

  /** Custom function to override default `WUPPopupElement.prototype.goHide` */
  protected goHidePopup(
    hideCase: HideCases,
    ev: MouseEvent | FocusEvent | KeyboardEvent | null
  ): boolean | Promise<boolean> {
    if (hideCase === HideCases.onPopupClick && !this._opts.hideOnPopupClick) {
      return false;
    }
    const p = WUPPopupElement.prototype.goHide.call(this.$refPopup, hideCase, ev);
    this.$refPopup.$options.target!.setAttribute("aria-expanded", false);
    return p;
  }
}

customElements.define(tagName, WUPDropdownElement);
