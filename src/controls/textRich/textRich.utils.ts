import { lineTags, pointAt } from "../textArea/textArea.input";

/** Containers => paragraph (`<p>` in value, `<div>` in editor); unwrapped if they contain blocks */
const paragraphTags = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "MAIN",
  "ASIDE",
  "NAV",
  "ADDRESS",
  "FIGURE",
  "FIGCAPTION",
  "DETAILS",
  "SUMMARY",
  "FIELDSET",
  "FORM",
  "CENTER",
  "DL",
  "DT",
  "DD",
  "TABLE",
  "CAPTION",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TH",
  "TD",
]);
export const listTags = new Set(["OL", "UL"]);
/** Removed with content: unsafe or not supported */
const skipTags = new Set([
  "SCRIPT",
  "STYLE",
  "TEMPLATE",
  "NOSCRIPT",
  "IFRAME",
  "FRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "MATH",
  "CANVAS",
  "AUDIO",
  "VIDEO",
  "IMG",
  "PICTURE",
  "SOURCE",
  "TRACK",
  "MAP",
  "AREA",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "BUTTON",
  "HR",
  "TITLE",
  "META",
  "LINK",
  "BASE",
]);
/** Value of `size` => font-size */
export const sizes = { sm: "small", lg: "x-large", hg: "xxx-large" };
/** Supported font-size => value of `size` */
export const sizeFormats = {
  small: "sm",
  "x-large": "lg",
  "xxx-large": "hg",
} satisfies Record<string, WUP.TextRich.ToolValues["size"]>;
/** Supported text-align ("left" is default) */
export const textAligns = new Set(["center", "right", "justify"]);
const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:", "sms:"]);
/** Margin-left of indent: number & unit */
export const indentReg = /^(\d+(?:\.\d+)?)(px|em)$/;

