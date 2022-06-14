/* eslint-disable no-use-before-define */
import { WUP } from "../baseElement";
import onEvent from "../helpers/onEvent";
import onFocusLostEv from "../helpers/onFocusLost";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases as PopupShowCases, WUPPopup } from "../popup/popupElement";
import popupListenTarget from "../popup/popupListenTarget";
import WUPSpinElement from "../spinElement";
import WUPTextControl, { WUPTextIn } from "./text";

const sideEffect = WUPSpinElement;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack

export namespace WUPSelectIn {
  export interface Defs {
    /** Wait for pointed time before show-error (sumarized with $options.debounce); WARN: hide-error without debounce
     *  @defaultValue 0 */
    validityDebounceMs?: number;
  }

  export interface Opt<T> {
    /** Items showed in dropdown-menu. Provide promise/api-call to show pending status when control retrieves data! */
    items: WUPSelect.MenuItems<T> | (() => WUPSelect.MenuItems<T> | Promise<WUPSelect.MenuItems<T>>);
    /** Set true to make input not editable but allow to user select items via popup-menu (ordinary dropdown mode) */
    readOnlyInput?: boolean;
  }

  export type Generics<
    ValueType = any,
    ValidationKeys extends WUPBase.ValidationMap = WUPSelect.ValidationMap,
    Defaults = Defs,
    Options = Opt<ValueType>
  > = WUPTextIn.Generics<ValueType, ValidationKeys, Defaults & Defs, Options & Opt<ValueType>>;

  export type Validation<T = any> = Generics<T>["Validation"];
  export type GenDef<T = any> = Generics<T>["Defaults"];
  export type GenOpt<T = any> = Generics<T>["Options"];
}

export const enum ShowCases {
  onManualCall,
  onInput,
  onPressArrowKey,
  onClick,
  onFocus,
}

export const enum HideCases {
  onClick,
  onManualCall,
  onSelect,
  onFocusLost,
  OnPressEsc,
  OnPressEnter,
  OnOptionsChange,
}

declare global {
  namespace WUPSelect {
    interface MenuItem<T> {
      text: string;
      value: T;
    }
    /** Use li.innerHTML to render value & return string required for input; */
    interface MenuItemFn<T> {
      text: (value: T, li: HTMLLIElement, i: number) => string;
      value: T;
    }
    export type MenuItemAny<T> = MenuItem<T> | MenuItemFn<T>;
    export type MenuItems<T> = MenuItem<T>[] | MenuItemFn<T>[];

    interface ValidationMap extends Omit<WUPText.ValidationMap, "min" | "max" | "email"> {}
    interface EventMap extends WUPText.EventMap {
      $show: Event;
      $hide: Event;
    }
    interface Defaults<T = string> extends WUPSelectIn.GenDef<T> {}
    interface Options<T = string> extends WUPSelectIn.GenOpt<T> {}
    interface JSXProps<T extends WUPSelectControl> extends WUPText.JSXProps<T> {
      /** @readonly Use [opened] for styling */
      readonly opened?: boolean;
    }
  }
}

