import { onEvent } from "../indexHelpers";
import WUPPopupElement from "../popup/popupElement";
import { PopupOpenCases, PopupAnimations } from "../popup/popupElement.types";
import WUPBaseControl, { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";

export const enum ShowCases {
  /** When $openMenu() called programmatically; Don't use it for $options (it's for nested cycle) */
  onManualCall = 1,
  /** When control got focus via user interaction; ignores case when user changed value by click on item on clearButton
   * to change such behavior update WUPBaseComboControl.prototype.canOpenMenu */
  onFocus = 1 << 1,
  /** When control got focus programmatically (via option `autofocus` or when called method 'focus()') */
  onFocusAuto = 1 << 2,
  /** When user clicks on control (beside editable not-empty input) */
  onClick = 1 << 3,
  /** When user clicks on input (by default it's disabled rule to allow user to work with input without popup close/open blinks) */
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
      /** Fires after popup-menu is opened (after animation finishes) */
      $openMenu: Event;
      /** Fires after popup is closed (after animation finishes) */
      $closeMenu: Event;
    }
    interface ValidityMap extends Omit<WUP.Text.ValidityMap, "min" | "max" | "email"> {}
    interface NewOptions {
      /** Case when menu-popup to open; WARN ShowCases.inputClick doesn't work without ShowCases.click
       * @defaultValue onPressArrowKey | onClick | onFocus */
      showCase: ShowCases;
      /** Set true to make input not editable but allow select items via popup-menu (ordinary dropdown mode) */
      readOnlyInput: boolean | number;
    }
    interface Options<T = any, VM = ValidityMap> extends WUP.Text.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPBaseComboControl> extends WUP.Text.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      "w-showCase"?: ShowCases | number;
      "w-readOnlyInput"?: boolean | number;
    }
  }
}

/** Base abstract form-control for any control with popup-menu (Dropdown, Datepicker etc.) */
export default abstract class WUPBaseComboControl<
  ValueType = any,
  TOptions extends WUP.BaseCombo.Options = WUP.BaseCombo.Options,
  EventMap extends WUP.BaseCombo.EventMap = WUP.BaseCombo.EventMap
