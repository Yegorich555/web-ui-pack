import WUPBaseElement from "./baseElement";
import { objectClone } from "./indexHelpers";
import WUPPopupElement from "./popup/popupElement";
import { Animations, HideCases, ShowCases } from "./popup/popupElement.types";
import { WUPcssButton, WUPcssMenu } from "./styles";

const tagName = "wup-dropdown";
declare global {
  namespace WUP.Dropdown {
    interface Defaults extends WUP.Popup.Defaults, Pick<WUP.Popup.Options, "minWidthByTarget" | "minHeightByTarget"> {
      /** Animation that applied to popup;
       * @defaultValue `Animations.drawer`
       * @tutorial Troubleshooting
       * * to change option for specific element change it for `<wup-popup/>` direclty after timeout
       * @example setTimeout(() => this.$refPopup.$options.animation = Animations.stack) */
      animation: Animations;
      /** Case when popup need to show;
       * @defaultValue `ShowCases.onClick | ShowCases.onHover | ShowCases.onFocus`
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
      }${WUPcssButton(":host button")}
      :host button {
        min-width: initial;
        margin: 0;
        padding: 0.7em;
      }${WUPcssMenu(":host [menu]")}`;
  }

  /** Default options applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Dropdown.Defaults = {
    ...WUPPopupElement.$defaults,
    animation: Animations.drawer,
    showCase: ShowCases.onClick | ShowCases.onHover | ShowCases.onFocus,
    hideOnClick: true,
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

  /** Options inherited from `static.$defauls` and applied to element. Use this to change behavior per item OR use `$defaults` to change globally
   * @tutorial Troubleshooting
   * * Popup-related options are not observed so to change it use `WUPDropdownElement.$defaults` or `element.$refPopup.$options` direclty */
  $options: WUP.Dropdown.Options = objectClone(this.#ctr.$defaults);
  protected override _opts = this.$options;

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
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.$refPopup.init = () => {};
      Object.assign(this.$refPopup.$options, this.$options);
      setTimeout(() => {
        // @ts-expect-error
        delete this.$refPopup.init;
        // @ts-expect-error
        this.$refPopup.init(); // init manually otherwise it can trigger several times
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
      !menu.hasAttribute("tabindex") && menu.setAttribute("tabindex", -1); // todo check it: otherwise Firefox move focus into it by keydown 'tab'

      // lbl.id = lbl.id || this.#ctr.$uniqueId;
      // menu.setAttribute("aria-labelledby", lbl.id);
      this.appendEvent(this, "keydown", (e) => !this.hasAttribute("disabled") && this.gotKeyDown(e), {
        passive: false,
      });
    }
    super.gotReady();
  }

  /** Custom function to override default `WUPPopupElement.prototype.goHide` */
  protected goShowPopup(showCase: ShowCases): boolean | Promise<boolean> {
    const p = WUPPopupElement.prototype.goShow.call(this.$refPopup, showCase);
    this.$refPopup.$options.target!.setAttribute("aria-expanded", true);
    this.addEventListener("keydown", this.gotKeyDown);
    return p;
  }

  /** Custom function to override default `WUPPopupElement.prototype.goHide` */
  protected goHidePopup(hideCase: HideCases): boolean | Promise<boolean> {
    if (hideCase === HideCases.onPopupClick && !this._opts.hideOnClick) {
      return false;
    }
    const p = WUPPopupElement.prototype.goHide.call(this.$refPopup, hideCase);
    this.$refPopup.$options.target!.setAttribute("aria-expanded", false);
    this.focusMenuItem(null);
    return p;
  }

  /** Current focused menu-item (via aria-activedescendant) */
  _focusedMenuItem?: Element | null;
  /** Focus/resetFocus for item (via aria-activedescendant) */
  protected focusMenuItem(next: Element | null): void {
    // WARN: it's dupicate of WUPBaseComboControl.prototype.focusMenuItem
    this._focusedMenuItem?.removeAttribute("focused");

    if (next) {
      next.id = next.id || this.#ctr.$uniqueId;
      next.setAttribute("focused", "");
      this.$refTitle.setAttribute("aria-activedescendant", next.id);
      const ifneed = (next as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
      ifneed ? ifneed.call(next, false) : next.scrollIntoView();
    } else {
      this.$refTitle.removeAttribute("aria-activedescendant");
    }
    this._focusedMenuItem = next;
  }

  /** Called when user pressed key */
  protected gotKeyDown(e: KeyboardEvent): void {
    // todo need to prevent focus inside by Tab ???
    // todo what if menuItems is controls ???? In this case need to remove this logic ???
    if (e.defaultPrevented || e.altKey || e.shiftKey || e.ctrlKey) {
      return;
    }
    let handled = true;
    const isHidden = this.$refPopup.$isHidden;

    let focused = this._focusedMenuItem;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        focused = focused?.nextElementSibling || this.$refMenu.firstElementChild;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        focused = focused?.previousElementSibling || this.$refMenu.lastElementChild;
        break;
      default:
        handled = false;
    }
    handled && this.$refPopup.$isHidden && this.$refPopup.$show();

    if (!handled) {
      if (isHidden) {
        switch (e.key) {
          case "Space":
          case "Enter":
            this.$refPopup.$show();
            break;
          default:
            handled = false;
        }
      } else {
        switch (e.key) {
          case "Home":
            focused = this.$refMenu.firstElementChild;
            break;
          case "End":
            focused = this.$refMenu.lastElementChild;
            break;
          default:
            handled = false;
        }
      }
    }
    if (handled) {
      e.preventDefault();
      focused && focused !== this._focusedMenuItem && setTimeout(() => this.focusMenuItem(focused!), isHidden ? 1 : 0); // 1ms wait for opening popup
    }
  }
}

customElements.define(tagName, WUPDropdownElement);