/** Helpers of DOM ranges, points (node & offset) & selection */
export const Ranges = {
  /** Fast `r.intersectsNode(n)`: it walks previous siblings (slow for lines); `end` - offset where content of node ends */
  intersects(
    r: Range,
    n: Node,
    end = n.nodeType === Node.TEXT_NODE ? (n as Text).length : n.childNodes.length
  ): boolean {
    return r.comparePoint(n, 0) < 1 && r.comparePoint(n, end) > -1;
  },

  /** Returns the 1st node inside range (skips node if range starts at its end) */
  firstNode(r: Range): Node {
    const n = r.startContainer;
    if (r.collapsed) {
      return n;
    }
    if (n.nodeType === Node.TEXT_NODE) {
      if (r.startOffset < (n as Text).length) {
        return n;
      }
    } else if (n.childNodes[r.startOffset]) {
      return n.childNodes[r.startOffset];
    }
    const w = document.createTreeWalker(r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    let last = n;
    while (last.lastChild) {
      last = last.lastChild; // range starts at the end of element: otherwise its own text is next (it's before range)
    }
    w.currentNode = last;
    const next = w.nextNode();
    return next && Ranges.intersects(r, next) ? next : n;
  },

  /** Returns text nodes inside range (edge nodes are split by range) */
  split(r: Range): Text[] {
    const e = r.endContainer;
    if (e.nodeType === Node.TEXT_NODE && r.endOffset > 0 && r.endOffset < (e as Text).length) {
      (e as Text).splitText(r.endOffset);
    }
    const s = r.startContainer;
    if (s.nodeType === Node.TEXT_NODE && r.startOffset > 0 && r.startOffset < (s as Text).length) {
      r.setStart((s as Text).splitText(r.startOffset), 0); // end in the same node moves automatically
    }

    const arr: Text[] = [];
    const w = document.createTreeWalker(r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    w.currentNode = r.startContainer.childNodes[r.startOffset] ?? r.startContainer;
    let isIn = false;
    for (let n = w.currentNode.nodeType === Node.TEXT_NODE ? w.currentNode : w.nextNode(); n; n = w.nextNode()) {
      const t = n as Text;
      if (Ranges.intersects(r, t)) {
        isIn = true;
        const isOut =
          !t.length ||
          (t === r.startContainer && r.startOffset === t.length) ||
          (t === r.endContainer && r.endOffset === 0);
        !isOut && arr.push(t);
      } else if (isIn) {
        break; // the rest is after range
      }
    }
    return arr;
  },

  /** Returns text of element after point (or before if `isBefore`): empty at its edge or out of it */
  textAt(el: Node, n: Node, offset: number, isBefore?: boolean): string {
    const r = document.createRange();
    r.selectNodeContents(el);
    isBefore ? r.setEnd(n, offset) : r.setStart(n, offset);
    return r.toString();
  },

  /** Inserts text at point
   * @returns point after inserted text */
  insertText(n: Node, offset: number, s: string): [Node, number] {
    if (n.nodeType === Node.TEXT_NODE) {
      (n as Text).insertData(offset, s);
      return [n, offset + s.length];
    }
    return [n.insertBefore(document.createTextNode(s), n.childNodes[offset] ?? null), s.length];
  },

  /** Selects range (Range or StaticRange) or node (embed format replaces it) */
  select(r: AbstractRange | Node): void {
    if (r instanceof Node) {
      const x = document.createRange();
      x.selectNode(r);
      r = x;
    }
    window.getSelection()!.setBaseAndExtent(r.startContainer, r.startOffset, r.endContainer, r.endOffset);
  },

  /** Returns range between char positions inside root (see pointAt) */
  at(root: Node, a: number, b: number, isEmbed?: (el: Element) => boolean): Range {
    const r = document.createRange();
    r.setStart(...pointAt(root, a, isEmbed));
    r.setEnd(...pointAt(root, b, isEmbed));
    return r;
  },
};

/** Helpers of tool options: shortcuts & recognizing */
export const Tools = {
  /** Returns list of shortcuts: `["Control", "B"]` => `[["Control", "B"]]`, `{ prev, next }` => `[prev, next]` */
  shortcuts(hk: WUP.TextRich.Tool["hotKey"]): WUP.TextRich.HotKey[] {
    if (!hk) {
      return [];
    }
    return Array.isArray(hk) ? [hk] : [hk.prev, hk.next];
  },

  /** Returns text recognized by RegExp (the whole match) or by function (see `Tool.recognize`) */
  recognized(r: WUP.TextRich.Tool["recognize"], s: string): string | null | undefined {
    return typeof r === "function" ? r(s) : r?.exec(s)?.[0];
  },
};

/** Helpers of format elements (see `create` & `is` of tool): creating, matching, adding & removing */
export const Formats = {
  /** Creates element of format via `create` & adds `classNameTag` of tool & value */
  create(t: WUP.TextRich.Tool, v: unknown): HTMLElement {
    const el = typeof t.create === "string" ? document.createElement(t.create) : t.create!(v);
    t.classNameTag && el.classList.add(t.classNameTag);
    const cls = t.values?.find((x) => x.value === v)?.classNameTag;
    cls && el.classList.add(cls);
    return el;
  },

  /** Returns true if applied value `v` matches `value` (`true` matches any value) */
  isMatch(v: unknown, value: unknown): boolean {
    return v !== undefined && (value === true || v === value);
  },

  /** Returns true if elements have the same tag & attributes */
  isSame(a: Node, b: Node): boolean {
    return a.nodeName === b.nodeName && a.cloneNode(false).isEqualNode(b.cloneNode(false));
  },

  /** Merges element into previous sibling with the same tag & attributes: `<b>a</b><b>b</b>` => `<b>ab</b>` */
  mergePrev(el: Node | null): void {
    const prev = el?.previousSibling;
    if (prev?.nodeType === Node.ELEMENT_NODE && Formats.isSame(prev, el!)) {
      (prev as Element).append(...el!.childNodes);
      (el as Element).remove();
    }
  },

  /** Returns ancestors of node matched by `is` (from inner to outer) inside root */
  parents(n: Node, is: (el: Element) => boolean, root: Node): Element[] {
    const arr: Element[] = [];
    for (let el = (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement) as Element | null; el && el !== root; ) {
      is(el) && arr.push(el);
      el = el.parentElement;
    }
    return arr;
  },

  /** Removes inline format from text nodes: unwraps matched ancestors around them */
  removeInline(nodes: Text[], is: (el: Element) => boolean, root: Node): void {
    const groups = new Map<Element, Text[]>(); // format element => text nodes inside
    nodes.forEach((t) =>
      Formats.parents(t, is, root).forEach((el) => {
        const arr = groups.get(el);
        arr ? arr.push(t) : groups.set(el, [t]);
      })
    );
    groups.forEach((arr, el) => {
      Internal.isolate(el, arr[0], arr.at(-1)!);
      el.replaceWith(...el.childNodes);
    });
  },

  /** Wraps text nodes into copies of element of format (text inside element matched by `is` is skipped) */
  addInline(nodes: Text[], el: Element, root: Node, is?: (el: Element) => boolean): void {
    nodes.forEach((t) => {
      if (!is || !Formats.parents(t, is, root).length) {
        const c = el.cloneNode(false) as Element;
        t.before(c);
        c.appendChild(t);
        Formats.mergePrev(c.nextSibling);
        Formats.mergePrev(c);
      }
    });
  },

  /** Splits element at collapsed range & places range between parts: `<b>a|b</b>` => `<b>a</b>|<b>b</b>`;
   *  parts without text & embeds (see `isEmbed`) are removed; at element start it stays after range (the same element) */
  splitAt(el: Element, r: Range, isEmbed?: (el: Element) => boolean): void {
    const isEmpty = (x: Element | DocumentFragment): boolean =>
      !x.textContent && !(isEmbed && Lines.elements(x).some(isEmbed));
    r.setStart(...Internal.edgeOf(el, r.startContainer, r.startOffset));
    r.setEnd(el, el.childNodes.length);
    const f = r.extractContents(); // range is collapsed at split point
    if (!isEmpty(el)) {
      if (!isEmpty(f)) {
        const c = el.cloneNode(false) as Element;
        c.appendChild(f);
        el.after(c);
      }
      r.setStartAfter(el);
    } else {
      r.setStartBefore(el);
      isEmpty(f) ? el.remove() : el.replaceChildren(f);
    }
    r.collapse(true);
  },
};

/** Helpers of editor lines: blocks placed directly into editor & items of lists */
export const Lines = {
  /** Returns true for block tag: line (paragraph, heading, list item etc.), container or list */
  isBlockTag(tag: string): boolean {
    return lineTags.has(tag) || paragraphTags.has(tag) || listTags.has(tag);
  },

  /** Returns lines of editor: blocks placed directly into root & items of lists */
  all(root: Element): HTMLElement[] {
    const arr: HTMLElement[] = [];
    const walk = (parent: Element): void => {
      for (
        let el = parent.firstElementChild as HTMLElement | null;
        el;
        el = el.nextElementSibling as HTMLElement | null
      ) {
        const tag = el.tagName;
        if (listTags.has(tag)) {
          walk(el);
        } else if (tag === "LI") {
          arr.push(el);
          walk(el); // nested lists
        } else if (parent === root && Lines.isBlockTag(tag)) {
          arr.push(el);
        }
      }
    };
    walk(root);
    return arr;
  },

  /** Returns line of node: the nearest list item or block placed directly into root (`undefined` for loose content) */
  at(n: Node, root: Element): HTMLElement | undefined {
    return Formats.parents(
      n,
      (el) =>
        el.tagName === "LI" || (el.parentElement === root && Lines.isBlockTag(el.tagName) && !listTags.has(el.tagName)),
      root
    )[0] as HTMLElement | undefined;
  },

  /** Returns true if line has no own text & embeds (nested lists of item aren't counted) */
  isEmpty(line: Element, isEmbed?: (el: Element) => boolean): boolean {
    return (
      Array.prototype.every.call(line.childNodes, (n: Node) => listTags.has(n.nodeName) || !n.textContent) &&
      !(isEmbed && Lines.elements(line).some(isEmbed))
    );
  },

  /** Returns elements of line content in document order (nested lists of item are skipped) */
  elements(line: ParentNode): HTMLElement[] {
    const arr: HTMLElement[] = [];
    const walk = (parent: ParentNode): void => {
      for (let el = parent.firstElementChild; el; el = el.nextElementSibling) {
        if (parent !== line || !listTags.has(el.tagName)) {
          arr.push(el as HTMLElement);
          walk(el);
        }
      }
    };
    walk(line);
    return arr;
  },

  /** Returns lines in range (skips the last one if range ends at its start: triple click);
   *  item with nested list is in range if its own content is (till nested list): otherwise selected nested item gives parent */
  of(r: Range, root: Element): HTMLElement[] {
    const arr = Lines.all(root).filter((l) => {
      const i = Array.prototype.findIndex.call(l.childNodes, (n: Node) => listTags.has(n.nodeName));
      return Ranges.intersects(r, l, i < 0 ? undefined : i);
    });
    !r.collapsed && arr.length > 1 && !Ranges.textAt(arr.at(-1)!, r.endContainer, r.endOffset, true) && arr.pop();
    return arr;
  },

  /** Wraps loose inline content into <div> (Chrome doesn't wrap the 1st line); adds empty line to empty root
   * @returns true if root is changed */
  wrap(root: Element): boolean {
    let isChanged = false;
    let div: HTMLElement | null = null;
    Array.from(root.childNodes).forEach((n) => {
      if (Lines.isBlockTag(n.nodeName)) {
        div = null;
      } else if (n.nodeName === "BR") {
        if (div) {
          n.remove(); // after inline content it means the next line
        } else {
          root.insertBefore(document.createElement("div"), n).appendChild(n); // empty line
        }
        div = null;
        isChanged = true;
      } else if (div || n.nodeType !== Node.TEXT_NODE || (n as Text).data.trim()) {
        div ??= root.insertBefore(document.createElement("div"), n);
        div.appendChild(n);
        isChanged = true;
      }
    });
    if (!root.firstChild) {
      root.appendChild(document.createElement("div")).appendChild(document.createElement("br"));
      isChanged = true;
    }
    return isChanged;
  },

  /** Replaces line with element or tag (keeps line style: alignment etc.);
   *  list item is moved out of its lists at first (see `lift`), its nested lists stay in list after it (keep their level) */
  setTag(line: HTMLElement, tag: string | HTMLElement): HTMLElement {
    if (line.tagName === "LI") {
      line.after(...Array.prototype.filter.call(line.children, (el: Element) => listTags.has(el.tagName)));
      while (line.parentElement!.matches("ol,ul,li")) {
        Lines.lift(line);
      }
    }
    const el = typeof tag === "string" ? document.createElement(tag) : tag;
    el.append(...line.childNodes);
    const s = line.getAttribute("style");
    s && el.setAttribute("style", s + (el.getAttribute("style") ?? "")); // element style wins
    line.replaceWith(el);
    return el;
  },

  /** Moves list item out of its parent (list or item of nested list): items before it stay in a copy of parent
   *  (`<ol><li>a</li><li>b</li><li>c</li></ol>`, `b` => `<ol><li>a</li></ol><li>b</li><ol><li>c</li></ol>`);
   *  parts without content are removed (see Internal.dropEmpty)
   * @returns the same item */
  lift(li: HTMLElement): HTMLElement {
    const p = li.parentElement!;
    // items before line: lines are set in order (see setTag), so the rest isn't moved for each one
    const head = p.cloneNode(false) as Element;
    while (li.previousSibling) {
      head.prepend(li.previousSibling);
    }
    p.before(head, li);
    Internal.dropEmpty(head);
    Internal.dropEmpty(p);
    return li;
  },

  /** Moves list item into nested list of the previous item (with its nested items) or back after parent item if `isOut`
   *  (the next items stay below it: they become its nested items)
   * @returns false if there is no level to move: the 1st item of list or item of top-level list */
  nest(li: HTMLElement, isOut?: boolean): boolean {
    const list = li.parentElement!;
    // parent item or the previous one; list: Chrome places nested list directly into list
    const x = isOut ? list.parentElement : li.previousElementSibling;
    if (!x?.matches("li,ol,ul")) {
      return false;
    }
    const isItem = x.tagName === "LI";
    if (isOut) {
      Lines.lift(li); // the next items stay in list after it
      for (let n = li.nextSibling; n && (isItem || n === list); n = li.nextSibling) {
        li.appendChild(n); // the next items & other nested lists of parent item
      }
      Formats.mergePrev(list); // into nested list of item
      isItem && x.after(li);
      Internal.dropEmpty(x);
      return true;
    }
    // nested list of the previous item or nested list without parent item
    let sub = isItem ? x.lastElementChild : x;
    if (sub?.tagName !== list.tagName) {
      sub = document.createElement(list.tagName);
      isItem ? x.appendChild(sub) : x.after(sub);
    }
    sub.appendChild(li);
    return true;
  },

  /** Returns text of line before & after point: from the last line break, embed or block (nested list etc.) to the next one */
  textAround(line: Element, n: Node, offset: number, isEmbed?: (el: Element) => boolean): [string, string] {
    const a = document.createRange();
    a.setStart(line, 0);
    a.setEnd(n, offset);
    const b = document.createRange();
    b.setStart(n, offset);
    b.setEnd(line, line.childNodes.length);
    const w = document.createTreeWalker(line, NodeFilter.SHOW_ELEMENT);
    let prev: Element | undefined; // elements are in order: the last one before point wins
    for (let el = w.nextNode() as Element | null; el; el = w.nextNode() as Element | null) {
      if ((el.tagName === "BR" || Lines.isBlockTag(el.tagName) || isEmbed?.(el)) && !el.contains(n)) {
        if (b.comparePoint(el, 0) >= 0) {
          b.setEndBefore(el);
          break;
        }
        prev = el; // range isn't moved here: setStartAfter walks previous siblings
      }
    }
    prev && a.setStartAfter(prev);
    return [a.toString(), b.toString()];
  },
};

// WARN: sanitizer never clones or moves source nodes (they can be unsafe): it creates new ones only

/** Sanitizer context: tools grouped by kind */
interface Ctx {
  /** Result for editor: paragraph as `<div>` (as browser adds on Enter), bold as `<b>` (`<strong>` is styled as control label) */
  isEditor: boolean;
  inline: WUP.TextRich.Tool[];
  line: WUP.TextRich.Tool[];
  lineStyle: WUP.TextRich.Tool[];
  embed: WUP.TextRich.Tool[];
  /** Result has embed: it isn't empty even without text */
  hasEmbed?: boolean;
}

/** Cache [html, text]: validations min & max convert the same value (Html.fromEditor fills it too) */
let lastText = ["", ""];

/** Html of value & editor: sanitizer (only formats of tools are kept), url check & text for validations */
export const Html = {
  /** Returns sanitized content for editor */
  toEditor(html: string, tools: WUP.TextRich.Tools): DocumentFragment {
    const f = document.createDocumentFragment();
    if (html) {
      const { body } = new DOMParser().parseFromString(html, "text/html"); // inert: nothing is executed/loaded
      Internal.appendBlocks(body, f, Internal.ctxOf(tools, true));
    }
    return f;
  },

  /** Returns sanitized html of editor content (empty string if there is no text or embeds)
   * @tutorial Rules
   * * single plain paragraph goes without `<p>` (`text` instead of `<p>text</p>`)
   * * only formats of tools are kept: other elements are unwrapped (`<span>`, `<table>` etc.)
   * or removed with content (`<script>`, `<img>` if it isn't embed etc.)
   * * links with unsafe protocols are removed (`javascript:` etc.)
   * * trailing `<br>` of non-empty line is removed (browser adds it to show empty line) */
  fromEditor(root: Node, tools: WUP.TextRich.Tools): string {
    const div = document.createElement("div");
    const ctx = Internal.ctxOf(tools, false);
    Internal.appendBlocks(root, div, ctx);
    Lines.all(div).forEach((l) => {
      const last = l.lastChild;
      last && last !== l.firstChild && last.nodeName === "BR" && last.remove();
    });
    const text = div.textContent!;
    const p = div.firstChild as HTMLElement;
    const html = text.trim() || ctx.hasEmbed ? (Internal.isPlainParagraph(p) ? p : div).innerHTML : "";
    lastText = [html, html && text]; // validations skip parsing
    return html;
  },

  /** Returns text of html (for validations) */
  toText(html: string): string {
    if (html !== lastText[0]) {
      const t = document.createElement("template");
      t.innerHTML = html; // inert: nothing is executed/loaded
      lastText = [html, t.content.textContent || ""];
    }
    return lastText[1];
  },

  /** Returns url if its protocol is safe, otherwise empty string */
  sanitizeUrl(url: string): string {
    // todo update when min Safari 18+ (URL.parse returns null instead of throwing, so without try/catch): return safeProtocols.has(URL.parse(url, document.baseURI)?.protocol ?? "") ? url : "";
    try {
      return safeProtocols.has(new URL(url, document.baseURI).protocol) ? url : "";
    } catch {
      return "";
    }
  },
};

/** Helpers used internally by groups above (not exported) */
const Internal = {
  // Formats

  /** Returns point moved out of nested elements of el while it's at their start or end:
   *  (`<b>a<i>|bc</i></b>`, `<b>`) => (`<b>`, 1); split at it doesn't leave their empty copies (`<b>a<i></i></b>`) */
  edgeOf(el: Element, n: Node, offset: number): [Node, number] {
    while (
      n !== el &&
      (!offset || offset === (n.nodeType === Node.TEXT_NODE ? (n as Text).length : n.childNodes.length))
    ) {
      const p = n.parentNode!;
      offset = Array.prototype.indexOf.call(p.childNodes, n) + (offset ? 1 : 0);
      n = p;
    }
    return [n, offset];
  },

  /** Moves content outside `first`..`last` into copies of el: `<b>a[bc]d</b>` => `<b>a</b><b>[bc]</b><b>d</b>`;
   *  split at edges of nested elements: otherwise their empty copies stay (`<b><i></i></b>`) */
  isolate(el: Element, first: Text, last: Text): void {
    [first, last].forEach((t, isEnd) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      isEnd ? r.setStart(...Internal.edgeOf(el, t, t.length)) : r.setEnd(...Internal.edgeOf(el, t, 0));
      if (!r.collapsed) {
        const c = el.cloneNode(false);
        c.appendChild(r.extractContents());
        isEnd ? el.after(c) : el.before(c);
      }
    });
  },

  // Lines

  /** Removes list without items (whitespaces between items etc.) or unwraps item without own content: its nested lists
   *  go into parent list (keep their level; otherwise item without text is shown as empty line with bullet) */
  dropEmpty(el: Element): void {
    const isItem = el.tagName === "LI";
    Array.prototype.every.call(
      el.childNodes,
      (n: Node) => (isItem && listTags.has(n.nodeName)) || (n.nodeType === Node.TEXT_NODE && !(n as Text).data.trim())
    ) && el.replaceWith(...el.children);
  },

  // Html: sanitizer

  /** Returns sanitizer context (tools without `is`, `create`/`set` are skipped) */
  ctxOf(tools: WUP.TextRich.Tools, isEditor: boolean): Ctx {
    const ctx: Ctx = { isEditor, inline: [], line: [], lineStyle: [], embed: [] };
    Object.values(tools).forEach(
      (t) => t.kind && t.is && (t.kind === "lineStyle" ? t.set : t.create) && ctx[t.kind].push(t)
    );
    return ctx;
  },

  /** Returns tools applied by element & their values (default value `false` isn't applied) */
  applied(tools: WUP.TextRich.Tool[], el: HTMLElement): Array<[WUP.TextRich.Tool, unknown]> {
    const arr: Array<[WUP.TextRich.Tool, unknown]> = [];
    tools.forEach((t) => {
      const v = t.is!(el);
      v !== undefined && v !== false && arr.push([t, v]);
    });
    return arr;
  },

  /** Creates element of format: `<b>` => `<strong>` in value (in editor `<strong>` is styled as control label) */
  createFor(t: WUP.TextRich.Tool, v: unknown, ctx: Ctx): HTMLElement {
    const el = Formats.create(t, v);
    if (ctx.isEditor || el.tagName !== "B") {
      return el;
    }
    const s = document.createElement("strong");
    el.className && (s.className = el.className); // classNameTag
    return s;
  },

  /** Appends sanitized inline node: embed (`<img>` etc.) is created again, unsupported elements are unwrapped
   *  or removed with content (see skipTags); nested blocks are flattened into lines separated by `<br>` */
  appendInlineNode(n: Node, dst: HTMLElement, ctx: Ctx): void {
    if (n.nodeType === Node.TEXT_NODE) {
      dst.append((n as Text).data);
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = n as HTMLElement;
    const tag = el.tagName;
    const [embed] = Internal.applied(ctx.embed, el);
    if (embed) {
      ctx.hasEmbed = true;
      dst.appendChild(Internal.createFor(...embed, ctx));
      return;
    }
    if (skipTags.has(tag)) {
      return;
    }
    if (tag === "BR") {
      dst.appendChild(document.createElement("br"));
      return;
    }
    const isBlock = Lines.isBlockTag(tag);
    isBlock && dst.lastChild && dst.lastChild.nodeName !== "BR" && dst.appendChild(document.createElement("br"));
    // element can apply several formats (`<span style="font-size; color">`) => nested elements;
    // blocks & unsupported elements are unwrapped: <span>, <font>, <code> etc.
    const arr = isBlock ? [] : Internal.applied(ctx.inline, el).map(([t, v]) => Internal.createFor(t, v, ctx));
    const inner = arr.length ? arr.reduce((a, b) => a.appendChild(b)) : dst;
    for (let c = el.firstChild; c; c = c.nextSibling) {
      Internal.appendInlineNode(c, inner, ctx);
    }
    inner !== dst && inner.firstChild && dst.appendChild(arr[0]);
  },

  /** Fills line `el` (paragraph, heading, list item etc.) with sanitized content of src: copies line styles (`lineStyle`
   *  formats & indent); nested lists of list item are kept (empty item gets `<br>`), other blocks are flattened */
  toLine(src: HTMLElement, el: HTMLElement, ctx: Ctx): HTMLElement {
    Internal.applied(ctx.lineStyle, src).forEach(([t, v]) => t.set!(el, v));
    const ml = src.style.marginLeft;
    indentReg.test(ml) && parseFloat(ml) > 0 && (el.style.marginLeft = ml);
    const isItem = el.tagName === "LI";
    for (let n = src.firstChild; n; n = n.nextSibling) {
      isItem && listTags.has(n.nodeName)
        ? el.appendChild(Internal.toList(n as HTMLElement, ctx))
        : Internal.appendInlineNode(n, el, ctx);
    }
    isItem && !el.firstChild && el.appendChild(document.createElement("br"));
    return el;
  },

  /** Returns sanitized list */
  toList(src: HTMLElement, ctx: Ctx): HTMLElement {
    const list = document.createElement(src.tagName);
    let li: HTMLElement | null = null; // for content directly in list (invalid html)
    for (let n = src.firstChild; n; n = n.nextSibling) {
      const tag = n.nodeName;
      if (tag === "LI") {
        li = null;
        Internal.toLine(n as HTMLElement, list.appendChild(document.createElement("li")), ctx);
      } else if (listTags.has(tag)) {
        li = null;
        list.appendChild(Internal.toList(n as HTMLElement, ctx)); // Chrome nests lists on indent
      } else if (n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n as Text).data.trim())) {
        li ??= list.appendChild(document.createElement("li"));
        Internal.appendInlineNode(n, li, ctx);
      }
    }
    return list;
  },

  /** Appends sanitized blocks of container: loose inline content is grouped into paragraphs */
  appendBlocks(src: Node, dst: Node, ctx: Ctx): void {
    const pTag = ctx.isEditor ? "div" : "p";
    let p: HTMLElement | null = null; // current paragraph for inline content
    for (let n = src.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = (n as Text).data;
        if (p || t.trim()) {
          p ??= dst.appendChild(document.createElement(pTag));
          p.append(t);
        } // skip whitespaces between blocks
        continue;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      const el = n as HTMLElement;
      const tag = el.tagName;
      if (tag === "BR") {
        // after inline content - next paragraph, otherwise - empty line
        !p && dst.appendChild(document.createElement(pTag)).appendChild(document.createElement("br"));
        p = null;
        continue;
      }
      if (!Lines.isBlockTag(tag)) {
        // skip unsupported with content (<script> etc.) except embeds (<img> etc.): otherwise empty paragraph stays
        if (!skipTags.has(tag) || Internal.applied(ctx.embed, el).length) {
          p ??= dst.appendChild(document.createElement(pTag));
          Internal.appendInlineNode(el, p, ctx);
        }
        continue;
      }

      p = null;
      const [line] = Internal.applied(ctx.line, el); // heading, blockquote etc.
      if (line) {
        dst.appendChild(Internal.toLine(el, Internal.createFor(...line, ctx), ctx));
      } else if (listTags.has(tag)) {
        dst.appendChild(Internal.toList(el, ctx));
      } else if (tag === "LI") {
        const ul = dst.appendChild(document.createElement("ul")); // <li> without list
        Internal.toLine(el, ul.appendChild(document.createElement("li")), ctx);
      } else if (Array.prototype.some.call(el.children, (c: Element) => Lines.isBlockTag(c.tagName))) {
        Internal.appendBlocks(el, dst, ctx); // unwrap: `<div><ol>...</ol></div>`
      } else {
        const paragraph = Internal.toLine(el, document.createElement(pTag), ctx);
        paragraph.firstChild && dst.appendChild(paragraph);
      }
    }
  },

  /** Returns true if `<p>` can be dropped from value: the only paragraph without styles, `<br>` & leading whitespaces
   *  (sanitizer adds it back) */
  isPlainParagraph(p: HTMLElement): boolean {
    if (p.nextSibling || p.tagName !== "P" || p.attributes.length) {
      return false;
    }
    p.normalize(); // to check leading whitespaces
    const f = p.firstChild!;
    return (
      (f.nodeType !== Node.TEXT_NODE || !!(f as Text).data.trim()) &&
      !Array.prototype.some.call(p.childNodes, (n: Node) => n.nodeName === "BR")
    );
  },
};
