import WUPBaseControl, { WUPBaseIn } from "./baseControl";

const tagName = "wup-switch";
export namespace WUPSwitchIn {
  export interface Def {
    /** Reversed-style (switch+label for true vs label+swich)
     * @defaultValue false */
    reverse?: boolean;
  }
  export interface Opt {}

  export type Generics<
    ValueType = boolean,
    ValidationKeys extends WUPSwitch.ValidationMap = WUPSwitch.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPBaseIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = boolean> = Generics<T>["Defaults"];
  export type GenOpt<T = boolean> = Generics<T>["Options"];
}

declare global {
  namespace WUPSwitch {
    interface ValidationMap extends Omit<WUPBase.ValidationMap, "required"> {}
    interface EventMap extends WUPBase.EventMap {}
    interface Defaults<T = boolean> extends WUPSwitchIn.GenDef<T> {}
    interface Options<T = boolean> extends WUPSwitchIn.GenOpt<T> {}
    interface JSXProps<T extends WUPSwitchControl> extends WUPBase.JSXProps<T> {
      /** Reversed-style (switch+label vs label+swich) */
      reverse?: boolean | "";
      /** @deprecated This attr doesn't work with React (react-issue) */
      defaultChecked?: boolean;
    }
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSwitchControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPSwitch.JSXProps<WUPSwitchControl>;
    }
  }
}

export default class WUPSwitchControl<EventMap extends WUPSwitch.EventMap = WUPSwitch.EventMap> extends WUPBaseControl<
  boolean,
  EventMap
> {
  #ctr = this.constructor as typeof WUPSwitchControl;

  static get $styleRoot(): string {
    return `:root {
      --ctrl-switch-padding: 1em;
      --ctrl-switch-on: #fff;
      --ctrl-switch-off: #fff;
      --ctrl-switch-shadow: #0003;
      --ctrl-switch-off-back: #9f9f9f;
      --ctrl-switch-on-back: var(--ctrl-focus);
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
        background: var(--ctrl-switch-off-back);
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
      :host input:checked + * + * {
        background-color: var(--ctrl-switch-on-back);
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
      @media not all and (prefers-reduced-motion) {
        :host label>span { transition: background-color var(--anim); }
        :host label>span:before { transition: left var(--anim); }
      }`;
  }

  static observedOptions = (super.observedOptions as Set<keyof WUPSwitch.Options>).add("reverse") as any;
  static get observedAttributes() {
    const arr = super.observedAttributes as Array<keyof WUPSwitch.Options | "defaultChecked">;
    arr.push("reverse", "defaultChecked");
    return arr;
  }

  static $defaults: WUPSwitch.Defaults = {
    ...WUPBaseControl.$defaults,
    validationRules: WUPBaseControl.$defaults.validationRules as WUPSwitch.Defaults["validationRules"],
  };

  $options: WUPSwitch.Options = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
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

  protected override renderControl(): void {
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    this.$refInput.type = "checkbox";
    this.$refInput.setAttribute("wup-hidden", "");
    this.$refLabel.appendChild(this.$refInput);
    this.$refLabel.appendChild(this.$refTitle);
    this.$refLabel.appendChild(document.createElement("span")); // for icon
    this.appendChild(this.$refLabel);
  }

  protected override setValue(v: boolean, canValidate = true) {
    super.setValue(v, canValidate);
    this.$refInput.checked = !!v;
  }

  protected override gotChanges(propsChanged: Array<keyof WUPSwitch.Options> | null) {
    super.gotChanges(propsChanged as any);

    this._opts.reverse = this.getBoolAttr("reverse", this._opts.reverse);
    this.setBoolAttr("reverse", this._opts.reverse);

    if (this.getBoolAttr("defaultChecked", false)) {
      this.$initValue = true;
      if (!propsChanged) {
        this.$value = this.$initValue;
      }
    }
  }
}

customElements.define(tagName, WUPSwitchControl);
