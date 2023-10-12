import WUPBaseElement from "./baseElement";

const tagName = "wup-modal";
declare global {
  namespace WUP.Modal {
    interface Options {
      // todo add details to types.html.json
    }
    interface EventMap extends WUP.Base.EventMap {
      /** Fires before show is happened;
       * @tutorial rules
       * * can be prevented via `e.preventDefault()` */
      $willShow: Event;
      /** Fires after element is shown (after animation finishes) */
      $show: Event;
      /** Fires before hide is happened;
       * @tutorial rules
       * * can be prevented via `e.preventDefault()` */
      $willHide: Event;
      /** Fires after element is hidden (after animation finishes) */
      $hide: Event;
    }
    interface JSXProps<T = WUPModalElement> extends WUP.Base.JSXProps<T>, WUP.Base.OnlyNames<Options> {
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willShow') instead */
      onWillShow?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$show') instead */
      onShow?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willHide') instead */
      onWillHide?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$hide') instead */
      onHide?: never;
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPModalElement; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /**  Modal element
       *  @see {@link WUPModalElement} */
      [tagName]: WUP.Modal.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

export default class WUPModalElement<
  TOptions extends WUP.Modal.Options = WUP.Modal.Options,
  Events extends WUP.Modal.EventMap = WUP.Modal.EventMap
> extends WUPBaseElement<TOptions, Events> {
  protected override gotRender(): void {
    console.error("Method not implemented");
  }
  // todo implement
}

customElements.define(tagName, WUPModalElement);
