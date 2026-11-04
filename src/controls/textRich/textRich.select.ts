// eslint-disable-next-line max-classes-per-file
import onEvent from "../../helpers/onEvent";
import promiseWait from "../../helpers/promiseWait";
import { stringPrettify } from "../../helpers/string";
import WUPPopupElement from "../../popup/popupElement";
import { PopupAnimations, PopupOpenCases } from "../../popup/popupElement.types";
import { menuPlacements } from "../../popup/popupPlacements";
import WUPSpinElement from "../../spinElement";
import { SetValueReasons, ValidationCases } from "../baseControl";

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
      // url pasted or typed after prefill (link, image etc.): `https://https://x.com` => `https://x.com`
      const v = el.$value?.replace(/^(?:https?:\/\/)+(?=https?:\/\/)/i, "");
      v !== el.$value && (el.$value = v);
      hovered && e.detail.reason === SetValueReasons.clear && el.$value === undefined && this.done("", true);
    };
    // WARN: there is no `onfocusout` in HTML spec
    // browser window blur keeps focused element active (relatedTarget is null)
    p.addEventListener(
      "focusout",
      (e) => !p.contains((e.relatedTarget || document.activeElement) as Node) && this.done()
    );
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
  /** Items or function that returns items filtered by text (see `Tool.items`) */
  items: WUP.TextRich.ToolItem[] | ((text: string) => WUP.TextRich.ToolItem[] | Promise<WUP.TextRich.ToolItem[]>);
  selected: unknown;
  render: (li: HTMLLIElement, v: WUP.TextRich.ToolItem) => void;
}

/** Dropdown menu of TextRich toolbar: listbox with keyboard & aria like WUPSelectControl;
 *  focus stays in owner (items are focused virtually); click or Enter/Tab (Space in dropdown) chooses value
 * @tutorial innerHTML @example
 * <wup-popup menu><ul role="listbox" aria-label="Heading"><li role="option"><h1 role="none">Heading 1</h1></li>...</ul></wup-popup> */
export default class TextRichMenu extends TextRichAsk {
  #o: MenuOptions;
  #ul: HTMLUListElement;
  #items: HTMLLIElement[] = [];
  #focused?: HTMLLIElement;
  /** Removes blur listener of owner */
  #offBlur?: () => void;
  /** Element to append popup to: on opening or when function items are loaded */
  #parent?: HTMLElement;
  /** Text of the last call of function items: results of previous calls are ignored */
  #text?: string;
  /** Spinner while function items are loading */
  #spin?: WUPSpinElement;

  constructor(o: MenuOptions) {
    const t = o.target;
    super(t instanceof Range ? o.button : t, o.owner ? undefined : (t as HTMLElement));
    this.#o = o;
    const p = this.popup;
    // rect of range to place popup near (caret gets width 1px)
    t instanceof Range &&
      (p.getTargetRect = () => {
        const rect = t.getBoundingClientRect();
        if (rect.height) {
          return rect.width ? rect : new DOMRect(rect.x, rect.y, 1, rect.height);
        }
        // caret between nodes has empty rect: take the end of previous node (embed, end of line) or start of node (empty line)
        const n = t.startContainer;
        const prev = n.childNodes[t.startOffset - 1];
        const x = document.createRange();
        x.selectNode(prev ?? n);
        const rects = x.getClientRects();
        const b = rects[prev ? rects.length - 1 : 0] ?? rect;
        return new DOMRect(prev ? b.right : b.x, b.y, 1, b.height);
      });
    p.setAttribute("menu", "");
    p.$options.animation = PopupAnimations.drawer;
    p.$options.placement = [...menuPlacements]; // the same as in select

    const ul = p.appendChild(document.createElement("ul"));
    ul.id = WUPPopupElement.$uniqueId;
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", o.button.getAttribute("aria-label")!);
    this.#ul = ul;
    o.owner && (this.onKey = this.handleKey);
  }

  /** Element or range menu is placed near: popup target is dropdown for range */
  get target(): HTMLElement | Range {
    return this.#o.target;
  }

