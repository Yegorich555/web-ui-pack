// eslint-disable-next-line max-classes-per-file
import { WUPCssIconHover, WUPcssHidden } from "../styles";
import WUPBaseControl, { SetValueReasons } from "./baseControl";

const tagName = "wup-switch";
declare global {
  namespace WUP.Switch {
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface ValidityMap extends WUP.BaseControl.ValidityMap {}
    interface NewOptions {
      /** Reversed-style (switch+label for true vs label+switch)
       * @defaultValue false */
      reverse: boolean;
    }
    interface Options<T = boolean, VM = ValidityMap> extends WUP.BaseControl.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPSwitchControl> extends WUP.BaseControl.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      "w-reverse"?: boolean | "";
      /** InitValue for control @deprecated use `initValue` instead */
      defaultChecked?: boolean;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSwitchControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with toggle button
       *  @see {@link WUPSwitchControl} */
      [tagName]: WUP.Switch.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with toggle button
 * @example
  const el = document.createElement("wup-switch");
  el.$options.name = "isDarkMode";
  el.$options.label = "Dark Mode";
  el.$initValue = false;
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-switch w-name="isDarkMode" w-label="Dark Mode" w-initvalue="false"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *    <input type='checkbox'/>
 *    <strong>{$options.label}</strong>
 *    <span bar>
 *        <span thumb></span>
 *    </span>
 * </label> */
export default class WUPSwitchControl<
  TOptions extends WUP.Switch.Options = WUP.Switch.Options,
  EventMap extends WUP.Switch.EventMap = WUP.Switch.EventMap
> extends WUPBaseControl<boolean, TOptions, EventMap> {
  #ctr = this.constructor as typeof WUPSwitchControl;

  static get $styleRoot(): string {
    return `:root {
      --ctrl-padding: 1em;
      --ctrl-switch-on: #fff;
      --ctrl-switch-off: #fff;
      --ctrl-switch-off-bg: #9f9f9f;
      --ctrl-switch-on-bg: var(--ctrl-focus);
      --ctrl-switch-shadow: #0003;
      --ctrl-switch-h: var(--ctrl-icon-size);
      --ctrl-switch-w: calc(var(--ctrl-icon-size) * 2.8);
      --ctrl-switch-r: calc(var(--ctrl-icon-size) * 1.4);
     }
    [wupdark] {
      --ctrl-switch-on: #e7e7e7;
      --ctrl-switch-off: #e7e7e7;
      --ctrl-switch-off-bg: #707070;
      --ctrl-switch-shadow: #000;
    }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        background: none;
        cursor: pointer;
      }
      :host[readonly] {
        cursor: initial;
      }
      :host label {
        display: flex;
        gap: 0.5em;
        padding: var(--ctrl-padding);
      }
      :host strong {
        box-sizing: border-box;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        font-weight: normal;
        text-decoration: none;
        color: inherit;
      }
      :host [bar] {
        display: inline-flex;
        align-items: center;
        overflow: visible;
        width: var(--ctrl-switch-w);
        min-width: var(--ctrl-switch-w);
        height: var(--ctrl-switch-h);
        border-radius: 999px;
        color: whitesmoke;
        background: var(--ctrl-switch-off-bg);
      }
      ${WUPCssIconHover(":host", "[thumb]")}
      :host [thumb] {
        z-index: 2;
        display: inline-block;
        height: var(--ctrl-switch-r);
        width: var(--ctrl-switch-r);
        background: var(--ctrl-switch-off);
        box-shadow: 0 1px 4px 0 var(--ctrl-switch-shadow);
        border-radius: 50%;
        transform: translateX(-1px);
      }
      :host input { ${WUPcssHidden} }
      :host[checked] [bar] {
        background-color: var(--ctrl-switch-on-bg);
      }
      :host[checked] [thumb] {
        background: var(--ctrl-switch-on);
        transform: translateX(var(--ctrl-switch-w)) translateX(calc(-100% + 1px));
      }
      :host[w-reverse] label {
        flex-direction: row-reverse;
      }
      :host[w-reverse] strong {
        margin-right: auto;
      }
      @media not all and (prefers-reduced-motion) {
        :host [bar] { transition: background-color var(--anim); }
        :host [thumb] { transition: transform var(--anim); }
      }`;
  }

  static $isEqual(v1: boolean | undefined, v2: boolean | undefined): boolean {
    return !!v1 === !!v2;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes;
    arr.push("defaultchecked");
    return arr;
  }

  static $defaults: WUP.Switch.Options = {
    ...WUPBaseControl.$defaults,
    validationRules: { ...WUPBaseControl.$defaults.validationRules },
    reverse: false,
  };

  get $value(): boolean {
    return !!super.$value as boolean;
  }

  set $value(v: boolean) {
    super.$value = !!v;
  }

  override parse(text: string): boolean | undefined {
    return text === "" || text === "1" || text.toLowerCase() === "true";
  }

  override valueToUrl(v: boolean): string | null {
    return v ? "1" : null;
  }

  protected override renderControl(): void {
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    this.$refInput.type = "checkbox";
    this.$refLabel.appendChild(this.$refInput);
    this.$refLabel.appendChild(this.$refTitle);
    const sp = document.createElement("span");
    sp.setAttribute("bar", "");
    sp.appendChild(document.createElement("span")).setAttribute("thumb", "");
    this.$refLabel.appendChild(sp);
    this.appendChild(this.$refLabel);
  }

  protected override gotReady(): void {
    super.gotReady();
    this.$refInput.oninput = (e) => this.gotInput(e);
  }

  /** Called when user changes value via click or keyboard */
  protected gotInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    if (this.$isReadOnly) {
      el.checked = !el.checked;
    } else {
      this.setValue(el.checked, SetValueReasons.userInput);
    }
  }

  protected override setValue(v: boolean, reason: SetValueReasons): boolean | null {
    const r = super.setValue(v, reason);
    this.$refInput.checked = !!v;
    this.setAttr("checked", this.$refInput.checked, true);
    return r;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Switch.Options | any> | null): void {
    super.gotChanges(propsChanged as any);
    this.setAttr("w-reverse", this._opts.reverse, true);
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.setAttr.call(this.$refInput, "aria-readonly", this.$isReadOnly);
  }

  protected override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === "defaultchecked") {
      name = "initvalue";
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }
}

customElements.define(tagName, WUPSwitchControl);
