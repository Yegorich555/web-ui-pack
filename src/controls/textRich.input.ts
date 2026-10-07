import WUPTextAreaInput from "./textArea.input";

/** Tools of toolbar: formats of tools are kept by sanitizer (static $tools of control) */
type Tools = Record<string, WUP.TextRich.Tool>;

/** Lines: block elements with inline content only */
const lineTags = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE"]);
/** Containers converted into paragraph (`<p>` in value, `<div>` in editor) or unwrapped if contain blocks */
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
/** Elements skipped with content: unsafe or not supported */
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
/** Font size by value of format `size` */
export const sizes = { sm: "small", lg: "x-large", hg: "xxx-large" };
/** Value of format `size` by font size (supported font sizes) */
export const sizeFormats = {
  small: "sm",
  "x-large": "lg",
  "xxx-large": "hg",
} satisfies Record<string, WUP.TextRich.ToolValues["size"]>;
/** Font size by attribute `size` of `<font>` (produced by `document.execCommand("fontSize")` in another editors) */
export const fontSizes = { "2": "small", "5": "x-large", "7": "xxx-large" };
/** Supported values of text-align ("left" is default) */
export const textAligns = new Set(["center", "right", "justify"]);
const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:", "sms:"]);
/** Positive length for margin-left (indentation) */
const indentReg = /^\d+(\.\d+)?(px|em)$/;

/** Returns url if its protocol is safe (http, https, mailto, tel, sms) otherwise empty string */
export function sanitizeUrl(url: string): string {
  // todo update when min Safari 18+ (URL.parse returns null instead of throwing, so without try/catch): return safeProtocols.has(URL.parse(url, document.baseURI)?.protocol ?? "") ? url : "";
  try {
    return safeProtocols.has(new URL(url, document.baseURI).protocol) ? url : "";
  } catch {
    return "";
  }
}

/** The last html converted to text & its text: validations min & max convert the same value (getter `value` sets it as well) */
let lastText = ["", ""];

/** Returns text content of html (for validations) */
export function htmlToText(html: string): string {
  if (html !== lastText[0]) {
    const t = document.createElement("template");
    t.innerHTML = html; // inert: scripts & resources aren't executed/loaded
    lastText = [html, t.content.textContent || ""];
  }
  return lastText[1];
}

/** Returns function that checks if element is embed (`<img>` etc. of tools with kind `embed`);
 *  `undefined` if tools don't have embeds */
export function embedOf(tools: Tools): ((el: Element) => boolean) | undefined {
  const arr = Object.values(tools).filter((t) => t.kind === "embed" && t.is);
  return arr.length ? (el) => arr.some((t) => t.is!(el as HTMLElement) !== undefined) : undefined;
}

// WARN: during cleaning source nodes are never cloned or moved (they can be unsafe): only new nodes are created

/** Context of cleaning: tools with formats grouped by kind & type of result */
interface Ctx {
  /** Result for editor: paragraph as `<div>` (browser adds it on Enter), bold as `<b>` (`<strong>` is styled as label of control) */
  isEditor: boolean;
  inline: WUP.TextRich.Tool[];
  line: WUP.TextRich.Tool[];
  lineStyle: WUP.TextRich.Tool[];
  embed: WUP.TextRich.Tool[];
  /** Embed is added: result isn't empty even without text */
  hasEmbed?: boolean;
}

/** Returns context of cleaning: tools grouped by kind (tool without `is`, `create` or `set` doesn't define format) */
function ctxOf(tools: Tools, isEditor: boolean): Ctx {
  const ctx: Ctx = { isEditor, inline: [], line: [], lineStyle: [], embed: [] };
  Object.values(tools).forEach(
    (t) => t.kind && t.is && (t.kind === "lineStyle" ? t.set : t.create) && ctx[t.kind].push(t)
  );
  return ctx;
}

/** Returns value of format applied via element (`undefined` if it isn't applied: `false` means default value) */
function applied(t: WUP.TextRich.Tool, el: HTMLElement): unknown {
  const v = t.is!(el);
  return v === false ? undefined : v;
}

