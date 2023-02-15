import WUPPopupElement from "../popup/popupElement";
import { WUPcssIcon } from "../styles";
import WUPSelectControl from "./select";

const tagName = "wup-select-many";

declare global {
  namespace WUP.SelectMany {
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap {}
    interface Defaults<T = any, VM = ValidityMap> extends WUP.Select.Defaults<T, VM> {}
    interface Options<T = any, VM = ValidityMap> extends WUP.Select.Options<T, VM>, Defaults<T, VM> {}
    interface Attributes extends WUP.Select.Attributes {}
    interface JSXProps<C = WUPSelectManyControl> extends WUP.Select.JSXProps<C>, Attributes {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectManyControl; // add element to document.createElement
  }

  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.SelectMany.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

export default class WUPSelectManyControl<
  ValueType = any,
  EventMap extends WUP.SelectMany.EventMap = WUP.SelectMany.EventMap
> extends WUPSelectControl<ValueType[], ValueType, EventMap> {
  #ctr = this.constructor as typeof WUPSelectManyControl;

  static get $styleRoot(): string {
    return `:root {
        --ctrl-select-item: inherit;
        --ctrl-select-item-bg: rgba(0,0,0,0.04);
        --ctrl-select-item-del-display: none;
        --ctrl-select-item-del: var(--ctrl-icon);
        --ctrl-select-item-del-hover: var(--ctrl-selected);
        --ctrl-select-item-del-img: var(--wup-icon-cross);
        --ctrl-select-item-del-size: 0.8em;
        --ctrl-select-gap: 6px;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host strong {
        margin: calc(var(--ctrl-select-gap) / 2);
      }
      :host label > span {
        flex-wrap: wrap;
        flex-direction: row;
        padding: var(--ctrl-padding);
        padding-left: 0; padding-right: 0;
        margin: calc(var(--ctrl-select-gap) / -2);
      }
      :host [item],
      :host input {
        margin: calc(var(--ctrl-select-gap) / 2);
        padding: var(--ctrl-select-gap);
      }
      :host input {
        flex: 1 1 auto;
        width: 0;
        min-width: 2em;
        padding-left: 0; padding-right: 0;
        background: #f7d4f7;
      }
      :host [item] {
        color: var(--ctrl-select-item);
        background-color: var(--ctrl-select-item-bg);
        border-radius: var(--ctrl-border-radius);
        cursor: pointer;
      }
      :host [item]:after {
        --ctrl-icon: var(--ctrl-select-item-del);
        --ctrl-icon-size: var(--ctrl-select-item-del-size);
        --ctrl-icon-img: var(--ctrl-select-item-del-img);
        ${WUPcssIcon}
        display: var(--ctrl-select-item-del-display);
        content: "";
        padding: 0;
        margin-left: 0.5em;
      }
      @media (hover: hover) {
        :host [item]:hover {
          text-decoration: line-through;
          color: var(--ctrl-err-text);
          background-color: var(--ctrl-err-bg);
        }
        :host [item]:hover:after {
          --ctrl-icon: var(--ctrl-err-text);
         }
      }`;
  }

  static $defaults: WUP.SelectMany.Defaults = {
    ...WUPSelectControl.$defaults,
  };

  $options: WUP.SelectMany.Options = {
    ...this.#ctr.$defaults,
    items: [],
  };

  protected override _opts = this.$options;

  $refItems?: Array<HTMLElement & { _wupValue: ValueType }>;

  protected override async renderMenu(popup: WUPPopupElement, menuId: string): Promise<HTMLElement> {
    const r = await super.renderMenu(popup, menuId);
    r.setAttribute("aria-multiselectable", "true");
    return r;
  }

  protected renderItems(v: ValueType[], items: WUP.Select.MenuItems<any>): void {
    const refs = this.$refItems ?? [];
    v.forEach((vi, i) => {
      let r = refs[i];
      if (!r) {
        r = this.$refInput.parentNode!.insertBefore(document.createElement("span"), this.$refInput) as HTMLElement & {
          _wupValue: ValueType;
        };
        r.setAttribute("aria-hidden", true);
        r.setAttribute("item", "");
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
    const r = this.getItems().then((items) => {
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

// todo show in menu items excluded based on value
// todo add style-remove based for touch-screen

// todo ability to type free-text without selection
// todo click on item > remove item
// todo ability to remove items via keyboard - need support keyLeft, keyRight with selection via aria-activedescendant
