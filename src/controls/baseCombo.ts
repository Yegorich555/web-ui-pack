// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases as PopupShowCases, WUPPopup } from "../popup/popupElement";
import popupListenTarget from "../popup/popupListenTarget";
import WUPTextControl, { WUPTextIn } from "./text";

export namespace WUPBaseComboIn {
  export interface Defs {
    /** Wait for pointed time before show-error (sumarized with $options.debounce);
     *  @defaultValue 0 */
    validityDebounceMs?: number;
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
  /** When $show() fired programmatically; Don't use it for $options */
  onManualCall = 1,
  /** When user types text */
  onInput = 1 << 1,
  /** When user presses arrowUp/arrowDown */
  onPressArrowKey = 1 << 2,
  /** When user clicks on control (beside editable not-empty input) */
  onClick = 1 << 3,
  /** When control got focus */
  onFocus = 1 << 3,
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
      $show: Event;
      $hide: Event;
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

  static get $style(): string {
    return `${super.$style}
      :host {
        cursor: pointer;
      }
      :host input:not(:placeholder-shown) {
        cursor: text;
      }
      :host input:read-only {
        cursor: pointer;
      }
      :host label::after {
        content: "";
        width: var(--ctrl-icon-size);
        min-height: var(--ctrl-icon-size);

        background-color: var(--ctrl-icon);
        -webkit-mask-image: var(--ctrl-icon-img);
        mask-image: var(--ctrl-icon-img);
        -webkit-mask-size: var(--ctrl-icon-size);
        mask-size: var(--ctrl-icon-size);
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
    showCase: ShowCases.onClick | ShowCases.onFocus | ShowCases.onPressArrowKey,
  };

  $options: WUPBaseCombo.Options<ValueType> = {
    ...this.#ctr.$defaults,
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
  }

  protected override gotChanges(propsChanged: Array<keyof WUPBaseCombo.Options> | null) {
    super.gotChanges(propsChanged as any);

    this._opts.readOnlyInput
      ? this.$refInput.removeAttribute("aria-autocomplete")
      : this.$refInput.setAttribute("aria-autocomplete", "list");

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
            s === WUPPopup.HideCases.onTargetClick
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

  gotFormChanges(propsChanged: Array<keyof WUPForm.Options> | null) {
    super.gotFormChanges(propsChanged);
    this.$refInput.readOnly = this.$refInput.readOnly || (this._opts.readOnlyInput as boolean);
  }

  /** Fired when need to create menu in opened popup */
  protected abstract renderMenu(popup: WUPPopupElement, menuId: string): Promise<void> | void;
  // todo required abstract valueToInput, valueFromInput

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goShowMenu(showCase: ShowCases, e?: MouseEvent | FocusEvent | null): Promise<WUPPopupElement | null> {
    if (this.$isReadOnly) {
      return null;
    }

    if (
      showCase === ShowCases.onClick &&
      e?.target instanceof HTMLInputElement &&
      !e.target.readOnly &&
      this.contains(e.target) &&
      e.target.value !== ""
    ) {
      return null; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
    }

    if (this.#isOpen) {
      return this.$refPopup!;
    }

    this.#isOpen = true;
    this.$hideError(); // it resolves overflow menu vs error

    if (!this.$refPopup) {
      const p = document.createElement("wup-popup");
      this.$refPopup = p;
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

      await this.renderMenu(p, menuId);
      // fix case when user waited for loading and moved focus to another
      if (!this.$isFocused) {
        this.#isOpen = false;
        this.removePopup();
        return null;
      }
      this.appendChild(p);
    }
    await this.$refPopup.$show();

    this.setAttribute("opened", "");
    this.$refInput.setAttribute("aria-expanded", "true");

    // call for ref-listener to apply events properly
    showCase !== ShowCases.onClick &&
      showCase !== ShowCases.onFocus &&
      this.#popupRefs!.show(WUPPopup.ShowCases.always);

    setTimeout(() => this.fireEvent("$show", { cancelable: false }));
    return this.$refPopup;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async goHideMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null): Promise<boolean> {
    if (
      hideCase === HideCases.onClick &&
      e?.target instanceof HTMLInputElement &&
      !e.target.readOnly &&
      this.contains(e.target) &&
      e.target.value !== ""
    ) {
      return false; // if input readonly > dropdown behavior otherwise allow to work with input instead of opening window
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

      wasOpen && (await this.$refPopup.$hide());

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
    this.$refInput.setAttribute("aria-expanded", "false");
    this.focusMenuItem(null, undefined);
    setTimeout(() => this.fireEvent("$hide", { cancelable: false }));
    return true;
  }

  #focusedMenuItem?: HTMLElement | null;
  #focusedMenuValue?: ValueType | undefined;
  /** Focus item by index or reset is index is null (via aria-activedescendant).
   *  If menuItems is filtered by input-text than index must point on filtered array */
  protected focusMenuItem(next: HTMLElement | null, nextValue: ValueType | undefined) {
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
  protected selectMenuItem(next: HTMLElement | null) {
    this.#selectedMenuItem?.setAttribute("aria-selected", "false");

    if (next) {
      next.setAttribute("aria-selected", "true");
      setTimeout(() => {
        const ifneed = (next as any).scrollIntoViewIfNeeded as undefined | ((center?: boolean) => void);
        ifneed ? ifneed.call(next, false) : next.scrollIntoView();
      }); // timeout to wait to popup to start opening otherwise scroll doesn't work
    }
    this.#selectedMenuItem = next;
  }

  protected override async gotKeyDown(e: KeyboardEvent) {
    // don't allow to process Esc-key when menu is opened
    const isEscPrevent = this.#isOpen && e.key === "Escape";
    !isEscPrevent && super.gotKeyDown(e);

    if (e.altKey || e.shiftKey || e.ctrlKey) {
      return;
    }

    if (e.key === "ArrowDown") {
      !this.#isOpen && (await this.goShowMenu(ShowCases.onPressArrowKey));
    } else if (e.key === "ArrowUp") {
      !this.#isOpen && (await this.goShowMenu(ShowCases.onPressArrowKey));
    }

    if (!this.#isOpen) {
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      this.setValue(this.$value);
      await this.goHideMenu(HideCases.OnPressEsc);
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.setValue(this.#focusedMenuValue);
      await this.goHideMenu(HideCases.OnPressEnter);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override async gotInput(e: Event & { currentTarget: HTMLInputElement }) {
    !this.$isOpen && this._opts.showCase & ShowCases.onInput && (await this.goShowMenu(ShowCases.onInput));
  }

  protected override clearValue(canValidate = true) {
    super.clearValue(!this.#isOpen && canValidate);
  }

  protected removePopup() {
    this.$refPopup?.remove();
    this.$refPopup = undefined;
    this.#focusedMenuItem = undefined;
    this.#focusedMenuValue = undefined;
  }

  protected gotRemoved() {
    this.removePopup();
    // remove resources for case when control can be appended again
    this.#isOpen = false;
    this.#popupRefs = undefined;

    super.gotRemoved();
  }
}
