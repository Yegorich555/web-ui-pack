import { onEvent } from "../indexHelpers";
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
      }
      @media not all and (pointer: fine) {
        :host [item] { user-select: none; } ${/* to show remove-decoration instead of text-selection */ ""}
      }`;
  }

  static override $filterMenuItem(
    this: WUPSelectManyControl,
    menuItemText: string,
    menuItemValue: any,
    inputValue: string,
    inputRawValue: string
  ): boolean {
    if (this.$value?.includes(menuItemValue)) {
      return false;
    }
    return super.$filterMenuItem.call(this, menuItemText, menuItemValue, inputValue, inputRawValue);
  }

  static $defaults: WUP.SelectMany.Defaults = {
    ...WUPSelectControl.$defaults,
  };

  $options: WUP.SelectMany.Options = {
    ...this.#ctr.$defaults,
    items: [],
  };

  protected override _opts = this.$options;

  /** Items selected & rendered on control */
  $refItems?: Array<HTMLElement & { _wupValue: ValueType }>;
  /** Copy of $refTitle element to fix reading title as first (resolves accessibility issue) */
  #refTitleAria = document.createElement("span");

  protected override renderControl(): void {
    super.renderControl();
    this.#refTitleAria.className = this.#ctr.classNameHidden;
    this.$refTitle.parentElement!.prepend(this.#refTitleAria);
    this.$refTitle.setAttribute("aria-hidden", "true");
  }

  protected override async renderMenu(popup: WUPPopupElement, menuId: string): Promise<HTMLElement> {
    const r = await super.renderMenu(popup, menuId);
    r.setAttribute("aria-multiselectable", "true");
    this.filterMenuItems();
    return r;
  }

  /** Called to update/remove selected items on control */
  protected renderItems(v: ValueType[], all: WUP.Select.MenuItems<any>): void {
    const refs = this.$refItems ?? [];
    v.forEach((vi, i) => {
      let r = refs[i];
      if (!r) {
        r = this.$refInput.parentNode!.insertBefore(document.createElement("span"), this.$refInput) as HTMLElement & {
          _wupValue: ValueType;
        };
        r.setAttribute("item", "");
        refs.push(r);
      }

      if (r._wupValue !== vi) {
        r.textContent = this.valueToText(vi, all);
        r._wupValue = vi;
      }
    });

    const toRemove = refs.length - v.length;
    toRemove > 0 && refs.splice(v.length, toRemove).forEach((el) => el.remove()); // remove previous items

    this.$refPopup && this.filterMenuItems();
    this.$refItems = refs;
  }

  protected override valueToInput(v: ValueType[] | undefined): Promise<string> | string {
    const r = this.getItems().then((items) => {
      v = v ?? [];
      this.renderItems(v, items);
      // todo develop anotherway for input because in current way it autoselected
      return " "; // otherwise broken css:placeholder-shown & screenReaders reads 'Blank'
    });

    return r;
  }

  // @ts-expect-error - because expected v: ValueType[]
  protected override selectValue(v: ValueType, canHideMenu = true): void {
    const arr = this.$value || [];
    arr.push(v);
    canHideMenu = canHideMenu && arr.length === this._opts.items.length;
    super.selectValue(arr, canHideMenu);
  }

  // @ts-expect-error - because expected v: ValueType[]
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected selectMenuItemByValue(v: ValueType | undefined): void {
    /* skip this because item is filtered/hidden in this case */
  }

  /** Select item (hide item) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override selectMenuItem(next: HTMLElement | null): void {
    /* skip this because item is filtered/hidden in this case */
  }

  protected override clearFilterMenuItems(): void {
    /* skip this because default filtering doesn't reset after re-opening menu */
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.SelectMany.Options> | null): void {
    super.gotChanges(propsChanged);
    this.#refTitleAria.textContent = this.$refTitle.textContent;
  }

  protected override gotFocus(): Array<() => void> {
    const r = super.gotFocus();
    r.push(
      onEvent(this.$refInput.parentElement!, "click", (e) => {
        const t = e.target;
        const eli = this.$refItems?.findIndex((li) => li === t || this.includes.call(li, t));
        if (eli != null && eli > -1) {
          e.stopPropagation(); // to prevent open/hide popup
          // todo prevent openByFocus in this case ?
          this.$value!.splice(eli, 1);
          this.setValue([...this.$value!]);
        }
      })
    );
    return r;
  }
}

customElements.define(tagName, WUPSelectManyControl);

// todo add style-remove for touch-screen (when user presses tap need to fire hover effect)
// todo allowNewValue
// todo keyboard
// todo develop autowidth for input so it can render in the same row without new empty row
// todo drag & drop
