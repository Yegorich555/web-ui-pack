import { WUP } from "../baseElement";
import nestedProperty from "../helpers/nestedProperty";
import { WUPcssHidden } from "../styles";
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
      /** @deprecated Items showed as radio-buttons. Point global obj-key with items (set `window.inputRadio.items` for `window.inputRadio.items = [{value: 1, text: 'Item 1'}]` ) */
      items?: string;
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

  /** Custom text that announced by screen-readers. Redefine it to use with another language */
  static get $ariaReadonly(): string {
    return "readonly";
  }

  static get $styleRoot(): string {
    return `:root {
      --ctrl-radio-size: 1em;
      --ctrl-radio-spot-size: calc(var(--ctrl-radio-size) * 0.5);
      --ctrl-radio-back: #fff;
      --ctrl-radio-off: #fff;
      --ctrl-radio-on: var(--ctrl-focus);
      --ctrl-radio-border: #0003;
      --ctrl-radio-border-size: 2px;
      --ctrl-radio-gap: 7px;
     }`;
  }

  static get $style(): string {
    // :host input + *:after >> not relative because 1.2em of 14px provides round-pixel-issue and not always rounded items
    return `${super.$style}
      :host {
        padding: var(--ctrl-padding);
        cursor: pointer;
       }
      :host fieldset {
        border: none;
        padding: 0;
        margin: calc(var(--ctrl-radio-gap) * -0.5) calc(var(--ctrl-radio-gap) * -1);
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
        cursor: pointer;
      }
      :host strong {
        font: inherit;
      }
      :host label {
        padding: 0;
        cursor: pointer;
      }
      :host input {${WUPcssHidden}}
      :host input + * {
        padding: var(--ctrl-radio-gap);
        display: inline-flex;
        align-items: center;
      }
      :host[readonly],
      :host[readonly] legend,
      :host[readonly] label {
        cursor: default;
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
      :host fieldset[aria-required="true"] input + *:after {
        content: "";
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

  static $isEqual(v1: unknown, v2: unknown): boolean {
    return (
      super.$isEqual(v1, v2) ||
      // eslint-disable-next-line eqeqeq
      v1 == v2 ||
      String.prototype.localeCompare.call(v1, v2 as string, undefined, { sensitivity: "accent" }) === 0
    );
  }

  static observedOptions = (super.observedOptions as Set<keyof WUPRadio.Options>).add("reverse") as any;
  static get observedAttributes(): Array<keyof WUPRadio.Options> {
    const arr = super.observedAttributes as Array<keyof WUPRadio.Options>;
    arr.push("reverse");
    return arr;
  }

  static $defaults: WUPRadio.Defaults = {
    ...WUPBaseControl.$defaults,
    validationRules: { ...WUPBaseControl.$defaults.validationRules },
  };

  $options: WUPRadio.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  protected override parseValue(text: string): ValueType | undefined {
    if (!this.$refItems?.length) {
      return undefined;
    }
    const r = this.$refItems.find((o) => this.#ctr.$isEqual(o._value, text));
    return r?._value;
  }

  protected override gotReady(): void {
    super.gotReady();
    this.appendEvent(this, "input", this.gotInput as any);
  }

  /** Called when user touches inputs */
  protected gotInput(e: Event & { target: ExtInputElement }): void {
    if (this.$isReadOnly) {
      e.target.checked = !e.target.checked;
    } else {
      this.setValue(e.target._value);
    }
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
    const tmp =
      (nestedProperty.get(window, this.getAttribute("items") || "") as WUPRadio.Options["items"]) || this._opts.items;
    const arr = tmp instanceof Function ? tmp() : tmp;
    if (!arr?.length) {
      return;
    }
    const nm = this.#ctr.$uniqueId + (Date.now() % 1000);
    const arrLi = arr.map((item) => {
      const lbl = document.createElement("label");
      const inp = lbl.appendChild(document.createElement("input")) as ExtInputElement;
      const tit = lbl.appendChild(document.createElement("span"));
      this.$refItems.push(inp);
      inp.id = this.#ctr.$uniqueId;
      inp._value = item.value;

      lbl.setAttribute("for", inp.id);
      inp.type = "radio";
      inp.name = nm; // required otherwise tabbing, arrow-keys doesn't work inside single fieldset
      parent.appendChild(lbl);
      return tit;
    }) as Array<HTMLElement & { _text: string }>;

    if (arr[0].text instanceof Function) {
      arr.forEach((v, i) => (v as WUPSelect.MenuItemFn<ValueType>).text(v.value, arrLi[i], i));
    } else {
      arr.forEach((v, i) => (arrLi[i].textContent = (v as WUPSelect.MenuItem<ValueType>).text));
    }

    this.$refItems[0].tabIndex = 0;

    this.checkInput(this.$value); // required for case when user changed items
  }

  /** Called when need to update check-state of inputs */
  protected checkInput(v: ValueType | undefined): void {
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

  protected override setValue(v: ValueType, canValidate = true): boolean | null {
    this.$isReady && this.checkInput(v); // otherwise it will be checked from renderItems
    return super.setValue(v, canValidate);
  }

  protected override gotChanges(propsChanged: Array<keyof WUPRadio.Options> | null): void {
    this._opts.reverse = this.getBoolAttr("reverse", this._opts.reverse);
    this.setAttr("reverse", this._opts.reverse, true);

    if (!propsChanged || propsChanged.includes("items")) {
      this.renderItems(this.$refFieldset);
    }
    // required
    const req = this._opts.validations?.required;
    this.setAttr.call(this.$refFieldset, "aria-required", !!req);

    super.gotChanges(propsChanged as any);
  }

  override gotFormChanges(propsChanged: Array<keyof WUPForm.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.$refInput.disabled = false;
    this.$refInput.readOnly = false;
    this.$refFieldset.disabled = this.$isDisabled as boolean;
    this.$ariaDetails(this.$isReadOnly ? this.#ctr.$ariaReadonly : null);
  }

  protected override gotOptionsChanged(e: WUP.OptionEvent): void {
    this._isStopChanges = true;
    e.props.includes("reverse") && this.setAttr("reverse", this._opts.reverse, true);
    super.gotOptionsChanged(e);
    this._isStopChanges = false;
  }

  override focus(): boolean {
    this.$refInput.focus();
    return document.activeElement === this.$refInput || super.focus();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override goShowError(err: string | null, target: HTMLElement): void {
    super.goShowError(err, this.$refFieldset);
  }
}

customElements.define(tagName, WUPRadioControl);