export default class WUPSelectControl<
  ValueType = any,
  EventMap extends WUPSelect.EventMap = WUPSelect.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPSelectControl;

  static observedOptions = (super.observedOptions as Set<keyof WUPSelect.Options>).add("items") as any;

  static get $styleRoot(): string {
    return `:root {
              --ctrl-combo-icon: var(--cltr-icon);
              --ctrl-combo-icon-size: var(--ctrl-icon-size);
              --ctrl-combo-icon-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='m16.078 258.214 329.139 329.139c21.449 21.449 56.174 21.449 77.567 0l329.139-329.139c21.449-21.449 21.449-56.174 0-77.567s-56.174-21.449-77.567 0L384 471.003 93.644 180.647c-21.449-21.449-56.173-21.449-77.567 0s-21.449 56.173 0 77.567z'/%3E%3C/svg%3E");
              --ctrl-combo-selected: inherit;
              --ctrl-combo-selected-back: #d9f7fd;
            }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        cursor: pointer;
      }
      :host input:not(:placeholder-shown) {
        cursor: text;
      }
      :host label::after {
        content: "";
        width: var(--ctrl-combo-icon-size);
        min-height: var(--ctrl-combo-icon-size);

        background-color: var(--ctrl-combo-icon);
        -webkit-mask-image: var(--ctrl-combo-icon-img);
        mask-image: var(--ctrl-combo-icon-img);
        -webkit-mask-size: var(--ctrl-combo-icon-size);
        mask-size: var(--ctrl-combo-icon-size);
      }
      :host[opened] label::after {
        transform: rotate(180deg);
      }
      @media not all and (prefers-reduced-motion) {
        :host label::after {
          transition: transform var(--anim);
        }
      }
      :host button[clear] {
        margin: 0;
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
        color: var(--ctrl-combo-selected);
        background: var(--ctrl-combo-selected-back);
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
  static $filterMenuItem(text: string, inputValue: string, inputRawValue: string): boolean {
    return text.startsWith(inputValue) || text.includes(` ${inputValue}`);
  }

  /** Parse/get items from $options.items */
  static async $getMenuItems<T, C extends WUPSelectControl<T>>(ctrl: C): Promise<WUPSelect.MenuItems<T>> {
    if (ctrl._cachedItems) {
      return ctrl._cachedItems;
    }

    const { items } = ctrl.$options;

    let arr: WUPSelect.MenuItems<T>;
    if (items instanceof Function) {
      const f = items();
      if (f instanceof Promise) {
        /* todo show isPending here;
         what if user tries to input text - we need to prevent this while it's not ready
         */
        ctrl.$refInput.setAttribute("aria-busy", "true");
        arr = await f;
        ctrl.$refInput.removeAttribute("aria-busy");
      } else {
        arr = f;
      }
    } else {
      arr = items;
    }
    ctrl._cachedItems = arr;
    return arr;
  }

  static $provideInputValue<T, C extends WUPTextControl<T>>(v: T | undefined, control: C): string | Promise<string> {
    if (v === undefined) {
      return "";
    }
    const ctrl = control as unknown as WUPSelectControl<T>;

    const ctr = ctrl.constructor as typeof WUPSelectControl;
    const r = ctr.$getMenuItems<T, WUPSelectControl<T>>(ctrl).then((items) => {
      const i = (items as WUPSelect.MenuItemAny<any>[]).findIndex((o) => ctr.$isEqual(o.value, v));
      if (i === -1) {
        console.error(`${ctrl.tagName}.[${ctrl._opts.name}]. Not found in items`, { items, value: v });
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

  static $defaults: WUPSelect.Defaults = {
    ...WUPTextControl.$defaults,
  };

  $options: WUPSelect.Options<ValueType> = {
    ...this.#ctr.$defaults,
    items: [],
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  #isOpen = false;
  get $isOpen(): boolean {
    return this.#isOpen;
  }

  $hide() {
    this.goHideMenu(HideCases.onManualCall);
  }

  $show() {
    this.goShowMenu(ShowCases.onManualCall);
  }

  $refPopup?: WUPPopupElement;
  #popupRefs?: {
    hide: (hideCase: WUPPopup.HideCases) => Promise<void>;
    show: (showCase: WUPPopup.ShowCases) => Promise<void>;
    dispose: () => void;
  };

  protected override renderControl() {
    super.renderControl();

    const i = this.$refInput;
    i.setAttribute("role", "combobox");
    i.setAttribute("aria-haspopup", "listbox");
    i.setAttribute("aria-expanded", "false");
    // i.setAttribute("aria-multiselectable", "false");

    // todo remove after tests
    this.appendChild(document.createElement("wup-spin"));
  }

  protected override gotChanges(propsChanged: Array<keyof WUPSelect.Options> | null) {
    super.gotChanges(propsChanged as any);

    this._opts.readOnlyInput
      ? this.$refInput.removeAttribute("aria-autocomplete")
      : this.$refInput.setAttribute("aria-autocomplete", "list");
    this.$refInput.readOnly = (this.$isReadOnly || this._opts.readOnlyInput) as boolean;

    const isMenuEnabled = !this.$isDisabled && !this.$isReadOnly;
    if (isMenuEnabled && !this.#popupRefs) {
      const refs = popupListenTarget(
        {
          target: this,
          showCase: PopupShowCases.onClick | PopupShowCases.onFocus,
        },
        (s, e) => {
          if (s === WUPPopup.ShowCases.always) {
            return this.$refPopup!;
          }
          return this.goShowMenu(s === PopupShowCases.onClick ? ShowCases.onClick : ShowCases.onFocus, e);
        },
        (s, e) => {
          if (
            s === WUPPopup.HideCases.onFocusOut ||
            s === WUPPopup.HideCases.onOutsideClick ||
            s === WUPPopup.HideCases.onTargetClick ||
            s === WUPPopup.HideCases.onPopupClick
          ) {
            return this.goHideMenu(
              s === WUPPopup.HideCases.onFocusOut || s === WUPPopup.HideCases.onOutsideClick
                ? HideCases.onFocusLost
                : HideCases.onClick,
              e
            );
          }
          return false;
        }
      );
      this.#popupRefs = { hide: refs.hide, show: refs.show, dispose: refs.onRemoveRef };
    } else {
      this.#popupRefs?.dispose.call(this.#popupRefs); // remove all possible prev-eventListeners
      this.#popupRefs = undefined;
    }
  }

  /** All items of current menu */
  _menuItems?: {
    all: Array<HTMLLIElement & { _text: string }>;
    /** Index of items filtered by input */
    filtered?: Array<number>;
    /** Index (in 'filtered' otherwise in 'all' array) of item that has virtual-focus; */
    focused: number;
    /** Index of selected/current item */
    selected: number;
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

  #disposeMenuEvents?: Array<() => void>;
  protected async renderMenu(popup: WUPPopupElement, menuId: string) {
    const ul = popup.appendChild(document.createElement("ul"));
    ul.setAttribute("id", menuId);
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", "Items");

    const r = onEvent(ul, "click", async (e) => {
      e.stopPropagation();
      if (e.target instanceof HTMLLIElement) {
        this.gotMenuItemClick(e as MouseEvent & { target: HTMLLIElement });
      }
    });
    this.#disposeMenuEvents!.push(r);

    const all = await this.renderMenuItems(ul);
    this._menuItems = { all, focused: -1, selected: -1 };
    !all.length && this.renderMenuNoItems(popup, false);
  }

  /** Create menuItems as array of HTMLLiElement with option _text required to filtering by input (otherwise content can be html-structure) */
  protected async renderMenuItems(ul: HTMLUListElement): Promise<Array<HTMLLIElement & { _text: string }>> {
    const arr = await this.#ctr.$getMenuItems<ValueType, this>(this);

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

  protected gotMenuItemClick(e: MouseEvent & { target: HTMLLIElement }) {
    const i = this._menuItems!.all.indexOf(e.target as HTMLLIElement & { _text: string });
    const o = this._cachedItems![i];

    this.setValue(o.value);
    this.goHideMenu(HideCases.onSelect);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goShowMenu(showCase: ShowCases, e?: MouseEvent | FocusEvent | null): Promise<WUPPopupElement | null> {
    if (
      showCase === ShowCases.onClick &&
      e?.target instanceof HTMLInputElement &&
      !e.target.readOnly &&
      this.contains(e.target)
    ) {
      return null;
    }

    if (this.#isOpen) {
      return this.$refPopup!;
    }

    this.#isOpen = true;
    this.$hideError(); // it resolves overflow menu vs error

    const isCreate = !this.$refPopup;
    if (!this.$refPopup) {
      this.$refPopup = this.appendChild(document.createElement("wup-popup"));
      const p = this.$refPopup;
      p.$options.showCase = PopupShowCases.always;
      p.$options.target = this;
      p.$options.minWidthByTarget = true;
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

      p.setAttribute("menu", "");
      p.$options.animation = WUPPopup.Animations.drawer;

      const menuId = this.#ctr.$uniqueId;
      const i = this.$refInput;
      i.setAttribute("aria-owns", menuId);
      i.setAttribute("aria-controls", menuId);

      this.#disposeMenuEvents = [];
      // remove popup only by focusOut to optimize resources
      const r = onFocusLostEv(
        this,
        () =>
          setTimeout(async () => {
            this.setValue(this.$value); // to update imput according to result
            await this.#menuHidding; // wait for animation if exists
            // check if closed (user can open again during the hidding)
            !this.#isOpen && this.removePopup();
          }),
        { debounceMs: this._opts.focusDebounceMs }
      );
      this.#disposeMenuEvents!.push(r);

      await this.renderMenu(p, menuId);
    } else if (showCase !== ShowCases.onInput && this._menuItems!.filtered) {
      this._menuItems!.all?.forEach((li) => (li.style.display = "")); // reset styles after filtering
      this._menuItems!.filtered = undefined;
    }
    !isCreate && this.$refPopup.$show(); // otherwise popup is opened automatically by init (because PopupShowCases.always)

    this.setAttribute("opened", "");
    this.$refInput.setAttribute("aria-expanded", "true");

    // set aria-selected
    const v = this.$value;
    if (v !== undefined) {
      const i = this._cachedItems!.findIndex((item) => this.#ctr.$isEqual(item.value, v));
      this.selectMenuItem(i);
    }

    // call for ref-listener to apply events properly
    showCase !== ShowCases.onClick &&
      showCase !== ShowCases.onFocus &&
      this.#popupRefs!.show(WUPPopup.ShowCases.always);

    setTimeout(() => this.fireEvent("$show", { cancelable: false }));
    return this.$refPopup;
  }

  #menuHidding?: Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goHideMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): Promise<boolean> {
    if (
      hideCase === HideCases.onClick &&
      e?.target instanceof HTMLInputElement &&
      !e.target.readOnly &&
      this.contains(e.target)
    ) {
      return false;
    }

    const wasOpen = this.#isOpen;
    this.#isOpen = false;
    if (!this.$refPopup) {
      return false;
    }

    if (wasOpen) {
      // call for ref-listener to apply events properly
      hideCase !== HideCases.onFocusLost &&
        hideCase !== HideCases.onClick &&
        this.#popupRefs!.hide(WUPPopup.HideCases.onManuallCall);

      let pback: () => void;
      // eslint-disable-next-line no-promise-executor-return
      this.#menuHidding = new Promise((resolve) => (pback = resolve));

      wasOpen && (await this.$refPopup.$hide());
      // @ts-expect-error
      pback();
      this.#menuHidding = undefined;
    }

    if (this.#isOpen) {
      return false; // possible when popup opened again during the animation
    }

    this.removeAttribute("opened");
    this.$refInput.setAttribute("aria-expanded", "false");
    this.focusMenuItem(null);
    setTimeout(() => this.fireEvent("$hide", { cancelable: false }));
    return true;
  }

  /** Focus item by index or reset is index is null (via aria-activedescendant).
   *  If menuItems is filtered by input-text than index must point on filtered array */
  protected focusMenuItem(index: number | null) {
    const { filtered } = this._menuItems!;
    // get the real index if items is filtered
    const prevIndex = filtered ? filtered[this._menuItems!.focused] : this._menuItems!.focused;
    this._menuItems!.all[prevIndex]?.removeAttribute("focused");

    if (index != null && index > -1) {
      // get the real index if items is filtered
      const trueIndex = filtered ? filtered[index] : index;
      const next = this._menuItems!.all[trueIndex];
      next.setAttribute("focused", "");
      this.$refInput.setAttribute("aria-activedescendant", next.id);
      const ifneed = (next as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
      ifneed ? ifneed.call(next, false) : next.scrollIntoView();
      this._menuItems!.focused = index;
    } else {
      this.$refInput.removeAttribute("aria-activedescendant");
      this._menuItems!.focused = -1;
    }
  }

  /** Select item by index (set aria-selected and scroll to) */
  protected selectMenuItem(index: number) {
    const prev = this._menuItems!.all[this._menuItems!.selected];
    prev?.setAttribute("aria-selected", "false");

    if (index !== -1) {
      const li = this._menuItems!.all[index];
      li.setAttribute("aria-selected", "true");
      setTimeout(() => {
        const ifneed = (li as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
        ifneed ? ifneed.call(li, false) : li.scrollIntoView();
      }); // timeout to wait to popup to start opening otherwise scroll doesn't work
    }
    this._menuItems!.selected = index;
  }

  protected override async gotKeyDown(e: KeyboardEvent) {
    // don't allow to process Esc-key when menu is opened
    const isEscPrevent = this.#isOpen && e.key === "Escape";
    !isEscPrevent && super.gotKeyDown(e);

    if (!this.#isOpen || e.altKey || e.shiftKey || e.ctrlKey) {
      return;
    }

    const { length } = this._menuItems!.filtered || this._menuItems!.all;
    let focusIndex: number | null = null;

    if (e.key === "ArrowDown") {
      !this.#isOpen && (await this.goShowMenu(ShowCases.onPressArrowKey));
      let cur = this._menuItems!.focused;
      focusIndex = ++cur >= length ? 0 : cur;
    } else if (e.key === "ArrowUp") {
      const wasOpen = this.#isOpen;
      !this.#isOpen && (await this.goShowMenu(ShowCases.onPressArrowKey));
      let cur = wasOpen ? this._menuItems!.focused : length;
      focusIndex = --cur < 0 ? length - 1 : cur;
    }

    if (!this.#isOpen) {
      return;
    }

    if (e.key === "Home") {
      focusIndex = 0;
    } else if (e.key === "End") {
      focusIndex = length - 1;
    }

    if (focusIndex != null) {
      e.preventDefault();
      this.focusMenuItem(focusIndex);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      this.setValue(this.$value);
      await this.goHideMenu(HideCases.OnPressEsc);
    } else if (e.key === "Enter") {
      e.preventDefault();
      let i = this._menuItems!.focused;
      i = this._menuItems!.filtered ? this._menuItems!.filtered[i] : i;
      i > -1 && this.setValue(this._cachedItems![i].value);
      await this.goHideMenu(HideCases.OnPressEnter);
    }
  }

  protected override async gotInput(e: Event & { currentTarget: HTMLInputElement }) {
    this.#isOpen && this.focusMenuItem(null); // reset focus
    !this.#isOpen && (await this.goShowMenu(ShowCases.onInput));

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

    hasVisible && rawV !== "" && this.focusMenuItem(0);

    this.$refPopup!.$refresh();
  }

  protected override clearValue(canValidate = true) {
    super.clearValue(!this.#isOpen && canValidate);
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

  protected removePopup() {
    this.$refPopup?.remove();
    this.$refPopup = undefined;
    this.#disposeMenuEvents?.forEach((f) => f()); // remove possible previous event listeners
    this.#disposeMenuEvents = undefined;
    this._menuItems = undefined;
  }

  protected gotRemoved() {
    this.removePopup();
    // remove resources for case when control can be appended again
    this.#isOpen = false;
    this.#popupRefs = undefined;

    super.gotRemoved();
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
      [tagName]: WUPSelect.JSXProps<WUPSelectControl>;
    }
  }
}

// todo remove after tests
// const el = document.createElement(tagName);
// el.$options.name = "testMe";
// el.$options.validations = {
//   required: true,
//   min: (v) => v.length > 500 && "This is error",
//   extra: (v) => "test Me",
// };

// testcase (close menu by outside click): to reproduce focus > pressEsc > typeText > try close by outside click
