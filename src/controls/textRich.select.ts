// eslint-disable-next-line max-classes-per-file
import onEvent from "../helpers/onEvent";
import WUPPopupElement from "../popup/popupElement";
import { PopupAnimations, PopupOpenCases } from "../popup/popupElement.types";
import { menuPlacements } from "../popup/popupPlacements";
import { SetValueReasons, ValidationCases } from "./baseControl";

/** Returns rect of range to place popup near (caret gets width 1px) */
function rectOf(r: Range): DOMRect {
  const rect = r.getBoundingClientRect();
  if (rect.height) {
    return rect.width ? rect : new DOMRect(rect.x, rect.y, 1, rect.height);
  }
  // caret between nodes has empty rect: take the end of previous node (embed, end of line) or start of node (empty line)
  const n = r.startContainer;
  const prev = n.childNodes[r.startOffset - 1];
  const x = document.createRange();
  x.selectNode(prev ?? n);
  const rects = x.getClientRects();
  const b = rects[prev ? rects.length - 1 : 0] ?? rect;
  return new DOMRect(prev ? b.right : b.x, b.y, 1, b.height);
}

/** TextRich popup near target to ask value: text control (TextRichPrompt) or dropdown menu (TextRichMenu) */
export class TextRichAsk {
  popup = document.createElement("wup-popup");
  isClosed = false;
  /** Handles keys of editor while focus stays there (menu)
   * @returns true if key is handled */
  onKey?: (e: KeyboardEvent) => boolean;
  /** Called on selection change in editor */
  onSelect?: () => void;
  /** Called once on close: `v` - asked value (`null` if canceled), `isBack` - return focus & selection to editor */
  onClose?: (v: any, isBack: boolean) => void;

  /**
   * @param target element to place popup near (popup closes when it's removed)
   * @param hovered element edited via hover popup (link, embed): popup closes when pointer leaves both */
  constructor(target: HTMLElement, public hovered?: HTMLElement) {
    const p = this.popup;
    p.$options.openCase = PopupOpenCases.onInit;
    p.$options.target = target;
    p.$onClose = () => this.done(); // target is removed
  }

  /** Appends popup: it opens at once */
  open(parent: HTMLElement): void {
    parent.appendChild(this.popup);
  }

  /** Closes popup & calls `onClose` once
   * @param v asked value: `null` if canceled
   * @param isBack return focus & selection to editor */
  done(v: unknown = null, isBack = false): void {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    this.popup.$close().finally(() => this.popup.remove());
    this.onClose?.(v, isBack);
  }
}

/** Popup with text control (see WUPTextRichControl.$ask)
 * @tutorial innerHTML @example
 * <wup-popup><wup-text/></wup-popup> */
export class TextRichPrompt extends TextRichAsk {
  /**
   * @param value initial value
   * @param opts options of text control: label, validations etc.
   * @param hovered hover popup (link): text control isn't focused, clearing value resolves `""` (to remove link) */
  constructor(target: HTMLElement, value: string, opts: Partial<WUP.Text.Options>, hovered?: HTMLElement) {
    super(target, hovered);
    const p = this.popup;
    const el = p.appendChild(document.createElement("wup-text"));
    el.$options.validationCase = ValidationCases.onChangeSmart; // without onFocusWithValue: otherwise error shows at once
    el.$options.autoFocus = !hovered;
    Object.assign(el.$options, opts);
    el.$initValue = value;

    p.onkeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault(); // otherwise control value is cleared
        this.done(null, true);
      } else if (e.key === "Enter") {
        e.preventDefault(); // otherwise form is submitted
        !el.$validate() && this.done(el.$value ?? "", true);
      }
    };
    el.$onChange = (e) => {
      e.stopPropagation(); // not related to form
      hovered && e.detail.reason === SetValueReasons.clear && el.$value === undefined && this.done("", true);
    };
    // WARN: there is no `onfocusout` in HTML spec
    p.addEventListener("focusout", (e) => !p.contains(e.relatedTarget as Node) && this.done());
  }
}

interface MenuOptions {
  /** Toolbar dropdown: gets `aria-expanded` */
  button: HTMLElement;
  /** Focused element (editor or dropdown): gets `aria-activedescendant` & passes keys via `onKey`;
   *  `null` - hover menu (keys aren't handled) */
  owner: HTMLElement | null;
  /** Element (dropdown, embed) or range (caret, typed trigger) to place menu near */
  target: HTMLElement | Range;
  values: WUP.TextRich.ToolValue[];
  selected: unknown;
  render: (li: HTMLLIElement, v: WUP.TextRich.ToolValue) => void;
}

