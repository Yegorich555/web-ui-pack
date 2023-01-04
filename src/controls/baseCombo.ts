import WUPPopupElement from "../popup/popupElement";
import { ShowCases as PopupShowCases, HideCases as PopupHideCases, Animations } from "../popup/popupElement.types";
import popupListen from "../popup/popupListen";
import WUPBaseControl from "./baseControl";
import WUPTextControl from "./text";

export const enum ShowCases {
  /** When $showMenu() called programmatically; Don't use it for $options (it's for nested cycle) */
  onManualCall = 1,
  /** When control got focus */
  onFocus = 1 << 1,
  /** When user clicks on control (beside editable not-empty input) */
  onClick = 1 << 2,
  /** When user clicks on input (by default it's disabled rule to allow user to work with input without popup hide/show blinks) */
  onClickInput = 1 << 4,
  /** When user types text */
  onInput = 1 << 5,
  /** When user presses arrowUp/arrowDown */
  onPressArrowKey = 1 << 6,
}

export const enum HideCases {
  onManualCall,
  onClick,
  onSelect,
  onFocusLost,
  OnPressEsc,
  OnPressEnter,
  OnOptionsChange,
}

declare global {
  namespace WUP.BaseCombo {
    interface EventMap extends WUP.Text.EventMap {
      /** Fires after popup-menu is shown (after animation finishes) */
      $showMenu: Event;
      /** Fires after popup is hidden (after animation finishes) */
      $hideMenu: Event;
    }
    interface ValidityMap extends Omit<WUP.Text.ValidityMap, "min" | "max" | "email"> {}
    interface Defaults<T = string, VM = ValidityMap> extends WUP.Text.Defaults<T, VM> {
      /** Case when menu-popup to show; WARN ShowCases.inputClick doesn't work without ShowCases.click
       * @defaultValue onPressArrowKey | onClick | onFocus */
      showCase: ShowCases;
    }
    interface Options<T = string, VM = ValidityMap> extends WUP.Text.Options<T, VM>, Defaults<T, VM> {
      /** Set true to make input not editable but allow to user select items via popup-menu (ordinary dropdown mode) */
      readOnlyInput?: boolean;
    }
    interface Attributes extends WUP.Text.Attributes {}
    interface JSXProps<C = WUPBaseComboControl> extends WUP.Text.JSXProps<C>, Attributes {}
  }
}

