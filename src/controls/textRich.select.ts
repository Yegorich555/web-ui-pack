import { inheritDefaults } from "../baseElement";
import WUPPopupElement from "../popup/popupElement";
import { MenuCloseCases, MenuOpenCases } from "./baseCombo";
import WUPSelectControl from "./select";

const tagName = "wup-richselect";
declare global {
  interface HTMLElementTagNameMap {
    [tagName]: WUPTextRichSelect; // add element to document.createElement
  }
}

/** Dropdown of TextRich toolbar: select with button instead of input (menu, keyboard & aria are the same as in WUPSelectControl);
 *  focus stays in owner (editor) on click: menu is opened near button or editor (caret, embed) via `openMenuAt` & its keys are handled
 *  via `handleKey`
 * @tutorial innerHTML @example
 * <button role="combobox" aria-label="{$options.label}">{label of the current value}</button> // $refInput: label is shown if value is empty
 * <wup-popup menu><ul role="listbox"><li role="option">Heading 1</li>...</ul></wup-popup> */
export default class WUPTextRichSelect extends WUPSelectControl {
  static get $style(): string {
    return ""; // own styles only: button of toolbar with menu instead of form control
  }

  /** Text for listbox when no items are displayed: menu is hidden instead (it's closed when nothing matches typed text) */
  static $textNoItems: string | undefined = undefined;

  /** Item is visible if its label or value contains typed text: `{name` & `{firstName` show `First Name` */
  static $filterMenuItem(this: WUPSelectControl, text: string, value: unknown, input: string): boolean {
    return text.includes(input) || String(value).toLowerCase().includes(input);
  }

  static $defaults: WUP.Select.Options = inheritDefaults(WUPSelectControl.$defaults, {
    openCase: MenuOpenCases.onClick | MenuOpenCases.onPressArrowKey, // without onFocus: otherwise it's opened on navigation via Arrows
    clearButton: false,
  });

  /** Text of button (like value of input): it isn't shown if control has attribute `icon` (button shows icon of value) */
  #text = "";
  /** Menu is opened via `openMenuAt` & controlled by owner: owner gets aria-activedescendant */
  #isOwned = false;
  /** Text to filter items instead of input: text typed in editor (see `filter`) */
  _query?: string;
  /** Element that keeps focus (editor): click on button or item doesn't move focus from it, menu opened via `openMenuAt`
   *  is controlled by its keys (see `handleKey`) */
  _owner?: HTMLElement;
  /** Returns rect to place menu near it instead of control (caret, embed); it's reset when menu is opened via button */
  _anchor?: () => DOMRect;
  /** Called when menu is closed (at once, before animation): item is chosen, Escape is pressed etc. */
  _onCloseMenu?: () => void;
  /** Returns text of value that isn't in items: format is applied but its value isn't rendered in toolbar
   *  (`Heading 3` for `{ header: [1, 2, false] }`) */
  _textOf?: (v: unknown) => string;

