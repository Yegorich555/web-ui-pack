// import WUPBaseElement from "../baseElement";
import WUPBaseElement from "../baseElement";

/** Tags with appended styles (the class can be inherited by another element) */
const styledTags = new Set<string>();

/** Lines: line break is placed before them (browser adds `<div>` on Enter) */
const lineTags = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE"]);

/** Walks parts of text inside root in order: text node, line break (before line except the 1st one & `<br>` except the last child)
 *  & embed (see `isEmbed`: counted as 1 char, its content is skipped); walking is stopped when fn returns true */
function walkText(root: Node, fn: (n: Node, len: number) => boolean | void, isEmbed?: (el: Element) => boolean): void {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let isStarted = false;
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    let len = 1;
    if (n.nodeType === Node.TEXT_NODE) {
      len = (n as Text).length;
    } else if (isEmbed?.(n as Element)) {
      let last: Node = n;
      while (last.lastChild) {
        last = last.lastChild;
      }
      w.currentNode = last; // content of embed is skipped
    } else if (lineTags.has(n.nodeName)) {
      len = +isStarted;
      isStarted = true;
    } else if (n.nodeName !== "BR" || !n.nextSibling) {
      continue; // inline element or the last `<br>`: browser adds it to show empty line
    }
    isStarted ||= len > 0;
    if (fn(n, len)) {
      return;
    }
  }
}

/** Returns count of chars before point (node & offset) inside root: line break & embed are counted as 1 char (see walkText) */
export function charsBefore(root: Node, node: Node, offset: number, isEmbed?: (el: Element) => boolean): number {
  const r = document.createRange();
  r.setStart(node, offset);
  let cnt = 0;
  walkText(
    root,
    (n, len) => {
      if (n === node && n.nodeType === Node.TEXT_NODE) {
        cnt += offset;
        return true;
      }
      if (r.comparePoint(n, 0) > 0) {
        return true; // part is after point
      }
      cnt += len;
      return false;
    },
    isEmbed
  );
  return cnt;
}

/** Returns point (node & offset) by count of chars inside root: line break & embed are counted as 1 char (see walkText);
 *  point at the boundary of parts is placed at the end of the previous one (at the start of line - into its text);
 *  position out of range - at the end of root */
export function pointAt(root: Node, pos: number, isEmbed?: (el: Element) => boolean): [Node, number] {
  let last: [Node, number] = [root, 0];
  walkText(
    root,
    (n, len) => {
      const isLine = lineTags.has(n.nodeName);
      if (n.nodeType === Node.TEXT_NODE) {
        last = [n, Math.min(pos, len)];
      } else if (len && !pos) {
        return true; // before line break or embed
      } else {
        const p = n.parentNode!;
        last = isLine ? [n, 0] : [p, Array.prototype.indexOf.call(p.childNodes, n) + 1];
      }
      pos -= len;
      return pos < 0 || (!pos && !isLine);
    },
    isEmbed
  );
  return last;
}

/** Represents contenteditable element with custom input props as value, select etc. */
export default class WUPTextAreaInput extends HTMLElement {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextAreaInput;

  static $use(): void {
    // it's for sideEffects component self-registered
  }

  static get $style(): string {
    return "";
  }

  constructor() {
    super();
    if (!styledTags.has(this.tagName)) {
      styledTags.add(this.tagName);
      WUPBaseElement.$refStyle!.append(this.#ctr.$style.replace(/:host/g, `${this.tagName}`));
    }
  }

  $options: Record<string, any> = {};
  #isInit = true;
  connectedCallback(): void {
    if (this.#isInit) {
      this.setupEditable();
      this.setAttribute("role", "textbox");
      this.setAttribute("aria-multiline", "true");
      this.#isInit = false;
      this.oninput = () => {
        this._cached = undefined;
      };
    }
  }

  /** Makes the selection equal to the current object. */
  select(): void {
    const range = document.createRange();
    range.selectNodeContents(this);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /** Get/set readonly: element is focusable (to select & copy text) but not editable */
  get readOnly(): boolean {
    return this.hasAttribute("aria-readonly");
  }

  set readOnly(v: boolean) {
    WUPBaseElement.prototype.setAttr.call(this, "aria-readonly", v);
    this.setupEditable();
  }

  /** Get/set disabled: element is neither focusable nor editable */
  get disabled(): boolean {
    return this.hasAttribute("aria-disabled");
  }

  set disabled(v: boolean) {
    WUPBaseElement.prototype.setAttr.call(this, "aria-disabled", v);
    this.setupEditable();
  }

  /** Updates [contenteditable] & [tabindex] according to readOnly & disabled;
   *  WARN: preventing beforeinput isn't enough since IME composition (`insertCompositionText`) isn't cancelable */
  protected setupEditable(): void {
    const ro = this.readOnly;
    const d = this.disabled;
    this.setAttribute("contenteditable", ro || d ? "false" : "true");
    WUPBaseElement.prototype.setAttr.call(this, "tabindex", ro && !d && "0"); // otherwise it's focusable only while editable
  }

  _cached?: string;
  /** Get/set plain text (getter converts `<br>` & lines added by browser on Enter into '\n'; setter assigns textContent) */
  get value(): string {
    if (this._cached == null) {
      let s = "";
      walkText(this, (n, len) => {
        s += n.nodeType === Node.TEXT_NODE ? (n as Text).data : "\n".repeat(len);
      });
      this._cached = s;
    }
    return this._cached;
  }

  set value(v: string) {
    this._cached = undefined;
    this.textContent = v;
    v.endsWith("\n") && this.append(document.createElement("br")); // otherwise browser doesn't show the last empty line
  }

  /** Returns function that checks if element is embed (`<img>` etc.): it's counted as 1 char in positions of selection */
  _embedOf?(): ((el: Element) => boolean) | undefined;

  /** Sets the start and end positions of a selection in a text field.
   * @param start The offset into the text field for the start of the selection.
   * @param end The offset into the text field for the end of the selection. */
  setSelectionRange(start: number | null, end: number | null): void {
    this.selection = { start: start || 0, end: end || 0 };
  }

  /** Gets or sets the starting position or offset of a text selection. */
  get selectionStart(): number | null {
    return this.selection?.start ?? null;
  }

  set selectionStart(v: number | null) {
    this.selection = { start: v || 0, end: this.selection?.end as number };
  }

  /** Gets or sets the end position or offset of a text selection. */
  get selectionEnd(): number | null {
    return this.selection?.end ?? null;
  }

  set selectionEnd(v: number | null) {
    this.selection = { start: this.selection?.start as number, end: v || 0 };
  }

  /** Positions of selection by chars of value (contenteditable doesn't contain selectionStart & selectionEnd props) */
  get selection(): null | { start: number; end: number } {
    const sel = window.getSelection();
    if (document.activeElement !== this || !sel?.rangeCount) {
      return null;
    }
    const r = sel.getRangeAt(0);
    const isEmbed = this._embedOf?.();
    return {
      start: charsBefore(this, r.startContainer, r.startOffset, isEmbed),
      end: charsBefore(this, r.endContainer, r.endOffset, isEmbed),
    };
  }

  set selection(sel) {
    if (document.activeElement !== this) {
      return;
    }
    const isEmbed = this._embedOf?.();
    const [n1, o1] = pointAt(this, sel?.start ?? 0, isEmbed);
    const [n2, o2] = pointAt(this, sel?.end ?? 0, isEmbed);
    window.getSelection()!.setBaseAndExtent(n1, o1, n2, o2);
  }
}

customElements.define("wup-areainput", WUPTextAreaInput);
