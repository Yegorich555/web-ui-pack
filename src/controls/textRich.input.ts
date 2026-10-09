import WUPTextAreaInput, { lineTags } from "./textArea.input";

/** Static $tools of control: sanitizer keeps their formats */
type Tools = Record<string, WUP.TextRich.Tool>;

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

/** Returns url if its protocol is safe, otherwise empty string */
export function sanitizeUrl(url: string): string {
  // todo update when min Safari 18+ (URL.parse returns null instead of throwing, so without try/catch): return safeProtocols.has(URL.parse(url, document.baseURI)?.protocol ?? "") ? url : "";
  try {
    return safeProtocols.has(new URL(url, document.baseURI).protocol) ? url : "";
  } catch {
    return "";
  }
}

/** Cache [html, text]: validations min & max convert the same value (getter `value` fills it too) */
let lastText = ["", ""];

/** Returns text of html (for validations) */
export function htmlToText(html: string): string {
  if (html !== lastText[0]) {
    const t = document.createElement("template");
    t.innerHTML = html; // inert: nothing is executed/loaded
    lastText = [html, t.content.textContent || ""];
  }
  return lastText[1];
}

/** Returns checker of embed elements (`<img>` etc.); `undefined` if there are no embed tools */
export function embedOf(tools: Tools): ((el: Element) => boolean) | undefined {
  const arr = Object.values(tools).filter((t) => t.kind === "embed" && t.is);
  return arr.length ? (el) => arr.some((t) => t.is!(el as HTMLElement) !== undefined) : undefined;
}

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

/** Returns sanitizer context (tools without `is`, `create`/`set` are skipped) */
function ctxOf(tools: Tools, isEditor: boolean): Ctx {
  const ctx: Ctx = { isEditor, inline: [], line: [], lineStyle: [], embed: [] };
  Object.values(tools).forEach(
    (t) => t.kind && t.is && (t.kind === "lineStyle" ? t.set : t.create) && ctx[t.kind].push(t)
  );
  return ctx;
}

/** Returns value of format applied by element (`undefined` for default value `false` too) */
function applied(t: WUP.TextRich.Tool, el: HTMLElement): unknown {
  const v = t.is!(el);
  return v === false ? undefined : v;
}

/** Returns the 1st tool applied by element & its value */
function firstOf(tools: WUP.TextRich.Tool[], el: HTMLElement): [WUP.TextRich.Tool, unknown] | undefined {
  let v: unknown;
  const t = tools.find((x) => (v = applied(x, el)) !== undefined);
  return t && [t, v];
}

/** Adds classes: every argument can be space-separated (`"fa fa-bold"`) */
export function addClass(el: Element, ...classes: Array<string | undefined>): void {
  classes.forEach((c) => c && el.classList.add(...c.split(" ").filter(Boolean)));
}

/** Creates element of format via `create` & adds `classNameTag` of tool & value */
export function createOf(t: WUP.TextRich.Tool, v: unknown): HTMLElement {
  const el = typeof t.create === "string" ? document.createElement(t.create) : t.create!(v);
  addClass(el, t.classNameTag, t.values?.find((x) => x.value === v)?.classNameTag);
  return el;
}

/** Creates element of format: `<b>` => `<strong>` in value (in editor `<strong>` is styled as control label) */
function create(t: WUP.TextRich.Tool, v: unknown, ctx: Ctx): HTMLElement {
  const el = createOf(t, v);
  if (ctx.isEditor || el.tagName !== "B") {
    return el;
  }
  const s = document.createElement("strong");
  el.className && (s.className = el.className); // classNameTag
  return s;
}

/** Returns new embed if element is embed (`<img>` etc.) */
function toEmbed(el: HTMLElement, ctx: Ctx): HTMLElement | null {
  const m = firstOf(ctx.embed, el);
  ctx.hasEmbed ||= !!m;
  return m ? create(m[0], m[1], ctx) : null;
}

