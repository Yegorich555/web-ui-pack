import WUPTextareaInput from "./textarea.input";

/** Inline formats: tagName => tagName in result */
const inlineTags = new Map<string, string>([
  ["B", "strong"],
  ["STRONG", "strong"],
  ["I", "em"],
  ["EM", "em"],
  ["U", "u"],
  ["S", "s"],
  ["STRIKE", "s"],
  ["DEL", "s"],
  ["SUB", "sub"],
  ["SUP", "sup"],
]);
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
const listTags = new Set(["OL", "UL"]);
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
  "HEAD",
  "TITLE",
  "META",
  "LINK",
  "BASE",
]);
/** Font size by attribute `size` of `<font>` (produced by `document.execCommand("fontSize")` in another editors) */
const fontSizes = new Map<string, string>([
  ["2", "small"],
  ["5", "x-large"],
  ["7", "xxx-large"],
]);
/** Supported font sizes */
const sizes = new Set(fontSizes.values());
const textAligns = new Set(["center", "right", "justify"]);
const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:", "sms:"]);
/** Positive length for margin-left (indentation) */
const indentReg = /^\d+(\.\d+)?(px|em)$/;

/** Returns url if its protocol is safe (http, https, mailto, tel, sms) otherwise empty string */
export function sanitizeUrl(url: string): string {
  try {
    return safeProtocols.has(new URL(url, document.baseURI).protocol) ? url : "";
  } catch {
    return "";
  }
}

/** Returns text content of html (for validations) */
export function htmlToText(html: string): string {
  const t = document.createElement("template");
  t.innerHTML = html; // inert: scripts & resources aren't executed/loaded
  return t.content.textContent || "";
}

/** Context of cleaning; WARN: source nodes are never cloned or moved (they can be unsafe) - only new nodes are created */
interface Ctx {
  /** Result for editor: paragraph as `<div>` (browser adds it on Enter), bold as `<b>` */
  isEditor: boolean;
}

/** Returns true if element with tag is block */
export const isBlockTag = (tag: string): boolean =>
  lineTags.has(tag) || paragraphTags.has(tag) || listTags.has(tag) || tag === "LI";

/** Copies supported styles of block: text-align & margin-left (indentation) */
function copyBlockStyle(src: HTMLElement, dst: HTMLElement): void {
  const align = src.style.textAlign || src.getAttribute("align") || "";
  textAligns.has(align) && (dst.style.textAlign = align);
  const ml = src.style.marginLeft;
  indentReg.test(ml) && parseFloat(ml) > 0 && (dst.style.marginLeft = ml);
}

/** Removes `<br>` at the end of line with content (browser adds it as placeholder) */
function trimBr(el: HTMLElement): void {
  const last = el.lastChild;
  last && last !== el.firstChild && (last as Element).tagName === "BR" && last.remove();
}

/** Returns true if element contains block elements */
function hasBlocks(el: Element): boolean {
  for (let n = el.firstElementChild; n; n = n.nextElementSibling) {
    if (isBlockTag(n.tagName)) {
      return true;
    }
  }
  return false;
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
  if (skipTags.has(tag)) {
    return;
  }
  if (tag === "BR") {
    dst.appendChild(document.createElement("br"));
    return;
  }
  if (isBlockTag(tag)) {
    // nested block inside line: flatten into lines
    dst.lastChild && (dst.lastChild as Element).tagName !== "BR" && dst.appendChild(document.createElement("br"));
    appendInline(el, dst, ctx);
    return;
  }
  let next: HTMLElement | null = null;
  const it = inlineTags.get(tag);
  if (it) {
    next = document.createElement(ctx.isEditor && it === "strong" ? "b" : it); // <strong> is styled as label of the control
  } else if (tag === "A") {
    const href = sanitizeUrl(el.getAttribute("href") || "");
    if (href) {
      next = document.createElement("a");
      next.setAttribute("href", href);
      next.setAttribute("target", "_blank");
      next.setAttribute("rel", "noopener noreferrer");
    }
  } else {
    const size = tag === "FONT" ? fontSizes.get(el.getAttribute("size")!) : tag === "SPAN" && el.style.fontSize;
    if (size && sizes.has(size)) {
      next = document.createElement("span");
      next.style.fontSize = size;
    }
  }

  if (next) {
    appendInline(el, next, ctx);
    next.firstChild && dst.appendChild(next);
  } else {
    appendInline(el, dst, ctx); // unwrap not supported element: <span>, <font>, <code> etc.
  }
}

