/* eslint-disable no-use-before-define */
import onEvent from "../helpers/onEvent";
import onFocusLostEv from "../helpers/onFocusLost";
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
    onFocusLost,
    // todo onPressEsc ???
  }

  export type MenuItem<T> = { text: string; value: T };
  /** Use li.innerHTML to render value & return string required for input; */
  export type MenuItemFn<T> = { text: (value: T, li: HTMLLIElement, i: number) => string; value: T };
  export type MenuItemAny<T> = MenuItem<T> | MenuItemFn<T>;
  export type MenuItems<T> = MenuItem<T>[] | MenuItemFn<T>[];

  export type ExtraOptions<T> = {
    /** Items showed in dropdown-menu. Provide promise/api-call to show pending status when control retrieves data! */
    items: MenuItems<T> | (() => MenuItems<T> | Promise<MenuItems<T>>);
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

  export type Validation<T = any> = Generics<T>["Validation"];
  export type Options<T = any> = Generics<T>["Options"];
}

export default class WUPSelectControl<ValueType = any> extends WUPTextControl<ValueType> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPSelectControl;

  /** StyleContent related to component */
  static get style(): string {
    return `
      :host {

      }
     `;
  }

  /** Parse/get items from $options.items */
  static async getMenuItems<T, C extends WUPSelectControl<T>>(ctrl: C): Promise<WUPSelectControlTypes.MenuItems<T>> {
    if (ctrl._cachedItems) {
      return ctrl._cachedItems;
    }

    const { items } = ctrl.$options;

    let arr: WUPSelectControlTypes.MenuItems<T>;
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
      const i = (items as WUPSelectControlTypes.MenuItemAny<any>[]).findIndex((o) => ctr.isEqual(o.value, v));
      if (i === -1) {
        console.error(`${ctrl.tagName} '${ctr.$defaults.name}'. Not found in items`, { items, value: v });
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

  static $defaults: WUPSelectControlTypes.Options = {
    ...WUPTextControl.$defaults,
    debounceMs: 0,
    validityDebounceMs: 0,
    items: [],
    validationRules: WUPBaseControl.$defaults.validationRules,
  };

  $options: Omit<WUPSelectControlTypes.Options<ValueType>, "validationRules"> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  #isOpen = false;
  get $isOpen(): boolean {
    return this.#isOpen;
  }

  $hide() {
    this.goHideMenu(WUPSelectControlTypes.HideCases.onManualCall);
  }

  $show() {
    this.goShowMenu(WUPSelectControlTypes.ShowCases.onManualCall);
  }

  $refPopup?: WUPPopupElement;
  #popupRefs?: {
    hide: (hideCase: WUPPopup.HideCases) => Promise<void>;
    show: (showCase: WUPPopup.ShowCases) => Promise<void>;
  };

  protected override connectedCallback() {
    super.connectedCallback();

    const refs = popupListenTarget(
      {
        target: this,
        showCase: PopupShowCases.onClick | PopupShowCases.onFocus,
      },
      (s) =>
        s === WUPPopup.ShowCases.always // manual show
          ? (this.$refPopup as WUPPopupElement)
          : this.goShowMenu(
              s === PopupShowCases.onClick
                ? WUPSelectControlTypes.ShowCases.onClick
                : WUPSelectControlTypes.ShowCases.onFocus
            ),
      (s) =>
        s === WUPPopup.HideCases.onFocusOut ||
        s === WUPPopup.HideCases.onOutsideClick ||
        s === WUPPopup.HideCases.onTargetClick ||
        s === WUPPopup.HideCases.onPopupClick
          ? this.goHideMenu(
              s === WUPPopup.HideCases.onFocusOut || s === WUPPopup.HideCases.onOutsideClick
                ? WUPSelectControlTypes.HideCases.onFocusLost
                : WUPSelectControlTypes.HideCases.onClick
            )
          : true
    );
    this.#popupRefs = { hide: refs.hide, show: refs.show };
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
  _menuItems?: HTMLLIElement[];
  /** Items resolved from options */
  _cachedItems?: WUPSelectControlTypes.MenuItems<ValueType>;

  #disposeMenuEvent?: () => void;
  protected async renderMenu(popup: WUPPopupElement, menuId: string) {
    const ul = popup.appendChild(document.createElement("ul"));
    ul.setAttribute("id", menuId);
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", "Items");

    const r = onEvent(ul, "click", async (e) => {
      e.stopPropagation();
      if (e.target instanceof HTMLLIElement) {
        this.onMenuItemClick(e as MouseEvent & { target: HTMLLIElement });
      }
    });
    this.disposeLst.push(r);
    this.#disposeMenuEvent = () => {
      r(); // self-remove event listener by hidding
      this.disposeLst.splice(this.disposeLst.indexOf(r), 1);
    };

    this._menuItems = await this.renderMenuItems(ul);
  }

  protected async renderMenuItems(ul: HTMLUListElement): Promise<Array<HTMLLIElement>> {
    const arr = await this.#ctr.getMenuItems<ValueType, this>(this);

    const arrLi = arr.map(() => {
      const li = ul.appendChild(document.createElement("li"));
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      const id = this.#ctr.uniqueId;
      li.id = id;
      return li;
    });

    if (arr[0].text instanceof Function) {
      arr.forEach((v, i) => (v as WUPSelectControlTypes.MenuItemFn<ValueType>).text(v.value, arrLi[i], i));
    } else {
      arr.forEach((v, i) => (arrLi[i].textContent = (v as WUPSelectControlTypes.MenuItem<ValueType>).text));
    }

    return arrLi;
  }

  protected onMenuItemClick(e: MouseEvent & { target: HTMLLIElement }) {
    const i = this._menuItems!.indexOf(e.target);
    const o = this._cachedItems![i];

    this.setValue(o.value);
    this.goHideMenu(WUPSelectControlTypes.HideCases.onSelect);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goShowMenu(showCase: WUPSelectControlTypes.ShowCases): Promise<WUPPopupElement | null> {
    if (this.#isOpen) {
      return this.$refPopup || null;
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

      p.setAttribute("menu", "");
      p.$options.animation = WUPPopup.Animations.drawer;

      const menuId = this.#ctr.uniqueId;
      const i = this.$refInput;
      i.setAttribute("aria-owns", menuId);
      i.setAttribute("aria-controls", menuId);

      // remove popup only by focusOut to optimize resources
      const r = onFocusLostEv(
        this,
        async () => {
          this.disposeLst.splice(this.disposeLst.indexOf(r), 1);
          await this.#menuHidding; // wait for animation if exists
          // check if closed (user can open again during the hidding)
          !this.#isOpen && this.removePopup();
        },
        { debounceMs: this._opts.focusDebounceMs, once: true }
      );
      this.disposeLst.push(r);

      await this.renderMenu(p, menuId);
    } else {
      this.$refPopup.querySelector('[aria-selected="true"]')?.removeAttribute("aria-selected");
    }

    const selectedItemId = "itemId"; // todo implement
    this.$refInput.setAttribute("aria-activedescendant", selectedItemId);

    this.setAttribute("opened", "");
    this.$refInput.setAttribute("aria-expanded", "true");

    // set aria-selected
    const v = this.$value;
    if (v !== undefined) {
      const i = this._cachedItems!.findIndex((item) => this.#ctr.isEqual(item.value, v));
      i !== -1 && this._menuItems![i].setAttribute("aria-selected", "true");
    }

    !isCreate && this.$refPopup.$show(); // otherwise popup is opened automatically by init (because PopupShowCases.always)

    if (showCase === WUPSelectControlTypes.ShowCases.onManualCall) {
      // call for ref-listener to apply events properly
      this.#popupRefs!.show(WUPPopup.ShowCases.always);
    }

    return this.$refPopup;
  }

  #menuHidding?: Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goHideMenu(hideCase: WUPSelectControlTypes.HideCases): Promise<boolean> {
    const wasOpen = this.#isOpen;
    this.#isOpen = false;
    if (!this.$refPopup) {
      return false;
    }

    if (wasOpen) {
      if (
        hideCase === WUPSelectControlTypes.HideCases.onManualCall ||
        hideCase === WUPSelectControlTypes.HideCases.onSelect
      ) {
        // call for ref-listener to apply events properly
        this.#popupRefs!.hide(WUPPopup.HideCases.onManuallCall);
      }

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

    return true;
  }

  protected override onInput(e: Event & { currentTarget: HTMLInputElement }) {
    // todo implement search
  }

  protected removePopup() {
    this.$refPopup?.remove();
    this.$refPopup = undefined;
    this.#disposeMenuEvent?.call(this);
    this.#disposeMenuEvent = undefined;
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
