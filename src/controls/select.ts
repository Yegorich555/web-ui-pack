/* eslint-disable no-use-before-define */
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases as PopupShowCases, WUPPopup } from "../popup/popupElement";
import popupListenTarget from "../popup/popupListenTarget";
import WUPBaseControl, { WUPBaseControlTypes } from "./baseControl";
import WUPTextControl, { WUPTextControlTypes } from "./textControl";

export namespace WUPSelectControlTypes {
  export const enum ShowCases {
    onManualCall,
    onInput,
    onArrowKeyPress,
    onClick,
    onFocus,
  }

  export const enum HideCases {
    onClick,
    onManualCall,
    onSelect,
    onEscPress,
    onFocusLost,
  }

  export type MenuItem<T> = { text: string; value: T };
  /** Use li.innerHTML to render value & return string required for input; li can be null if function calls when popup is closed */
  export type MenuItemFn<T> = { text: (value: T, li: HTMLLIElement | null, i: number) => string; value: T };
  export type MenuItemAll<T> = MenuItem<T> | MenuItemFn<T>;
  export type MenuItemsAll<T> = MenuItem<T>[] | MenuItemFn<T>[];

  export type ExtraOptions<T> = {
    /** Items showed in dropdown-menu. Provide promise/api-call to show pending status when control retrieves data! */
    items: MenuItemsAll<T> | (() => MenuItemsAll<T> | Promise<MenuItemsAll<T>>);
    /** Wait for pointed time before show error (it's sumarized with $options.debounce); WARN: hide error without debounce
     *  @defaultValue 0 */
    validityDebounceMs: number;
  };

  export type ValidationMap = WUPBaseControlTypes.ValidationMap;
  export type Generics<
    ValueType = any,
    ValidationKeys extends WUPBaseControlTypes.ValidationMap = ValidationMap,
    Extra = ExtraOptions<ValueType>
  > = WUPTextControlTypes.Generics<ValueType, ValidationKeys, Extra & ExtraOptions<ValueType>>;

  export type Validation = Generics["Validation"];
  export type Options<T = any> = Generics<T>["Options"];
}