> extends WUPTextControl<ValueType, TOptions, EventMap> {
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
      :host label:after {
        content: "";
        -webkit-mask-image: var(--ctrl-icon-img);
        mask-image: var(--ctrl-icon-img);
      }
      @media not all and (prefers-reduced-motion) {
        :host label:after {
          transition: transform var(--anim);
        }
      }
      :host button[clear] {
        margin: 0;
      }
      :host > [menu] {
        padding: 0;
        max-height: 300px;
        z-index: 8010;
      }`;
  }

  static $defaults: WUP.BaseCombo.Options<any> = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
    },
    showCase: ShowCases.onClick | ShowCases.onFocus | ShowCases.onPressArrowKey,
    readOnlyInput: false,
  };

  /** Fires after popup-menu is opened (after animation finishes) */
  $onOpenMenu?: (e: Event) => void;
  /** Fires after popup is closed (after animation finishes) */
  $onCloseMenu?: (e: Event) => void;

  #isOpened = false;
  /** Returns if popup-menu is opened */
  get $isOpened(): boolean {
    return this.#isOpened;
  }

  /** Close popup-menu
   * @returns Promise resolved by animation time */
  async $closeMenu(): Promise<void> {
    await this.goCloseMenu(HideCases.onManualCall);
  }

  /** Open popup-menu
   * @returns Promise resolved resolved by animation time */
  async $openMenu(): Promise<void> {
    await this.goOpenMenu(ShowCases.onManualCall);
    this.#isOpened && (await this.$refPopup!.$open()); // wait for popup open-end
  }

  /** Reference to popupMenu */
  $refPopup?: WUPPopupElement;

  protected override renderControl(): void {
    super.renderControl();

    const i = this.$refInput;
    i.setAttribute("role", "combobox");
    i.setAttribute("aria-haspopup", "listbox");
    i.setAttribute("aria-expanded", false);
    i.focus = this.inputFocus; // assign custom method to detect how focus called
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
  /** Called when need to transfer current value to text-input (or string-value) */
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

  /** Override to change open-behavior */
  canOpenMenu(showCase: ShowCases, e?: MouseEvent | FocusEvent | KeyboardEvent | null): boolean {
    if (this.$isReadOnly || this.$isDisabled) {
      return false;
    }

    if (e && this.isLockInputDrodpown(e!)) {
      return false; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
    }

    const can = !!(this._opts.showCase & showCase) || showCase === ShowCases.onManualCall;
    return can;
  }

  protected async goOpenMenu(
    showCase: ShowCases,
    e?: MouseEvent | FocusEvent | KeyboardEvent | null
  ): Promise<WUPPopupElement | null> {
    if (this.#isOpened) {
      return this.$refPopup!;
    }
    const can = this.canOpenMenu(showCase, e);
    if (!can) {
      return null;
    }
    this.#isOpened = true;

    // this.$hideError(); // it resolves overflow menu vs error

    if (!this.$refPopup) {
      const p = document.createElement("wup-popup");
      this.$refPopup = p;
      p.$options.openCase = PopupOpenCases.alwaysOff;
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
      p.$options.animation = PopupAnimations.drawer;

      const menuId = this.#ctr.$uniqueId;
      const i = this.$refInput;
      i.setAttribute("aria-owns", menuId);
      i.setAttribute("aria-controls", menuId);

      // const wasFcs = this.$isFocused;
      this.renderMenu(p, menuId);
      // WARN: rollback the logic if renderMenu() returns Promise
      // const fcs = this.$isFocused;
      // if (!fcs && wasFcs) {
      //   this.#isOpened = false;
      //   this.removePopup(); // fix case when user waited for loading and moved focus to another
      //   return null;
      // }
      this.appendChild(p); // WARN: it will open onInit
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((res) => setTimeout(res)); // wait for appending to body so size is defined and possible to scroll
    }
    if (!this.#isOpened) {
      return null; // possible when user calls open & close sync
    }
    this.$refPopup.$open().then(() => this.fireEvent("$openMenu", { cancelable: false }));
    this.setAttribute("opened", "");
    this.$refInput.setAttribute("aria-expanded", true);
    // await r; // WARN: it's important don't wait for animation to assign onShow events fast

    return this.$refPopup;
  }

  /** Override to change close-behavior */
  canCloseMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): boolean {
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

    // always close by focusLost
    // if (hideCase === HideCases.onFocusLost && !(this._opts.showCase & ShowCases.onFocus)) {
    //   return false;
    // }

    return true;
  }

  protected _isClosing?: true;
  protected async goCloseMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): Promise<boolean> {
    if (!this.#isOpened || this._isClosing) {
      return false;
    }
    if (!this.canCloseMenu(hideCase, e)) {
      return false;
    }
    this.#isOpened = false;
    this._isClosing = true;
    await this.$refPopup?.$close();
    delete this._isClosing;
    if (this.#isOpened) {
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
    setTimeout(() => this.fireEvent("$closeMenu", { cancelable: false }));
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
    const isEscPrevent = this.#isOpened && e.key === "Escape";
    !isEscPrevent && super.gotKeyDown(e);

    if (e.altKey || e.shiftKey || e.ctrlKey) {
      return;
    }

    if (!this.#isOpened) {
      if (this._opts.showCase & ShowCases.onPressArrowKey) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault(); // to prevent parent-scroll
          this.goOpenMenu(ShowCases.onPressArrowKey, e).then(() => this.focusMenuItemByKeydown(e));
          return;
        }
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        this.resetInputValue();
        this.goCloseMenu(HideCases.OnPressEsc);
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
              this.goCloseMenu(HideCases.OnPressEnter);
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
    !this.$isOpened && this._opts.showCase & ShowCases.onInput && this.$isFocused && this.goOpenMenu(ShowCases.onInput);
    if (preventValueChange) {
      this._refHistory?.handleInput(e);
    } else {
      super.gotInput(e);
    }
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const arr = super.gotFocus(ev);

    // known issue: _isFocusCall missed when el.focus() + browser-tab not active. Reason: 'focusin' called only when browser-tab gets focus
    const sc = (this.$refInput as any)._isFocusCall ? ShowCases.onFocusAuto : ShowCases.onFocus;
    delete (this.$refInput as any)._isFocusCall;

    let isPreventedFromClick = false; // possible when user clicks on btnClear or on item inside input to remove it
    setTimeout(() => this.$isFocused && !isPreventedFromClick && this.goOpenMenu(sc, ev), 1); // filter in 1ms to avoid case when focusin + focusout at the same time

    let clickAfterFocus = true; // prevent clickAfterFocus
    let onInputStartClick = false; // mouseDown>selectText>mouseUp - without filter it closes/opens popup when user tries to select text
    const dsps0 = onEvent(this.$refInput, "mousedown", () => {
      const allow = !this.$refInput.readOnly && !(this._opts.showCase & ShowCases.onClickInput);
      onInputStartClick = allow;
    });

    let isInsideClick = false; // fix when labelOnClick > inputOnClick (twice in loop)
    const dsps1 = onEvent(this, "click", (e) => {
      isPreventedFromClick = e.defaultPrevented;
      const skip = e.defaultPrevented || e.button /* only left click */ || isInsideClick || onInputStartClick;
      if (!skip) {
        !this.#isOpened || clickAfterFocus
          ? this.goOpenMenu(ShowCases.onClick, e)
          : this.goCloseMenu(HideCases.onClick, e);
      }
      isInsideClick = true;
      setTimeout(() => (isInsideClick = false), 1);
    });

    const dsps2 = onEvent(document, "click", (e) => {
      // close by outside click
      !onInputStartClick && !isInsideClick && this.goCloseMenu(HideCases.onClick, e);
      onInputStartClick = false;
    });

    setTimeout(
      () =>
        document.addEventListener(
          "pointerdown",
          () => {
            clickAfterFocus = false;
          },
          { once: true, passive: true, capture: true }
        ),
      10
    ); // fix 10ms => testcase: point autofocus > remove browser focus (click outside browser) > reload page outside browser > click on ctrl with autofocus: menu blinks and hidden after a time but need to open in this case. Also ShowCases.onFocusAuto isn't detected in this case

    arr.push(dsps0, dsps1, dsps2);
    return arr;
  }

  protected override gotFocusLost(): void {
    !this.#isOpened && !this._isClosing && this.removePopup(); // otherwise it's removed by hidingMenu
    this.goCloseMenu(HideCases.onFocusLost);
    super.gotFocusLost();
  }

  /** Called when user selected new value from menu and need to close menu */
  protected selectValue(v: ValueType, canCloseMenu = true): void {
    this.setValue(v, SetValueReasons.userSelect);
    canCloseMenu && setTimeout(() => this.goCloseMenu(HideCases.onSelect)); // without timeout it handles click by listener and opens again
  }

  /** Reset input to currentValue; called on pressing Escape or Enter */
  protected resetInputValue(): void {
    if (this._inputError) {
      this.$showError(this._inputError); // case when mask/parse applied and need to open input error without changing
      return;
    }
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
    if (this.#isOpened) {
      this.#isOpened = false;
      this.removeAttribute("opened");
      this.$refInput.setAttribute("aria-expanded", false);
      this.$refInput.removeAttribute("aria-activedescendant");
    }
  }

  protected override gotRemoved(): void {
    this.removePopup();
    super.gotRemoved();
  }

  private inputFocus(this: HTMLInputElement & { _isFocusCall?: boolean }): void {
    this._isFocusCall = true;
    HTMLInputElement.prototype.focus.call(this);
    delete this._isFocusCall;
  }
}

// WARN about chaining
/*
 $openMenu().then(()=> console.warn('done'))
 isOpened: true >>> create popup,
 isOpening: true
 ...fetch menu-items (takes time)... >>> render popup with items
 ...animation (takes time)...
 isOpening: false
 >>> console.warn('done')
 open-event
 */

/*
 $closeMenu().then(()=> console.warn('done'))
 isOpened: false
 isClosing: true
 ...animation...
 isClosing: false >>> remove popup if focus out
 >>> console.warn('done')
 close-event
 */

// NiceToHave: option for press-Escape: hideMenu + rollback value to that was before showing OR only hideMenu; now WUPTime.$options.menuButtons changes such behavior