/** Base abstract form-control for any control with popup-menu (Dropdown, Datepicker etc.) */
export default abstract class WUPBaseComboControl<
  ValueType = any,
  EventMap extends WUP.BaseCombo.EventMap = WUP.BaseCombo.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseComboControl;

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.BaseCombo.Options>;
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
        max-height: 300px;
        z-index: 90010;
      }`;
  }

  static $defaults: WUP.BaseCombo.Defaults<any> = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
      _mask: WUPTextControl.$defaults.validationRules._mask,
      _parse: WUPTextControl.$defaults.validationRules._parse,
    },
    showCase: ShowCases.onClick | ShowCases.onFocus | ShowCases.onPressArrowKey,
  };

  // @ts-expect-error reason: validationRules is different
  $options: WUP.BaseCombo.Options = {
    ...this.#ctr.$defaults,
  };

  // @ts-expect-error reason: validationRules is different
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

  protected override gotChanges(propsChanged: Array<keyof WUP.BaseCombo.Options> | null): void {
    super.gotChanges(propsChanged as any);

    this._opts.readOnlyInput
      ? this.$refInput.removeAttribute("aria-autocomplete")
      : this.$refInput.setAttribute("aria-autocomplete", "list");
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options | keyof WUP.BaseCombo.Options> | null): void {
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
          const sc = s === PopupShowCases.onClick ? ShowCases.onClick : ShowCases.onFocus;
          if (s === PopupShowCases.always) {
            return this.$refPopup!;
          }
          if (!(sc & this._opts.showCase)) {
            return null;
          }
          return this.goShowMenu(sc, e);
        },
        (s, e) => {
          if (s === PopupHideCases.onManuallCall) {
            return true;
          }
          if (s !== PopupHideCases.onPopupClick) {
            return this.goHideMenu(
              s === PopupHideCases.onFocusOut || s === PopupHideCases.onOutsideClick
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

  /** Override to change show-behavior */
  canShowMenu(showCase: ShowCases, e?: MouseEvent | FocusEvent | null): boolean {
    if (this.$isReadOnly) {
      return false;
    }

    if (this._opts.showCase & ShowCases.onClickInput) {
      return true;
    }

    if (
      showCase === ShowCases.onClick &&
      e!.target instanceof HTMLInputElement &&
      !e!.target.readOnly &&
      e!.target.value !== ""
    ) {
      return false; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
    }
    return true;
  }

  protected async goShowMenu(
    showCase: ShowCases,
    e?: MouseEvent | FocusEvent | null,
    isNeedWait?: boolean
  ): Promise<WUPPopupElement | null> {
    if (this.#isOpen) {
      return this.$refPopup!;
    }
    if (!this.canShowMenu(showCase, e)) {
      return null;
    }

    this.#isOpen = true;
    // this.$hideError(); // it resolves overflow menu vs error

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
      p.$options.animation = Animations.drawer;

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
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((res) => setTimeout(res)); // wait for appending to body so size is defined and possible to scroll
    }
    if (!this.#isOpen) {
      return null; // possible when user calls show & hide sync
    }
    const r = this.$refPopup.$show().finally(() => this.fireEvent("$showMenu", { cancelable: false }));
    this.setAttribute("opened", ""); // possible when user calls show & hide sync
    this.$refInput.setAttribute("aria-expanded", true);
    this.#popupRefs!.show(PopupShowCases.always); // call for ref-listener to apply events properly
    isNeedWait && (await r); // WARN: it's important don't wait for animation to assign onShow events fast

    return this.$refPopup;
  }

  /** Override to change hide-behavior */
  canHideMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): boolean {
    if (this._opts.showCase & ShowCases.onClickInput) {
      return true;
    }

    if (
      hideCase === HideCases.onClick &&
      e!.target instanceof HTMLInputElement &&
      !e!.target.readOnly &&
      e!.target.value !== ""
    ) {
      return false; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
    }
    return true;
  }

  protected _isHidding?: true;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goHideMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): Promise<boolean> {
    if (!this.$refPopup || this._isHidding) {
      return false;
    }
    const wasOpen = this.#isOpen;
    if (!this.canHideMenu(hideCase, e)) {
      return false;
    }
    this.#isOpen = false;
    /* istanbul ignore else */
    if (wasOpen) {
      this._isHidding = true;
      this.#popupRefs!.hide(PopupHideCases.onManuallCall); // call for ref-listener to apply events properly
      await this.$refPopup.$hide();
      delete this._isHidding;
      if (this.#isOpen) {
        return false; // possible when popup opened again during the animation
      }
      // remove popup only by focusOut to optimize resources
      if (hideCase === HideCases.onFocusLost) {
        this.removePopup();
      }
    }

    this.removeAttribute("opened");
    this.$refInput.setAttribute("aria-expanded", false);
    this.focusMenuItem(null);
    this.selectMenuItem(null);
    setTimeout(() => this.fireEvent("$hideMenu", { cancelable: false }));
    return true;
  }

  _focusedMenuItem?: HTMLElement | null;
  /** Focus/resetFocus for item (via aria-activedescendant) */
  protected focusMenuItem(next: HTMLElement | null): void {
    this._focusedMenuItem?.removeAttribute("focused");

    if (next) {
      next.setAttribute("focused", "");
      this.$refInput.setAttribute("aria-activedescendant", next.id);
      const ifneed = (next as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
      ifneed ? ifneed.call(next, false) : next.scrollIntoView();
    } else {
      this.$refInput.removeAttribute("aria-activedescendant");
    }
    this._focusedMenuItem = next;
  }

  _selectedMenuItem?: HTMLElement | null;
  /** Select item (set aria-selected and scroll to) */
  protected selectMenuItem(next: HTMLElement | null): void {
    this._selectedMenuItem?.setAttribute("aria-selected", false);
    if (next) {
      next.setAttribute("aria-selected", true);
      const ifneed = (next as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
      ifneed ? ifneed.call(next, false) : next.scrollIntoView();
    }

    this._selectedMenuItem = next;
  }

  protected override async gotKeyDown(e: KeyboardEvent): Promise<void> {
    // don't allow to process Esc-key when menu is opened
    const isEscPrevent = this.#isOpen && e.key === "Escape";
    !isEscPrevent && super.gotKeyDown(e);

    if (e.altKey || e.shiftKey || e.ctrlKey) {
      return;
    }

    if (this._opts.showCase & ShowCases.onPressArrowKey) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); // to prevent parent-scroll
        if (!this.#isOpen) {
          await this.goShowMenu(ShowCases.onPressArrowKey, null); // , true);
          return;
        }
      }
    }

    if (!this.#isOpen) {
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        this.resetInputValue();
        await this.goHideMenu(HideCases.OnPressEsc);
        break;
      case "Enter":
        // case " ": user can type space; we should not use this as click
        e.preventDefault();
        {
          const el = this._focusedMenuItem;
          if (el && !el.hasAttribute("disabled")) {
            const isHandled = !el.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true }));
            if (isHandled) {
              return; // skip hidding menu if itemClick isHandled
            }
          }
          await this.goHideMenu(HideCases.OnPressEnter);
          this.resetInputValue();
        }
        break;
      default:
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override gotInput(e: WUP.Text.GotInputEvent, allowSuper = false): void {
    // gotInput possible on browser-autofill so we need filter check if isFocused
    !this.$isOpen && this._opts.showCase & ShowCases.onInput && this.$isFocused && this.goShowMenu(ShowCases.onInput);
    allowSuper && super.gotInput(e);
  }

  protected override gotFocusLost(): void {
    !this.#isOpen && !this._isHidding && this.removePopup(); // otherwise it's removed by hidingMenu
    this.resetInputValue(); // to update/rollback input according to result
    super.gotFocusLost();
  }

  /** Called when user selected new value from menu and need to hide menu */
  protected selectValue(v: ValueType): void {
    this.setValue(v);
    setTimeout(() => this.goHideMenu(HideCases.onSelect)); // without timeout it handles click by listener and opens again
  }

  /* Reset input to currentValue; called on focusOut, press Escape, Enter */
  protected resetInputValue(): void {
    this.setInputValue(this.$value);
  }

  protected override setInputValue(v: ValueType | undefined): void {
    const p = this.valueToInput(v);
    if (p instanceof Promise) {
      // todo try to avoid promise here and use super.setInputValue instead
      p.then((s) => super.setInputValue(s));
    } else {
      super.setInputValue(p);
    }
  }

  /** Called when popup must be removed (by focus out OR if control removed) */
  protected removePopup(): void {
    this.$refPopup?.remove();
    this.$refPopup = undefined;
    delete this._focusedMenuItem;
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

// WARN about chaining
/*
 $showMenu().then(()=> console.warn('done'))
 isOpen: true >>> create popup,
 isOpening: true
 ...fetch menu-items (takes time)... >>> render popup with items
 ...animation (takes time)...
 isOpening: false
 >>> console.warn('done')
 show-event
 */

/*
 $hideMenu().then(()=> console.warn('done'))
 isOpen: false
 isHidding: true
 ...animation...
 isHidding: false >>> remove popup if focus out
 >>> console.warn('done')
 hide-event
 */