/** Dropdown menu of TextRich toolbar: listbox with keyboard & aria like WUPSelectControl;
 *  focus stays in owner (items are focused virtually); click or Enter/Tab (Space in dropdown) chooses value
 * @tutorial innerHTML @example
 * <wup-popup menu><ul role="listbox" aria-label="Heading"><li role="option"><h1 role="none">Heading 1</h1></li>...</ul></wup-popup> */
export default class TextRichMenu extends TextRichAsk {
  #o: MenuOptions;
  #items: HTMLLIElement[];
  #focused?: HTMLLIElement;
  /** Removes blur listener of owner */
  #offBlur?: () => void;

  constructor(o: MenuOptions) {
    const t = o.target;
    super(t instanceof Range ? o.button : t, o.owner ? undefined : (t as HTMLElement));
    this.#o = o;
    const p = this.popup;
    t instanceof Range && (p.getTargetRect = () => rectOf(t));
    p.setAttribute("menu", "");
    p.$options.animation = PopupAnimations.drawer;
    p.$options.placement = [...menuPlacements]; // the same as in select

    const ul = p.appendChild(document.createElement("ul"));
    ul.id = WUPPopupElement.$uniqueId;
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", o.button.getAttribute("aria-label")!);
    this.#items = o.values.map((v) => {
      const li = ul.appendChild(document.createElement("li"));
      li.id = WUPPopupElement.$uniqueId;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", v.value === o.selected);
      li.onclick = () => this.done(v.value);
      o.render(li, v);
      return li;
    });
    o.owner && (this.onKey = this.handleKey);
  }

  override open(parent: HTMLElement): void {
    const { button, owner, values, selected } = this.#o;
    button.setAttribute("aria-expanded", true);
    if (owner) {
      owner.setAttribute("aria-controls", this.popup.firstElementChild!.id);
      this.#offBlur = onEvent(owner, "blur", () => this.done());
      this.focus(this.#items[values.findIndex((v) => v.value === selected)] ?? this.#items[0]);
    }
    super.open(parent);
    // after popup is shown: otherwise it doesn't scroll
    setTimeout(() =>
      (this.#focused ?? this.popup.querySelector("[aria-selected=true]"))?.scrollIntoView({ block: "nearest" })
    );
  }

  /** Focuses item virtually (real focus stays in owner) */
  protected focus(li: HTMLLIElement | undefined): void {
    const { owner } = this.#o;
    this.#focused?.removeAttribute("focused");
    this.#focused = li;
    li?.setAttribute("focused", "");
    li?.scrollIntoView({ block: "nearest" });
    li ? owner?.setAttribute("aria-activedescendant", li.id) : owner?.removeAttribute("aria-activedescendant");
  }

  /** Owner keys: Arrows - navigate, Enter/Tab (Space in dropdown) - choose, Escape - close
   * @returns true if key is handled */
  protected handleKey = (e: KeyboardEvent): boolean => {
    const k = !(e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) && e.key;
    const f = this.#focused;
    if (k === "ArrowDown" || k === "ArrowUp") {
      const arr = this.#items.filter((li) => !li.hidden);
      const i = arr.indexOf(f!);
      this.focus(k === "ArrowDown" ? arr[(i + 1) % arr.length] : arr[(i > 0 ? i : arr.length) - 1]);
    } else if (k === "Enter" || k === "Tab" || (k === " " && this.#o.owner === this.#o.button)) {
      f ? f.click() : this.done();
    } else if (k === "Escape") {
      this.done();
    } else {
      return false;
    }
    return true;
  };

  /** Hides not matched items & focuses the 1st visible one
   * @returns false if nothing matches (items stay as is for closing animation) */
  filter(isMatch: (v: WUP.TextRich.ToolValue) => boolean): boolean {
    const shown = this.#o.values.map(isMatch);
    if (!shown.includes(true)) {
      return false;
    }
    this.#items.forEach((li, i) => (li.hidden = !shown[i]));
    this.focus(this.#items[shown.indexOf(true)]);
    return true;
  }

  override done(v: unknown = null, isBack = false): void {
    if (!this.isClosed) {
      const { button, owner } = this.#o;
      this.#offBlur?.();
      owner?.removeAttribute("aria-activedescendant");
      owner?.removeAttribute("aria-controls");
      button.setAttribute("aria-expanded", false);
    }
    super.done(v, isBack);
  }
}
