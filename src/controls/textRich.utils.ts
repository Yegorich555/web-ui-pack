import { lineTags } from "./textArea.input";

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
/** Positive margin-left (indent) */
const indentReg = /^\d+(\.\d+)?(px|em)$/;

/** Helpers of DOM ranges, points (node & offset) & selection */
export const Ranges = {
  /** Fast `r.intersectsNode(n)`: it walks previous siblings (slow for lines) */
  intersects(r: Range, n: Node): boolean {
    return (
      r.comparePoint(n, 0) < 1 &&
      r.comparePoint(n, n.nodeType === Node.TEXT_NODE ? (n as Text).length : n.childNodes.length) > -1
    );
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
    return next && r.intersectsNode(next) ? next : n;
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
      if (r.intersectsNode(t)) {
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

  /** Selects range (Range or StaticRange) */
  select(r: AbstractRange): void {
    window.getSelection()!.setBaseAndExtent(r.startContainer, r.startOffset, r.endContainer, r.endOffset);
  },

  /** Selects node (embed format replaces it) */
  selectNode(n: Node): void {
    const r = document.createRange();
    r.selectNode(n);
    Ranges.select(r);
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
    return a.cloneNode(false).isEqualNode(b.cloneNode(false));
  },

  /** Returns checker of embed elements (`<img>` etc.); `undefined` if there are no embed tools */
  embedOf(tools: WUP.TextRich.Tools): ((el: Element) => boolean) | undefined {
    const arr = Object.values(tools).filter((t) => t.kind === "embed" && t.is);
    return arr.length ? (el) => arr.some((t) => t.is!(el as HTMLElement) !== undefined) : undefined;
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

  /** Wraps not formatted text nodes into new element of format */
  addInline(nodes: Text[], is: (el: Element) => boolean, create: () => HTMLElement, root: Node): void {
    nodes.forEach((t) => {
      if (!Formats.parents(t, is, root).length) {
        const el = create();
        t.before(el);
        el.appendChild(t);
        Internal.mergePrev(el.nextSibling);
        Internal.mergePrev(el); // `<b>a</b><b>b</b>` => `<b>ab</b>`
      }
    });
  },

  /** Splits element at collapsed range & places range between parts: `<b>a|b</b>` => `<b>a</b>|<b>b</b>`;
   *  parts without text & embeds (see `isEmbed`) are removed; at element start it stays after range (the same element) */
  splitAt(el: Element, r: Range, isEmbed?: (el: Element) => boolean): void {
    const isEmpty = (x: Element | DocumentFragment): boolean =>
      !x.textContent && !(isEmbed && Array.prototype.some.call(x.querySelectorAll("*"), isEmbed));
    const after = document.createRange();
    after.setStart(...Internal.edgeOf(el, r.startContainer, r.startOffset));
    after.setEnd(el, el.childNodes.length);
    const f = after.extractContents();
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

  /** Returns lines in range (skips the last one if range ends at its start: triple click) */
  of(r: Range, root: Element): HTMLElement[] {
    const arr = Lines.all(root).filter((l) => Ranges.intersects(r, l));
    !r.collapsed && arr.length > 1 && !Ranges.textAt(arr.at(-1)!, r.endContainer, r.endOffset, true) && arr.pop();
    return arr.filter((l, i) => !l.contains(arr[i + 1] ?? null)); // skip parents of nested items (nested item follows parent)
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

  /** Replaces line with element or tag (keeps line style: alignment etc.; skips the same tag);
   *  list item is moved out of its lists at first (splits lists & parent items of nested list) */
  setTag(line: HTMLElement, tag: string | HTMLElement): HTMLElement {
    for (let p = line.parentElement!; line.tagName === "LI" && (listTags.has(p.tagName) || p.tagName === "LI"); ) {
      const rest = p.cloneNode(false) as Element; // items after line (nested ones keep their level)
      while (line.nextSibling) {
        rest.appendChild(line.nextSibling);
      }
      !Internal.isBlank(rest) && p.after(rest);
      p.after(line);
      Internal.isBlank(p) && p.remove();
      p = line.parentElement!;
    }
    if (line.tagName === tag) {
      return line;
    }
    const el = typeof tag === "string" ? document.createElement(tag) : tag;
    el.append(...line.childNodes);
    const s = line.getAttribute("style");
    s && el.setAttribute("style", s + (el.getAttribute("style") ?? "")); // element style wins
    line.replaceWith(el);
    return el;
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
    for (let el = w.nextNode() as Element | null; el; el = w.nextNode() as Element | null) {
      if ((el.tagName === "BR" || Lines.isBlockTag(el.tagName) || isEmbed?.(el)) && !el.contains(n)) {
        if (b.comparePoint(el, 0) < 0) {
          a.setStartAfter(el); // elements are in order: the last one before point wins
        } else {
          b.setEndBefore(el);
          break;
        }
      }
    }
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
   * * links with unsafe protocols are removed (`javascript:` etc.) */
  fromEditor(root: Node, tools: WUP.TextRich.Tools): string {
    const div = document.createElement("div");
    const ctx = Internal.ctxOf(tools, false);
    Internal.appendBlocks(root, div, ctx);
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
    const before = document.createRange();
    before.setStart(el, 0);
    before.setEnd(...Internal.edgeOf(el, first, 0));
    if (!before.collapsed) {
      const c = el.cloneNode(false);
      c.appendChild(before.extractContents());
      el.before(c);
    }
    const after = document.createRange();
    after.setStart(...Internal.edgeOf(el, last, last.length));
    after.setEnd(el, el.childNodes.length);
    if (!after.collapsed) {
      const c = el.cloneNode(false);
      c.appendChild(after.extractContents());
      el.after(c);
    }
  },

  /** Merges element into previous sibling with the same tag & attributes */
  mergePrev(el: Node | null): void {
    const prev = el?.previousSibling;
    if (prev?.nodeType === Node.ELEMENT_NODE && Formats.isSame(prev, el!)) {
      (prev as Element).append(...el!.childNodes);
      (el as Element).remove();
    }
  },

  // Lines

  /** Returns true if element has neither text nor elements (whitespaces between list items etc.) */
  isBlank(el: Element): boolean {
    return !el.firstElementChild && !el.textContent!.trim();
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

  /** Returns value of format applied by element (`undefined` for default value `false` too) */
  applied(t: WUP.TextRich.Tool, el: HTMLElement): unknown {
    const v = t.is!(el);
    return v === false ? undefined : v;
  },

  /** Returns the 1st tool applied by element & its value */
  firstOf(tools: WUP.TextRich.Tool[], el: HTMLElement): [WUP.TextRich.Tool, unknown] | undefined {
    let v: unknown;
    const t = tools.find((x) => (v = Internal.applied(x, el)) !== undefined);
    return t && [t, v];
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

  /** Returns new embed if element is embed (`<img>` etc.) */
  toEmbed(el: HTMLElement, ctx: Ctx): HTMLElement | null {
    const m = Internal.firstOf(ctx.embed, el);
    ctx.hasEmbed ||= !!m;
    return m ? Internal.createFor(m[0], m[1], ctx) : null;
  },

  /** Copies line styles: `lineStyle` formats (alignment etc.) & indent */
  copyBlockStyle(src: HTMLElement, dst: HTMLElement, ctx: Ctx): void {
    ctx.lineStyle.forEach((t) => {
      const v = Internal.applied(t, src);
      v !== undefined && t.set!(dst, v);
    });
    const ml = src.style.marginLeft;
    indentReg.test(ml) && parseFloat(ml) > 0 && (dst.style.marginLeft = ml);
  },

  /** Removes trailing `<br>` of non-empty line (browser placeholder) */
  trimBr(el: HTMLElement): void {
    const last = el.lastChild;
    last && last !== el.firstChild && last.nodeName === "BR" && last.remove();
  },

  /** Appends sanitized inline node; nested blocks are flattened into lines separated by `<br>` */
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
    const embed = Internal.toEmbed(el, ctx);
    if (embed) {
      dst.appendChild(embed);
      return;
    }
    if (skipTags.has(tag)) {
      return;
    }
    if (tag === "BR") {
      dst.appendChild(document.createElement("br"));
      return;
    }
    if (Lines.isBlockTag(tag)) {
      dst.lastChild && dst.lastChild.nodeName !== "BR" && dst.appendChild(document.createElement("br"));
      Internal.appendInline(el, dst, ctx);
      return;
    }
    // element can apply several formats (`<span style="font-size; color">`) => nested elements
    const arr = ctx.inline.flatMap((t) => {
      const v = Internal.applied(t, el);
      return v === undefined ? [] : [Internal.createFor(t, v, ctx)];
    });
    if (arr.length) {
      const inner = arr.reduce((a, b) => a.appendChild(b));
      Internal.appendInline(el, inner, ctx);
      inner.firstChild && dst.appendChild(arr[0]);
    } else {
      Internal.appendInline(el, dst, ctx); // unwrap unsupported: <span>, <font>, <code> etc.
    }
  },

  /** Appends sanitized inline content */
  appendInline(src: Node, dst: HTMLElement, ctx: Ctx): void {
    src.childNodes.forEach((n) => Internal.appendInlineNode(n, dst, ctx));
  },

  /** Fills line `el` (heading, paragraph etc.) with sanitized content of src */
  toLine(src: HTMLElement, el: HTMLElement, ctx: Ctx): HTMLElement {
    Internal.copyBlockStyle(src, el, ctx);
    Internal.appendInline(src, el, ctx);
    !ctx.isEditor && Internal.trimBr(el);
    return el;
  },

  /** Appends sanitized list item: nested lists are kept, other content is flattened */
  appendListItem(src: HTMLElement, list: HTMLElement, ctx: Ctx): void {
    const li = list.appendChild(document.createElement("li"));
    Internal.copyBlockStyle(src, li, ctx);
    src.childNodes.forEach((n) => {
      listTags.has(n.nodeName)
        ? li.appendChild(Internal.toList(n as HTMLElement, ctx))
        : Internal.appendInlineNode(n, li, ctx);
    });
    !ctx.isEditor && Internal.trimBr(li);
    !li.firstChild && li.appendChild(document.createElement("br"));
  },

  /** Returns sanitized list */
  toList(src: HTMLElement, ctx: Ctx): HTMLElement {
    const list = document.createElement(src.tagName);
    let li: HTMLElement | null = null; // for content directly in list (invalid html)
    src.childNodes.forEach((n) => {
      const tag = n.nodeName;
      if (tag === "LI") {
        li = null;
        Internal.appendListItem(n as HTMLElement, list, ctx);
      } else if (listTags.has(tag)) {
        li = null;
        list.appendChild(Internal.toList(n as HTMLElement, ctx)); // Chrome nests lists on indent
      } else if (n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n as Text).data.trim())) {
        li ??= list.appendChild(document.createElement("li"));
        Internal.appendInlineNode(n, li, ctx);
      }
    });
    return list;
  },

  /** Appends sanitized blocks of container: loose inline content is grouped into paragraphs */
  appendBlocks(src: Node, dst: Node, ctx: Ctx): void {
    const pTag = ctx.isEditor ? "div" : "p";
    let p: HTMLElement | null = null; // current paragraph for inline content
    const closeParagraph = (): void => {
      p && !ctx.isEditor && Internal.trimBr(p);
      p = null;
    };

    src.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = (n as Text).data;
        if (p || t.trim()) {
          p ??= dst.appendChild(document.createElement(pTag));
          p.append(t);
        } // skip whitespaces between blocks
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      const el = n as HTMLElement;
      const tag = el.tagName;
      if (tag === "BR") {
        // after inline content - next paragraph, otherwise - empty line
        if (p) {
          closeParagraph();
        } else {
          dst.appendChild(document.createElement(pTag)).appendChild(document.createElement("br"));
        }
        return;
      }
      if (!Lines.isBlockTag(tag)) {
        // skip unsupported with content (<script> etc.) except embeds (<img> etc.)
        const embed = Internal.toEmbed(el, ctx);
        if (embed || !skipTags.has(tag)) {
          p ??= dst.appendChild(document.createElement(pTag));
          embed ? p.appendChild(embed) : Internal.appendInlineNode(el, p, ctx);
        }
        return;
      }

      closeParagraph();
      const line = Internal.firstOf(ctx.line, el); // heading, blockquote etc.
      if (line) {
        dst.appendChild(Internal.toLine(el, Internal.createFor(line[0], line[1], ctx), ctx));
      } else if (listTags.has(tag)) {
        dst.appendChild(Internal.toList(el, ctx));
      } else if (tag === "LI") {
        Internal.appendListItem(el, dst.appendChild(document.createElement("ul")), ctx); // <li> without list
      } else if (Array.prototype.some.call(el.children, (c: Element) => Lines.isBlockTag(c.tagName))) {
        Internal.appendBlocks(el, dst, ctx); // unwrap: `<div><ol>...</ol></div>`
      } else {
        const paragraph = Internal.toLine(el, document.createElement(pTag), ctx);
        paragraph.firstChild && dst.appendChild(paragraph);
      }
    });
    closeParagraph();
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
