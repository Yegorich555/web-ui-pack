import nestedProperty from "../helpers/nestedProperty";
import onEvent from "../helpers/onEvent";
import promiseWait from "../helpers/promiseWait";
import WUPPopupElement from "../popup/popupElement";
import WUPSpinElement from "../spinElement";
import { WUPcssIcon, WUPcssScrollSmall } from "../styles";
import WUPBaseComboControl, { ShowCases } from "./baseCombo";

/* c8 ignore next */
/* istanbul ignore next */
!WUPSpinElement && console.error("!"); // It's required otherwise import is ignored by webpack

const tagName = "wup-select";
declare global {
  namespace WUP.Select {
    interface MenuItemText<T> {
      text: string;
      value: T;
    }
    /** Use li.innerHTML to render value & return string required for input; */
    interface MenuItemFn<T> {
      text: (value: T, el: HTMLElement, i: number) => string;
      value: T;
    }

    type MenuItem<T> = MenuItemText<T> | MenuItemFn<T>;
    type MenuItems<T> = MenuItemText<T>[] | MenuItemFn<T>[];
    interface MenuItemElement extends HTMLLIElement {
      _value: any;
      _text: string;
    }

    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap {}
    interface Defaults<T = any, VM = ValidityMap> extends WUP.BaseCombo.Defaults<T, VM> {
      /** Case when menu-popup to show
       * @defaultValue onPressArrowKey | onClick | onFocus | onInput */
      showCase: ShowCases;
    }
    interface Options<T = any, VM = ValidityMap> extends WUP.BaseCombo.Options<T, VM>, Defaults<T, VM> {
      /** Items showed in dropdown-menu. Provide promise/api-call to show pending status when control retrieves data! */
      items: MenuItems<T> | (() => MenuItems<T> | Promise<MenuItems<T>>);
      /** Set true to make input not editable but allow to user select items via popup-menu (ordinary dropdown mode)
       *  @defaultValue false */
      readOnlyInput?: boolean;
      /** Allow user to create new value if value not found in items
       * @defaultValue false */
      allowNewValue?: boolean;
      /** Allow to select multiple values; in this case $value & $initValue must contain Array<ValueType>
       * * @defaultValue false */
      multiple?: boolean;
    }
    interface Attributes extends WUP.BaseCombo.Attributes, Pick<Options, "multiple"> {
      /** Items showed in dropdown-menu. Point global obj-key with items (set `window.items` for `window.items = [{value: 1, text: 'Item 1'}]` ) */
      items?: string;
      /** Allow user to create new value if value not found in items */
      allownewvalue?: boolean | "";
    }
    interface JSXProps<C = WUPSelectControl> extends WUP.BaseCombo.JSXProps<C>, Attributes {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectControl; // add element to document.createElement
  }

  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Select.JSXProps; // add element to tsx/jsx intellisense
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
    <wup-select name="gender" initvalue="3" validations="myValidations" items="myDropdownItems" />
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
 *          // etc/
 *      </ul>
 *   </wup-popup>
 * </label>
 */
export default class WUPSelectControl<
  ValueType = any | any[],
  ItemType = ValueType,
  EventMap extends WUP.Select.EventMap = WUP.Select.EventMap
> extends WUPBaseComboControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPSelectControl;

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.Select.Options>;
    arr.push("items", "allowNewValue", "multiple");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.Select.Attributes>>;
    arr.push("items", "allownewvalue", "multiple");
    return arr;
  }

  static get $styleRoot(): string {
    return `:root {
        --ctrl-select-icon-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='m16.078 258.214 329.139 329.139c21.449 21.449 56.174 21.449 77.567 0l329.139-329.139c21.449-21.449 21.449-56.174 0-77.567s-56.174-21.449-77.567 0L384 471.003 93.644 180.647c-21.449-21.449-56.173-21.449-77.567 0s-21.449 56.173 0 77.567z'/%3E%3C/svg%3E");
      }`;
  }

  // WARN: scroll sets for ul otherwise animation brokes scroll to selectItem because animation affects on scrollSize
  static get $style(): string {
    return `${super.$style}
      :host {
        --ctrl-icon-img: var(--ctrl-select-icon-img);
      }
      :host[opened] label::after {
        transform: rotate(180deg);
      }
      :host [menu] {
        overflow: hidden;
      }
      :host [menu] ul {
        margin: 0;
        padding: 0;
        list-style-type: none;
        cursor: pointer;
        overflow: auto;
        max-height: 300px;
      }
      ${WUPcssScrollSmall(":host [menu]>ul")}
      :host [menu] li {
        padding: 1em;
        border-radius: var(--ctrl-border-radius);
      }
      @media (hover: hover) and (pointer: fine) {
        :host [menu] li:hover {
          box-shadow: inset 0 0 3px 0 var(--ctrl-focus);
        }
      }
      :host [menu] li[aria-selected="true"] {
        color: var(--ctrl-selected);
        display: flex;
      }
      :host [menu] li[aria-selected="true"]:after {
        content: "";
        --ctrl-icon-img: var(--wup-icon-check);
        ${WUPcssIcon}
        background: var(--ctrl-selected);
        margin-left: auto;
        padding: 0;
      }
      :host [menu] li[focused] {
        box-shadow: inset 0 0 4px 0 var(--ctrl-focus);
      }`;
  }

  /** Text for listbox when no items are displayed */
  static $textNoItems: string | undefined = "No Items";
  /** Text for aria-label of <ul> element */
  static $ariaLabelItems = "Items";

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

  static $defaults: WUP.Select.Defaults = {
    ...WUPBaseComboControl.$defaults,
    validationRules: { ...WUPBaseComboControl.$defaults.validationRules },
    showCase: ShowCases.onClick | ShowCases.onFocus | ShowCases.onPressArrowKey | ShowCases.onInput,
  };

  $options: WUP.Select.Options = {
    ...this.#ctr.$defaults,
    items: [],
  };

  protected override _opts = this.$options;

  /** Returns whether control in pending state or not (shows spinner) */
  get $isPending(): boolean {
    return !!this.#stopPending;
  }

  /** Called when need to parse attr [initValue] */
  override parse(attrValue: string): ValueType | undefined {
    if (this._opts.multiple) {
      return nestedProperty.get(window, attrValue);
    }
    this.getItems().then((arr) => {
      let r;
      if (arr?.length) {
        r =
          attrValue === ""
            ? (arr as WUP.Select.MenuItem<any>[]).find((o) => o.value == null)
            : (arr as WUP.Select.MenuItem<any>[]).find((o) => o.value && `${o.value}` === attrValue);
      }

      (this as any)._noDelInitValueAttr = true;
      this.$initValue = r?.value;
      delete (this as any)._noDelInitValueAttr;
    });
    return this.$initValue;
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

  /** It's called with option allowNewValue to find value related to text */
  protected findValueByText(txt: string): ValueType | undefined {
    const s = txt.toLowerCase();
    const i = this._menuItems?.all.findIndex((o) => o._text === s) as number;
    const r = i > -1 ? this._cachedItems![i].value : undefined;
    return r;
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

  protected override gotChanges(propsChanged: Array<keyof WUP.Select.Options> | null): void {
    const isUpdateItems = !propsChanged || propsChanged.includes("items");
    if (isUpdateItems) {
      this.removePopup();
      this._cachedItems = undefined;
      // it's important to be before super otherwise initValue won't work
      this._opts.items = this.getAttr<WUP.Radio.Options["items"]>("items", "ref") || [];
    }
    this._opts.allowNewValue = this.getAttr("allownewvalue", "bool", this._opts.allowNewValue);
    this._opts.multiple = this.getAttr("multiple", "bool", this._opts.multiple);

    super.gotChanges(propsChanged as any);
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.$refInput.readOnly = this.$refInput.readOnly || (this.$isPending as boolean);
  }

  #stopPending?: () => void;
  /** Change pending state */
  protected changePending(v: boolean): void {
    if (v === !!this.#stopPending) {
      return;
    }

    if (v) {
      this.$refInput.setAttribute("aria-busy", true);
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
    all: WUP.Select.MenuItemElement[];
    /** Index of items filtered by input */
    filtered?: Array<number>;
    /** Index (in 'filtered' otherwise in 'all' array) of item that has virtual-focus; */
    focused: number;
  };

  /** Items resolved from options */
  _cachedItems?: WUP.Select.MenuItems<ValueType>;

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

  protected override async renderMenu(popup: WUPPopupElement, menuId: string): Promise<HTMLElement> {
    const ul = popup.appendChild(document.createElement("ul"));
    ul.setAttribute("id", menuId);
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", this.#ctr.$ariaLabelItems);
    ul.setAttribute("tabindex", -1); // otherwise Firefox move focus into it by keydown 'tab'
    this.setAttr.call(ul, "aria-multiselectable", this._opts.multiple === true);

    const all = await this.renderMenuItems(ul);
    this._menuItems = { all, focused: -1 };
    !all.length && this.renderMenuNoItems(popup, false);
    // it happens on every show because by hide it dispose events
    onEvent(
      ul,
      "click",
      (e) => {
        e.preventDefault(); // to prevent popup-hide-show

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
      },
      { passive: false }
    );

    return ul;
  }

  /** Method retrieves items from options and shows spinner if required */
  protected async getItems(): Promise<WUP.Select.MenuItems<ValueType>> {
    if (this._cachedItems) {
      return this._cachedItems;
    }
    const { items } = this._opts;

    let arr: WUP.Select.MenuItems<ValueType>;
    if (typeof items === "function") {
      const f = items();
      if (f instanceof Promise) {
        arr = await promiseWait(f, 300, (v: boolean) => this.changePending(v));
      } else {
        arr = f;
      }
    } else {
      arr = items;
    }
    this._cachedItems = arr;
    return arr;
  }

  // Called when need to show text related to value
  protected valueToText(v: ItemType, items: WUP.Select.MenuItems<ItemType>): string {
    const i = items.findIndex((o) => this.#ctr.$isEqual(o.value, v));
    if (i === -1) {
      if (this._opts.allowNewValue) {
        return v != null ? (v as any).toString() : "";
      }
      console.error(`${this.tagName}${this._opts.name ? `[${this._opts.name}]` : ""}. Not found in items`, {
        items,
        value: v,
      });
      return `Error: not found for ${v != null ? (v as any).toString() : ""}`;
    }
    const item = items[i];
    if (typeof item.text === "function") {
      const li = document.createElement("li");
      const s = item.text(item.value, li, i);
      li.remove();
      return s;
    }
    return item.text;
  }

  protected override valueToInput(v: ValueType | undefined): Promise<string> | string {
    if (v === undefined || (this._opts.multiple && !(v as Array<ValueType>).length)) {
      return "";
    }
    // WARN: possible case when value changed but prev getItems.then still in progress
    const r = this.getItems().then((items) => {
      if (this._opts.multiple) {
        const s = (v as Array<any>)?.map((vi) => this.valueToText(vi, items as WUP.Select.MenuItems<any>)).join(", ");
        return this.$isFocused ? `${s}, ` : s;
      }
      return this.valueToText(v as any, items as WUP.Select.MenuItems<any>);
    });
    return r;
  }

  /** Create menuItems as array of HTMLLiElement with option _text required to filtering by input (otherwise content can be html-structure) */
  protected async renderMenuItems(ul: HTMLUListElement): Promise<WUP.Select.MenuItemElement[]> {
    const arr = await this.getItems();

    const arrLi = arr.map((a) => {
      const li = ul.appendChild(document.createElement("li")) as WUP.Select.MenuItemElement;
      li.setAttribute("role", "option");
      // li.setAttribute("aria-selected", "false");
      li._value = a.value;
      return li;
    }) as Array<WUP.Select.MenuItemElement> & { _focused: number; _selected: number };

    if (arr.length) {
      if (typeof arr[0].text === "function") {
        arr.forEach((v, i) => {
          arrLi[i]._text = (v as WUP.Select.MenuItemFn<ValueType>).text(v.value, arrLi[i], i).toLowerCase();
        });
      } else {
        arr.forEach((v, i) => {
          const txt = (v as WUP.Select.MenuItemText<ValueType>).text;
          arrLi[i].textContent = txt;
          arrLi[i]._text = txt.toLowerCase();
        });
      }
    }

    return arrLi;
  }

  /** Called when need to setValue & close base on clicked item */
  protected gotMenuItemClick(_e: MouseEvent, item: WUP.Select.MenuItemElement): void {
    const i = this._menuItems!.all.indexOf(item);
    const o = this._cachedItems![i];
    const canOff = this._opts.multiple && item.getAttribute("aria-selected") === "true";
    this.selectValue(o.value, !this._opts.multiple);
    canOff && item.setAttribute("aria-selected", "false");
  }

  protected override selectValue(v: ValueType, canHideMenu = true): void {
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
    super.selectValue(v, canHideMenu);

    this._opts.multiple && this.clearFilterMenuItems();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override async goShowMenu(
    showCase: ShowCases,
    e?: MouseEvent | FocusEvent | KeyboardEvent | null
  ): Promise<WUPPopupElement | null> {
    if (this.$isOpen) {
      return this.$refPopup!;
    }
    if (this.$isPending) {
      return null;
    }

    if (this.$refPopup && showCase !== ShowCases.onInput && this._menuItems!.filtered) {
      this.clearFilterMenuItems();
    }

    const popup = await super.goShowMenu(showCase, e);
    if (popup) {
      this.selectMenuItemByValue(this.$value); // set aria-selected
      this._selectedMenuItem?.scrollIntoView({ block: "center" }); // fix: sometimes scrollIntoViewIfNeeded works wrong during the opening menu
    }
    return popup;
  }

  protected override selectMenuItem(next: HTMLElement | null): void {
    if (this._opts.multiple) {
      this._selectedMenuItem = undefined; // othewise multiple selection not allowed in combobox
    }
    super.selectMenuItem(next);
  }

  /** Select menu item if value !== undefined and menu is opened */
  protected selectMenuItemByValue(v: ValueType | undefined): void {
    if (this.$isOpen) {
      const findAndSelect = (vi: ValueType): number => {
        const i = this._cachedItems!.findIndex((item) => this.#ctr.$isEqual(item.value, vi));
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
    if (this._menuItems.focused === -1 && this._selectedMenuItem && !this._selectedMenuItem.style.display) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        focusIndex = this._menuItems.all.indexOf(this._selectedMenuItem as WUP.Select.MenuItemElement);
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
    if (this.$isOpen && !this._focusedMenuItem && e.key === "Enter") {
      this._opts.allowNewValue && this.setValue(this.parseInput(this.$refInput.value));
    }
    super.gotKeyDown(e);
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

  protected override canHandleUndo(): boolean {
    return !!this._opts.multiple;
  }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    this.$isOpen && this.focusMenuItem(null); // reset virtual focus: // WARN it's not good enough when this._opts.multiple
    super.gotInput(e, false);

    const filter = (): void => {
      this.filterMenuItems();
    };

    let isChanged = false;
    // user can append item by ',' at the end or remove immediately
    if (this._opts.multiple && this.canParseInput(this.$refInput.value)) {
      let str = this.$refInput.value;
      const isDeleted = e.inputType.startsWith("deleteContent");
      if (this.$refInput.selectionStart !== str.length && !isDeleted) {
        this.declineInput(str.length); // don't allow to type text in the middle
      } else {
        const isRemove = str.endsWith(",") && isDeleted; // 'Item1, Item2, |' + Backspace => remove 'Item2'
        const iEnd = str.lastIndexOf(isRemove ? ", " : ",");
        str = str.substring(0, iEnd); // allow user filter via typing in the end of input => 'Item1, Item2,|'
        const next = this.parseInput(str) as Array<ValueType> | undefined;
        // case 1: user removes 'Item1,| Item2|' - setValue [Item1]
        // case 2: user adds `Item1,| Item2,| -- setValue [Item1, Item2]
        isChanged = (next || []).length !== ((this.$value as Array<ValueType> | undefined) || []).length;
        isChanged && this.setValue(next as any);
      }
    }
    isChanged ? setTimeout(filter, 1) : filter(); // setValue updates input only after Promise and we need to wait for: NiceToHave deprecate value
  }

  protected override gotFocus(e: FocusEvent): Array<() => void> {
    const r = super.gotFocus(e);
    if (this._opts.multiple) {
      if (!this.$isDisabled && !this.$isReadOnly && !this._opts.readOnlyInput && this.$refInput.value) {
        this.$refInput.value += ", "; // add delimiter at the end
      }
    }
    return r;
  }

  protected override gotFocusLost(): void {
    if (this._opts.multiple) {
      this.$refInput.value = this.$refInput.value.replace(/, *$/, ""); // remove delimiter
    }
    this._opts.allowNewValue && this.setValue(this.parseInput(this.$refInput.value)); // to allow user left value without pressing Enter
    super.gotFocusLost();
  }

  protected override setValue(v: ValueType | undefined, canValidate = true, skipInput = false): boolean | null {
    const r = super.setValue(v, canValidate, skipInput);
    // todo method setValue must contain the following prop 'details': fromInput, $valueChange, from $select etc. & need to call selectMenuItemByValue when setValue not from useSelect
    r && this.selectMenuItemByValue(v);
    return r;
  }

  protected override removePopup(): void {
    super.removePopup();
    this._menuItems = undefined;
  }
}

customElements.define(tagName, WUPSelectControl);

// NiceToHave: option to allow autoselect item without pressing Enter
// WARN Chrome touchscreen simulation issue: touch on label>strong fires click on input - the issue only in simulation

// todo sometimes pending not closed after blur
