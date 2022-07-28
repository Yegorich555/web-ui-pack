import WUPSwitchControl, { WUPSwitchIn } from "./switch";

const tagName = "wup-check";
export namespace WUPCheckIn {
  export interface Def {}
  export interface Opt {}

  export type Generics<
    ValueType = boolean,
    ValidationKeys extends WUPCheck.ValidationMap = WUPCheck.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPSwitchIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = boolean> = Generics<T>["Defaults"];
  export type GenOpt<T = boolean> = Generics<T>["Options"];
}

declare global {
  namespace WUPCheck {
    interface ValidationMap extends WUPSwitch.ValidationMap {}
    interface EventMap extends WUPSwitch.EventMap {}
    interface Defaults<T = boolean> extends WUPCheckIn.GenDef<T> {}
    interface Options<T = boolean> extends WUPCheckIn.GenOpt<T> {}
    interface JSXProps<T extends WUPCheckControl> extends WUPSwitch.JSXProps<T> {}
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPCheckControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPCheck.JSXProps<WUPCheckControl>;
    }
  }
}

export default class WUPCheckControl<
  EventMap extends WUPCheck.EventMap = WUPCheck.EventMap
> extends WUPSwitchControl<EventMap> {
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

        background-color: var(--ctrl-check-on);
        -webkit-mask-image: var(--wup-icon-check);
        mask-image: var(--wup-icon-check);
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
      }
      @media (hover: hover) {
        :host:hover label>span {
          box-shadow: 0 0 4px 0 var(--ctrl-focus);
        }
      }`;
  }

  static $defaults: WUPCheck.Defaults = {
    ...WUPSwitchControl.$defaults,
    validationRules: { ...WUPSwitchControl.$defaults.validationRules },
  };

  $options: WUPCheck.Options = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;
}

customElements.define(tagName, WUPCheckControl);

// todo add logic for checkbox-tree
