import WUPBaseControl, { WUPBaseIn } from "./baseControl";

const tagName = "wup-radio";
export namespace WUPRadioIn {
  export interface Def {
    /** Reversed-style (radio+label for true vs label+radio)
     * @defaultValue false */
    reverse?: boolean;
  }
  export interface Opt<T> {
    /** Items showed as radio-buttons */
    items: WUPSelect.MenuItems<T> | (() => WUPSelect.MenuItems<T>);
  }

  export type Generics<
    ValueType = any,
    ValidationKeys extends WUPRadio.ValidationMap = WUPRadio.ValidationMap,
    Defaults = Def,
    Options = Opt<ValueType>
  > = WUPBaseIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt<ValueType>>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = boolean> = Generics<T>["Defaults"];
  export type GenOpt<T = boolean> = Generics<T>["Options"];
}

declare global {
  namespace WUPRadio {
    interface ValidationMap extends WUPBase.ValidationMap {}
    interface EventMap extends WUPBase.EventMap {}
    interface Defaults<T = any> extends WUPRadioIn.GenDef<T> {}
    interface Options<T = any> extends WUPRadioIn.GenOpt<T> {}
    interface JSXProps<T extends WUPRadioControl> extends WUPBase.JSXProps<T> {
      /** Reversed-style (radio+label vs label+radio) */
      reverse?: boolean | "";
    }
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPRadioControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPRadio.JSXProps<WUPRadioControl>;
    }
  }
}

interface ExtInputElement extends HTMLInputElement {
  _value: any;
}

export default class WUPRadioControl<
  ValueType = any,
  EventMap extends WUPRadio.EventMap = WUPRadio.EventMap