export default class WUPSelectControl<ValueType = any> extends WUPTextControl<ValueType> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr2 = this.constructor as typeof WUPSelectControl;

  /** StyleContent related to component */
  static get style(): string {
    return `
      :host {

      }
     `;
  }

  /** Parse/get items from $options.items */
  static async getMenuItems<T, C extends WUPSelectControl<T>>(ctrl: C): Promise<WUPSelectControlTypes.MenuItemsAll<T>> {
    if (ctrl._cachedItems) {
      return ctrl._cachedItems;
    }

    const { items } = ctrl.$options;

    let arr: WUPSelectControlTypes.MenuItemsAll<T>;
    if (items instanceof Function) {
      const f = items();
      if (f instanceof Promise) {
        // todo show isPending here; don't forget aria-busy
        arr = await f;
      } else {
        arr = f;
      }
    } else {
      arr = items;
    }
    ctrl._cachedItems = arr;
    return arr;
  }

  /** Get rawValue for input based on argument [value] */
  static provideInputValue<T, C extends WUPTextControl<T>>(v: T | undefined, control: C): string | Promise<string> {
    if (v === undefined) {
      return "";
    }
    const ctrl = control as unknown as WUPSelectControl<T>;

    const ctr = ctrl.constructor as typeof WUPSelectControl;
    const r = ctr.getMenuItems<T, WUPSelectControl<T>>(ctrl).then((items) => {
      const i = (items as WUPSelectControlTypes.MenuItemAll<any>[]).findIndex((o) => ctr.isEqual(o.value, v));
      if (i === -1) {
        console.error(`${ctrl.tagName} '${ctr.$defaults.name}'. Not found in items`, { items, value: v });
        return `Error: not found for ${v}` != null ? (v as any).toString() : "";
      }
      const item = items[i];
      if (item.text instanceof Function) {
        // todo maybe use li insteaf of it ?
        return item.text(item.value, null, i);
      }
      return item.text;
    });

    return r;
  }

  static $defaults: WUPSelectControlTypes.Options = {
    ...WUPTextControl.$defaults,
    debounceMs: 0,
    validityDebounceMs: 0,
    items: [],
    validationRules: WUPBaseControl.$defaults.validationRules,
  };

  $options: Omit<WUPSelectControlTypes.Options<ValueType>, "validationRules"> = {
    ...this.#ctr2.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  #isOpen = false;
  get $isOpen(): boolean {
    return this.#isOpen;
  }

  $hide() {
    this.goHide(WUPSelectControlTypes.HideCases.onManualCall);
  }

  $show() {
    this.goShow(WUPSelectControlTypes.ShowCases.onManualCall);
  }

  $refPopup?: WUPPopupElement;
  #refPopupDispose?: () => void; // todo use it
  protected override connectedCallback() {
    super.connectedCallback();

    const refs = popupListenTarget(
      {
        target: this,
        showCase: PopupShowCases.onClick | PopupShowCases.onFocus,
      },
      (s) =>
        this.goShow(
          s === PopupShowCases.onClick
            ? WUPSelectControlTypes.ShowCases.onClick
            : WUPSelectControlTypes.ShowCases.onFocus
        ),
      (s) =>
        (s === WUPPopup.HideCases.onFocusOut ||
          s === WUPPopup.HideCases.onOutsideClick ||
          s === WUPPopup.HideCases.onTargetClick) &&
        this.goHide(
          s === WUPPopup.HideCases.onFocusOut
            ? WUPSelectControlTypes.HideCases.onFocusLost
            : WUPSelectControlTypes.HideCases.onClick
        )
    );
    this.#refPopupDispose = refs.onHideRef;
  }

  protected override renderControl() {
    super.renderControl();

    const i = this.$refInput;
    i.setAttribute("role", "combobox");
    i.setAttribute("aria-haspopup", "listbox");
    i.setAttribute("aria-autocomplete", "list");
    i.setAttribute("aria-expanded", "false");
    // i.setAttribute("aria-multiselectable", "false");

    // todo on input click need to select all every time
  }

  /** Mapping items with li-ids */
  _itemsMap: Map<string, WUPSelectControlTypes.MenuItem<ValueType> | WUPSelectControlTypes.MenuItemFn<ValueType>> =
    new Map();

  _cachedItems?: WUPSelectControlTypes.MenuItemsAll<ValueType>;

  protected async renderMenuItems(ul: HTMLUListElement) {
    const arr = await this.#ctr2.getMenuItems<ValueType, this>(this);

    const arrLi = arr.map((o) => {
      const li = ul.appendChild(document.createElement("li"));
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false"); // todo implement it according to current value
      const id = this.#ctr2.uniqueId;
      li.id = id; // todo check it (maybe use more convenient id's)
      this._itemsMap.set(id, o);
      return li;
    });

    if (arr[0].text instanceof Function) {
      arr.forEach((v, i) => (v as WUPSelectControlTypes.MenuItemFn<ValueType>).text(v.value, arrLi[i], i));
    } else {
      arr.forEach((v, i) => (arrLi[i].textContent = (v as WUPSelectControlTypes.MenuItem<ValueType>).text));
    }
  }

  protected onMenuItemClick(e: MouseEvent & { target: HTMLLIElement }) {
    const o = this._itemsMap.get(e.target.id) as WUPSelectControlTypes.MenuItemAll<ValueType>;

    this.setValue(o.value);
  }

  protected override onInput(e: Event & { currentTarget: HTMLInputElement }) {
    // todo implement search
  }

  protected async goShow(showCase: WUPSelectControlTypes.ShowCases): Promise<WUPPopupElement | null> {
    if (this.#isOpen) {
      return this.$refPopup || null;
    }

    this.#isOpen = true;
    this.$hideError(); // todo resolve conflict overflow popup and error

    if (!this.$refPopup) {
      this.$refPopup = this.appendChild(document.createElement("wup-popup"));
      const p = this.$refPopup;
      p.$options.minWidthByTarget = true;
      // todo set maxHeight via styles ?
      p.$options.placement = [
        WUPPopupElement.$placements.$bottom.$start,
        WUPPopupElement.$placements.$bottom.$end,
        WUPPopupElement.$placements.$top.$start,
        WUPPopupElement.$placements.$top.$end,
        WUPPopupElement.$placements.$bottom.$start.$resizeHeight,
        WUPPopupElement.$placements.$bottom.$end.$resizeHeight,
        WUPPopupElement.$placements.$top.$start.$resizeHeight,
        WUPPopupElement.$placements.$top.$end.$resizeHeight,
      ];

      // todo don't forget dropdown animation from example

      const menuId = this.#ctr2.uniqueId;
      const i = this.$refInput;
      i.setAttribute("aria-owns", menuId);
      i.setAttribute("aria-controls", menuId);

      const ul = p.appendChild(document.createElement("ul"));
      ul.setAttribute("id", menuId);
      ul.setAttribute("role", "listbox");
      ul.setAttribute("aria-label", "Items");
      // todo appendEvent maybe wrong
      this.appendEvent(ul, "click", (e) => {
        e.stopPropagation();
        if (e.target instanceof HTMLLIElement) {
          this.onMenuItemClick(e as MouseEvent & { target: HTMLLIElement });
        }
      });

      await this.renderMenuItems(ul);
    }

    const selectedItemId = "itemId"; // todo implement
    this.$refInput.setAttribute("aria-activedescendant", selectedItemId);

    this.setAttribute("opened", "");
    this.$refInput.setAttribute("aria-expanded", "true");

    this.$refPopup.$show();
    return this.$refPopup;
  }

  protected async goHide(hideCase: WUPSelectControlTypes.HideCases): Promise<boolean> {
    const wasOpen = this.#isOpen;
    this.#isOpen = false;
    if (!this.$refPopup) {
      return false;
    }

    if (wasOpen) {
      await this.$refPopup.$hide();
    }

    // remove popup only by focusOut to optimize resources
    if (hideCase === WUPSelectControlTypes.HideCases.onFocusLost) {
      this.$refPopup.remove();
      this.$refPopup = undefined;
    }

    this.removeAttribute("opened");
    this.$refInput.setAttribute("aria-expanded", "false");

    return true;
  }
}

const tagName = "wup-select";
customElements.define(tagName, WUPSelectControl);

declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPBaseControlTypes.JSXControlProps<WUPSelectControl>;
    }
  }
}

const el = document.createElement(tagName);
el.$options.name = "testMe";
el.$options.validations = {
  required: true,
  min: (v) => v.length > 500 && "This is error",
  extra: (v) => "test Me",
};