/** Returns the 1st tool which format is applied via element & its value */
function firstOf(tools: WUP.TextRich.Tool[], el: HTMLElement): [WUP.TextRich.Tool, unknown] | undefined {
  let v: unknown;
  const t = tools.find((x) => (v = applied(x, el)) !== undefined);
  return t && [t, v];
}

/** Returns new element of format: `<b>` is replaced with `<strong>` in value (in editor `<strong>` is styled as label of control) */
function create(t: WUP.TextRich.Tool, v: unknown, ctx: Ctx): HTMLElement {
  const el = t.create!(v);
  return !ctx.isEditor && el.tagName === "B" ? document.createElement("strong") : el;
}

/** Returns new element of embed (`<img>` etc.) if element is embed of tools */
function toEmbed(el: HTMLElement, ctx: Ctx): HTMLElement | null {
  const m = firstOf(ctx.embed, el);
  ctx.hasEmbed ||= !!m;
  return m ? create(m[0], m[1], ctx) : null;
}

/** Returns true if element with tag is block */
export const isBlockTag = (tag: string): boolean =>
  lineTags.has(tag) || paragraphTags.has(tag) || listTags.has(tag) || tag === "LI";

/** Copies styles of line: formats of tools with kind `lineStyle` (alignment etc.) & indentation (margin-left) */
function copyBlockStyle(src: HTMLElement, dst: HTMLElement, ctx: Ctx): void {
  ctx.lineStyle.forEach((t) => {
    const v = applied(t, src);
    v !== undefined && t.set!(dst, v);
  });
  const ml = src.style.marginLeft;
  indentReg.test(ml) && parseFloat(ml) > 0 && (dst.style.marginLeft = ml);
}

/** Removes `<br>` at the end of line with content (browser adds it as placeholder) */
function trimBr(el: HTMLElement): void {
  const last = el.lastChild;
  last && last !== el.firstChild && last.nodeName === "BR" && last.remove();
}

/** Appends cleaned inline node to dst; nested blocks are flattened into lines separated by `<br>` */
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
    // nested block inside line: flatten into lines
    dst.lastChild && dst.lastChild.nodeName !== "BR" && dst.appendChild(document.createElement("br"));
    appendInline(el, dst, ctx);
    return;
  }
  // inline formats of tools: element can apply several ones (`<span style="font-size; color">`) => nested elements
  const arr = ctx.inline.flatMap((t) => {
    const v = applied(t, el);
    return v === undefined ? [] : [create(t, v, ctx)];
  });
  if (arr.length) {
    const inner = arr.reduce((a, b) => a.appendChild(b));
    appendInline(el, inner, ctx);
    inner.firstChild && dst.appendChild(arr[0]);
  } else {
    appendInline(el, dst, ctx); // unwrap not supported element: <span>, <font>, <code> etc.
  }
}

/** Appends cleaned inline content of src to dst */
function appendInline(src: Node, dst: HTMLElement, ctx: Ctx): void {
  src.childNodes.forEach((n) => appendInlineNode(n, dst, ctx));
}

/** Returns line with cleaned inline content of src: element of format (heading etc.) or paragraph */
function toLine(src: HTMLElement, el: HTMLElement, ctx: Ctx): HTMLElement {
  copyBlockStyle(src, el, ctx);
  appendInline(src, el, ctx);
  !ctx.isEditor && trimBr(el);
  return el;
}

/** Appends cleaned list item to list: nested lists are kept, other content is flattened */
function appendListItem(src: HTMLElement, list: HTMLElement, ctx: Ctx): void {
  const li = list.appendChild(document.createElement("li"));
  copyBlockStyle(src, li, ctx);
  src.childNodes.forEach((n) => {
    listTags.has(n.nodeName) ? li.appendChild(toList(n as HTMLElement, ctx)) : appendInlineNode(n, li, ctx);
  });
  !ctx.isEditor && trimBr(li);
  !li.firstChild && li.appendChild(document.createElement("br"));
}

