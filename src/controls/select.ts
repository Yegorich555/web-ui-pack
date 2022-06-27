import { WUP } from "../baseElement";
import { onEvent, promiseWait } from "../indexHelpers";
// eslint-disable-next-line import/named
import WUPPopupElement from "../popup/popupElement";
import WUPSpinElement from "../spinElement";
import WUPBaseComboControl, { HideCases, ShowCases, WUPBaseComboIn } from "./baseCombo";

!WUPSpinElement && console.error("!"); // It's required otherwise import is ignored by webpack

const tagName = "wup-select";
export namespace WUPSelectIn {
  export interface Defs {
    /** Wait for pointed time before show-error (sumarized with $options.debounce); WARN: hide-error without debounce
     *  @defaultValue 0 */
    validityDebounceMs?: number;
    /** Case when menu-popup need to show
     * @defaultValue onPressArrowKey | onClick | onFocus | onInput */
    showCase: ShowCases;
  }

  export interface Opt<T> {
    /** Items showed in dropdown-menu. Provide promise/api-call to show pending status when control retrieves data! */
    items: WUPSelect.MenuItems<T> | (() => WUPSelect.MenuItems<T> | Promise<WUPSelect.MenuItems<T>>);
    /** Set true to make input not editable but allow to user select items via popup-menu (ordinary dropdown mode) */
    readOnlyInput?: boolean;
  }

  export type Generics<
    ValueType = any,
    ValidationKeys extends WUPSelect.ValidationMap = WUPSelect.ValidationMap,
    Defaults = Defs,
    Options = Opt<ValueType>
  > = WUPBaseComboIn.Generics<ValueType, ValidationKeys, Defaults & Defs, Options & Opt<ValueType>>;

  export type Validation<T = any> = Generics<T>["Validation"];
  export type GenDef<T = any> = Generics<T>["Defaults"];
  export type GenOpt<T = any> = Generics<T>["Options"];
}
declare global {
  namespace WUPSelect {
    interface MenuItem<T> {
      text: string;
      value: T;
    }
    /** Use li.innerHTML to render value & return string required for input; */
    interface MenuItemFn<T> {
      text: (value: T, el: HTMLElement, i: number) => string;
      value: T;
    }
    type MenuItemAny<T> = MenuItem<T> | MenuItemFn<T>;
    type MenuItems<T> = MenuItem<T>[] | MenuItemFn<T>[];

    interface ValidationMap extends WUPBaseCombo.ValidationMap {}
    interface EventMap extends WUPBaseCombo.EventMap {}
    interface Defaults<T = string> extends WUPSelectIn.GenDef<T> {}
    interface Options<T = string> extends WUPSelectIn.GenOpt<T> {}
    interface JSXProps<T extends WUPSelectControl> extends WUPBaseCombo.JSXProps<T> {}
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPSelect.JSXProps<WUPSelectControl>;
    }
  }
}

export default class WUPSelectControl<
  ValueType = any,
  EventMap extends WUPSelect.EventMap = WUPSelect.EventMap
