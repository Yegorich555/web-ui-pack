import { WUPcssHidden } from "../styles";
import WUPBaseControl from "./baseControl";

const tagName = "wup-switch";
declare global {
  namespace WUP.Switch {
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface ValidityMap extends WUP.BaseControl.ValidityMap {}
    interface Defaults<T = boolean, VM = ValidityMap> extends WUP.BaseControl.Defaults<T, VM> {}
    interface Options<T = boolean, VM = ValidityMap> extends WUP.BaseControl.Options<T, VM>, Defaults<T, VM> {
      /** Reversed-style (switch+label for true vs label+switch)
       * @defaultValue false */
      reverse?: boolean;
    }
    interface Attributes extends WUP.BaseControl.Attributes {
      /** InitValue for control */
      defaultChecked?: boolean;
      /** Reversed-style (switch+label vs label+switch) */
      reverse?: boolean | "";
    }
    interface JSXProps<C = WUPSwitchControl> extends WUP.BaseControl.JSXProps<C>, Attributes {}
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPSwitchControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
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
    <wup-switch name="isDarkMode" label="Dark Mode" initvalue="false"/>
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
export default class WUPSwitchControl<
  EventMap extends WUP.Switch.EventMap = WUP.Switch.EventMap
> extends WUPBaseControl<boolean, EventMap> {
  #ctr = this.constructor as typeof WUPSwitchControl;

  static get $styleRoot(): string {
    return `:root {
      --ctrl-switch-padding: 1em;
      --ctrl-switch-on: #fff;
      --ctrl-switch-off: #fff;
      --ctrl-switch-shadow: #0003;
      --ctrl-switch-off-bg: #9f9f9f;
      --ctrl-switch-on-bg: var(--ctrl-focus);
      --ctrl-switch-size-h: var(--ctrl-icon-size);
      --ctrl-switch-size-w: calc(var(--ctrl-switch-size-spot) * 2);
      --ctrl-switch-size-spot: calc(var(--ctrl-switch-size-h) * 1.4);
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
        padding: var(--ctrl-switch-padding);
      }
      :host strong {
        box-sizing: border-box;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        font-weight: normal;
        text-decoration: none;
        color: var(--ctrl-label);
      }
      :host label>span {
        margin-left: 0.5em;
        position: relative;
        width: var(--ctrl-switch-size-w);
        min-width: var(--ctrl-switch-size-w);
        height: var(--ctrl-switch-size-h);
        border-radius: 999px;
        background: var(--ctrl-switch-off-bg);
      }
      :host label>span:before {
        content: "";
        position: absolute;
        height: var(--ctrl-switch-size-spot);
        width: var(--ctrl-switch-size-spot);
        left: -1px; top: 50%;
        transform: translateY(-50%);
        background: var(--ctrl-switch-off);
        box-shadow: 0 1px 4px 0 var(--ctrl-switch-shadow);
        border-radius: 50%;
      }
      :host input { ${WUPcssHidden} }
      :host input:checked + * + * {
        background-color: var(--ctrl-switch-on-bg);
      }
      :host input:checked + * + *:before {
        background: var(--ctrl-switch-on);
        left: calc(100% - var(--ctrl-switch-size-w) + var(--ctrl-switch-size-spot) + 1px);
      }
      :host[reverse] label {
        flex-direction: row-reverse;
      }
      :host[reverse] label>span {
        margin-left: 0;
        margin-right: 0.5em;
      }
      :host[reverse] label>strong {
        margin-right: auto;
      }
      @media not all and (prefers-reduced-motion) {
        :host label>span { transition: background-color var(--anim); }
        :host label>span:before { transition: left var(--anim); }
      }
      @media (hover: hover) {
        :host:hover label>span:before {
           box-shadow: 0 0 4px 0 var(--ctrl-focus);
        }
      }`;
  }

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.Switch.Options>;
    arr.push("reverse");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.Switch.Attributes>>;
    arr.push("reverse", "defaultchecked");
    return arr;
  }

  static $defaults: WUP.Switch.Defaults = {
    ...WUPBaseControl.$defaults,
    validationRules: { ...WUPBaseControl.$defaults.validationRules },
  };

  $options: WUP.Switch.Options = {
    ...this.#ctr.$defaults,
  };

  protected override _opts = this.$options;

  get $initValue(): boolean {
    return super.$initValue as boolean;
  }

  set $initValue(v: boolean) {
    super.$initValue = !!v;
  }

  get $value(): boolean {
    return super.$value as boolean;
  }

  set $value(v: boolean) {
    super.$value = !!v;
  }

  constructor() {
    super();
    this.$initValue = !!this.$initValue;
  }

  override parse(text: string): boolean | undefined {
    return text === "" || text.toLowerCase() === "true";
  }

  protected override renderControl(): void {
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    this.$refInput.type = "checkbox";
    this.$refLabel.appendChild(this.$refInput);
    this.$refLabel.appendChild(this.$refTitle);
    this.$refLabel.appendChild(document.createElement("span")); // for icon
    this.appendChild(this.$refLabel);
  }

  protected override gotReady(): void {
    super.gotReady();
    this.appendEvent(this.$refInput, "input", (e) => this.gotInput(e));
  }

  /** Called when user changes value via click or keyboard */
  protected gotInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    if (this.$isReadOnly) {
      el.checked = !el.checked;
    } else {
      this.setValue(el.checked);
    }
  }

  protected override setValue(v: boolean, canValidate = true): boolean | null {
    const r = super.setValue(v, canValidate);
    this.$refInput.checked = !!v;
    return r;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Switch.Options | any> | null): void {
    super.gotChanges(propsChanged as any);

    this._opts.reverse = this.getBoolAttr("reverse", this._opts.reverse);
    this.setAttr("reverse", this._opts.reverse, true);

    if (!propsChanged || propsChanged.includes("defaultchecked")) {
      const attr = this.getAttribute("defaultchecked");
      if (attr) {
        this.$initValue = attr !== "false";
      } else if (propsChanged) {
        this.$initValue = false; // removed attr >> remove initValue
      }
    }
  }

  protected override gotOptionsChanged(e: WUP.Base.OptionEvent): void {
    this._isStopChanges = true;
    e.props.includes("reverse") && this.setAttr("reverse", this._opts.reverse, true);
    super.gotOptionsChanged(e);
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.setAttr.call(this.$refInput, "aria-readonly", this.$isReadOnly);
  }
}

customElements.define(tagName, WUPSwitchControl);
