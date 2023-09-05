import WUPSwitchControl from "./switch";

const tagName = "wup-check";
declare global {
  namespace WUP.Check {
    interface EventMap extends WUP.Switch.EventMap {}
    interface ValidityMap extends WUP.Switch.ValidityMap {}
    interface Options<T = boolean, VM = ValidityMap> extends WUP.Switch.Options<T, VM> {}
    interface JSXProps<C = WUPCheckControl> extends WUP.Switch.JSXProps<C> {}
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPCheckControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with checkbox
       *  @see {@link WUPCheckControl} */
      [tagName]: WUP.Check.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with checkbox
 * @example
  const el = document.createElement("wup-check");
  el.$options.name = "accepted";
  el.$options.label = "Accept";
  el.$initValue = false;
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-check name="accepted" label="Accept" initvalue="false"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input/>
 *      <strong>{$options.label}</strong>
 *      <span></span> // this icon
 *   </span>
 * </label>
 */
export default class WUPCheckControl<
  TOptions extends WUP.Check.Options = WUP.Check.Options,
  EventMap extends WUP.Check.EventMap = WUP.Check.EventMap
> extends WUPSwitchControl<TOptions, EventMap> {
  #ctr = this.constructor as typeof WUPCheckControl;

  static get $styleRoot(): string {
    return `:root {
        --ctrl-check-off-bg: #fff;
        --ctrl-check-on-bg: var(--ctrl-focus);
        --ctrl-check-on: #fff;
        --ctrl-check-radius: 3px;
        --ctrl-check-shadow: #0003;
        --ctrl-check-size: calc(var(--ctrl-icon-size) * 1.2);
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host label>span {
        position: initial;
        height: var(--ctrl-check-size);
        width: var(--ctrl-check-size);
        min-width: var(--ctrl-check-size);
        border-radius: var(--ctrl-check-radius);
        background: var(--ctrl-check-off-bg);
        box-shadow: 0 0 2px 0 var(--ctrl-check-shadow);
      }
      :host label>span:before {
        content: none;
      }
      :host input:checked + * + * {
        background: var(--ctrl-check-on-bg);
      }
      :host input:checked + * + *:before {
        content: "";
        position: initial;
        top: 0; left: 0;
        border-radius: 0;
        box-shadow: none;
        display: block;
        height: 100%; width: 100%;
        transform: scale(0.8);

        background: var(--ctrl-check-on);
        -webkit-mask-image: var(--wup-icon-check);
        mask-image: var(--wup-icon-check);
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
      }
      @media (hover: hover) and (pointer: fine) {
        :host:hover label>span {
          box-shadow: 0 0 4px 0 var(--ctrl-focus);
        }
      }`;
  }

  static $defaults: WUP.Check.Options = {
    ...WUPSwitchControl.$defaults,
    // WARN: it's shared =>  validationRules: { ...WUPSwitchControl.$defaults.validationRules },
  };
}

customElements.define(tagName, WUPCheckControl);

// todo add logic for checkbox-tree:
