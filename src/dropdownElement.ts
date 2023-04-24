import WUPBaseElement from "./baseElement";
import WUPPopupElement from "./popup/popupElement";
import { Animations, ShowCases } from "./popup/popupElement.types";
import { WUPcssButton, WUPcssMenu } from "./styles";

const tagName = "wup-dropdown";

declare global {
  namespace WUP.Dropdown {
    interface Defaults {
      /** Direction for opened menu
       * @defaultValue "bottom" */
      direction: "right" | "top" | "left" | "bottom";
      /** Case when popup need to show;
       * @defaultValue ShowCases.onClick | ShowCases.onHover - (onClick and onHover) */
      showCase: ShowCases; // todo implement
      /* todo animation stacked - item apeares one by one */
      animation: "drawer" | "stacked" | "opacity" | "none";
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

  static get observedOptions(): Array<keyof WUP.Dropdown.Options> {
    return ["showCase"]; // , "placement"];
  }

  static get observedAttributes(): Array<LowerKeys<WUP.Dropdown.Attributes>> {
    return ["direction"]; // , "placement"];
  }

  static get $styleRoot(): string {
    return `:root {}`;
  }

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
    direction: "bottom",
    showCase: ShowCases.onClick | ShowCases.onHover,
    animation: "stacked",
  };

  $options: WUP.Dropdown.Options = {
    ...this.#ctr.$defaults,
  };

  /** Reference to nested HTMLElement tied with $options.label */
  $refTitle = this.firstElementChild as HTMLElement;
  /** Reference to popupMenu */
  $refPopup = this.lastElementChild as WUPPopupElement;

  protected override _opts = this.$options;

  protected override gotChanges(propsChanged: Array<keyof WUP.Dropdown.Options> | null): void {
    super.gotChanges(propsChanged);

    // todo click on item inside closes popup but it maybe wrong - need option for this
    // todo hover effect is wrong - if user hovers popup after showing it closes
    // todo this._opts.direction = (this.getAttr("direction", "string") as "bottom") || "bottom";
    this.$refPopup.$options.showCase = this.$options.showCase && ShowCases.onClick;
    this.$refPopup.$options.animation = Animations.stack;
  }

  protected override gotReady(): void {
    this.$refTitle = this.firstElementChild as HTMLElement;
    this.$refPopup = this.lastElementChild as WUPPopupElement;
    if (this.$refTitle === this.$refPopup || !this.$refPopup.$show) {
      this.throwError("Invalid structure. Expected 1st element: <any/>, last element: <wup-popup/>");
    } else {
      this.$refPopup.setAttribute("menu", "");
      this.$refPopup.$options.minWidthByTarget = true;
      this.$refPopup.$options.minHeightByTarget = true;
      // todo user must be able to change direction
      if (!this.$refPopup.hasAttribute("placement")) {
        this.$refPopup.$options.placement = [
          WUPPopupElement.$placements.$bottom.$start,
          WUPPopupElement.$placements.$bottom.$end,
        ];
      }

      // this.$refPopup.addEventListener("$show", () => {
      //   setTimeout(() => this.$refPopup.$hide(), 1000);
      // });
      // this.$refPopup.addEventListener("$hide", () => {
      //   setTimeout(() => this.$refPopup.$show(), 1000);
      // });
    }
    super.gotReady();
  }
}

customElements.define(tagName, WUPDropdownElement);
