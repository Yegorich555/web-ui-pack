import { isAnimEnabled } from "../helpers/animate";
import { onEvent } from "../indexHelpers";
import WUPPopupElement from "../popup/popupElement";
import { WUPcssIcon } from "../styles";
import WUPSelectControl from "./select";

const tagName = "wup-selectmany";

declare global {
  namespace WUP.SelectMany {
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap {}
    interface Defaults<T = any, VM = ValidityMap> extends WUP.Select.Defaults<T, VM> {
      /** Hide items in menu that selected
       * @defaultValue false */
      hideSelected?: boolean;
    }
    interface Options<T = any, VM = ValidityMap> extends WUP.Select.Options<T, VM>, Defaults<T, VM> {}
    interface Attributes extends WUP.Select.Attributes {}
    interface JSXProps<C = WUPSelectManyControl> extends WUP.Select.JSXProps<C>, Attributes {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectManyControl; // add element to document.createElement
  }

  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.SelectMany.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with dropdown/combobox behavior & ability to select several items
 * @example
  const el = document.createElement("wup-selectmany");
  el.$options.name = "gender";
  el.$options.items = [
    { value: 1, text: "Male" },
    { value: 2, text: "Female" },
    { value: 3, text: "Other/Skip" },
  ];
  el.$initValue = [3];
  el.$options.validations = { required: true };
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-selectmany name="gender" initvalue="window.myInitValue" validations="myValidations" items="window.myDropdownItems" />
  </wup-form>;
  @tutorial Troubleshooting
 * * Accessibility. Screen readers announce 'blank' when focus on not-empty control.
   Solution not found (using contenteditable fixes this but provides more other bugs)
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <span [item]>Item 1</span>
 *      <span [item]>Item 2</span>
 *      // etc/
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
export default class WUPSelectManyControl<
  ValueType = any,
  EventMap extends WUP.SelectMany.EventMap = WUP.SelectMany.EventMap
> extends WUPSelectControl<ValueType[], ValueType, EventMap> {
  #ctr = this.constructor as typeof WUPSelectManyControl;

  static get $styleRoot(): string {
    return `:root {
        --ctrl-select-item: inherit;
        --ctrl-select-item-bg: rgba(0,0,0,0.04);
        --ctrl-select-item-del-display: none;
        --ctrl-select-item-del: var(--ctrl-icon);
        --ctrl-select-item-del-img: var(--wup-icon-cross);
        --ctrl-select-item-del-size: 0.8em;
        --ctrl-select-gap: 6px;
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host strong {
        top: 1.6em;
        margin: calc(var(--ctrl-select-gap) / 2);
      }
      :host label > span {
        flex-wrap: wrap;
        flex-direction: row;
        padding: var(--ctrl-padding);
        padding-left: 0; padding-right: 0;
        margin: calc(var(--ctrl-select-gap) / -2);
      }
      :host [item],
      :host input {
        margin: calc(var(--ctrl-select-gap) / 2);
        padding: var(--ctrl-select-gap);
      }
      :host input {
        flex: 1 1 auto;
        width: 0;
        min-width: 2em;
        padding-left: 0; padding-right: 0;
      }
      :host [item] {
        --ctrl-icon: var(--ctrl-select-item-del);
        --ctrl-icon-size: var(--ctrl-select-item-del-size);
        --ctrl-icon-img: var(--ctrl-select-item-del-img);
        color: var(--ctrl-select-item);
        background-color: var(--ctrl-select-item-bg);
        border-radius: var(--ctrl-border-radius);
        cursor: pointer;
        box-sizing: border-box;
        white-space: nowrap;
        overflow: hidden;
      }
      :host [item]:after {
        ${WUPcssIcon}
        display: var(--ctrl-select-item-del-display);
        content: "";
        padding: 0;
        margin-left: 0.5em;
      }
      @media (hover: hover) and (pointer: fine) {
        :host [item]:hover {
          --ctrl-icon: var(--ctrl-err-text);
          text-decoration: line-through;
          color: var(--ctrl-err-text);
          background-color: var(--ctrl-err-bg);
        }
      }
      @media not all and (pointer: fine) {
        :host:focus-within [item]:active {${
          "" // todo issue 1st touch set focus and makes item:active for small time - but it's wrong
          /* WARN: on Safari active is event on during the touchMove, but android: none */
        }
          --ctrl-icon: var(--ctrl-err-text);
          text-decoration: line-through;
          color: var(--ctrl-err-text);
          background-color: var(--ctrl-err-bg);
        }
        :host [item] {
          user-select: none;
          -webkit-user-select: none;
        }${/* to show remove-decoration instead of text-selection */ ""}
      }
      @media not all and (prefers-reduced-motion) {
        :host [item][removed] {
          transition: all var(--anim-time) ease-in-out;
          padding-left: 0; padding-right: 0;
          margin-left: 0; margin-right: 0;
          width: 0;
          opacity: 0;
        }
      }`;
  }

  static override $isEmpty(v: unknown[] | undefined): boolean {
    return !v || v.length === 0;
  }

  static override $filterMenuItem(
    this: WUPSelectManyControl,
    menuItemText: string,
    menuItemValue: any,
    inputValue: string,
    inputRawValue: string
  ): boolean {
    if (this._opts.hideSelected && this.$value?.includes(menuItemValue)) {
      return false;
    }
    return super.$filterMenuItem.call(this, menuItemText, menuItemValue, inputValue, inputRawValue);
  }

  static $defaults: WUP.SelectMany.Defaults = {
    ...WUPSelectControl.$defaults,
  };

  $options: WUP.SelectMany.Options = {
    ...this.#ctr.$defaults,
    multiple: true,
    items: [],
  };

  protected override _opts = this.$options;

  /** Items selected & rendered on control */
  $refItems?: Array<HTMLElement & { _wupValue: ValueType }>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canParseInput(_text: string): boolean {
    return false; // disable behavior from select[mulitple]
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Select.Options> | null): void {
    this._opts.multiple = true;
    this.removeAttribute("multiple");
    super.gotChanges(propsChanged);
  }

  protected override async renderMenu(popup: WUPPopupElement, menuId: string): Promise<HTMLElement> {
    const r = await super.renderMenu(popup, menuId);
    this.filterMenuItems();
    return r;
  }

  /** Called to update/remove selected items on control */
  protected renderItems(v: ValueType[], all: WUP.Select.MenuItems<any>): void {
    const refs = this.$refItems ?? [];
    v.forEach((vi, i) => {
      let r = refs[i];
      if (!r) {
        r = this.$refInput.parentNode!.insertBefore(document.createElement("span"), this.$refInput) as HTMLElement & {
          _wupValue: ValueType;
        };
        r.setAttribute("item", "");
        r.setAttribute("aria-hidden", true);
        refs.push(r);
      }

      if (r._wupValue !== vi) {
        r.textContent = this.valueToText(vi, all);
        r._wupValue = vi;
      }
    });

    const toRemove = refs.length - v.length;
    toRemove > 0 && refs.splice(v.length, toRemove).forEach((el) => !el.hasAttribute("removed") && el.remove()); // remove previous items
    this.$refPopup && this.filterMenuItems(); // NiceToHave it can be optimized because on Remove/Select we can hide/show specific item
    this.$refItems = refs;

    this.ariaSpeakValue();
  }

  /** Announce items as single value on change if element is focused */
  protected ariaSpeakValue(): void {
    this.$isFocused &&
      this.$refItems?.length &&
      this.$ariaSpeak(this.$refItems.map((el) => el.textContent).join(","), 0);
  }

  /** Hide/Show input when it's required to fix the following case:
   *
   *  All items + input in flexbox so when no-enough space for input in the last line it moves input to new line and creates extra space */
  protected toggleHideInput(v: ValueType[] | undefined): void {
    // WARN we can't use this.$isEmpty because valueToInput > toggleHideInput is called before value set
    const canShow = this.#ctr.$isEmpty(v) || (this.$isFocused && !(this._opts.readOnly || this._opts.readOnlyInput));
    this.$refInput.className = canShow ? "" : this.#ctr.classNameHidden;
  }

  protected resetInputValue(): void {
    this.$refInput.value = this.valueToInput(this.$value as ValueType[], true);
  }

  protected override valueToInput(v: ValueType[] | undefined, isReset?: boolean): string {
    !isReset && this.getItems().then((items) => this.renderItems(v ?? [], items));
    this.toggleHideInput(v);
    return this.$isFocused || !v?.length ? "" : " "; // otherwise broken css:placeholder-shown
  }

  // @ts-expect-error - because expected v: ValueType[]
  protected override selectValue(v: ValueType, canHideMenu = true): void {
    canHideMenu = canHideMenu || (this.$value !== undefined && this.$value.length + 1 === this._menuItems!.all!.length);
    super.selectValue(v as any, canHideMenu);
    this._opts.hideSelected && this.focusMenuItem(null);
  }

  protected selectMenuItemByValue(v: ValueType[] | undefined): void {
    !this._opts.hideSelected && super.selectMenuItemByValue(v);
  }

  protected override selectMenuItem(next: HTMLElement | null): void {
    !this._opts.hideSelected && super.selectMenuItem(next);
  }

  protected override clearFilterMenuItems(): void {
    !this._opts.hideSelected && super.clearFilterMenuItems(); // skip this because default filtering doesn't reset after re-opening menu
  }

  /** Called to remove item with animation */
  protected removeValue(index: number): void {
    const item = this.$refItems![index];
    const isAnim = isAnimEnabled();
    if (isAnim) {
      this.$refItems!.splice(index, 1); // otherwise item is replaced
      item.style.width = `${item.offsetWidth}px`;
      item.setAttribute("removed", "");
      setTimeout(() => (item.style.width = ""));
      const ms = Number.parseInt(window.getComputedStyle(item).getPropertyValue("--anim-time"), 10); // WARN: expected anim-time: 200ms
      setTimeout(() => item.remove(), ms); // otherwise item is removed immediately in setValue...
    }

    this.$value!.splice(index, 1);
    this.setValue(this.$value!.length ? [...this.$value!] : undefined);
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const r = super.gotFocus(ev);

    this.ariaSpeakValue();
    this.$refInput.value = "";
    this.toggleHideInput(this.$value);

    // https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
    // WARN: the right way is 'window.matchMedia("(pointer: coarse)").matches' but we must be correlated with css-hover styles
    const isTouchScreen = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let preventClickAfterFocus = isTouchScreen; // allow focus by touch-click instead of focus+removeItem (otherwise difficult to focus control without removing item when no space)
    isTouchScreen && setTimeout(() => (preventClickAfterFocus = false));

    const dsps = onEvent(
      this.$refInput.parentElement!,
      "click",
      (e) => {
        if (e.button || this.$isDisabled || this.$isReadOnly || preventClickAfterFocus) {
          return;
        }
        const t = e.target;
        const eli = this.$refItems?.findIndex((li) => li === t || this.includes.call(li, t));
        if (eli != null && eli > -1) {
          e.preventDefault(); // to prevent open/hide popup
          this.removeValue(eli);
        }
      },
      { passive: false }
    );
    r.push(dsps);

    const dsps2 = onEvent(this.$refInput, "blur", () => {
      if (!this.$refInput.value) {
        this.$refInput.value = " "; // fix label position trigerring: testcase focus>long mouseDown outside>blur - label must save position
      }
    });
    r.push(dsps2);

    return r;
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    this.toggleHideInput(this.$value);
  }
}

customElements.define(tagName, WUPSelectManyControl);

// todo allowNewValue
// todo keyboard
// todo drag & drop

/**
 * known issues when 'contenteditable':
 *
 *  <span contenteditalbe='true'>
 *    <span></span>
 *    <span contenteditalbe='false'>Item 1</span>
 *    <span></span>
 *    <span contenteditalbe='false'>Item 2</span>
 *    <span>Input text here</span>
 *  </span>
 * 01. NVDA. Reads only first line (the same issue for textarea)
 * 02. NVDA. Reads only first item in Firefox (when :after exists)
 * 1. Firefox. Carret position is wrong/missed between Items is use try to use ArrowKeys
 * 2. Firefox. Carret position is missed if no empty spans between items
 * 3. Without contenteditalbe='false' browser moves cursor into item, but it should be outside
 */