  /** Button instead of input: `value` is its text like for input (control reads & sets it) */
  $refInput = Object.defineProperties(document.createElement("button"), {
    value: {
      get: () => this._query ?? this.#text,
      set: (v: string) => {
        this.#text = v;
        !this.hasAttribute("icon") && (this.$refInput.textContent = v);
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    select: { value: () => {} }, // it's called for input on clearing value (Escape)
  }) as unknown as HTMLInputElement;

  protected override renderControl(): void {
    super.renderControl();
    const b = this.$refInput as unknown as HTMLButtonElement;
    b.type = "button"; // otherwise it submits form: type `text` is invalid for button
    this.$refLabel.replaceWith(b); // without label: it's `aria-label` of button (shown when value is empty)
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Select.Options> | null): void {
    super.gotChanges(propsChanged);
    this.$refInput.setAttribute("aria-label", this._opts.label ?? "");
  }

  /** Opens menu near anchor (button, caret, embed etc.): it's controlled by keys of owner (see `handleKey`) & item is focused at once
   *  (selected or the 1st one)
   * @param isHover menu is opened by hover: owner doesn't control it
   * @param value value to select instead of $value (value of hovered embed) */
  openMenuAt(anchor: () => DOMRect, isHover = false, value: unknown = this.$value): void {
    this._anchor = anchor;
    this.#isOwned = !isHover && !!this._owner;
    this._menuItems && this.focusMenuItem(null); // reset after previous menu: it can be still closing
    this.goOpenMenu(MenuOpenCases.onManualCall).then((p) => {
      if (p) {
        this.selectMenuItemByValue(value);
        // otherwise item is focused by filtering already (text is typed fast)
        this.#isOwned &&
          !this._focusedMenuItem &&
          this.focusMenuItemByKeydown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      }
    });
    this.#isOwned &&
      this.$isOpened &&
      this._owner!.setAttribute("aria-controls", this.$refInput.getAttribute("aria-controls")!);
  }

  /** Handles key pressed in owner while menu is opened near it (see openMenuAt): Arrows to navigate, Enter/Tab to choose,
   *  Escape to close
   * @returns true if key is handled */
  handleKey(e: KeyboardEvent): boolean {
    const k = !(e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) && e.key;
    if (k === "Tab") {
      this._focusedMenuItem?.click(); // the same as Enter
    } else if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === "Escape") {
      this.gotKeyDown(e);
    } else {
      return false;
    }
    return true;
  }

  /** Filters items by text (typed in owner instead of input)
   * @returns count of visible items */
  filter(text: string): number {
    this._query = text;
    this.filterMenuItems();
    const m = this._menuItems!;
    return (m.filtered ?? m.all).length;
  }

  protected override valueToText(v: unknown, items: WUP.Select.MenuItem[]): string {
    return this._textOf && !items.some((x) => x.value === v) ? this._textOf(v) : super.valueToText(v, items);
  }

  override focus(): boolean {
    return document.activeElement !== this._owner && super.focus(); // click on button or item doesn't move focus from owner
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    if (e.key === " " && this.$isOpened) {
      e.preventDefault(); // otherwise button is clicked: menu is closed
      this._focusedMenuItem?.click(); // the same as Enter
      return;
    }
    super.gotKeyDown(e);
  }

  protected override focusMenuItem(next: HTMLElement | null): void {
    super.focusMenuItem(next);
    if (this.#isOwned) {
      const o = this._owner!;
      next ? o.setAttribute("aria-activedescendant", next.id) : o.removeAttribute("aria-activedescendant");
    }
  }

  protected override renderPopup(menuId: string): WUPPopupElement {
    const p = super.renderPopup(menuId);
    p.getTargetRect = (t) => this._anchor?.() ?? t.getBoundingClientRect(); // menu can be placed near editor instead of control
    return p;
  }

  protected override async goOpenMenu(
    openCase: MenuOpenCases,
    e?: MouseEvent | FocusEvent | KeyboardEvent | null
  ): Promise<WUPPopupElement | null> {
    if (openCase !== MenuOpenCases.onManualCall) {
      this._anchor = undefined; // opened via focused button (keyboard): placed near it
      this.#isOwned = false;
    }
    const p = await super.goOpenMenu(openCase, e);
    p && this.selectMenuItemByValue(this.$value); // even if text of button is empty: it's set with delay after changing $value
    return p;
  }

  protected override goCloseMenu(closeCase: MenuCloseCases, e?: MouseEvent | FocusEvent | null): Promise<boolean> {
    const r = super.goCloseMenu(closeCase, e);
    if (!this.$isOpened) {
      const f = this._onCloseMenu;
      this._onCloseMenu = undefined;
      if (this.#isOwned) {
        this.#isOwned = false;
        this._owner!.removeAttribute("aria-activedescendant");
        this._owner!.removeAttribute("aria-controls");
      }
      this._query = undefined;
      f?.();
    }
    return r;
  }
}

customElements.define(tagName, WUPTextRichSelect);