> extends WUPBaseComboControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPSelectControl;

  static observedOptions = (super.observedOptions as Set<keyof WUPSelect.Options>).add("items") as any;

  static get $styleRoot(): string {
    return `:root {
        --ctrl-select-icon-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='m16.078 258.214 329.139 329.139c21.449 21.449 56.174 21.449 77.567 0l329.139-329.139c21.449-21.449 21.449-56.174 0-77.567s-56.174-21.449-77.567 0L384 471.003 93.644 180.647c-21.449-21.449-56.173-21.449-77.567 0s-21.449 56.173 0 77.567z'/%3E%3C/svg%3E");
        --ctrl-select-current: inherit;
        --ctrl-select-current-back: #d9f7fd;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        cursor: pointer;
        --ctrl-icon-img: var(--ctrl-select-icon-img);
      }
      :host [menu] {
        padding: 0;
        overflow: hidden;
      }
      :host [menu] ul {
        max-height: 300px;
        overflow: auto;
      }
      :host [menu] ul {
        margin: 0;
        padding: 0;
        list-style-type: none;
        cursor: pointer;
      }
      :host [menu] li {
        padding: 1em;
      }
      :host [menu] li:hover,
      :host [menu] li[aria-selected="true"] {
        color: var(--ctrl-select-current);
        background: var(--ctrl-select-current-back);
      }
      :host [menu] li[focused] {
        box-shadow: inset 0 0 4px 0 var(--ctrl-focus);
        border-radius: var(--ctrl-border-radius);
      }`;
  }

  /** Text for listbox when no items are displayed */
  static $textNoItems: string | undefined = "No Items";

  /** Function to filter menuItems based on inputValue; all values are in lowerCase */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static $filterMenuItem(menuItemText: string, inputValue: string, inputRawValue: string): boolean {
    return menuItemText.startsWith(inputValue) || menuItemText.includes(` ${inputValue}`);
  }

  static $defaults: WUPSelect.Defaults = {
    ...WUPBaseComboControl.$defaults,
    showCase: ShowCases.onClick | ShowCases.onFocus | ShowCases.onPressArrowKey | ShowCases.onInput,
  };

  $options: WUPSelect.Options<ValueType> = {
    ...this.#ctr.$defaults,
    items: [],
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  /** Returns is control in pending state (show spinner) */
  get $isPending(): boolean {
    return !!this.#stopPending;
  }

  protected override renderControl() {
    super.renderControl();
    // this.$refInput.setAttribute("aria-multiselectable", "false");
  }

  /** Called on every spin-render */
  renderSpin(): WUPSpinElement {
    const spin = document.createElement("wup-spin");
    spin.$options.fit = true;
    spin.$options.overflowFade = true;
    spin.$options.overflowTarget = this;
    this.appendChild(spin);
    return spin;
  }

  protected override async gotOptionsChanged(e: WUP.OptionEvent) {
    const ev = e as unknown as WUP.OptionEvent<WUPSelect.Options>;
    if (ev.props.includes("items")) {
      this.removePopup();
      this._cachedItems = undefined;
      if (ev.props.length === 1) {
        return; // skip re-init if only $options.items is changed
      }
    }
    super.gotOptionsChanged(e);
  }

  override gotFormChanges(propsChanged: Array<keyof WUPForm.Options> | null) {
    super.gotFormChanges(propsChanged);
    this.$refInput.readOnly = this.$refInput.readOnly || (this.$isPending as boolean);
  }

  #stopPending?: () => void;
  /** Change pending state */
  protected changePending(v: boolean) {
    if (v === !!this.#stopPending) {
      return;
    }

    if (v) {
      this.$refInput.setAttribute("aria-busy", "true");
      const wasDisabled = this._opts.disabled;
      const refSpin = this.renderSpin();
      this.$refInput.readOnly = true;
      this.#stopPending = () => {
        this.$refInput.readOnly = this.$isReadOnly;
        this.#stopPending = undefined;
        this.$options.disabled = wasDisabled;
        this.$refInput.removeAttribute("aria-busy");
        refSpin.remove();
      };
    } else {
      this.#stopPending!();
    }
  }

  /** All items of current menu */
  _menuItems?: {
    all: Array<HTMLLIElement & { _text: string }>;
    /** Index of items filtered by input */
    filtered?: Array<number>;
    /** Index (in 'filtered' otherwise in 'all' array) of item that has virtual-focus; */
    focused: number;
  };

  /** Items resolved from options */
  _cachedItems?: WUPSelect.MenuItems<ValueType>;

  /** Called when NoItems need to show */
  protected renderMenuNoItems(popup: WUPPopupElement, isReset: boolean) {
    if (isReset) {
      popup.hidden = false;
      const liSaved = (this._menuItems as any)._refNoItems as HTMLLIElement;
      if (liSaved) {
        liSaved.style.display = "none";
      }
    } else if (this.#ctr.$textNoItems) {
      const liSaved = (this._menuItems as any)._refNoItems as HTMLLIElement;
      if (liSaved) {
        liSaved.style.display = "";
      } else {
        const ul = popup.children.item(0) as HTMLUListElement;
        const li = ul.appendChild(document.createElement("li"));
        li.textContent = this.#ctr.$textNoItems;
        li.setAttribute("role", "option");
        li.setAttribute("aria-disabled", "true");
        li.setAttribute("aria-selected", "false");
        (this._menuItems as any)._refNoItems = li;
      }
    } else {
      popup.hidden = true;
    }
  }

  protected override async renderMenu(popup: WUPPopupElement, menuId: string) {
    const ul = popup.appendChild(document.createElement("ul"));
    ul.setAttribute("id", menuId);
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", "Items");

    const all = await this.renderMenuItems(ul);
    this._menuItems = { all, focused: -1 };
    !all.length && this.renderMenuNoItems(popup, false);

    // it happens on every show because by hide it dispose events
    onEvent(ul, "click", (e) => {
      e.stopPropagation(); // to prevent popup-hide-show
      if (e.target instanceof HTMLLIElement) {
        this.gotMenuItemClick(e as MouseEvent & { target: HTMLLIElement });
      }
    });
  }

  /** Method retrieves items from options and shows spinner if required */
  protected async getMenuItems(): Promise<WUPSelect.MenuItems<ValueType>> {
    if (this._cachedItems) {
      return this._cachedItems;
    }

    const { items } = this._opts;

    let arr: WUPSelect.MenuItems<ValueType>;
    if (items instanceof Function) {
      const f = items();
      if (f instanceof Promise) {
        arr = await promiseWait(f, 300, () => this.changePending(true)).finally(() => this.changePending(false));
      } else {
        arr = f;
      }
    } else {
      arr = items;
    }
    this._cachedItems = arr;
    return arr;
  }

  protected override valueToInput(v: ValueType | undefined): Promise<string> | string {
    if (v === undefined) {
      return "";
    }
    const r = this.getMenuItems().then((items) => {
      const i = (items as WUPSelect.MenuItemAny<any>[]).findIndex((o) => this.#ctr.$isEqual(o.value, v));
      if (i === -1) {
        console.error(`${this.tagName}${this._opts.name ? `[${this._opts.name}]` : ""}. Not found in items`, {
          items,
          value: v,
        });
        return `Error: not found for ${v}` != null ? (v as any).toString() : "";
      }
      const item = items[i];
      if (item.text instanceof Function) {
        const li = document.createElement("li");
        const s = item.text(item.value, li, i);
        li.remove();
        return s;
      }
      return item.text;
    });

    return r;
  }

  /** Create menuItems as array of HTMLLiElement with option _text required to filtering by input (otherwise content can be html-structure) */
  protected async renderMenuItems(ul: HTMLUListElement): Promise<Array<HTMLLIElement & { _text: string }>> {
    const arr = await this.getMenuItems();

    const arrLi = arr.map(() => {
      const li = ul.appendChild(document.createElement("li"));
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      const id = this.#ctr.$uniqueId;
      li.id = id;
      return li;
    }) as Array<HTMLLIElement & { _text: string }> & { _focused: number; _selected: number };

    if (arr.length) {
      if (arr[0].text instanceof Function) {
        arr.forEach((v, i) => {
          arrLi[i]._text = (v as WUPSelect.MenuItemFn<ValueType>).text(v.value, arrLi[i], i).toLowerCase();
        });
      } else {
        arr.forEach((v, i) => {
          const txt = (v as WUPSelect.MenuItem<ValueType>).text;
          arrLi[i].textContent = txt;
          arrLi[i]._text = txt.toLowerCase();
        });
      }
    }

    return arrLi;
  }

  /** Called when need to setValue & close base on clicked item */
  protected gotMenuItemClick(e: MouseEvent & { target: HTMLLIElement }) {
    const i = this._menuItems!.all.indexOf(e.target as HTMLLIElement & { _text: string });
    const o = this._cachedItems![i];

    this.setValue(o.value);
    this.goHideMenu(HideCases.onSelect);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  /** Called on show menu-popup */
  protected async goShowMenu(showCase: ShowCases, e?: MouseEvent | FocusEvent | null): Promise<WUPPopupElement | null> {
    if (this.$isPending) {
      return null;
    }
    const isCreate = !this.$refPopup;
    const popup = await super.goShowMenu(showCase, e);

    if (!isCreate && showCase !== ShowCases.onInput && this._menuItems!.filtered) {
      this._menuItems!.all?.forEach((li) => (li.style.display = "")); // reset styles after filtering
      this._menuItems!.filtered = undefined;
    }
    // set aria-selected
    const v = this.$value;
    if (v !== undefined) {
      const i = this._cachedItems!.findIndex((item) => this.#ctr.$isEqual(item.value, v));
      this.selectMenuItem(this._menuItems!.all[i] || null);
    }

    return popup;
  }

  protected override focusMenuItem(next: HTMLElement | null, nextValue: ValueType | undefined) {
    super.focusMenuItem(next, nextValue);
    if (next === null && this._menuItems) {
      this._menuItems.focused = -1;
    }
  }

  /** Focus item by index or reset is index is null (via aria-activedescendant).
   *  If menuItems is filtered by input-text than index must point on filtered array */
  protected focusMenuItemByIndex(index: number | null) {
    if (index != null && index > -1) {
      const { filtered } = this._menuItems!;
      const trueIndex = filtered ? filtered[index] : index;
      const next = this._menuItems!.all[trueIndex];
      this.focusMenuItem(next, this._cachedItems![trueIndex].value);
      this._menuItems!.focused = index;
    } else {
      this.focusMenuItem(null, undefined);
    }
  }

  protected override async gotKeyDown(e: KeyboardEvent) {
    if (this.$isPending) {
      return;
    }
    const wasOpen = this.$isOpen;
    super.gotKeyDown(e);

    if (!this.$isOpen || e.altKey || e.shiftKey || e.ctrlKey) {
      return;
    }

    const { length } = this._menuItems!.filtered || this._menuItems!.all;
    let focusIndex: number | null = null;

    if (e.key === "ArrowDown") {
      let cur = this._menuItems!.focused;
      focusIndex = ++cur >= length ? 0 : cur;
    } else if (e.key === "ArrowUp") {
      let cur = wasOpen ? this._menuItems!.focused : length;
      focusIndex = --cur < 0 ? length - 1 : cur;
    } else if (e.key === "Home") {
      focusIndex = 0;
    } else if (e.key === "End") {
      focusIndex = length - 1;
    }

    if (focusIndex != null) {
      e.preventDefault();
      this.focusMenuItemByIndex(focusIndex);
    }
  }

  protected override async gotInput(e: Event & { currentTarget: HTMLInputElement }) {
    this.$isOpen && this.focusMenuItem(null, undefined); // reset virtual focus
    super.gotInput(e);

    const rawV = e.currentTarget.value;
    const v = rawV.trimStart().toLowerCase();

    const filtered: number[] = [];
    this._menuItems!.all.forEach((li, i) => {
      const isOk = this.#ctr.$filterMenuItem(li._text, v, rawV);
      isOk && filtered.push(i);
      li.style.display = isOk ? "" : "none";
    });
    this._menuItems!.filtered = filtered.length ? filtered : undefined;
    const hasVisible = !!filtered.length;
    this.renderMenuNoItems(this.$refPopup!, hasVisible);

    hasVisible && rawV !== "" && this.focusMenuItemByIndex(0);

    this.$refPopup!.$refresh();
  }

  protected override removePopup() {
    super.removePopup();
    this._menuItems = undefined;
  }
}

customElements.define(tagName, WUPSelectControl);

// testcase (close menu by outside click): to reproduce focus > pressEsc > typeText > try close by outside click
