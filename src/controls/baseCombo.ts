// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases as PopupShowCases, WUPPopup } from "../popup/popupElement";
import popupListen from "../popup/popupListen";
import WUPBaseControl from "./baseControl";
import WUPTextControl, { WUPTextIn } from "./text";

export namespace WUPBaseComboIn {
  export interface Defs {
    /** Wait for pointed time before show-error (sumarized with $options.debounce); WARN: hide-error without debounce
     *  @defaultValue 0 */
    validateDebounceMs?: number;
    /** Case when menu-popup need to show
     * @defaultValue onPressArrowKey | onClick | onFocus */
    showCase: ShowCases;
  }

  export interface Opt {
    /** Set true to make input not editable but allow to user select items via popup-menu (ordinary dropdown mode) */
    readOnlyInput?: boolean;
  }

  export type Generics<
    ValueType = any,
    ValidationKeys extends WUPBase.ValidationMap = WUPBaseCombo.ValidationMap,
    Defaults = Defs,
    Options = Opt
  > = WUPTextIn.Generics<ValueType, ValidationKeys, Defaults & Defs, Options & Opt>;

  export type Validation<T = any> = Generics<T>["Validation"];
  export type GenDef<T = any> = Generics<T>["Defaults"];
  export type GenOpt<T = any> = Generics<T>["Options"];
}

export const enum ShowCases {
  /** When $show() called programmatically; Don't use it for $options */
  onManualCall = 1,
  /** When user types text */
  onInput = 1 << 1,
  /** When user presses arrowUp/arrowDown */
  onPressArrowKey = 1 << 2,
  /** When user clicks on control (beside editable not-empty input) */
  onClick = 1 << 3,
  /** When control got focus */
  onFocus = 1 << 4,
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
  namespace WUPBaseCombo {
    interface ValidationMap extends Omit<WUPText.ValidationMap, "min" | "max" | "email"> {}
    interface EventMap extends WUPText.EventMap {
      /** Fires after popup-menu is shown (after animation finishes) */
      $showMenu: Event;
      /** Fires after popup is hidden (after animation finishes) */
      $hideMenu: Event;
    }
    interface Defaults<T = string> extends WUPBaseComboIn.GenDef<T> {}
    interface Options<T = string> extends WUPBaseComboIn.GenOpt<T> {}
    interface JSXProps<T extends WUPBaseComboControl> extends WUPText.JSXProps<T> {
      /** @readonly Use [opened] for styling */
      readonly opened?: boolean;
    }
  }
}