  /** Appends popup with items: function items are loaded at first */
  override open(parent: HTMLElement): void {
    const { button, owner, items } = this.#o;
    button.setAttribute("aria-expanded", true);
    if (owner) {
      owner.setAttribute("aria-controls", this.#ul.id);
      // browser window blur keeps owner active
      this.#offBlur = onEvent(owner, "blur", () => document.activeElement !== owner && this.done());
    }
    this.#parent = parent;
    typeof items === "function" ? this.filter("") : this.render(items);
  }

  /** Renders items, focuses selected or the 1st one & shows popup */
  protected render(items: WUP.TextRich.ToolItem[]): void {
    const { owner, selected } = this.#o;
    this.#ul.replaceChildren();
    this.#items = items.map((v) => {
      const li = this.#ul.appendChild(document.createElement("li")); // before render: it checks previous item
      li.id = WUPPopupElement.$uniqueId;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", v.value === selected);
      li.onclick = () => this.done(v.value);
      this.#o.render(li, v);
      return li;
    });
    owner && this.focus(this.#items[items.findIndex((v) => v.value === selected)] ?? this.#items[0]);
    this.popup.isConnected || super.open(this.#parent!); // opened with spinner if items are loaded slowly
    // after popup is shown: otherwise it doesn't scroll
    setTimeout(() =>
      (this.#focused ?? this.popup.querySelector("[aria-selected=true]"))?.scrollIntoView({ block: "nearest" })
    );
  }

  /** Shows spinner over items while function items are loading: menu is opened with it if items aren't rendered yet */
  protected changePending(v: boolean): void {
    if (v === !!this.#spin) {
      return;
    }
    if (v) {
      WUPSpinElement.$use();
      const s = document.createElement("wup-spin"); // it sets aria-busy on popup
      // instead of items: otherwise opening animation of popup resets position of spinner placed over it
      s.$options.inline = !this.popup.isConnected;
      this.#spin = this.popup.appendChild(s);
      this.popup.isConnected || super.open(this.#parent!);
    } else {
      this.#spin!.remove();
      this.#spin = undefined;
    }
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
    if (k === "Escape") {
      this.done();
    } else if (!this.#items.length && typeof this.#o.items === "function") {
      return false; // function items are loading: keys work in editor
    } else if (k === "ArrowDown" || k === "ArrowUp") {
      const arr = this.#items.filter((li) => !li.hidden);
      const i = arr.indexOf(f!);
      this.focus(k === "ArrowDown" ? arr[(i + 1) % arr.length] : arr[(i > 0 ? i : arr.length) - 1]);
    } else if (k === "Enter" || k === "Tab" || (k === " " && this.#o.owner === this.#o.button)) {
      f ? f.click() : this.done();
    } else {
      return false;
    }
    return true;
  };

  /** Shows items with label or value containing text (`{name` & `{firstName` show `First Name`) & focuses the 1st one
   *  or renders items returned by function `items` (result of the last call); closes menu if nothing matches */
  filter(text: string): void {
    const { items } = this.#o;
    if (typeof items !== "function") {
      const s = text.toLowerCase();
      const has = (x: string): boolean => x.toLowerCase().includes(s);
      const shown = items.map(
        (v) => has(v.label ?? stringPrettify(String(v.value), true, true)) || has(String(v.value))
      );
      if (shown.includes(true)) {
        this.#items.forEach((li, i) => (li.hidden = !shown[i]));
        this.focus(this.#items[shown.indexOf(true)]);
      } else {
        this.done(); // items stay as is for closing animation
      }
    } else if (text !== this.#text) {
      this.#text = text;
      const isLast = (): boolean => text === this.#text && !this.isClosed;
      // like WUPSelectControl: spinner isn't shown for items resolved at once, otherwise it's shown 300ms at least
      promiseWait(
        new Promise<WUP.TextRich.ToolItem[]>((res) => res(items(text))), // sync error too
        300,
        (v) => isLast() && this.changePending(v)
      )
        .then((arr) => isLast() && (arr.length ? this.render(arr) : this.done()))
        .finally(() => isLast() && this.changePending(false)) // spinner of previous call (the last one is resolved at once)
        .catch((err) => {
          isLast() && this.done();
          throw err; // shown in console
        });
    }
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
