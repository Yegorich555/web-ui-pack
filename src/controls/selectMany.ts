import { WUPcssIcon } from "../styles";
import WUPSelectControl, { WUPSelectIn } from "./select";

const tagName = "wup-select-many";

export namespace WUPSelecManyIn {
  export interface Defs {}
  export interface Opt {}

  export type Generics<
    ValueType = any,
    ValidationKeys extends WUPSelect.ValidationMap = WUPSelect.ValidationMap,
    Defaults = Defs,
    Options = Opt
  > = WUPSelectIn.Generics<ValueType[], ValueType, ValidationKeys, Defaults & Defs, Options & Opt>;

  export type Validation<T = any> = Generics<T>["Validation"];
  export type GenDef<T = any> = Generics<T>["Defaults"];
  export type GenOpt<T = any> = Generics<T>["Options"];
}

declare global {
  namespace WUPSelectMany {
    interface ValidationMap extends WUPSelect.ValidationMap {}
    interface EventMap extends WUPSelect.EventMap {}
    interface Defaults<T = any> extends WUPSelecManyIn.GenDef<T> {}
    interface Options<T = any> extends WUPSelecManyIn.GenOpt<T> {}
    interface JSXProps<T extends WUPSelectManyControl> extends WUPSelect.JSXProps<T> {}
  }
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectManyControl;
  }
  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPSelectMany.JSXProps<WUPSelectManyControl>;
    }
  }
}

export default class WUPSelectManyControl<
  ValueType = any,
  EventMap extends WUPSelectMany.EventMap = WUPSelectMany.EventMap
> extends WUPSelectControl<ValueType[], ValueType, EventMap> {
  #ctr = this.constructor as typeof WUPSelectManyControl;

  static get $styleRoot(): string {
    return `:root {
        --ctrl-select-item: inherit;
        --ctrl-select-item-back: rgba(0, 0, 0, 0.04);
        --ctrl-select-item-del-display: inline-block;
        --ctrl-select-item-del: var(--ctrl-icon);
        --ctrl-select-item-del-hover: var(--ctrl-selected);
        --ctrl-select-item-del-img: var(--wup-icon-cross);
        --ctrl-select-item-del-size: 0.8em;
        --ctrl-select-gap: 7px;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host strong {
        margin: calc(var(--ctrl-select-gap) / 2);
      }
      :host label > span {
        display: flex;
        flex-wrap: wrap;
        padding: var(--ctrl-padding);
        padding-left: 0; padding-right: 0;
        margin: calc(var(--ctrl-select-gap) / -2);
      }
      :host label > span > span,
      :host input {
        margin: calc(var(--ctrl-select-gap) / 2);
        padding: var(--ctrl-select-gap);
      }
      :host input {
        width: 0;
        min-width: 2em;
        padding-left: 0; padding-right: 0;
        background: #f7d4f7;
      }
      :host label > span > span {
        display: flex;
        align-items: center;
        color: var(--ctrl-select-item);
        background-color: var(--ctrl-select-item-back);
        border-radius: var(--ctrl-border-radius);
        cursor: pointer;
      }
      :host label > span > span:after {
        --ctrl-icon: var(--ctrl-select-item-del);
        --ctrl-icon-size: var(--ctrl-select-item-del-size);
        --ctrl-icon-img: var(--ctrl-select-item-del-img);
        ${WUPcssIcon}
        display: var(--ctrl-select-item-del-display);
        content: "";
        padding:0;
        margin-left: 0.5em;
      }
      @media (hover: hover) {
        :host label > span > span:hover {
          text-decoration: line-through;
          color: var(--ctrl-err-text);
          background-color: var(--ctrl-err-back);
        }
        :host label > span > span:hover:after {
          --ctrl-icon: var(--ctrl-err-text);
        }
      }`;
  }

  static $defaults: WUPSelectMany.Defaults = {
    ...WUPSelectControl.$defaults,
  };

  // @ts-expect-error - because items incompatible
  $options: WUPSelectMany.Options<ValueType> = {
    ...this.#ctr.$defaults,
    items: [],
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  // @ts-expect-error
  protected override _opts = this.$options;

  $refItems?: Array<HTMLElement & { _wupValue: ValueType }>;
  protected renderItems(v: ValueType[], items: WUPSelect.MenuItems<any>): void {
    const refs = this.$refItems ?? [];
    v.forEach((vi, i) => {
      let r = refs[i];
      if (!r) {
        r = this.$refInput.parentNode!.insertBefore(document.createElement("span"), this.$refInput) as HTMLElement & {
          _wupValue: ValueType;
        };
        r.setAttribute("aria-hidden", "true"); // todo how to improve it to set on single parent ?
        refs.push(r);
      }

      if (r._wupValue !== vi) {
        r.textContent = this.valueToText(vi, items);
        r._wupValue = vi;
      }
    });
    this.$refItems = refs;
  }

  protected override valueToInput(v: ValueType[] | undefined): Promise<string> | string {
    const r = this.getMenuItems().then((items) => {
      v = v ?? [];
      this.renderItems(v, items);
      return `Selected ${v.length} of ${items.length}`; // required to suppress reading blank need to set opacity 0 ???
    });

    return r;
  }

  // @ts-expect-error
  protected override selectValue(v: ValueType): void {
    const arr = this.$value || [];
    arr.push(v);
    super.selectValue(arr);
  }
}

customElements.define(tagName, WUPSelectManyControl);

// todo ability to type free-text without selection
// todo click on item > remove item
// todo ability to remove items via keyboard - need support keyLeft, keyRight with selection via aria-activedescendant
// todo show in menu items excluded based on value
// todo autoresize of input based on text - maybe visually hide input and use contenteditable ???
