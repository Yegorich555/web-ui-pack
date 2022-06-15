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
        --ctrl-check-off-back: #fff;
        --ctrl-check-on-back: var(--ctrl-focus);
        --ctrl-check-on: #fff;
        --ctrl-check-radius: 3px;
        --ctrl-check-shadow: #0003;
        --ctrl-check-size: calc(var(--ctrl-icon-size) * 1.2);
        --ctrl-check-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath stroke='black' stroke-width='40' d='M37.691 450.599 224.76 635.864c21.528 21.32 56.11 21.425 77.478 0l428.035-426.23c21.47-21.38 21.425-56.11 0-77.478s-56.11-21.425-77.478 0L263.5 519.647 115.168 373.12c-21.555-21.293-56.108-21.425-77.478 0s-21.425 56.108 0 77.478z'/%3E%3C/svg%3E");
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host label>span {
        position: initial;
        height: var(--ctrl-check-size);
        width: var(--ctrl-check-size);
        min-width: auto;
        border-radius: var(--ctrl-check-radius);
        background: var(--ctrl-check-off-back);
        box-shadow: 0 0 2px 0 var(--ctrl-check-shadow);
      }
      :host label>span:before {
        content: none;
      }
      :host input:checked + * + * {
        background: var(--ctrl-check-on-back);
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
        -webkit-mask-image: var(--ctrl-check-img);
        mask-image: var(--ctrl-check-img);
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
      }
     `;
  }

  static $defaults: WUPCheck.Defaults = {
    ...WUPSwitchControl.$defaults,
    validationRules: WUPSwitchControl.$defaults.validationRules as WUPCheck.Defaults["validationRules"],
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