/** Returns cleaned list */
function toList(src: HTMLElement, ctx: Ctx): HTMLElement {
  const list = document.createElement(src.tagName);
  let li: HTMLElement | null = null; // for content placed directly into list (invalid html)
  src.childNodes.forEach((n) => {
    const tag = n.nodeName;
    if (tag === "LI") {
      li = null;
      appendListItem(n as HTMLElement, list, ctx);
    } else if (listTags.has(tag)) {
      li = null;
      list.appendChild(toList(n as HTMLElement, ctx)); // nested list produced by Chrome (indent)
    } else if (n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n as Text).data.trim())) {
      li ??= list.appendChild(document.createElement("li"));
      appendInlineNode(n, li, ctx);
    }
  });
  return list;
}

/** Appends cleaned content of container (root, indentation) to dst: inline content is grouped into paragraphs */
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
      } // otherwise skip whitespaces between blocks
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = n as HTMLElement;
    const tag = el.tagName;
    if (tag === "BR") {
      // line break after inline content means the next paragraph; otherwise it's an empty line
      if (p) {
        closeParagraph();
      } else {
        dst.appendChild(document.createElement(pTag)).appendChild(document.createElement("br"));
      }
      return;
    }
    if (!isBlockTag(tag)) {
      // inline content: not supported elements are skipped with content (<script> etc.) except embeds of tools (<img> etc.)
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

/** Returns sanitized content for editor: only formats of tools & safe elements are kept */
export function htmlToEditor(html: string, tools: Tools): DocumentFragment {
  const f = document.createDocumentFragment();
  if (html) {
    const { body } = new DOMParser().parseFromString(html, "text/html"); // inert: scripts & resources aren't executed/loaded
    appendBlocks(body, f, ctxOf(tools, true));
  }
  return f;
}

/** Returns true if node is the only paragraph without styles: `<p>` isn't required in value since sanitizer adds it back;
 *  it's required if paragraph contains `<br>` or starts with whitespaces (outside paragraph they're parsed differently) */
function isPlainParagraph(p: HTMLElement): boolean {
  if (p.nextSibling || p.tagName !== "P" || p.attributes.length) {
    return false;
  }
  p.normalize(); // join text nodes to check leading whitespaces
  const f = p.firstChild!;
  return (
    (f.nodeType !== Node.TEXT_NODE || !!(f as Text).data.trim()) &&
    !Array.prototype.some.call(p.childNodes, (n: Node) => n.nodeName === "BR")
  );
}

/** Represents contenteditable element with rich text where value is html */
export default class WUPTextRichInput extends WUPTextAreaInput {
  /** Tools of toolbar (static $tools of control): their formats are kept by sanitizer */
  _tools: Tools = {};

  /** Get/set html: getter returns clean html (empty string if there is no text or embeds): paragraphs as `<p>`,
   *  inline formats as `<strong>`, `<em>` etc.; setter sanitizes html
   * @tutorial Rules
   * * `<p>` is used only if it's required: single paragraph without styles is returned without it (`text` instead of `<p>text</p>`)
   * * only formats of tools are kept (see `is`, `create` & `set` of $tools): other elements are unwrapped
   * (`<span>`, `<table>` etc.) or removed with content (`<script>`, `<img>` if it isn't embed of tools etc.)
   * * links with unsafe protocols are removed (`javascript:` etc.) */
  override get value(): string {
    if (this._cached == null) {
      const div = document.createElement("div");
      const ctx = ctxOf(this._tools, false);
      appendBlocks(this, div, ctx);
      const text = div.textContent!;
      const p = div.firstChild as HTMLElement;
      this._cached = text.trim() || ctx.hasEmbed ? (isPlainParagraph(p) ? p : div).innerHTML : "";
      lastText = [this._cached, this._cached && text]; // validations get text without parsing html
    }
    return this._cached;
  }

  override set value(v: string) {
    this._cached = undefined;
    this.replaceChildren(htmlToEditor(v, this._tools));
  }

  override _embedOf(): ((el: Element) => boolean) | undefined {
    return embedOf(this._tools);
  }
}

customElements.define("wup-richinput", WUPTextRichInput);