export default abstract class WUPBaseComboControl<
  ValueType = any,
  EventMap extends WUPBaseCombo.EventMap = WUPBaseCombo.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseComboControl;

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUPBaseCombo.Options>;
    arr.push("readOnlyInput");
    return arr;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        cursor: pointer;
      }
      :host input {
        cursor: text;
      }
      :host input:placeholder-shown,
      :host input:read-only {
        cursor: pointer;
      }
      :host label::after {
        content: "";
        -webkit-mask-image: var(--ctrl-icon-img);
        mask-image: var(--ctrl-icon-img);
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
      }`;
  }

  static $defaults: WUPBaseCombo.Defaults = {
    ...WUPTextControl.$defaults,
    validationRules: { ...WUPBaseControl.$defaults.validationRules },
    showCase: ShowCases.onClick | ShowCases.onFocus | ShowCases.onPressArrowKey,
  };

  $options: WUPBaseCombo.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  #isOpen = false;
  /** Returns if popup-menu is opened */
  get $isOpen(): boolean {
    return this.#isOpen;
  }

  /** Hide popup-menu
   * @returns Promise resolved by animation time */
  async $hideMenu(): Promise<void> {
    await this.goHideMenu(HideCases.onManualCall);
  }

  /** Show popup-menu
   * @returns Promise resolved resolved by animation time */
  async $showMenu(): Promise<void> {
    await this.goShowMenu(ShowCases.onManualCall, null, true);
  }

  /** Reference to popupMenu */
  $refPopup?: WUPPopupElement;
  #popupRefs?: ReturnType<typeof popupListen>;

  protected override renderControl(): void {
    super.renderControl();

    const i = this.$refInput;
    i.setAttribute("role", "combobox");
    i.setAttribute("aria-haspopup", "listbox");
    i.setAttribute("aria-expanded", false);
  }

  protected override gotChanges(propsChanged: Array<keyof WUPBaseCombo.Options> | null): void {
    super.gotChanges(propsChanged as any);

    this._opts.readOnlyInput
      ? this.$refInput.removeAttribute("aria-autocomplete")
      : this.$refInput.setAttribute("aria-autocomplete", "list");
  }

  override gotFormChanges(propsChanged: Array<keyof WUPForm.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.$refInput.readOnly = this.$refInput.readOnly || (this._opts.readOnlyInput as boolean);

    const isMenuEnabled = !this.$isDisabled && !this.$isReadOnly;
    if (!isMenuEnabled) {
      this.#popupRefs?.stopListen.call(this.#popupRefs); // remove all possible prev-eventListeners
      this.#popupRefs = undefined;
      this.removePopup();
    } else if (!this.#popupRefs) {
      const refs = popupListen(
        {
          target: this,
          showCase: PopupShowCases.onClick | PopupShowCases.onFocus,
          skipAlreadyFocused: true,
        },
        (s, e) => {
          if (s === WUPPopup.ShowCases.always) {
            return this.$refPopup!;
          }
          return this.goShowMenu(s === PopupShowCases.onClick ? ShowCases.onClick : ShowCases.onFocus, e);
        },
        (s, e) => {
          if (s === WUPPopup.HideCases.onManuallCall) {
            return true;
          }
          if (s !== WUPPopup.HideCases.onPopupClick) {
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
      this.#popupRefs = refs;
    }
  }

  /** Called when need to create menu in opened popup */
  protected abstract renderMenu(popup: WUPPopupElement, menuId: string): Promise<HTMLElement> | HTMLElement;
  /** Called when need to transfer current value to input */
  protected abstract valueToInput(v: ValueType | undefined): string | Promise<string>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goShowMenu(
    showCase: ShowCases,
    e?: MouseEvent | FocusEvent | null,
    isNeedWait?: boolean
  ): Promise<WUPPopupElement | null> {
    if (this.$isReadOnly) {
      return null;
    }

    if (this.#isOpen) {
      return this.$refPopup!;
    }

    if (
      showCase === ShowCases.onClick &&
      e!.target instanceof HTMLInputElement &&
      !e!.target.readOnly &&
      e!.target.value !== ""
    ) {
      return null; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
    }

    this.#isOpen = true;
    this.$hideError(); // it resolves overflow menu vs error

    if (!this.$refPopup) {
      const p = document.createElement("wup-popup");
      this.$refPopup = p;
      p.$options.showCase = PopupShowCases.always;
      p.$options.target = this;
      p.$options.offsetFitElement = [1, 1];
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

      const wasFcs = this.$isFocused;
      await this.renderMenu(p, menuId);

      const fcs = this.$isFocused;
      if (!fcs && wasFcs) {
        this.#isOpen = false;
        this.removePopup(); // fix case when user waited for loading and moved focus to another
        return null;
      }
      this.appendChild(p); // WARN: it will show onInit
      this.$refPopup.addEventListener("$willShow", (ev) => ev.preventDefault(), { once: true }); // otherwise popup shows by init and impossible to wait for result (only via event)
    }
    if (!this.#isOpen) {
      return null; // possible when user calls show & hide sync
    }
    const r = this.$refPopup.$show().finally(() => this.fireEvent("$showMenu", { cancelable: false }));
    this.setAttribute("opened", ""); // possible when user calls show & hide sync
    this.$refInput.setAttribute("aria-expanded", true);
    this.#popupRefs!.show(WUPPopup.ShowCases.always); // call for ref-listener to apply events properly
    isNeedWait && (await r); // WARN: it's important don't wait for animation to assign onShow events fast

    return this.$refPopup;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goHideMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): Promise<boolean> {
    if (
      hideCase === HideCases.onClick &&
      e!.target instanceof HTMLInputElement &&
      !e!.target.readOnly &&
      e!.target.value !== ""
    ) {
      return false; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
    }

    const wasOpen = this.#isOpen;
    this.#isOpen = false;
    if (!this.$refPopup) {
      return false;
    }
    /* istanbul ignore else */
    if (wasOpen) {
      this.#popupRefs!.hide(WUPPopup.HideCases.onManuallCall); // call for ref-listener to apply events properly
      await this.$refPopup.$hide();

      // remove popup only by focusOut to optimize resources
      if (hideCase === HideCases.onFocusLost) {
        this.removePopup();
        this.setValue(this.$value); // to update/rollback input according to result
      }
    }

    if (this.#isOpen) {
      return false; // possible when popup opened again during the animation
    }

    this.removeAttribute("opened");
    this.$refInput.setAttribute("aria-expanded", false);
    this.focusMenuItem(null, undefined);
    setTimeout(() => this.fireEvent("$hideMenu", { cancelable: false }));
    return true;
  }

  #focusedMenuItem?: HTMLElement | null;
  #focusedMenuValue?: ValueType | undefined;
  /** Focus/resetFocus for item (via aria-activedescendant) */
  protected focusMenuItem(next: HTMLElement | null, nextValue: ValueType | undefined): void {
    this.#focusedMenuItem?.removeAttribute("focused");

    if (next) {
      next.setAttribute("focused", "");
      this.$refInput.setAttribute("aria-activedescendant", next.id);
      const ifneed = (next as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
      ifneed ? ifneed.call(next, false) : next.scrollIntoView();
    } else {
      this.$refInput.removeAttribute("aria-activedescendant");
    }
    this.#focusedMenuItem = next;
    this.#focusedMenuValue = nextValue;
  }

  #selectedMenuItem?: HTMLElement | null;
  /** Select item (set aria-selected and scroll to) */
  protected selectMenuItem(next: HTMLElement | null): void {
    this.#selectedMenuItem?.setAttribute("aria-selected", "false");

    if (next) {
      next.setAttribute("aria-selected", true);
      const ifneed = (next as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
      ifneed ? ifneed.call(next, false) : next.scrollIntoView();
    }
    this.#selectedMenuItem = next;
  }

  protected override async gotKeyDown(e: KeyboardEvent): Promise<void> {
    // don't allow to process Esc-key when menu is opened
    const isEscPrevent = this.#isOpen && e.key === "Escape";
    !isEscPrevent && super.gotKeyDown(e);

    if (e.altKey || e.shiftKey || e.ctrlKey) {
      return;
    }

    if (e.key === "ArrowDown") {
      !this.#isOpen && (await this.goShowMenu(ShowCases.onPressArrowKey, null, true));
    } else if (e.key === "ArrowUp") {
      !this.#isOpen && (await this.goShowMenu(ShowCases.onPressArrowKey, null, true));
    }

    if (!this.#isOpen) {
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      this.setInputValue(this.$value); // reset input to currentValue
      await this.goHideMenu(HideCases.OnPressEsc);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this.#focusedMenuValue !== undefined) {
        this.selectValue(this.#focusedMenuValue);
      } else {
        this.setInputValue(this.$value); // reset input to currentValue
      }
      await this.goHideMenu(HideCases.OnPressEnter);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override gotInput(e: Event & { currentTarget: HTMLInputElement }): void {
    !this.$isOpen && this._opts.showCase & ShowCases.onInput && this.goShowMenu(ShowCases.onInput);
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    !this.#isOpen && this.removePopup(); // otherwise it's removed by hidingMenu
  }

  /** Called when user selected new value from menu */
  protected selectValue(v: ValueType): void {
    this.setValue(v);
  }

  protected override setInputValue(v: ValueType | undefined): void {
    const p = this.valueToInput(v);
    if (p instanceof Promise) {
      p.then((s) => (this.$refInput.value = s));
    } else {
      this.$refInput.value = p;
    }
  }

  protected override clearValue(canValidate = true): void {
    super.clearValue(!this.#isOpen && canValidate);
  }

  /** Called when popup must be removed (by focus out OR if control removed) */
  protected removePopup(): void {
    this.$refPopup?.remove();
    this.$refPopup = undefined;
    this.#focusedMenuItem = undefined;
    this.#focusedMenuValue = undefined;
    if (this.#isOpen) {
      this.#isOpen = false;
      this.removeAttribute("opened");
      this.$refInput.setAttribute("aria-expanded", false);
      this.$refInput.removeAttribute("aria-activedescendant");
    }
  }

  protected override gotRemoved(): void {
    this.removePopup();
    // remove resources for case when control can be appended again
    this.#popupRefs?.stopListen.call(this);
    this.#popupRefs = undefined;
    super.gotRemoved();
  }
}