> extends WUPBaseControl<ValueType, EventMap> {
  #ctr = this.constructor as typeof WUPRadioControl;

  static get $styleRoot(): string {
    return `:root {
      --ctrl-radio-size: 1em;
      --ctrl-radio-spot-size: calc(var(--ctrl-radio-size) * 0.5);
      --ctrl-radio-back: #fff;
      --ctrl-radio-off: #fff;
      --ctrl-radio-on: var(--ctrl-focus);
      --ctrl-radio-border: #0003;
      --ctrl-radio-border-size: 2px;
      --ctrl-radio-gap: 0.7em;
     }`;
  }

  static get $style(): string {
    // :host input + *:after >> not relative because 1.2em of 14px provides round-pixel-issue and not always rounded items
    return `${super.$style}
      :host {
        padding: var(--ctrl-padding);
        cursor: initial;
       }
      :host fieldset {
        border: none;
        padding: 0; marging: 0;
        margin: calc(var(--ctrl-radio-gap) * -1);
        display: flex;
        flex-wrap: wrap;
      }
      :host legend {
        display: block;
        position: absolute;
        top: 0.2em;
        transform-origin: top left;
        transform: scale(0.9);
        margin: 0 var(--ctrl-radio-gap);
        padding: 0;
        box-sizing: border-box;
        max-width: 100%;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        font-weight: normal;
        text-decoration: none;
      }
      :host strong {
        font: inherit;
      }
      :host label {
        padding: 0;
      }
      :host input {${this.$styleHidden}}
      :host input + * {
        padding: var(--ctrl-radio-gap);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
      }
      :host input + *:after {
        content: "";
        width: var(--ctrl-radio-size);
        height: var(--ctrl-radio-size);
        border: calc((var(--ctrl-radio-size) - var(--ctrl-radio-spot-size)) / 2) solid var(--ctrl-radio-back);
        box-sizing: border-box;
        background: var(--ctrl-radio-off);
        box-shadow: 0 0 1px var(--ctrl-radio-border-size) var(--ctrl-radio-border);
        border-radius: 50%;
        margin-left: 0.5em;
      }
      :host[reverse] input + * {
        flex-direction: row-reverse;
      }
      :host[reverse] input + *:after {
        margin-left: 0;
        margin-right: 0.5em;
      }
      :host input:checked + *:after {
        background-color: var(--ctrl-radio-on);
      }
      @media not all and (prefers-reduced-motion) {
        :host input + *:after {
          transition: background-color var(--anim);
        }
      }
      :host input:focus + * {
        color: var(--ctrl-selected);
      }
      :host input:focus + *:after {
         box-shadow: 0 0 1px var(--ctrl-radio-border-size) var(--ctrl-selected);
      }
      @media (hover: hover) {
        :host input + *:hover {
          color: var(--ctrl-selected);
        }
        :host input + *:hover:after {
          box-shadow: 0 0 1px var(--ctrl-radio-border-size) var(--ctrl-selected);
        }
      }
     `;
  }

  static observedOptions = (super.observedOptions as Set<keyof WUPRadio.Options>).add("reverse") as any;
  static get observedAttributes() {
    const arr = super.observedAttributes as Array<keyof WUPRadio.Options>;
    arr.push("reverse");
    return arr;
  }

  static $defaults: WUPRadio.Defaults = {
    ...WUPBaseControl.$defaults,
    validationRules: WUPBaseControl.$defaults.validationRules as WUPRadio.Defaults["validationRules"],
  };

  $options: WUPRadio.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  protected override gotReady() {
    super.gotReady();
    this.appendEvent(this, "input", this.gotInput as any);
  }

  /** Fired when user touches inputs */
  protected gotInput(e: Event & { target: ExtInputElement }) {
    this.setValue(e.target._value);
  }

  $refFieldset = document.createElement("fieldset");
  $refItems: ExtInputElement[] = [];

  protected override renderControl(): void {
    this.$refFieldset.appendChild(document.createElement("legend")).appendChild(this.$refTitle);
    this.appendChild(this.$refFieldset);
  }

  protected renderItems(parent: HTMLFieldSetElement): void {
    this.$refItems.forEach((r) => r.remove());
    this.$refItems.length = 0;
    const tmp = this._opts.items;
    const arr = tmp instanceof Function ? tmp() : tmp;
    if (!arr?.length) {
      return;
    }

    const arrLi = arr.map((item) => {
      const lbl = document.createElement("label");
      const inp = lbl.appendChild(document.createElement("input")) as ExtInputElement;
      const tit = lbl.appendChild(document.createElement("span"));
      this.$refItems.push(inp);
      inp.id = this.#ctr.$uniqueId;
      inp._value = item.value;

      lbl.setAttribute("for", inp.id);
      inp.type = "radio";
      parent.appendChild(lbl);
      return tit;
    }) as Array<HTMLElement & { _text: string }>;

    if (arr[0].text instanceof Function) {
      arr.forEach((v, i) => (v as WUPSelect.MenuItemFn<ValueType>).text(v.value, arrLi[i], i));
    } else {
      arr.forEach((v, i) => (arrLi[i].textContent = (v as WUPSelect.MenuItem<ValueType>).text));
    }

    this.checkInput(this.$value); // required for case when user changed items
  }

  /** Fired when need to update check-state of inputs */
  protected checkInput(v: ValueType | undefined) {
    this.$refInput.checked = false;

    if (v === undefined) {
      // eslint-disable-next-line prefer-destructuring
      this.$refInput = this.$refItems[0];
    } else {
      const item = this.$refItems.find((inp) => inp._value === v);
      if (!item) {
        console.error(`${this.tagName}${this._opts.name ? `[${this._opts.name}]` : ""}. Not found in items`, {
          items: this._opts.items,
          value: v,
        });
      } else {
        item.checked = true;
        this.$refInput = item;
      }
    }

    this.$refLabel = this.$refInput.parentElement as HTMLLabelElement;
  }

  protected override setValue(v: ValueType, canValidate = true) {
    this.$isReady && this.checkInput(v); // otherwise it will be checked from renderItems
    super.setValue(v, canValidate);
  }

  protected override gotChanges(propsChanged: Array<keyof WUPRadio.Options> | null) {
    this._opts.reverse = this.getBoolAttr("reverse", this._opts.reverse);
    this.setBoolAttr("reverse", this._opts.reverse);

    if (!propsChanged || propsChanged.includes("items")) {
      this.renderItems(this.$refFieldset);
    }
    // required
    const req = this._opts.validations?.required;
    req ? this.$refFieldset.setAttribute("aria-required", "true") : this.$refFieldset.removeAttribute("aria-required");
    // disabled
    this.$refFieldset.disabled = this.$isDisabled as boolean;
    // readonly
    const readonly = this.$isReadOnly as boolean;
    this.$refItems.forEach((i) => (i.readOnly = readonly));

    super.gotChanges(propsChanged as any);
  }
}

customElements.define(tagName, WUPRadioControl);