/** Returns true for block tag: line (paragraph, heading, list item etc.), container or list */
export const isBlockTag = (tag: string): boolean => lineTags.has(tag) || paragraphTags.has(tag) || listTags.has(tag);

/** Copies line styles: `lineStyle` formats (alignment etc.) & indent */
function copyBlockStyle(src: HTMLElement, dst: HTMLElement, ctx: Ctx): void {
  ctx.lineStyle.forEach((t) => {
    const v = applied(t, src);
    v !== undefined && t.set!(dst, v);
  });
  const ml = src.style.marginLeft;
  indentReg.test(ml) && parseFloat(ml) > 0 && (dst.style.marginLeft = ml);
}

/** Removes trailing `<br>` of non-empty line (browser placeholder) */
function trimBr(el: HTMLElement): void {
  const last = el.lastChild;
  last && last !== el.firstChild && last.nodeName === "BR" && last.remove();
}

/** Appends sanitized inline node; nested blocks are flattened into lines separated by `<br>` */
function appendInlineNode(n: Node, dst: HTMLElement, ctx: Ctx): void {
  if (n.nodeType === Node.TEXT_NODE) {
    dst.append((n as Text).data);
    return;
  }
  if (n.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  const el = n as HTMLElement;
  const tag = el.tagName;
  const embed = toEmbed(el, ctx);
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
  if (isBlockTag(tag)) {
    dst.lastChild && dst.lastChild.nodeName !== "BR" && dst.appendChild(document.createElement("br"));
    appendInline(el, dst, ctx);
    return;
  }
  // element can apply several formats (`<span style="font-size; color">`) => nested elements
  const arr = ctx.inline.flatMap((t) => {
    const v = applied(t, el);
    return v === undefined ? [] : [create(t, v, ctx)];
  });
  if (arr.length) {
    const inner = arr.reduce((a, b) => a.appendChild(b));
    appendInline(el, inner, ctx);
    inner.firstChild && dst.appendChild(arr[0]);
  } else {
    appendInline(el, dst, ctx); // unwrap unsupported: <span>, <font>, <code> etc.
  }
}

/** Appends sanitized inline content */
function appendInline(src: Node, dst: HTMLElement, ctx: Ctx): void {
  src.childNodes.forEach((n) => appendInlineNode(n, dst, ctx));
}

/** Fills line `el` (heading, paragraph etc.) with sanitized content of src */
function toLine(src: HTMLElement, el: HTMLElement, ctx: Ctx): HTMLElement {
  copyBlockStyle(src, el, ctx);
  appendInline(src, el, ctx);
  !ctx.isEditor && trimBr(el);
  return el;
}

/** Appends sanitized list item: nested lists are kept, other content is flattened */
function appendListItem(src: HTMLElement, list: HTMLElement, ctx: Ctx): void {
  const li = list.appendChild(document.createElement("li"));
  copyBlockStyle(src, li, ctx);
  src.childNodes.forEach((n) => {
    listTags.has(n.nodeName) ? li.appendChild(toList(n as HTMLElement, ctx)) : appendInlineNode(n, li, ctx);
  });
  !ctx.isEditor && trimBr(li);
  !li.firstChild && li.appendChild(document.createElement("br"));
}

/** Returns sanitized list */
function toList(src: HTMLElement, ctx: Ctx): HTMLElement {
  const list = document.createElement(src.tagName);
  let li: HTMLElement | null = null; // for content directly in list (invalid html)
  src.childNodes.forEach((n) => {
    const tag = n.nodeName;
    if (tag === "LI") {
      li = null;
      appendListItem(n as HTMLElement, list, ctx);
    } else if (listTags.has(tag)) {
      li = null;
      list.appendChild(toList(n as HTMLElement, ctx)); // Chrome nests lists on indent
    } else if (n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n as Text).data.trim())) {
      li ??= list.appendChild(document.createElement("li"));
      appendInlineNode(n, li, ctx);
    }
  });
  return list;
}

