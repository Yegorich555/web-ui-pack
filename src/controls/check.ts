import { inheritDefaults } from "../baseElement";
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
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with checkbox
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/check}
       *  @see {@link WUPCheckControl} */
      [tagName]: WUP.Base.ReactHTML<WUPCheckControl> & WUP.Check.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with checkbox
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/check}
       *  @see {@link WUPCheckControl} */
      [tagName]: HTMLAttributes<WUPCheckControl> & WUP.Check.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Form-control with checkbox
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/check}
 * @example
  const el = document.createElement("wup-check");
  el.$options.name = "accepted";
  el.$options.label = "Accept";
  el.$initValue = false;
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-check w-name="accepted" w-label="Accept" w-initvalue="false"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *    <input type='checkbox'/>
 *    <strong>{$options.label}</strong>
 *    <span icon></span>
 * </label> */
export default class WUPCheckControl<
  TOptions extends WUP.Check.Options = WUP.Check.Options,
  EventMap extends WUP.Check.EventMap = WUP.Check.EventMap,
  ValueType = boolean
> extends WUPSwitchControl<TOptions, EventMap, ValueType> {
  #ctr = this.constructor as typeof WUPCheckControl;

  static get $styleRoot(): string {
    return "";
  }

  /** NiceToHave: split to wup-icheck to result with wup-table etc. */
  static get $style(): string {
    return super.$style;
  }

  static $defaults: WUP.Check.Options = inheritDefaults(WUPSwitchControl.$defaults, {
    // WARN: validationRules are shared with WUPSwitchControl; to add own rules use `validationRules: inheritDefaults(WUPSwitchControl.$defaults.validationRules, {...})`
  });

  protected override renderControl(): void {
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    this.$refInput.type = "checkbox";
    this.$refLabel.appendChild(this.$refInput);
    this.$refLabel.appendChild(this.$refTitle);
    this.$refLabel.appendChild(document.createElement("span")).setAttribute("icon", "");
    this.appendChild(this.$refLabel);
  }
}

customElements.define(tagName, WUPCheckControl);