/** Appends cleaned inline content of src to dst */
function appendInline(src: Node, dst: HTMLElement, ctx: Ctx): void {
  src.childNodes.forEach((n) => appendInlineNode(n, dst, ctx));
}

/** Returns cleaned line: heading, blockquote, pre or paragraph */
function toLine(src: HTMLElement, tag: string, ctx: Ctx): HTMLElement {
  const el = document.createElement(tag);
  copyBlockStyle(src, el);
  appendInline(src, el, ctx);
  !ctx.isEditor && trimBr(el);
  return el;
}

/** Appends cleaned list item to list: nested lists are kept, other content is flattened */
function appendListItem(src: HTMLElement, list: HTMLElement, ctx: Ctx): void {
  const li = list.appendChild(document.createElement("li"));
  copyBlockStyle(src, li);
  src.childNodes.forEach((n) => {
    listTags.has((n as Element).tagName) ? li.appendChild(toList(n as HTMLElement, ctx)) : appendInlineNode(n, li, ctx);
  });
  !ctx.isEditor && trimBr(li);
  !li.firstChild && li.appendChild(document.createElement("br"));
}

/** Returns cleaned list */
function toList(src: HTMLElement, ctx: Ctx): HTMLElement {
  const list = document.createElement(src.tagName);
  let li: HTMLElement | null = null; // for content placed directly into list (invalid html)
  src.childNodes.forEach((n) => {
    const tag = (n as Element).tagName;
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
    if (skipTags.has(tag)) {
      return;
    }
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
      p ??= dst.appendChild(document.createElement(pTag));
      appendInlineNode(el, p, ctx);
      return;
    }

    closeParagraph();
    if (paragraphTags.has(tag)) {
      if (hasBlocks(el)) {
        appendBlocks(el, dst, ctx); // unwrap: `<div><ol>...</ol></div>`
      } else {
        const line = toLine(el, pTag, ctx);
        line.firstChild && dst.appendChild(line);
      }
    } else if (lineTags.has(tag)) {
      dst.appendChild(toLine(el, tag, ctx));
    } else if (listTags.has(tag)) {
      dst.appendChild(toList(el, ctx));
    } else {
      // <li> without list
      appendListItem(el, dst.appendChild(document.createElement("ul")), ctx);
    }
  });
  closeParagraph();
}

/** Returns sanitized content for editor: only supported formats & safe elements are kept */
export function htmlToEditor(html: string): DocumentFragment {
  const f = document.createDocumentFragment();
  if (html) {
    const { body } = new DOMParser().parseFromString(html, "text/html"); // inert: scripts & resources aren't executed/loaded
    appendBlocks(body, f, { isEditor: true });
  }
  return f;
}

/** Returns clean html of editor: paragraphs as `<p>`, inline formats as `<strong>`, `<em>` etc.;
 *  empty string if there is no text */
export function htmlFromEditor(editor: Node): string {
  const div = document.createElement("div");
  appendBlocks(editor, div, { isEditor: false });
  return div.textContent!.trim() ? div.innerHTML : "";
}

/** Represents contenteditable element with rich text where value is html */
export default class WUPTextRichInput extends WUPTextareaInput {
  /** Get/set html: getter returns clean html (empty string if there is no text); setter sanitizes html
   * @tutorial Rules
   * * only supported formats are kept: other elements are unwrapped (`<span>`, `<table>` etc.) or removed with content (`<script>`, `<img>` etc.)
   * * links with unsafe protocols are removed (`javascript:` etc.) */
  override get value(): string {
    this._cached ??= htmlFromEditor(this);
    return this._cached;
  }

  override set value(v: string) {
    this._cached = undefined;
    this.replaceChildren(htmlToEditor(v));
  }
}

customElements.define("wup-richinput", WUPTextRichInput);