/** Appends sanitized blocks of container: loose inline content is grouped into paragraphs */
function appendBlocks(src: Node, dst: Node, ctx: Ctx): void {
  const pTag = ctx.isEditor ? "div" : "p";
  let p: HTMLElement | null = null; // current paragraph for inline content
  const closeParagraph = (): void => {
    p && !ctx.isEditor && trimBr(p);
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
    if (!isBlockTag(tag)) {
      // skip unsupported with content (<script> etc.) except embeds (<img> etc.)
      const embed = toEmbed(el, ctx);
      if (embed || !skipTags.has(tag)) {
        p ??= dst.appendChild(document.createElement(pTag));
        embed ? p.appendChild(embed) : appendInlineNode(el, p, ctx);
      }
      return;
    }

    closeParagraph();
    const line = firstOf(ctx.line, el); // heading, blockquote etc.
    if (line) {
      dst.appendChild(toLine(el, create(line[0], line[1], ctx), ctx));
    } else if (listTags.has(tag)) {
      dst.appendChild(toList(el, ctx));
    } else if (tag === "LI") {
      appendListItem(el, dst.appendChild(document.createElement("ul")), ctx); // <li> without list
    } else if (Array.prototype.some.call(el.children, (c: Element) => isBlockTag(c.tagName))) {
      appendBlocks(el, dst, ctx); // unwrap: `<div><ol>...</ol></div>`
    } else {
      const paragraph = toLine(el, document.createElement(pTag), ctx);
      paragraph.firstChild && dst.appendChild(paragraph);
    }
  });
  closeParagraph();
}

/** Returns sanitized content for editor */
export function htmlToEditor(html: string, tools: Tools): DocumentFragment {
  const f = document.createDocumentFragment();
  if (html) {
    const { body } = new DOMParser().parseFromString(html, "text/html"); // inert: nothing is executed/loaded
    appendBlocks(body, f, ctxOf(tools, true));
  }
  return f;
}

/** Returns true if `<p>` can be dropped from value: the only paragraph without styles, `<br>` & leading whitespaces
 *  (sanitizer adds it back) */
function isPlainParagraph(p: HTMLElement): boolean {
  if (p.nextSibling || p.tagName !== "P" || p.attributes.length) {
    return false;
  }
  p.normalize(); // to check leading whitespaces
  const f = p.firstChild!;
  return (
    (f.nodeType !== Node.TEXT_NODE || !!(f as Text).data.trim()) &&
    !Array.prototype.some.call(p.childNodes, (n: Node) => n.nodeName === "BR")
  );
}

/** Contenteditable element with html value */
export default class WUPTextRichInput extends WUPTextAreaInput {
  /** Static $tools of control: sanitizer keeps their formats */
  _tools: Tools = {};

  /** Sanitized html (empty string if there is no text or embeds)
   * @tutorial Rules
   * * single plain paragraph goes without `<p>` (`text` instead of `<p>text</p>`)
   * * only formats of tools are kept: other elements are unwrapped (`<span>`, `<table>` etc.)
   * or removed with content (`<script>`, `<img>` if it isn't embed etc.)
   * * links with unsafe protocols are removed (`javascript:` etc.) */
  override get value(): string {
    if (this._cached == null) {
      const div = document.createElement("div");
      const ctx = ctxOf(this._tools, false);
      appendBlocks(this, div, ctx);
      const text = div.textContent!;
      const p = div.firstChild as HTMLElement;
      this._cached = text.trim() || ctx.hasEmbed ? (isPlainParagraph(p) ? p : div).innerHTML : "";
      lastText = [this._cached, this._cached && text]; // validations skip parsing
    }
    return this._cached;
  }

  override set value(v: string) {
    if (v && v === this.value) {
      return; // re-render resets selection & scroll (empty value still clears empty lines)
    }
    this._cached = undefined;
    this.replaceChildren(htmlToEditor(v, this._tools));
  }

  override _embedOf(): ((el: Element) => boolean) | undefined {
    return embedOf(this._tools);
  }
}

customElements.define("wup-richinput", WUPTextRichInput);
