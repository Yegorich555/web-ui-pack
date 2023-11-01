import WUPBaseElement from "./baseElement";
import WUPPopupElement from "./popup/popupElement";
import { PopupAnimations, PopupCloseCases, PopupOpenCases } from "./popup/popupElement.types";
import { WUPcssButton, WUPcssMenu } from "./styles";

const tagName = "wup-dropdown";
declare global {
  namespace WUP.Dropdown {
    interface Options extends WUP.Popup.Options {
      /** Animation applied to popup;
       * @defaultValue `PopupAnimations.drawer`
       * @tutorial Troubleshooting
       * * to change option for specific element change it for `<wup-popup/>` direclty after timeout
       * @example setTimeout(() => this.$refPopup.$options.animation = PopupAnimations.stack) */
      animation: PopupAnimations;
      /** Case when popup need to show;
       * @defaultValue `PopupOpenCases.onClick | PopupOpenCases.onFocus`
       * @tutorial Troubleshooting
       * * to change option for specific element change it for `<wup-popup/>` directly after timeout
       * @example setTimeout(() => this.$refPopup.$options.openCase = PopupOpenCases.onFocus | PopupOpenCases.onClick) */
      openCase: PopupOpenCases;
      /** Close menu on popup click
       * @defaultValue true */
      closeOnPopupClick: boolean;
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
    // WARN: all options must be applied to wup-popup directly
    interface JSXProps<C = WUPDropdownElement> extends WUP.Base.JSXProps<C> {
      /** Close menu on popup click
       * @defaultValue true */
      "w-closeOnPopupClick"?: boolean;
    }
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
    <wup-popup w-placement="bottom-middle" w-animation="stack">
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
  static $defaults: WUP.Dropdown.Options = {
    ...WUPPopupElement.$defaults,
    animation: PopupAnimations.drawer,
    openCase: PopupOpenCases.onClick | PopupOpenCases.onFocus,
    closeOnPopupClick: true,
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
    if (this.$refTitle === this.$refPopup || !this.$refPopup.$open) {
      this.throwError("Invalid structure. Expected 1st element: <any/>, last element: <wup-popup/>");
    } else {
      this.$refPopup.setAttribute("menu", "");
      this.$refPopup.goOpen = this.goOpenPopup.bind(this);
      this.$refPopup.goClose = this.goClosePopup.bind(this);

      // find popup props from attributes
      const excluded = new Set<string>(); // popup props that assigned from attributes
      const proto = Object.getPrototypeOf(this.$refPopup).constructor as typeof WUPPopupElement;
      const mappedAttr = proto.mappedAttributes;
      this.$refPopup.getAttributeNames().forEach((a) => {
        a = a.startsWith("w-") ? a.substring(2) : a;
        const m = mappedAttr[a];
        m && excluded.add(m.prop ?? a);
      });
      Object.keys(this._opts).forEach((k) => {
        if (!excluded.has(k)) {
          // @ts-expect-error - because closeOnPopupClick doesn't exist on popup
          this.$refPopup.$options[k] = this._opts[k];
        }
      });

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

  /** Custom function to override default `WUPPopupElement.prototype.goClose` */
  protected goOpenPopup(openCase: PopupOpenCases, ev: MouseEvent | FocusEvent | null): Promise<boolean> {
    const p = WUPPopupElement.prototype.goOpen.call(this.$refPopup, openCase, ev);
    const t = this.$refPopup.$options.target!;
    t.setAttribute("aria-expanded", true); // NiceToHave: move it to popup side after refactoring ???
    t.style.zIndex = `${+getComputedStyle(this.$refPopup).zIndex + 2}`; // inc z-index for btn to allow animation-stack works properly
    return p;
  }

  /** Custom function to override default `WUPPopupElement.prototype.goClose` */
  protected goClosePopup(
    closeCase: PopupCloseCases,
    ev: MouseEvent | FocusEvent | KeyboardEvent | null
  ): Promise<boolean> {
    if (closeCase === PopupCloseCases.onPopupClick && !this._opts.closeOnPopupClick) {
      return Promise.resolve(false);
    }
    const p = WUPPopupElement.prototype.goClose.call(this.$refPopup, closeCase, ev);
    const t = this.$refPopup.$options.target!;
    t.setAttribute("aria-expanded", false);
    t.style.zIndex = "";
    t.getAttribute("style")?.trim() === "" && this.removeAttribute("style");
    return p;
  }
}

customElements.define(tagName, WUPDropdownElement);

// todo issue: animation:stack-right. If target is partially hidden in scrollable parent popup changes Y to be full visible but it's not ok; In this case popup must be also partially visible and listen only target
