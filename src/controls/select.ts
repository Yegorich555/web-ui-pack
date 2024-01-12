import nestedProperty from "../helpers/nestedProperty";
import onEvent from "../helpers/onEvent";
import promiseWait from "../helpers/promiseWait";
import WUPPopupElement from "../popup/popupElement";
import WUPSpinElement from "../spinElement";
import { WUPcssMenu } from "../styles";
import WUPBaseComboControl, { MenuOpenCases } from "./baseCombo";
import WUPBaseControl, { SetValueReasons } from "./baseControl";

const tagName = "wup-select";
declare global {
  namespace WUP.Select {
    interface MenuItem<T> {
      /** Provide ordinary string for rendering as menuItem OR
       *  Use li.innerHTML to render value & return string required for input
       * @example
         el.$options.items = [
          { value: 1, text: "Item N 1"}, // this ordinary behavior
          {
            value: 2,
            text: (value, li, i, control) => {
              li.innerHTML =
              `<button class='delete'><button>Item N ${i+1}` // some custom HTML here
              // li.textContent = `Item N ${i+1}`; // or use this for fastest render
              const btn = li.querySelector('button')!;
              btn.onclick = (e) => {
                e.preventDefault();
                control.$closeMenu();
              }
              return `Item N ${value}`; // this is text rendered in input when related item selected
            },
          },
        ]; */
      text: string | ((value: T, el: HTMLElement, i: number, control: WUPBaseControl) => string);
      /** Value tied with menu item */
      value: T;
      /** Use `(e)=>e.preventDefault()` to prevent selection & closing menu and do custom action */
      onClick?: (e: MouseEvent, me: MenuItem<T>) => void;
    }

    interface MenuItemElement extends HTMLLIElement {
      _value: any;
      _text: string;
    }

    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap {
      /** Count of minimal values that must be selected (only for option `multi`) */
      minCount: number;
      /** Count of minimal values that must be selected (only for option `multi`) */
      maxCount: number;
    }
    interface NewOptions<T = any> {
      /** Items showed in dropdown-menu. Provide promise/api-call to show pending status when control retrieves data! */
      items: MenuItem<T>[] | Promise<MenuItem<T>[]> | (() => MenuItem<T>[] | Promise<MenuItem<T>[]>);
      /** Allow user to create new value if value not found in items
       * @defaultValue false */
      allowNewValue: boolean;
      /** Allow to select multiple values; in this case $value & $initValue must contain Array<ValueType>
       * * @defaultValue false */
      multiple: boolean;
    }
    interface Options<T = any, VM = ValidityMap> extends WUP.BaseCombo.Options<T, VM>, NewOptions<T> {
      /** Case when menu-popup to show
       * @defaultValue onPressArrowKey | onClick | onFocus | onInput */
      openCase: MenuOpenCases;
      /** Set `true` to make input not editable but allow select items via popup-menu (ordinary dropdown mode)
       * @tutorial
       * * set number X to enable autoMode where `input.readOnly = items.length < X` */
      readOnlyInput: boolean | number;
    }
    interface JSXProps<C = WUPSelectControl> extends WUP.BaseCombo.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      /** Items showed in dropdown-menu. Provide promise/api-call to show pending status when control retrieves data!
       * Global reference to object with array
       * @see  {@link MenuItems}
       * @example
       * ```js
       * window.myItems = [...];
       * <wup-select w-items="window.myItems"></wup-select>
       * ``` */
      "w-items"?: string;
      "w-allowNewValue"?: boolean | "";
      "w-multiple"?: boolean | "";
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with dropdown/combobox behavior
       *  @see {@link WUPSelectControl} */
      [tagName]: WUP.Base.ReactHTML<WUPSelectControl> & WUP.Select.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with dropdown/combobox behavior
       *  @see {@link WUPSelectControl} */
      [tagName]: HTMLAttributes<WUPSelectControl> & WUP.Select.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}
/** Form-control with dropdown/combobox behavior
 * @example
  const el = document.createElement("wup-select");
  el.$options.name = "gender";
  el.$options.items = [
    { value: 1, text: "Male" },
    { value: 2, text: "Female" },
    { value: 3, text: "Other/Skip" },
  ];
  el.$initValue = 3;
  el.$options.validations = { required: true };
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-select w-name="gender" w-initvalue="3" w-validations="myValidations" w-items="myDropdownItems" />
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input/>
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 *   <wup-popup menu>
 *      <ul>
 *          <li>Item 1</li>
 *          <li>Item 2</li>
 *          // etc. /
 *      </ul>
 *   </wup-popup>
 * </label>
 */
export default class WUPSelectControl<
  ValueType = any | any[],
  ItemType = ValueType,
  TOptions extends WUP.Select.Options = WUP.Select.Options,
  EventMap extends WUP.Select.EventMap = WUP.Select.EventMap
> extends WUPBaseComboControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPSelectControl;

  // static get $styleRoot(): string {
  //   return "";
  // }

  // WARN: scroll sets for ul otherwise animation broken scroll to selectItem because animation affects on scrollSize
  static get $style(): string {
    return `${super.$style}
      :host {
        --ctrl-icon-img: var(--wup-icon-chevron);
      }
      :host label:after {
        height: 100%;
        align-self: center;
      }
      :host[opened] label:after {
        transform: rotate(180deg);
      }
      ${WUPcssMenu(":host [menu]")}`;
  }

  /** Text for listbox when no items are displayed */
  static $textNoItems: string | undefined = __wupln("No Items", "content");
  /** Text for aria-label of <ul> element */
  static $ariaLabelItems = __wupln("Items", "aria");

  static $isEqual(v1: unknown, v2: unknown, c: WUPSelectControl): boolean {
    let isEq = super.$isEqual(v1, v2, c);
    if (!isEq && c._opts.multiple && Array.isArray(v1) && Array.isArray(v2)) {
      const isSortMatter = (c._opts as Record<string, any>).sortable; // option sortable is defined in selectMany but placed here to simplify logic
      isEq =
        v1.length === v2.length && (isSortMatter ? v1.every((v, i) => v2[i] === v) : v1.every((v) => v2.includes(v)));
    }
    return isEq;
  }

  /** Function to filter menuItems based on inputValue
   * @param menuItemText textcontent in lowercase
   * @param menuItemValue value related to items[x].value
   * @param inputValue normalized input value (trimStart + lowercase)
   * @param inputRawValue input value without normalization
   * @returns true if menuItem must be visible in menu
   */
  static $filterMenuItem(
    this: WUPSelectControl,
    menuItemText: string,
    menuItemValue: any,
    inputValue: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    inputRawValue: string
  ): boolean {
    return !inputValue || menuItemText.startsWith(inputValue) || menuItemText.includes(` ${inputValue}`);
  }

  static $defaults: WUP.Select.Options = {
    ...WUPBaseComboControl.$defaults,
    validationRules: {
      ...WUPBaseComboControl.$defaults.validationRules,
      minCount: (v, setV) => (v == null || v.length < setV) && __wupln(`Min count is ${setV}`, "validation"),
      maxCount: (v, setV) => (v == null || v.length > setV) && __wupln(`Max count is ${setV}`, "validation"),
    },
    openCase: MenuOpenCases.onClick | MenuOpenCases.onFocus | MenuOpenCases.onPressArrowKey | MenuOpenCases.onInput,
    allowNewValue: false,
    multiple: false,
    items: [],
  };

  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.Select.Options;
    d.items = [];
    return d as unknown as T;
  }

  /** Returns whether control in pending state or not (shows spinner) */
  get $isPending(): boolean {
    return !!this.#stopPending;
  }

  /** Called when need to parse attr [initValue] */
  override parse(attrValue: string): ValueType | undefined {
    if (this._opts.multiple) {
      return nestedProperty.get(window, attrValue);
    }
    // WARN: parse must be called only after items is fetched
    const arr = this.getItems();
    if (arr?.length) {
      const r =
        attrValue === ""
          ? (arr as WUP.Select.MenuItem<any>[]).find((o) => o.value == null)
          : (arr as WUP.Select.MenuItem<any>[]).find((o) => o.value && `${o.value}` === attrValue);
      return r?.value;
    }
    return undefined;
  }

  override parseInput(text: string): ValueType | undefined {
    let v: Array<any> | ValueType | undefined;
    if (!this._opts.multiple) {
      const s = text.trim();
      v = s ? this.findValueByText(s) ?? (s as any) : undefined;
    } else {
      // WARN it works only with allowNewValue
      v = text.split(",").map((si) => si.trim()) as Array<string>;
      v = v
        .filter((si, i) => (v as Array<ValueType>).indexOf(si) === i) // allow only unique values
        .map((si) => {
          if (!si) {
            return undefined;
          }
          const vi = this.findValueByText(si);
          return vi ?? (this._opts.allowNewValue ? si : vi);
        })
        .filter((vi) => vi !== undefined);
      if (!v.length) {
        return undefined;
      }
    }
    return v as ValueType;
  }

  valueFromStorage(str: string): ValueType | undefined {
    if (this.$options.multiple) {
      this._opts.multiple = false;
      const v = str.split("_").map((si) => super.valueFromStorage(si)) as any;
      this._opts.multiple = true; // otherwise parse is wrong
      return v;
    }
    return super.valueFromStorage(str) as any;
  }

  valueToStorage(v: ValueType): string | null {
    // todo need to store text as is instead of real value
    if (this.$options.multiple) {
      return (v as Array<any>).map((vi) => super.valueToStorage(vi)).join("_");
    }
    return super.valueToStorage(v);
  }

  /** It's called with option allowNewValue to find value related to text */
  protected findValueByText(txt: string): ValueType | undefined {
    const s = txt.toLowerCase();
    const i = this._menuItems?.all.findIndex((o) => o._text === s) as number;
    const r = i > -1 ? this._cachedItems![i].value : undefined;
    return r;
  }

  /** Called on every spin-render */
  renderSpin(): WUPSpinElement {
    WUPSpinElement.$use();
    const spin = document.createElement("wup-spin");
    spin.$options.fit = true;
    spin.$options.overflowFade = true;
    spin.$options.overflowTarget = this;
    this.appendChild(spin);
    return spin;
  }

  /** Required to wait for fetching items to setup initValue */
  _onPendingInitValue?: () => void;
  /** Called to get/fetch items based on $options.items */
  fetchItems(): Promise<WUP.Select.MenuItem<ValueType>[]> | WUP.Select.MenuItem<ValueType>[] {
    this._cachedItems = undefined;
    this.#findValT && clearTimeout(this.#findValT); // prevent setInputValue if fetchItems is started
    this.#findValT = undefined;
    const { items } = this._opts;

    let d: any = items;
    if (typeof d === "function") {
      d = d();
    }
    const act = (): void => {
      this._onPendingInitValue?.call(this);
      delete this._onPendingInitValue;
      this.setInputValue(this.$value, SetValueReasons.initValue);
      this.setupInputReadonly(); // call it because opt readonlyInput can depend on items.length
    };
    if (d instanceof Promise) {
      return promiseWait(d, 300, (v) => this.changePending(v))
        .then((data) => {
          this._cachedItems = data || [];
          return data;
        })
        .finally(() => {
          this._cachedItems ??= [];
          act();
          this.$isFocused && this.goOpenMenu(MenuOpenCases.onFocus, null);
        });
    }
    this._cachedItems = d;
    act();
    return d;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Select.Options> | null): void {
    this._opts.items ??= [];
    if (!propsChanged || propsChanged.includes("items")) {
      this.removePopup();
      this.fetchItems(); // WARN: it's important to be before super otherwise initValue won't work
    }

    super.gotChanges(propsChanged as any);
  }

  override setupInputReadonly(): void {
    const r = this._opts.readOnlyInput;
    this.$refInput.readOnly =
      this.$isReadOnly ||
      this.$isPending ||
      r === true ||
      (typeof r === "number" && r > (this._cachedItems?.length || 0) && !this._opts.allowNewValue); // WARN: _cached items can be undefined when fetching not started yet
  }

  override setupInitValue(propsChanged: Array<keyof WUP.Select.Options> | null): void {
    if (this._cachedItems) {
      super.setupInitValue(propsChanged);
    } else {
      // case1: attr [initValue] > parse > setValue
      // case2: $value > setValue
      this._onPendingInitValue = () => super.setupInitValue(propsChanged);
    }
  }

  #stopPending?: () => void;
  /** Change pending state */
  protected changePending(v: boolean): void {
    if (v === !!this.#stopPending) {
      return;
    }

    if (v) {
      this.$refInput.setAttribute("aria-busy", true);
      const refSpin = this.renderSpin();
      this.$refInput.readOnly = true;
      this.#stopPending = () => {
        this.$refInput.readOnly = this.$isReadOnly;
        this.#stopPending = undefined;
        this.$refInput.removeAttribute("aria-busy");
        refSpin.remove();
      };
    } else {
      this.#stopPending!();
    }
  }

  /** All items of current menu */
  _menuItems?: {
    all: WUP.Select.MenuItemElement[];
    /** Index of items filtered by input */
    filtered?: Array<number>;
    /** Index (in 'filtered' otherwise in 'all' array) of item that has virtual-focus; */
    focused: number;
  };

  /** Items resolved from options */
  _cachedItems?: WUP.Select.MenuItem<ValueType>[];

  /** Called when NoItems need to show */
  protected renderMenuNoItems(popup: WUPPopupElement, isReset: boolean): void {
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
        li.setAttribute("aria-disabled", true);
        li.setAttribute("aria-selected", false);
        (this._menuItems as any)._refNoItems = li;
      }
    } else {
      popup.hidden = true;
    }
  }

  protected override renderMenu(popup: WUPPopupElement, menuId: string): HTMLElement {
    const ul = popup.appendChild(document.createElement("ul"));
    ul.setAttribute("id", menuId);
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", this.#ctr.$ariaLabelItems);
    ul.setAttribute("tabindex", -1); // otherwise Firefox move focus into it by keydown 'tab'
    this.setAttr.call(ul, "aria-multiselectable", this._opts.multiple === true);

    const all = this.renderMenuItems(ul);
    this._menuItems = { all, focused: -1 };
    !all.length && this.renderMenuNoItems(popup, false);
    // it happens on every show because by hide it dispose events
    onEvent(ul, "click", (e) => this.gotMenuClick(e), { passive: false });
    return ul;
  }

  /** Method returns items defined based on $options.items */
  protected getItems(): WUP.Select.MenuItem<ValueType>[] {
    if (!this._cachedItems) {
      this.throwError("Internal bug. No cached items", { options: this._opts, value: this.$value });
      return [];
    }
    return this._cachedItems;
  }

  /* Called when need to show text related to value */
  protected valueToText(v: ItemType, items: WUP.Select.MenuItem<ItemType>[]): string {
    const i = items.findIndex((o) => this.#ctr.$isEqual(o.value, v, this));
    if (i === -1) {
      if (this._opts.allowNewValue) {
        return v != null ? (v as any).toString() : "";
      }
      this.throwError("Not found in items", { items, value: v }, true);
      return `Error: not found for ${v != null ? (v as any).toString() : ""}`;
    }
    const item = items[i];
    if (typeof item.text === "function") {
      const li = document.createElement("li");
      const s = item.text(item.value, li, i, this);
      li.remove();
      return s;
    }
    return item.text;
  }

  #findValT?: ReturnType<typeof setTimeout>; // need to clear previous to avoid collission
  protected override setInputValue(v: ValueType | undefined, reason: SetValueReasons): void {
    this.#findValT && clearTimeout(this.#findValT);
    this.#findValT = undefined;
    if (this.$isPending) {
      return; // decline because setInputValue will be fired after pending
    }
    if (reason === SetValueReasons.manual || reason === SetValueReasons.initValue) {
      this.#findValT = setTimeout(() => super.setInputValue(v, reason), 2); // timeout to fix case when el.$options.items=... el.$value=...
    } else {
      super.setInputValue(v, reason);
    }
  }

  protected override valueToInput(v: ValueType | undefined): string {
    if (v === undefined || (this._opts.multiple && !(v as Array<ValueType>).length)) {
      return "";
    }
    // WARN: possible case when value changed but prev getItems.then still in progress
    const items = this.getItems();
    if (this._opts.multiple) {
      const s = (v as Array<any>)?.map((vi) => this.valueToText(vi, items as WUP.Select.MenuItem<any>[])).join(", ");
      return this.$isFocused ? `${s}, ` : s;
    }
    return this.valueToText(v as any, items as WUP.Select.MenuItem<any>[]);
  }

  /** Create menuItems as array of HTMLLiElement with option _text required to filtering by input (otherwise content can be html-structure) */
  protected renderMenuItems(ul: HTMLUListElement): WUP.Select.MenuItemElement[] {
    const arr = this.getItems();
    return arr.map((a, i) => {
      const li = ul.appendChild(document.createElement("li")) as WUP.Select.MenuItemElement;
      li.setAttribute("role", "option");
      // li.setAttribute("aria-selected", "false");
      li._value = a.value;
      let s = a.text;
      if (typeof s === "function") {
        s = s(a.value, li, i, this);
      } else {
        li.textContent = s;
      }
      li._text = s.toLowerCase();
      return li;
    }); // as Array<WUP.Select.MenuItemElement> & { _focused: number; _selected: number };
  }

  protected gotMenuClick(e: MouseEvent): void {
    if (e.defaultPrevented) {
      return;
    }
    const ul = e.currentTarget;
    let t = e.target as Node | HTMLElement;
    if (t === ul) {
      return;
    }
    while (1) {
      const parent = t.parentElement as HTMLElement;
      if (parent === ul) {
        const isDisabled = (t as HTMLElement).hasAttribute("aria-disabled");
        !isDisabled && this.gotMenuItemClick(e, t as WUP.Select.MenuItemElement);
        break;
      }
      t = parent;
    }

    e.preventDefault(); // to prevent popup-hide-show - because it handles by selectMenuItem
  }

  /** Called when need to setValue & close base on clicked item */
  protected gotMenuItemClick(e: MouseEvent, li: WUP.Select.MenuItemElement): void {
    const i = this._menuItems!.all.indexOf(li);
    const o = this._cachedItems![i];
    o.onClick?.call(e.target, e, o);
    if (e.defaultPrevented) {
      return;
    }
    const canOff = this._opts.multiple && li.getAttribute("aria-selected") === "true";
    this.selectMenuItem(canOff ? null : li); // select/deselect
    canOff && li.setAttribute("aria-selected", "false");

    this.selectValue(o.value, !this._opts.multiple);
  }

  protected override selectValue(v: ValueType, canCloseMenu = true): void {
    if (this._opts.multiple) {
      let arr = this.$value as Array<ValueType>;
      if (!arr?.length) {
        v = [v] as any;
      } else {
        const i = arr.indexOf(v);
        if (i !== -1) {
          if (arr.length === 1) {
            arr = undefined as any;
            // this.selectMenuItem(null);
          } else {
            arr = [...arr];
            arr.splice(i, 1);
          }
        } else {
          arr = [...arr, v];
        }
        v = arr as any;
      }
    }
    super.selectValue(v, canCloseMenu);

    this._opts.multiple && this.clearFilterMenuItems();
  }

  override canOpenMenu(openCase: MenuOpenCases, e?: MouseEvent | FocusEvent | KeyboardEvent | null): boolean {
    if (this.$isPending) {
      return false;
    }
    return super.canOpenMenu(openCase, e);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override async goOpenMenu(
    openCase: MenuOpenCases,
    e?: MouseEvent | FocusEvent | KeyboardEvent | null
  ): Promise<WUPPopupElement | null> {
    if (this.$isOpened) {
      return this.$refPopup!;
    }

    if (this.$refPopup && openCase !== MenuOpenCases.onInput && this._menuItems!.filtered) {
      this.clearFilterMenuItems();
    }

    const popup = await super.goOpenMenu(openCase, e);
    popup && !this.canClearSelection && this.selectMenuItemByValue(this.$value); // set aria-selected only if input not empty
    return popup;
  }

  /** Returns first selected visible item */
  protected getFirstSelected(): WUP.Select.MenuItemElement | undefined {
    if (this._selectedMenuItem) {
      const items = this._selectedMenuItem.parentElement!.querySelectorAll("[aria-selected=true]");
      for (let i = 0, item = items[0] as HTMLElement; i < items.length; item = items[++i] as HTMLElement) {
        if (!item.style.display) {
          return item as WUP.Select.MenuItemElement;
        }
      }
    }
    return undefined;
  }

  protected override selectMenuItem(next: HTMLElement | null): void {
    if (this._opts.multiple) {
      this._selectedMenuItem = undefined; // otherwise multiple selection not allowed in combobox
    }
    super.selectMenuItem(next);
  }

  /** Select menu item if value !== undefined and menu is opened */
  protected selectMenuItemByValue(v: ValueType | undefined): void {
    if (this.$isOpened) {
      const findAndSelect = (vi: ValueType): number => {
        const i = this._cachedItems!.findIndex((item) => this.#ctr.$isEqual(item.value, vi, this));
        this.selectMenuItem(this._menuItems!.all[i] || null);
        return i;
      };
      v === undefined && this._selectedMenuItem && this.selectMenuItem(null);

      if (!this._opts.multiple) {
        v !== undefined && findAndSelect(v);
      } else {
        const set = new Set<number>();
        v !== undefined && (v as Array<any>).forEach((vi) => set.add(findAndSelect(vi)));
        // deselect others
        this._menuItems!.all.forEach(
          (el, i) => !set.has(i) && el.hasAttribute("aria-selected") && el.removeAttribute("aria-selected")
        );
      }
    }
  }

  protected override focusMenuItem(next: HTMLElement | null): void {
    next && !next.hasAttribute("aria-selected") && next.setAttribute("aria-selected", false);
    super.focusMenuItem(next);
    if (next === null && this._menuItems) {
      this._menuItems.focused = -1;
    }
  }

  /** Focus item by index or reset is index is null (via aria-activedescendant).
   *  If menuItems is filtered by input-text than index must point on filtered array */
  protected focusMenuItemByIndex(index: number): void {
    const { filtered } = this._menuItems!;
    const trueIndex = filtered ? filtered[index] : index;
    const next = this._menuItems!.all[trueIndex];
    this.focusMenuItem(next);
    this._menuItems!.focused = index;
  }

  protected override focusMenuItemByKeydown(e: KeyboardEvent): void {
    if (!this._menuItems) {
      return; // possible when user goes to another but menuItems still is loading
      // throw new Error(`${this.tagName}. Impossible on empty menu`);
    }
    const { length } = this._menuItems.filtered || this._menuItems.all;
    let focusIndex: number | null = null;

    // firstFocused can be selected/current
    if (this._menuItems.focused === -1) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const item = this.getFirstSelected();
        if (item) {
          focusIndex = this._menuItems.all.indexOf(item as WUP.Select.MenuItemElement);
        }
      }
    }

    if (focusIndex === null) {
      switch (e.key) {
        case "ArrowDown":
          {
            let cur = this._menuItems.focused;
            focusIndex = ++cur >= length ? 0 : cur;
          }
          break;
        case "ArrowUp":
          {
            let cur = this._menuItems.focused; // : length;
            focusIndex = --cur < 0 ? length - 1 : cur;
          }
          break;
        case "Home":
          focusIndex = 0;
          break;
        case "End":
          focusIndex = length - 1;
          break;
        default:
          break;
      }
    }

    if (focusIndex != null) {
      e.preventDefault();
      this.focusMenuItemByIndex(focusIndex);
    }
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    // if (this.$isPending) {return;} // pending event disables gotKeyDown so case impossible
    if (this._opts.allowNewValue && e.key === "Enter" && !this._focusedMenuItem) {
      this.setValue(this.parseInput(this.$refInput.value), SetValueReasons.userInput);
      this._opts.multiple && e.preventDefault(); // prevent closing by keydown
    }
    !e.defaultPrevented && super.gotKeyDown(e);
  }

  /** Called to filter menuItems (on input change etc.) */
  protected filterMenuItems(): void {
    const rawV = this.$refInput.value;
    let v = rawV;
    if (this._opts.multiple) {
      v = rawV.substring(rawV.lastIndexOf(",") + 1, rawV.length);
    }
    v = v.trim().toLowerCase();

    const filtered: number[] = [];
    this._menuItems!.all.forEach((li, i) => {
      const isOk = this.#ctr.$filterMenuItem.call(this, li._text, li._value, v, rawV);
      isOk && filtered!.push(i);
      this.filterMenuItem(li, !isOk);
    });
    const hasFiltered = filtered.length !== this._menuItems!.all.length;
    this._menuItems!.filtered = hasFiltered ? filtered : undefined;
    const hasVisible = filtered.length !== 0;
    this.renderMenuNoItems(this.$refPopup!, hasVisible);
    hasVisible && rawV !== "" && !this._opts.allowNewValue && this.focusMenuItemByIndex(0);
  }

  /** Called on showMenu when user opened it without input-change */
  protected clearFilterMenuItems(): void {
    this._menuItems!.all.forEach((li) => this.filterMenuItem(li, false)); // reset styles after filtering
    delete this._menuItems!.filtered;
    const hasVisible = this._menuItems!.all.length !== 0;
    this.renderMenuNoItems(this.$refPopup!, hasVisible); // remove NoItems
  }

  /** Called to hide/show menuItem */
  protected filterMenuItem(el: HTMLElement, hide: boolean): void {
    el.style.display = hide ? "none" : "";
  }

  /** Returns if possible to de-select menu items when input is empty */
  private get canClearSelection(): boolean {
    return !this.$refInput.value && /*! this.$isRequired && */ !this._opts.multiple;
  }

  protected gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    super.gotBeforeInput(e);

    // handle delete-behavior
    if (this._opts.multiple /* && this.$refInput.value.endsWith(", ") */) {
      let isDelBack = false;
      /* prettier-ignore */
      switch (e.inputType) {
        case "deleteContentBackward": isDelBack = true; break;
        case "deleteContentForward": isDelBack = false; break;
        default: return;
      }
      const pos = this.$refInput.selectionStart || 0;
      let pos2 = this.$refInput.selectionEnd || 0;
      const str = this.$refInput.value;
      const isItemPart = pos < str.lastIndexOf(", ") + (isDelBack ? 3 : 2);
      if (!isItemPart) {
        return;
      }
      const delimitLength = 2; // length of ", "
      const char = ",".charCodeAt(0);
      if (isDelBack && !pos) {
        return;
      }
      const start = isDelBack ? pos - 1 : pos;
      let i = start;
      for (; i !== 0; --i) {
        if (str.charCodeAt(i) === char) {
          if (!isDelBack || start - i >= delimitLength) {
            i += delimitLength;
            // case 1: // "Item 1, Item 2, |" => "Item 1, |Item 2, "
            // case 2: // "Item 1,| Item 2, " => "|Item 1, Item 2, "
            break;
          }
        }
      }
      if (pos === pos2) {
        pos2 = i;
      }

      let end = str.indexOf(",", pos2);
      end = end === -1 ? str.length : end + delimitLength;
      this.$refInput.setSelectionRange(i, end); // select whole items(-s) so input event delete everything itself
      // e.preventDefault(); // uncomment to check behavior manually
    }
  }

  /** Called on input change to update menu if possible */
  protected tryUpdateMenu(): void {
    this.$isOpened && this.filterMenuItems();
    this.canClearSelection && this.selectMenuItem(null); // allow user clear value without pressing Enter
  }

  override clearValue(): void {
    super.clearValue();
    this.tryUpdateMenu();
  }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    this.$isOpened && this.focusMenuItem(null); // reset virtual focus: // WARN it's not good enough when this._opts.multiple
    super.gotInput(e, true); // prevent ordinary value change

    // user can append item by ',' at the end or remove immediately
    if (this._opts.multiple && this.canParseInput(this.$refInput.value)) {
      const str = this.$refInput.value;
      const isDeleted = e.inputType.startsWith("deleteContent");
      const pos = this.$refInput.selectionStart || 0;
      if (pos !== str.length && !isDeleted) {
        this.declineInput(str.length); // don't allow to type text in the middle
      } else {
        const iEnd = str.lastIndexOf(",");
        const strVal = str.substring(0, iEnd); // allow user filter via typing in the end of input => 'Item1, Item2,|'
        const next = this.parseInput(strVal) as Array<ValueType> | undefined;
        // case 1: user removes 'Item1,| Item2|' - setValue [Item1]
        // case 2: user adds `Item1,| Item2,| -- setValue [Item1, Item2]
        const nextLn = (next || []).length;
        const prevLn = ((this.$value as Array<ValueType> | undefined) || []).length;
        const isChanged = nextLn !== prevLn;
        if (isChanged) {
          this.setValue(next as any, SetValueReasons.userInput, true);
          this.setInputValueDirect(
            this.valueToInput(next as any) + str.substring(iEnd + 1).trimStart(),
            SetValueReasons.userInput
          ); // add search-part after value change
          nextLn < prevLn && this.$refInput.setSelectionRange(pos, pos); // restore caret only if items removed
        }
      }
    }
    this.tryUpdateMenu();
  }

  protected override gotFocus(e: FocusEvent): Array<() => void> {
    const r = super.gotFocus(e);
    if (this._opts.multiple) {
      if (!this.$isDisabled && !this.$isReadOnly && !this._opts.readOnlyInput && this.$refInput.value) {
        this.setInputValueDirect(`${this.$refInput.value}, `, SetValueReasons.userInput); // add delimiter at the end
      }
    }
    return r;
  }

  protected override gotFocusLost(): void {
    this._opts.multiple &&
      this.setInputValueDirect(this.$refInput.value.replace(/, *$/, ""), SetValueReasons.userInput); // remove delimiter
    if (this._opts.allowNewValue) {
      this.setValue(this.parseInput(this.$refInput.value), SetValueReasons.userInput); // to allow user left value without pressing Enter
    } else {
      this.resetInputValue(); // to update/rollback input according to result
    }
    super.gotFocusLost();
  }

  protected override setValue(v: ValueType | undefined, reason: SetValueReasons, skipInput = false): boolean | null {
    const r = super.setValue(v, reason, skipInput);
    r && reason !== SetValueReasons.userSelect && this.selectMenuItemByValue(v);
    return r;
  }

  protected override removePopup(): void {
    super.removePopup();
    this._menuItems = undefined;
  }
}

customElements.define(tagName, WUPSelectControl);

// WARN Chrome touchscreen simulation issue: touch on label>strong fires click on input - the issue only in simulation
// WARN label for="" in Chrome sometimes enables autosuggestion - need to remove it for all controls - need to double-check

// NiceToHave: add support custom items rendering when it's already appended to DOM like it works with dropdown
// NiceToHave: option to allow autoselect item without pressing Enter: option: $autoComplete + aria-autocomplete: true => https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-both/
// NiceToHave: color differently text-chunk that matches in menu
// NiceToHave: for allowNewValue add at the end of menu `[text] (New option)` like it works in JIRA. `label` dropdown on ticket

// todo issue: focus ctrl > menu opened > click outside on the body > menu closed but not destroyed even if focus next ctrl later
