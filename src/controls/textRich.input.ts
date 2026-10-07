import WUPTextAreaInput from "./textArea.input";

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
export const sizes = new Map<unknown, string>([
  ["sm", "small"],
  ["lg", "x-large"],
  ["hg", "xxx-large"],
]);
/** Value of format `size` by font size (supported font sizes) */
export const sizeFormats = new Map<string, unknown>([
  ["small", "sm"],
  ["x-large", "lg"],
  ["xxx-large", "hg"],
]);
/** Font size by attribute `size` of `<font>` (produced by `document.execCommand("fontSize")` in another editors) */
const fontSizes = new Map<string, string>([
  ["2", "small"],
  ["5", "x-large"],
  ["7", "xxx-large"],
]);
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

// WARN: during cleaning source nodes are never cloned or moved (they can be unsafe): only new nodes are created;
// param `isEditor` - result for editor: paragraph as `<div>` (browser adds it on Enter), bold as `<b>`

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
  last && last !== el.firstChild && last.nodeName === "BR" && last.remove();
}

/** Appends cleaned inline node to dst; nested blocks are flattened into lines separated by `<br>` */
function appendInlineNode(n: Node, dst: HTMLElement, isEditor: boolean): void {
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
    dst.lastChild && dst.lastChild.nodeName !== "BR" && dst.appendChild(document.createElement("br"));
    appendInline(el, dst, isEditor);
    return;
  }
  let next: HTMLElement | null = null;
  const it = inlineTags.get(tag);
  if (it) {
    next = document.createElement(isEditor && it === "strong" ? "b" : it); // <strong> is styled as label of the control
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
    if (size && sizeFormats.has(size)) {
      next = document.createElement("span");
      next.style.fontSize = size;
    }
  }

  if (next) {
    appendInline(el, next, isEditor);
    next.firstChild && dst.appendChild(next);
  } else {
    appendInline(el, dst, isEditor); // unwrap not supported element: <span>, <font>, <code> etc.
  }
}

/** Appends cleaned inline content of src to dst */
function appendInline(src: Node, dst: HTMLElement, isEditor: boolean): void {
  src.childNodes.forEach((n) => appendInlineNode(n, dst, isEditor));
}

/** Returns cleaned line: heading, blockquote, pre or paragraph */
function toLine(src: HTMLElement, tag: string, isEditor: boolean): HTMLElement {
  const el = document.createElement(tag);
  copyBlockStyle(src, el);
  appendInline(src, el, isEditor);
  !isEditor && trimBr(el);
  return el;
}

/** Appends cleaned list item to list: nested lists are kept, other content is flattened */
function appendListItem(src: HTMLElement, list: HTMLElement, isEditor: boolean): void {
  const li = list.appendChild(document.createElement("li"));
  copyBlockStyle(src, li);
  src.childNodes.forEach((n) => {
    listTags.has(n.nodeName) ? li.appendChild(toList(n as HTMLElement, isEditor)) : appendInlineNode(n, li, isEditor);
  });
  !isEditor && trimBr(li);
  !li.firstChild && li.appendChild(document.createElement("br"));
}

/** Returns cleaned list */
function toList(src: HTMLElement, isEditor: boolean): HTMLElement {
  const list = document.createElement(src.tagName);
  let li: HTMLElement | null = null; // for content placed directly into list (invalid html)
  src.childNodes.forEach((n) => {
    const tag = n.nodeName;
    if (tag === "LI") {
      li = null;
      appendListItem(n as HTMLElement, list, isEditor);
    } else if (listTags.has(tag)) {
      li = null;
      list.appendChild(toList(n as HTMLElement, isEditor)); // nested list produced by Chrome (indent)
    } else if (n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n as Text).data.trim())) {
      li ??= list.appendChild(document.createElement("li"));
      appendInlineNode(n, li, isEditor);
    }
  });
  return list;
}

/** Appends cleaned content of container (root, indentation) to dst: inline content is grouped into paragraphs */
function appendBlocks(src: Node, dst: Node, isEditor: boolean): void {
  const pTag = isEditor ? "div" : "p";
  let p: HTMLElement | null = null; // current paragraph for inline content
  const closeParagraph = (): void => {
    p && !isEditor && trimBr(p);
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
      appendInlineNode(el, p, isEditor);
      return;
    }

    closeParagraph();
    if (paragraphTags.has(tag)) {
      if (Array.prototype.some.call(el.children, (c: Element) => isBlockTag(c.tagName))) {
        appendBlocks(el, dst, isEditor); // unwrap: `<div><ol>...</ol></div>`
      } else {
        const line = toLine(el, pTag, isEditor);
        line.firstChild && dst.appendChild(line);
      }
    } else if (lineTags.has(tag)) {
      dst.appendChild(toLine(el, tag, isEditor));
    } else if (listTags.has(tag)) {
      dst.appendChild(toList(el, isEditor));
    } else {
      // <li> without list
      appendListItem(el, dst.appendChild(document.createElement("ul")), isEditor);
    }
  });
  closeParagraph();
}

/** Returns sanitized content for editor: only supported formats & safe elements are kept */
export function htmlToEditor(html: string): DocumentFragment {
  const f = document.createDocumentFragment();
  if (html) {
    const { body } = new DOMParser().parseFromString(html, "text/html"); // inert: scripts & resources aren't executed/loaded
    appendBlocks(body, f, true);
  }
  return f;
}

/** Represents contenteditable element with rich text where value is html */
export default class WUPTextRichInput extends WUPTextAreaInput {
  /** Get/set html: getter returns clean html (empty string if there is no text): paragraphs as `<p>`, inline formats as `<strong>`, `<em>` etc.;
   * setter sanitizes html
   * @tutorial Rules
   * * only supported formats are kept: other elements are unwrapped (`<span>`, `<table>` etc.) or removed with content (`<script>`, `<img>` etc.)
   * * links with unsafe protocols are removed (`javascript:` etc.) */
  override get value(): string {
    if (this._cached == null) {
      const div = document.createElement("div");
      appendBlocks(this, div, false);
      const text = div.textContent!;
      this._cached = text.trim() ? div.innerHTML : "";
      lastText = [this._cached, this._cached && text]; // validations get text without parsing html
    }
    return this._cached;
  }

  override set value(v: string) {
    this._cached = undefined;
    this.replaceChildren(htmlToEditor(v));
  }
}

customElements.define("wup-richinput", WUPTextRichInput);
