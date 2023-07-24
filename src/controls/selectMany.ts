import animate, { isAnimEnabled } from "../helpers/animate";
import isOverlap from "../helpers/isOverlap";
import { parseMsTime } from "../helpers/styleHelpers";
import { onEvent } from "../indexHelpers";
import WUPPopupElement from "../popup/popupElement";
import { WUPcssIcon } from "../styles";
import { ShowCases } from "./baseCombo";
import { SetValueReasons } from "./baseControl";
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
      /** Allow user to change ordering of items; Use drag&drop or keyboard Shift/Ctrl/Meta + arrows to change item position
       * @defaultValue false */
      sortable?: boolean;
    }

    interface Options<T = any, VM = ValidityMap> extends WUP.Select.Options<T, VM>, Defaults<T, VM> {
      /** Constant value that impossible to change */
      multiple: true;
    }
    interface Attributes extends WUP.Select.Attributes, Pick<Partial<Options>, "sortable"> {}
    interface JSXProps<C = WUPSelectManyControl> extends WUP.Select.JSXProps<C>, Attributes {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectManyControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with dropdown/combobox behavior
       *  @see {@link WUPSelectManyControl} */
      [tagName]: WUP.SelectMany.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with dropdown/combobox behavior
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

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.SelectMany.Options>;
    arr.push("sortable");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.SelectMany.Attributes>>;
    arr.push("sortable");
    return arr;
  }

  static get nameUnique(): string {
    return "WUPSelectManyControl";
  }

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
      :host [item][focused],
      :host [item][drag],
      :host [item][drop] {
        box-shadow: inset 0 0 3px 0 var(--ctrl-focus);
      }
      :host [item][removed],
      :host [item][drag][remove]  {
        --ctrl-icon: var(--ctrl-err-text);
        text-decoration: line-through;
        color: var(--ctrl-err-text);
        background-color: var(--ctrl-err-bg);
      }
      :host[readonly] [item] {
        pointer-events: none;
        touch-action: none;
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
        :host [item] {
          user-select: none;
          -webkit-user-select: none;
        }${/* don't allow select text on blocks to allow custom touch-logic */ ""}
      }
      @media not all and (prefers-reduced-motion) {
        :host [item][removed] {
          transition: all var(--anim-time) ease-in-out;
          transition-property: margin, padding, width, opacity;
          padding-left: 0; padding-right: 0;
          margin-left: 0; margin-right: 0;
          width: 0;
          opacity: 0;
        }
      }
      :host [item][drag] {
        z-index: 99999;
        position: fixed;
        left:0; top:0;
        cursor: grabbing;
        text-decoration: none;
        --ctrl-icon: var(--ctrl-select-item-del);
        color: var(--ctrl-select-item);
        background-color: var(--ctrl-select-item-bg);
      }
      :host [item][drop] {
        opacity: 0.7;
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
  override canParseInput(_text: string): boolean {
    return false; // disable behavior from select[mulitple]
  }

  override parseInput(text: string): ValueType[] | undefined {
    // WARN must be called only on allowNewValue
    // @ts-expect-error: because it's constant true
    this._opts.multiple = false;
    const vi = super.parseInput(text) as ValueType | undefined;
    this._opts.multiple = true;
    if (vi === undefined || this.$value?.some((v) => this.#ctr.$isEqual(v, vi))) {
      return this.$value; // no-changes, no-duplicates
    }
    return this.$value ? [...this.$value, vi] : [vi];
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Select.Options> | null): void {
    this._opts.multiple = true;
    this.removeAttribute("multiple");
    super.gotChanges(propsChanged);

    this._opts.sortable = this.getAttr("sortable", "bool") ?? false;
    if (this._opts.sortable) {
      !this._disposeDragdrop && this.applyDragdrop();
    } else {
      this._disposeDragdrop?.call(this);
      this._disposeDragdrop = undefined;
    }
  }

  /** It prevents menu opening if user tries sorting and focus got after mouseUp */
  _wasSortAfterClick?: boolean;
  /** Call it to remove dragdrop loggic */
  _disposeDragdrop?: () => void;
  /** Called to apply dragdrop logic */
  protected applyDragdrop(): void {
    this._disposeDragdrop = onEvent(this, "pointerdown", (e) => {
      this._wasSortAfterClick = false;
      if (this.$isReadOnly || this.$isDisabled) {
        return;
      }

      const t = e.target;
      let eli = (this.$refItems && this.$refItems.findIndex((item) => t === item || this.includes.call(item, t)))!;
      if (eli === -1 || eli === undefined) {
        return;
      }

      const el = this.$refItems![eli];
      let dr: HTMLElement;

      let isWaitTouch = false; // wait for touch to detect if possible to prevent scrollByTouch (browser can cancel pointer events if swipe)
      let r0 = onEvent(
        document,
        "touchstart",
        () => {
          isWaitTouch = true;
          r0 = onEvent(
            document,
            "touchmove",
            (ev) => {
              if (ev.cancelable) {
                ev.preventDefault(); // prevent scrolling by touch if possible
                isWaitTouch = false;
              }
            },
            { passive: false, capture: true }
          );
        },
        { capture: true }
      );

      let isInside = true;
      let isThrottle = false;
      const r1 = onEvent(document, "pointermove", (ev) => {
        if (isWaitTouch) {
          return;
        }
        // init
        if (!dr) {
          this._wasSortAfterClick = true;
          // clone draggable element
          dr = el.cloneNode(true) as HTMLElement;
          dr.setAttribute("drag", "");
          dr.style.width = `${el.offsetWidth}px`;
          dr.style.height = `${el.offsetHeight}px`;
          el.parentElement!.prepend(dr);
          el.setAttribute("drop", ""); // mark current element
          this.setAttribute("hovered", ""); // if pick item and move cursor fast control-focus-frame is blinking because because cursor much faster than js events
        }
        // set position
        const x = ev.clientX - el.offsetWidth / 2;
        const y = ev.clientY - el.offsetHeight / 2;
        dr.style.transform = `translate(${x}px, ${y}px)`;
        // define if element inside control (if outside - remove logic)
        isInside = isOverlap(this.getBoundingClientRect(), dr.getBoundingClientRect());
        this.setAttr.call(dr, "remove", !isInside, true);
        if (!isInside) {
          return; // skip new place detection when item outside control
        }
        if (isThrottle) {
          return;
        }

        // find nearest line
        let nearest = eli; // index of nearest item
        let nearestEnd = eli; // index of last item in the nearest line
        let dist = Number.MAX_SAFE_INTEGER; // distance between centers
        const rects = this.$refItems!.map((item) => item.getBoundingClientRect());
        let lineY = 0;
        rects.some((r, i) => {
          const nextLineY = r.y + r.height / 2;
          if (Math.abs(nextLineY - lineY) > 3) {
            // compare with 3px because centers can be not aligned properly
            lineY = nextLineY; // it's next line
            const c = Math.abs(ev.clientY - lineY);
            if (c < dist) {
              dist = c;
              nearest = i; // index of 1st item in the nearest line
              nearestEnd = i;
            } else {
              return true; // break search because next line is further then previous
            }
          } else {
            nearestEnd += 1;
          }
          return false;
        });
        // find nearest item in the nearest line
        dist = Number.MAX_SAFE_INTEGER;
        // console.warn(nearest, nearestEnd, linei);
        for (let i = nearest; i <= nearestEnd; ++i) {
          const r = rects[i];
          const dx = ev.clientX - (r.x + r.width / 2);
          const dy = ev.clientY - (r.y + r.height / 2);
          const c = Math.sqrt(dx * dx + dy * dy);
          if (c < dist) {
            dist = c;
            nearest = i;
          }
        }

        // define left/right side
        if (eli !== nearest) {
          const trg = this.$refItems![nearest];
          const r = rects[nearest];
          const isLeft = Math.abs(r.x - ev.clientX) < Math.abs(r.x + r.width - ev.clientX);
          let nextEli = eli;
          if (nearest < eli) {
            nextEli = isLeft ? nearest : nearest + 1; // shift from right to left
          } else {
            // if (nearest > eli) {
            nextEli = isLeft ? nearest - 1 : nearest; // shift from left to right
          }

          if (nextEli !== eli) {
            if (isLeft) {
              trg.parentElement!.insertBefore(el, trg);
            } else {
              trg.parentElement!.insertBefore(el, trg.nextElementSibling);
            }
            this.$refItems!.splice(nextEli, 0, this.$refItems!.splice(eli, 1)[0]);
            eli = nextEli;
            isThrottle = true;
            setTimeout(() => (isThrottle = false), 100); // to prevent fast changing position
          }
        }
      });

      const cancel = (): void => {
        if (dr) {
          setTimeout(() => (this._wasSortAfterClick = false), 1);
          this.removeAttribute("hovered");
          if (!isInside) {
            el.removeAttribute("drop");
            dr.remove();
            this.removeValue(eli);
          } else {
            const animTime = parseMsTime(window.getComputedStyle(el).getPropertyValue("--anim-time"));
            const from = dr.getBoundingClientRect();
            const to = el.getBoundingClientRect();
            const diff = { x: to.x - from.x, y: to.y - from.y };
            // return element back
            animate(0, 1, animTime, (v) => {
              dr.style.transform = `translate(${from.x + diff.x * v}px, ${from.y + diff.y * v}px)`;
            }).finally(() => {
              el.removeAttribute("drop");
              dr.remove();
            });
            // change value
            this.setValue(
              this.$refItems!.map((a) => a._wupValue),
              SetValueReasons.userInput
            );
          }
        }
        r0();
        r1();
        r2();
        r3();
      };

      const r2 = onEvent(document, "pointerup", cancel, { capture: true });
      const r3 = onEvent(document, "pointercancel", cancel, { capture: true }); // pointerup not called if touchmove can't be cancelled and browser scrolls
    });
  }

  override canShowMenu(
    showCase: ShowCases,
    e?: MouseEvent | FocusEvent | KeyboardEvent | null
  ): boolean | Promise<boolean> {
    return !this._wasSortAfterClick && super.canShowMenu(showCase, e);
  }

  protected override renderMenu(popup: WUPPopupElement, menuId: string): HTMLElement {
    const r = super.renderMenu(popup, menuId);
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

  protected resetInputValue(): void {
    this.$refInput.value = this.valueToInput(this.$value as ValueType[], true);
  }

  protected override valueToInput(v: ValueType[] | undefined, isReset?: boolean): string {
    !isReset && setTimeout(() => this.renderItems(v ?? [], this.getItems())); // timeout required otherwise filter is reset by empty input
    return this.$isFocused || !v?.length ? "" : " "; // otherwise broken css:placeholder-shown
  }

  // @ts-expect-error - because expected v: ValueType[]
  protected override selectValue(v: ValueType, canHideMenu = true): void {
    super.selectValue(v as any, canHideMenu);
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
    const item = this.$refItems![index];
    const isAnim = isAnimEnabled();
    if (isAnim) {
      this.$refItems!.splice(index, 1); // otherwise item is replaced
      item.style.width = `${item.offsetWidth}px`;
      item.setAttribute("removed", "");
      setTimeout(() => (item.style.width = ""));
      const ms = parseMsTime(window.getComputedStyle(item).getPropertyValue("--anim-time"));
      setTimeout(() => item.remove(), ms); // otherwise item is removed immediately in setValue...
      this._focusIndex === index && this.focusItemByIndex(null);
    }

    this.$value!.splice(index, 1);
    this.setValue(this.$value!.length ? [...this.$value!] : undefined, SetValueReasons.userInput);
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
          if (!this.$refItems.length) {
            next = null; // WARN: focus prev in the next "ArrowLeft" block
            break;
          }
        }
      // eslint-disable-next-line no-fallthrough
      case "ArrowLeft":
        next = Math.max(0, (next ?? this.$refItems.length) - 1);
        break;
      case "Delete":
        if (next != null) {
          this.removeValue(next);
          if (!this.$refItems.length) {
            next = null;
            break;
          }
          --next; // WARN: focus prev in the next "ArrowLeft" block
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
    if (handled && this._focusIndex !== next) {
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

/* todo popup can change position during the hiding by focuslost when input is goes invisible and control size is reduced - need somehow block changing position-priority
when popup is opened => don't change bottom...top if menu or control height changed. Change bottom to top only during the scrolling
 */
