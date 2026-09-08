import { isAnimEnabled } from "../helpers/animate";
import { parseMsTime } from "../helpers/styleHelpers";
import { onEvent } from "../indexHelpers";
import WUPPopupElement from "../popup/popupElement";
import WUPSortElement from "../sortElement";
import { WUPcssIcon, WUPcssScrollSmall } from "../styles";
import { MenuOpenCases } from "./baseCombo";
import { SetValueReasons } from "./baseControl";
import WUPSelectControl from "./select";

const tagName = "wup-selectmany";

declare global {
  namespace WUP.SelectMany {
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap {}
    interface NewOptions {
      /** Hide items in menu that selected
       * @defaultValue false */
      hideSelected: boolean;
      /** Allow user to change ordering of items; Use drag&drop or keyboard Shift/Ctrl/Meta + arrows to change item position;
       * dragging an item outside the control removes it
       * @defaultValue false */
      sortable: boolean;
    }
    interface Options<T = any, VM = ValidityMap> extends WUP.Select.Options<T, VM>, NewOptions {
      /** @readonly Constant value that impossible to change */
      multiple: true;
      /** @deprecated Not supported in SelectManyControl */
      prefix?: string | null | undefined;
      /** @deprecated Not supported in SelectManControl */
      postfix?: string | null | undefined;
    }
    interface JSXProps<C = WUPSelectManyControl> extends WUP.Select.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      "w-hideSelected"?: boolean | "";
      "w-sortable"?: boolean | "";
      /** @deprecated Not supported in SelectManyControl */
      "w-prefix"?: any;
      /** @deprecated Not supported in SelectManyControl */
      "w-postfix"?: any;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectManyControl; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with dropdown/combobox behavior
       *  @see {@link WUPSelectManyControl} */
      [tagName]: WUP.Base.ReactHTML<WUPSelectManyControl> & WUP.SelectMany.JSXProps; // add element to tsx/jsx intellisense (react)
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
       *  @see {@link WUPSelectManyControl} */
      [tagName]: HTMLAttributes<WUPSelectManyControl> & WUP.SelectMany.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Form-control with dropdown/combobox behavior
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/selectMany}
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
    <wup-selectmany w-name="gender" w-initvalue="window.myInitValue" w-validations="myValidations" w-items="window.myDropdownItems" />
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
  TOptions extends WUP.SelectMany.Options = WUP.SelectMany.Options,
  EventMap extends WUP.SelectMany.EventMap = WUP.SelectMany.EventMap
> extends WUPSelectControl<ValueType[], ValueType, TOptions, EventMap> {
  #ctr = this.constructor as typeof WUPSelectManyControl;

  static get $styleRoot(): string {
    return `:root {
        --ctrl-select-item-text: inherit;
        --ctrl-select-item-bg: rgba(0,0,0,0.04);
        --ctrl-select-item-del-display: none;
        --ctrl-select-item-del: var(--ctrl-icon);
        --ctrl-select-item-del-img: var(--wup-icon-cross);
        --ctrl-select-item-del-size: 0.8em;
        --ctrl-select-gap: 0.5em;
      }
      [wupdark] {
        --ctrl-select-item-bg: #fff2;
        --ctrl-select-item-del: var(--ctrl-icon);
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host label {
        position: relative;
      }
      ${WUPcssScrollSmall(":host label>span")}
      :host label > span {
        position: initial;
        overflow: auto;
        gap: var(--ctrl-select-gap);
        flex-wrap: wrap;
        flex-direction: row;
        margin: var(--ctrl-padding);
        padding: 0;
        margin-left: 0;
        margin-right: 0;
        max-height: 5em;
      }
      :host strong {
        top: 1.6em;
        margin: var(--ctrl-padding);
        margin-top: 0;
        margin-bottom: 0;
      }
      :host[filled] strong {
        transform: var(--ctrl-label-active-pos);
      }
      :host [item],
      :host input {
        padding: var(--ctrl-select-gap);
      }
      :host input {
        flex: 1 1 auto;
        width: 0;
        min-width: 1em;
        padding-left: 0; padding-right: 0;
      }
      :host[filled] input:placeholder-shown,
      :host[filled] input:not(:focus) {
        min-width: 0;
        padding-left: calc(var(--ctrl-select-gap));
        margin-right: 0;
        margin-left: calc(-1 * var(--ctrl-select-gap));
      }
      :host [item] {
        --ctrl-icon: var(--ctrl-select-item-del);
        --ctrl-icon-size: var(--ctrl-select-item-del-size);
        --ctrl-icon-img: var(--ctrl-select-item-del-img);
        color: var(--ctrl-select-item-text);
        background-color: var(--ctrl-select-item-bg);
        border-radius: var(--ctrl-border-radius);
        cursor: pointer;
        box-sizing: border-box;
        white-space: nowrap;
        overflow: hidden;
        flex: 0 0 auto;
      }
      :host [item]:after {
        ${WUPcssIcon}
        display: var(--ctrl-select-item-del-display);
        content: "";
        padding: 0;
        margin-left: 0.5em;
      }
      :host [item][focused] {
        color: var(--ctrl-focus-label);
        box-shadow: inset 0 0 3px 0 var(--ctrl-focus);
      }
      :host [item][removed],
      :host [item][drag][remove]  {
        --ctrl-icon: var(--ctrl-err);
        text-decoration: line-through;
        color: var(--ctrl-err);
        background-color: var(--ctrl-err-bg);
      }
      :host[readonly] [item] {
        pointer-events: none;
        touch-action: none;
      }
      :host button[clear] {
        display: inline-block;
        opacity: 0;
      }
      @media (hover: hover) and (pointer: fine) {
        :host [item]:hover {
          --ctrl-icon: var(--ctrl-err);
          text-decoration: line-through;
          color: var(--ctrl-err);
          background-color: var(--ctrl-err-bg);
        }
      }
      @media not all and (pointer: fine) {
        :host [item] {
          -webkit-user-select: none;
          user-select: none;
        }${/* don't allow select text on blocks to allow custom touch-logic */ ""}
      }
      @media not all and (prefers-reduced-motion) {
        :host [item][removed] {
          transition: all var(--anim-t) ease-in-out;
          transition-property: margin, padding, width, opacity;
          padding-left: 0; padding-right: 0;
          margin-left: 0; margin-right: 0;
          width: 0;
          opacity: 0;
        }
      }
      ${
        /* dragdrop styles ([drag], [drop], [drop-line], [hovered]) are reused from the sortElement: see $options.sortable
            WARN: $styleRoot of the sortElement isn't appended (see $attach with selectorName:null) - so its css-vars are defined here */ ""
      }
      :host {
        --sort-active-color: var(--ctrl-focus-label);
        --sort-active-shadow: var(--ctrl-focus);
      }
      ${WUPSortElement.$style}
      ${/* WARN: after the styles above - the drag-clone must keep colors of an ordinary item */ ""}
      :host [item][drag] {
        --ctrl-icon: var(--ctrl-select-item-del);
        color: var(--ctrl-select-item-text);
        background-color: var(--ctrl-select-item-bg);
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

  static $defaults: WUP.SelectMany.Options = {
    ...WUPSelectControl.$defaults,
    multiple: true,
    sortable: false,
    hideSelected: false,
  };

  /** Items selected & rendered on control */
  $refItems?: Array<HTMLElement & { _wupValue: ValueType }>;

  protected override renderControl(): void {
    super.renderControl();
    // Move ctrl-label outside scrollable part
    this.$refLabel.prepend(this.$refTitle); // WARN: expected browser won't autofill this type of control - otherwise it doesn't work
  }

  protected override canHandleUndo(): boolean {
    return false; // custom history not required for this control
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override canParseInput(_text: string): boolean {
    return false; // disable behavior from select[multiple]
  }

  override parseInput(text: string): ValueType[] | undefined {
    // WARN must be called only on allowNewValue
    // @ts-expect-error: because declared as constant true
    this._opts.multiple = false;
    const vi = super.parseInput(text) as ValueType | undefined;
    this._opts.multiple = true;
    if (vi === undefined || this.$value?.some((v) => this.#ctr.$isEqual(v, vi, this))) {
      return this.$value; // no-changes, no-duplicates
    }
    return this.$value ? [...this.$value, vi] : [vi];
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Select.Options> | null): void {
    this._opts.multiple = true;
    this.removeAttribute("w-multiple");
    super.gotChanges(propsChanged);

    this._opts.sortable ??= false;
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options | keyof WUP.BaseCombo.Options> | null): void {
    super.gotFormChanges(propsChanged);
    // WARN: it's here (not in gotChanges) - because `readOnly`/`disabled` can be changed by the parent form
    if (this._opts.sortable && !this.$isReadOnly && !this.$isDisabled) {
      this._disposeDragdrop ??= this.applyDragdrop();
    } else {
      this._disposeDragdrop?.call(this);
      this._disposeDragdrop = undefined;
    }
  }

  /** Call it to remove dragdrop logic */
  _disposeDragdrop?: () => void;
  /** Called to apply dragdrop logic: sorting items by dragging & removing an item when it's dragged outside the control
   * @returns detach-function */
  protected applyDragdrop(): () => void {
    type Items = Array<HTMLElement & { _wupValue: ValueType }>;
    return WUPSortElement.$attach(
      this,
      (_newOrderedIndexes, items, removedIndex) => {
        this.$refItems = items as Items; // items are ordered as they are rendered - so the value is built from them
        if (removedIndex !== -1) {
          this.removeValue(removedIndex); // WARN: it removes the item from the DOM (with animation) & fires setValue
        } else {
          this.setValue(
            this.$refItems.map((a) => a._wupValue),
            SetValueReasons.userInput
          );
        }
      },
      {
        selectorName: null, // because styles are defined in $style of this control
        canRemove: true,
      }
    );
  }

  override canOpenMenu(openCase: MenuOpenCases, e?: MouseEvent | FocusEvent | KeyboardEvent | null): boolean {
    // WARN: the drag-clone is removed only when the return-animation is finished (after pointerup) - so it exists when user tries sorting & focus/click got after pointerUp
    return !this.querySelector("[item][drag]") && super.canOpenMenu(openCase, e);
  }

  protected override renderMenu(popup: WUPPopupElement, menuId: string): HTMLElement {
    const r = super.renderMenu(popup, menuId);
    this.filterMenuItems();
    return r;
  }

  /** Called to update/remove selected items on control */
  protected renderItems(v: ValueType[], all: WUP.Select.MenuItem<any>[]): void {
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

  protected resetInputValue(): void {
    this.$refInput.value = this.valueToInput(this.$value as ValueType[], true);
  }

  protected override valueToInput(v: ValueType[] | undefined, isReset?: boolean): string {
    // WARN: items can be not fetched yet (when $options.items is a Promise): in this case rendering is skipped
    // because it's called again with fetched items - see fetchItems()
    !isReset &&
      setTimeout(() => {
        const all = this._cachedItems;
        (all || !v?.length) && this.renderItems(v ?? [], all ?? []); // empty value doesn't require items to render
      }); // timeout required otherwise filter is reset by empty input
    return this.$isFocused || !v?.length ? "" : " "; // otherwise broken css:placeholder-shown
  }

  // @ts-expect-error - because expected v: ValueType[]
  protected override selectValue(v: ValueType, canCloseMenu = true): void {
    super.selectValue(v as any, canCloseMenu);
    this._opts.hideSelected && this.focusMenuItem(null);
  }

  /** Index of focused value-item */
  _focusIndex?: number;
  /** Focus value-item by index (related to this.$refItems) */
  protected focusItemByIndex(i: number | null): void {
    const el = i == null ? null : this.$refItems![i];
    this.focusMenuItem(el);
    if (el) {
      el.setAttribute("role", "option"); // otherwise NVDA doesn't allow to use Arrow to goto
      el.removeAttribute("aria-hidden");
      el.removeAttribute("aria-selected"); // attribute appended by selectControl
    }
    this._focusIndex = i ?? undefined;
  }

  protected override focusMenuItem(next: HTMLElement | null): void {
    if (this._focusIndex != null) {
      const prev = this.$refItems![this._focusIndex];
      if (prev) {
        prev.setAttribute("aria-hidden", true);
        prev.removeAttribute("role");
      }
      this._focusIndex = undefined;
    }
    super.focusMenuItem(next);
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
    const item = this.$refItems!.splice(index, 1)[0]; // otherwise item is replaced
    this._focusIndex === index && this.focusItemByIndex(null);

    let ms = 0;
    const isAnim = isAnimEnabled();
    if (isAnim) {
      item.style.width = `${item.offsetWidth}px`;
      item.setAttribute("removed", "");
      setTimeout(() => (item.style.width = ""));
      ms = parseMsTime(window.getComputedStyle(item).getPropertyValue("--anim-t"));
    }
    item.setAttribute("item", "false"); // to exclude the item from the sort-logic while the remove-animation is running
    setTimeout(() => item.remove(), ms);

    // WARN: it's based on $refItems (not on $value) - because the order can be changed by dragging before the item is removed
    const v = this.$refItems!.map((a) => a._wupValue);
    this.setValue(v.length ? v : undefined, SetValueReasons.userInput);
  }

  protected override setValue(v: ValueType[] | undefined, reason: SetValueReasons, skipInput = false): boolean | null {
    const isChanged = super.setValue(v, reason, skipInput);
    isChanged !== false && this.setAttr("filled", !this.$isEmpty, true);
    return isChanged;
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const r = super.gotFocus(ev);

    this.ariaSpeakValue();
    this.$refInput.value = "";

    // https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
    const isTouchScreen = !window.matchMedia("(hover: hover) and (pointer: fine)").matches; // WARN: 'window.matchMedia("(pointer: coarse)").matches' but it's correlated with css-hover styles
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
      this.$refInput.value = " "; // fix label position trigerring: testcase focus>long mouseDown outside>blur - label must save position
      onEvent(this.$refInput, "focus", () => (this.$refInput.value = ""), { once: true }); // case: user click on browser console and click again on control: in this case gotFocus isn't fired
    });
    r.push(dsps2);

    return r;
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    this.focusItemByIndex(null);
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    super.gotKeyDown(e);

    if (!(this.$refInput.selectionEnd === 0 && this.$refItems?.length)) {
      return;
    }

    let handled = true;
    if (e.shiftKey) {
      if (!this._opts.sortable || this._focusIndex == null) {
        return;
      }
      const prev = this._focusIndex;
      const trg = this.$refItems[prev];
      let isR = false;
      const lastInd = this.$refItems.length - 1;
      switch (e.key) {
        case "ArrowLeft":
          this._focusIndex = this._focusIndex > 0 ? this._focusIndex - 1 : lastInd;
          break;
        case "ArrowRight":
          this._focusIndex = this._focusIndex < lastInd ? this._focusIndex + 1 : 0;
          isR = true;
          break;
        default:
          handled = false;
          break;
      }

      if (handled) {
        e.preventDefault();
        // if (prev !== this._focusIndex) {
        trg.parentElement!.insertBefore(
          trg,
          this._focusIndex === lastInd
            ? this.$refInput
            : this.$refItems[isR && this._focusIndex !== 0 ? this._focusIndex + 1 : this._focusIndex]
        );
        this.$refItems.splice(this._focusIndex, 0, this.$refItems.splice(prev, 1)[0]);
        this.setValue(
          this.$refItems.map((a) => a._wupValue),
          SetValueReasons.userInput
        );
        // }
      }
      return;
    }

    let next = this._focusIndex ?? null;
    const len = this.$refItems.length;
    switch (e.key) {
      case "Enter":
        if (next != null) {
          this._focusIndex = undefined; // WARN Enter fired click after empty timout but need to reset index immediately to focus next
          next = Math.max(0, next - 1);
        } else {
          handled = false; // it must be skipped if handled above otherwise auto-focus on select menu item by Enter
        }
        break;
      case "Backspace":
        if (next != null) {
          this.removeValue(next);
          next = !this.$refItems.length ? null : Math.max(0, next - 1);
          break;
        }
      // eslint-disable-next-line no-fallthrough
      case "ArrowLeft":
        next = Math.max(0, (next ?? this.$refItems.length) - 1);
        break;
      case "Delete":
        if (next != null) {
          this.removeValue(next);
          next = !this.$refItems.length ? null : Math.min(next, this.$refItems.length - 1);
          break;
        }
      // eslint-disable-next-line no-fallthrough
      case "ArrowRight":
        if (next != null) {
          next = Math.min(this.$refItems.length - 1, next + 1);
          if (next === this._focusIndex) {
            next = null; // move focus to input if was selected last
          }
        } else {
          handled = false;
        }
        break;
      default:
        handled = false;
        break;
    }

    if (handled && (this._focusIndex !== next || len !== this.$refItems.length)) {
      e.preventDefault();
      this.focusItemByIndex(next);
    }
  }
}

customElements.define(tagName, WUPSelectManyControl);

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
 * 1. Firefox. Caret position is wrong/missed between Items is use try to use ArrowKeys
 * 2. Firefox. Caret position is missed if no empty spans between items
 * 3. Without contenteditalbe='false' browser moves cursor into item, but it should be outside
 */

// NiceToHave: Ctrl+Z must should work for the whole control. Not only for `input`
