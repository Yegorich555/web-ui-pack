import { onEvent } from "../indexHelpers";
import WUPPopupElement from "../popup/popupElement";
import { ShowCases as PopupShowCases, Animations } from "../popup/popupElement.types";
import WUPBaseControl, { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";

export const enum ShowCases {
  /** When $showMenu() called programmatically; Don't use it for $options (it's for nested cycle) */
  onManualCall = 1,
  /** When control got focus; ignores case when user changed value by click on item on clearButton
   * to change such behavior update WUPBaseComboControl.prototype.canShowMenu */
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
    interface Options<T = any, VM = ValidityMap> extends WUP.Text.Options<T, VM> {
      /** Case when menu-popup to show; WARN ShowCases.inputClick doesn't work without ShowCases.click
       * @defaultValue onPressArrowKey | onClick | onFocus */
      showCase: ShowCases;
      /** Set true to make input not editable but allow select items via popup-menu (ordinary dropdown mode) */
      readOnlyInput: boolean | number;
    }

    interface Attributes extends WUP.Text.Attributes {}
    interface JSXProps<C = WUPBaseComboControl> extends WUP.Text.JSXProps<C>, Attributes {}
  }
}

/** Base abstract form-control for any control with popup-menu (Dropdown, Datepicker etc.) */
export default abstract class WUPBaseComboControl<
  ValueType = any,
  TOptions extends WUP.BaseCombo.Options = WUP.BaseCombo.Options,
  EventMap extends WUP.BaseCombo.EventMap = WUP.BaseCombo.EventMap
> extends WUPTextControl<
  ValueType,
  // @ts-expect-error - because validationRules is different
  TOptions,
  EventMap
> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseComboControl;

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
      :host > [menu] {
        padding: 0;
        max-height: 300px;
        z-index: 90010;
      }`;
  }

  static $defaults: WUP.BaseCombo.Options<any> = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
      _mask: WUPTextControl.$defaults.validationRules._mask,
      _parse: WUPTextControl.$defaults.validationRules._parse,
    },
    showCase: ShowCases.onClick | ShowCases.onFocus | ShowCases.onPressArrowKey,
    readOnlyInput: false,
  };

  /** Fires after popup-menu is shown (after animation finishes) */
  $onShowMenu?: (e: Event) => void;
  /** Fires after popup is hidden (after animation finishes) */
  $onHideMenu?: (e: Event) => void;

  #isShown = false;
  /** Returns if popup-menu is opened */
  get $isShown(): boolean {
    return this.#isShown;
  }

  /** Hide popup-menu
   * @returns Promise resolved by animation time */
  async $hideMenu(): Promise<void> {
    await this.goHideMenu(HideCases.onManualCall);
  }

  /** Show popup-menu
   * @returns Promise resolved resolved by animation time */
  async $showMenu(): Promise<void> {
    await this.goShowMenu(ShowCases.onManualCall);
    this.#isShown && (await this.$refPopup!.$show()); // wait for popup show-end
  }

  /** Reference to popupMenu */
  $refPopup?: WUPPopupElement;

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

    const isMenuEnabled = !this.$isDisabled && !this.$isReadOnly;
    !isMenuEnabled && this.removePopup();
  }

  override setupInputReadonly(): void {
    this.$refInput.readOnly = this.$isReadOnly || !!this._opts.readOnlyInput;
  }

  /** Called when need to create menu in opened popup */
  protected abstract renderMenu(popup: WUPPopupElement, menuId: string): HTMLElement;
  /** Called when need to transfer current value to text-input */
  protected abstract valueToInput(v: ValueType | undefined): string;
  /** Called on user's keyDown to apply focus on popup-menu items */
  protected abstract focusMenuItemByKeydown(e: KeyboardEvent): void;

  /** Returns whether possible to use input-click as dropdown behavior */
  isLockInputDrodpown(e: Event): boolean {
    return (
      !(this._opts.showCase & ShowCases.onClickInput) &&
      e.type === "click" &&
      e!.target instanceof HTMLInputElement &&
      !e!.target.readOnly &&
      e!.target.value !== ""
    );
  }

  /** Override to change show-behavior */
  canShowMenu(showCase: ShowCases, e?: MouseEvent | FocusEvent | KeyboardEvent | null): boolean | Promise<boolean> {
    if (this.$isReadOnly || this.$isDisabled) {
      return false;
    }

    if (e && this.isLockInputDrodpown(e!)) {
      return false; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
    }

    if (showCase === ShowCases.onClick) {
      if (!(this._opts.showCase & ShowCases.onClick)) {
        return false;
      }
    } else if (showCase === ShowCases.onFocus) {
      if (!(this._opts.showCase & ShowCases.onFocus)) {
        return false;
      }
      const was = this.$value;
      return new Promise((res) => {
        // WARN: if click on btnClear with control.emptyValue - no changes and popup appeares
        setTimeout(() => {
          const isChangedByClick = !this.#ctr.$isEqual(was, this.$value);
          return res(!isChangedByClick); // click on item or btnClear & control gets focus: need to not open menu because user makes action for changing value
        });
      });
    }
    return true;
  }

  protected async goShowMenu(
    showCase: ShowCases,
    e?: MouseEvent | FocusEvent | KeyboardEvent | null
  ): Promise<WUPPopupElement | null> {
    if (this.#isShown) {
      return this.$refPopup!;
    }

    let can = this.canShowMenu(showCase, e);
    if (can instanceof Promise) {
      can = await can;
    }
    if (!can) {
      return null;
    }

    this.#isShown = true;
    // this.$hideError(); // it resolves overflow menu vs error

    if (!this.$refPopup) {
      const p = document.createElement("wup-popup");
      this.$refPopup = p;
      p.$options.showCase = PopupShowCases.alwaysOff;
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

      // const wasFcs = this.$isFocused;
      this.renderMenu(p, menuId);
      // rollback the logic if renderMenu() returns Promise
      // const fcs = this.$isFocused;
      // if (!fcs && wasFcs) {
      //   this.#isShown = false;
      //   this.removePopup(); // fix case when user waited for loading and moved focus to another
      //   return null;
      // }
      this.appendChild(p); // WARN: it will show onInit
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((res) => setTimeout(res)); // wait for appending to body so size is defined and possible to scroll
    }
    if (!this.#isShown) {
      return null; // possible when user calls show & hide sync
    }
    this.$refPopup.$show().then(() => this.fireEvent("$showMenu", { cancelable: false }));
    this.setAttribute("opened", ""); // possible when user calls show & hide sync
    this.$refInput.setAttribute("aria-expanded", true);
    // await r; // WARN: it's important don't wait for animation to assign onShow events fast

    return this.$refPopup;
  }

  /** Override to change hide-behavior */
  canHideMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): boolean {
    if (e && this.isLockInputDrodpown(e!)) {
      return false; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
    }

    if (hideCase === HideCases.onClick) {
      if (!(this._opts.showCase & ShowCases.onClick)) {
        return false;
      }
      if (this.$refPopup!.includesTarget(e!)) {
        return false; // popupClick
      }
    }

    // always hide by focusLost
    // if (hideCase === HideCases.onFocusLost && !(this._opts.showCase & ShowCases.onFocus)) {
    //   return false;
    // }

    return true;
  }

  protected _isHiding?: true;
  protected async goHideMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): Promise<boolean> {
    if (!this.#isShown || this._isHiding) {
      return false;
    }
    if (!this.canHideMenu(hideCase, e)) {
      return false;
    }
    this.#isShown = false;
    this._isHiding = true;
    await this.$refPopup?.$hide();
    delete this._isHiding;
    if (this.#isShown) {
      return false; // possible when popup opened again during the animation
    }
    // remove popup only by focusOut to optimize resources
    if (hideCase === HideCases.onFocusLost) {
      this.removePopup();
    }

    this.removeAttribute("opened");
    this.$refInput.setAttribute("aria-expanded", false);
    this.focusMenuItem(null);
    this.selectMenuItem(null);
    setTimeout(() => this.fireEvent("$hideMenu", { cancelable: false }));
    return true;
  }

  /** Current focused menu-item (via aria-activedescendant) */
  _focusedMenuItem?: HTMLElement | null;
  /** Focus/resetFocus for item (via aria-activedescendant) */
  protected focusMenuItem(next: HTMLElement | null): void {
    this._focusedMenuItem?.removeAttribute("focused");

    if (next) {
      next.id = next.id || this.#ctr.$uniqueId;
      next.setAttribute("focused", "");
      this.$refInput.setAttribute("aria-activedescendant", next.id);
      this.tryScrollTo(next);
    } else {
      this.$refInput.removeAttribute("aria-activedescendant");
    }
    this._focusedMenuItem = next;
  }

  #scrolltid?: ReturnType<typeof setTimeout>;
  #scrollFrame?: ReturnType<typeof requestAnimationFrame>;
  /** Scroll to element if previous scroll is not in processing (debounce by empty timeout) */
  tryScrollTo(el: HTMLElement): void {
    if (this.#scrolltid) {
      return;
    }
    this.#scrolltid = setTimeout(() => {
      this.#scrolltid = undefined;
      this.#scrollFrame && window.cancelAnimationFrame(this.#scrollFrame); // cancel previous scrolling
      this.#scrollFrame = undefined;
      const act = (): void => {
        const p = el.parentElement!; // WARN: expected that parent is scrollable
        const prev = p.scrollTop;
        const ifneed = (el as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
        ifneed ? ifneed.call(el, false) : el.scrollIntoView({ behavior: "instant" as ScrollBehavior });
        if (p.scrollTop !== prev) {
          this.#scrollFrame = window.requestAnimationFrame(act); // try scroll again later because during the popup animation scrolling can be wrong
        } else {
          this.#scrollFrame = undefined;
        }
      };
      act();
    });
  }

  _selectedMenuItem?: HTMLElement | null;
  /** Select item (set aria-selected and scroll to) */
  protected selectMenuItem(next: HTMLElement | null): void {
    this._selectedMenuItem?.setAttribute("aria-selected", false);
    if (next) {
      next.setAttribute("aria-selected", true);
      this.tryScrollTo(next);
    }

    this._selectedMenuItem = next;
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    // don't allow to process Esc-key when menu is opened
    const isEscPrevent = this.#isShown && e.key === "Escape";
    !isEscPrevent && super.gotKeyDown(e);

    if (e.altKey || e.shiftKey || e.ctrlKey) {
      return;
    }

    if (!this.#isShown) {
      if (this._opts.showCase & ShowCases.onPressArrowKey) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault(); // to prevent parent-scroll
          this.goShowMenu(ShowCases.onPressArrowKey, e).then(() => this.focusMenuItemByKeydown(e));
          return;
        }
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        this.resetInputValue();
        this.goHideMenu(HideCases.OnPressEsc);
        break;
      case "Enter":
        e.preventDefault();
        {
          const el = this._focusedMenuItem;
          setTimeout(() => {
            const isPrevented =
              el &&
              // !el.hasAttribute("disabled") && // looks impossible case
              !el.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true }));
            if (!isPrevented) {
              this.$refInput.value || this.$isRequired
                ? this.resetInputValue()
                : this.setValue(undefined, SetValueReasons.userInput, true); // reset only when input not empty otherwise user cleared this manually
              this.goHideMenu(HideCases.OnPressEnter);
            }
          });
        }
        break;
      case " ":
        break; // don't process " " because it can fire clickEvent on buttons
      default:
        this.focusMenuItemByKeydown(e);
        break;
    }
  }

  protected override gotInput(e: WUP.Text.GotInputEvent, preventValueChange?: boolean): void {
    // gotInput possible on browser-autofill so we need filter check if isFocused
    !this.$isShown && this._opts.showCase & ShowCases.onInput && this.$isFocused && this.goShowMenu(ShowCases.onInput);
    if (preventValueChange) {
      this._refHistory?.handleInput(e);
    } else {
      super.gotInput(e);
    }
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const arr = super.gotFocus(ev);
    const r = this.goShowMenu(ShowCases.onFocus, ev);

    let clickAfterFocus = true; // prevent clickAfterFocus
    let lblClick: ReturnType<typeof setTimeout> | false = false; // fix when labelOnClick > inputOnClick > inputOnFocus
    let onInputStartClick = false; // mouseDown>selectText>mouseUp - without filter it closes/opens popup when user tries to select text
    const dsps0 = onEvent(this.$refInput, "mousedown", () => {
      const allow = !this.$refInput.readOnly && !(this._opts.showCase & ShowCases.onClickInput);
      onInputStartClick = allow;
    });
    const dsps1 = onEvent(this, "click", (e) => {
      const skip = e.defaultPrevented || e.button || lblClick || onInputStartClick; // e.button > 0 if not left-click
      if (!skip) {
        if (clickAfterFocus) {
          r.finally(() => this.$isFocused && this.goShowMenu(ShowCases.onClick, e)); // menu must be opened if openByFocus is rejected
        } else {
          !this.#isShown ? this.goShowMenu(ShowCases.onClick, e) : this.goHideMenu(HideCases.onClick, e);
        }
      }
      lblClick = setTimeout(() => (lblClick = false));
    });

    const dsps2 = onEvent(document, "click", (e) => {
      !lblClick && !onInputStartClick && setTimeout(() => this.$isFocused && this.goHideMenu(HideCases.onClick, e)); // timeout to prevent show before focusLost
      onInputStartClick = false;
    });

    document.addEventListener(
      "pointerdown",
      () => {
        clickAfterFocus = false;
      },
      { once: true, passive: true, capture: true }
    );

    arr.push(dsps0, dsps1, dsps2);
    return arr;
  }

  protected override gotFocusLost(): void {
    !this.#isShown && !this._isHiding && this.removePopup(); // otherwise it's removed by hidingMenu
    this.goHideMenu(HideCases.onFocusLost);
    this.resetInputValue(); // to update/rollback input according to result
    super.gotFocusLost();
  }

  /** Called when user selected new value from menu and need to hide menu */
  protected selectValue(v: ValueType, canHideMenu = true): void {
    this.setValue(v, SetValueReasons.userSelect);
    canHideMenu && setTimeout(() => this.goHideMenu(HideCases.onSelect)); // without timeout it handles click by listener and opens again
  }

  /** Reset input to currentValue; called on focusOut, pressing Escape or Enter */
  protected resetInputValue(): void {
    const isClear = !this.$refInput.value && !this._selectedMenuItem; // if user cleared input and $hided menu - need to clearValue
    isClear
      ? this.setValue(undefined, SetValueReasons.clear)
      : this.setInputValue(this.$value, SetValueReasons.userSelect);
  }

  // @ts-expect-error - because expected string
  protected override setInputValue(v: ValueType | undefined, reason: SetValueReasons): void {
    const p = this.valueToInput(v);
    this.setInputValueDirect(p, reason);
  }

  protected setInputValueDirect(v: string, reason: SetValueReasons): void {
    super.setInputValue(v, reason);
  }

  /** Called when popup must be removed (by focus out OR if control removed) */
  protected removePopup(): void {
    this.$refPopup?.remove();
    this.$refPopup = undefined;
    this._focusedMenuItem = undefined;
    this._selectedMenuItem = undefined;
    if (this.#isShown) {
      this.#isShown = false;
      this.removeAttribute("opened");
      this.$refInput.setAttribute("aria-expanded", false);
      this.$refInput.removeAttribute("aria-activedescendant");
    }
  }

  protected override gotRemoved(): void {
    this.removePopup();
    super.gotRemoved();
  }
}

// WARN about chaining
/*
 $showMenu().then(()=> console.warn('done'))
 isShown: true >>> create popup,
 isShowing: true
 ...fetch menu-items (takes time)... >>> render popup with items
 ...animation (takes time)...
 isShowing: false
 >>> console.warn('done')
 show-event
 */

/*
 $hideMenu().then(()=> console.warn('done'))
 isShown: false
 isHiding: true
 ...animation...
 isHiding: false >>> remove popup if focus out
 >>> console.warn('done')
 hide-event
 */

// NiceToHave: option for press-Escape: hideMenu + rollback value to that was before showing OR only hideMenu; now WUPTime.$options.menuButtons changes such behavior
