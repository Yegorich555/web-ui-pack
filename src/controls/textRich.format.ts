import { isBlockTag } from "./textRich.input";

/** Inline format applied via element */
export interface InlineFormat {
  /** Returns true if element applies the format */
  is: (el: Element) => boolean;
  /** Returns new element that applies the format */
  create: (value?: unknown) => HTMLElement;
}

const isTag =
  (...tags: string[]) =>
  (el: Element): boolean =>
    tags.includes(el.tagName);

/** Inline formats where key is name of format (or `format:value` for script) */
export const inlineFormats = new Map<string, InlineFormat>([
  ["bold", { is: isTag("B", "STRONG"), create: () => document.createElement("b") }], // <strong> is styled as label of the control
  ["italic", { is: isTag("EM", "I"), create: () => document.createElement("em") }],
  ["underline", { is: isTag("U"), create: () => document.createElement("u") }],
  ["strike", { is: isTag("S", "STRIKE", "DEL"), create: () => document.createElement("s") }],
  ["script:sub", { is: isTag("SUB"), create: () => document.createElement("sub") }],
  ["script:super", { is: isTag("SUP"), create: () => document.createElement("sup") }],
  [
    "size",
    {
      is: (el) => el.tagName === "SPAN" && !!(el as HTMLElement).style.fontSize,
      create: (v) => {
        const el = document.createElement("span");
        el.style.fontSize = v as string;
        return el;
      },
    },
  ],
  [
    "link",
    {
      is: isTag("A"),
      create: (v) => {
        const el = document.createElement("a");
        el.setAttribute("href", v as string);
        return el;
      },
    },
  ],
]);

/** Returns elements of format that wrap node (from inner to outer) inside root */
export function formatParents(n: Node, f: InlineFormat, root: Node): Element[] {
  const arr: Element[] = [];
  for (let el = (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement) as Element | null; el && el !== root; ) {
    f.is(el) && arr.push(el);
    el = el.parentElement;
  }
  return arr;
}

/** Replaces element with its children */
export function unwrap(el: Element): void {
  el.replaceWith(...el.childNodes);
}

/** Returns text nodes inside range; text nodes at the boundaries are split so range starts/ends at edges of nodes */
export function splitRange(r: Range): Text[] {
  const e = r.endContainer;
  if (e.nodeType === Node.TEXT_NODE && r.endOffset > 0 && r.endOffset < (e as Text).length) {
    (e as Text).splitText(r.endOffset);
  }
  const s = r.startContainer;
  if (s.nodeType === Node.TEXT_NODE && r.startOffset > 0 && r.startOffset < (s as Text).length) {
    r.setStart((s as Text).splitText(r.startOffset), 0); // end is moved into new node automatically if it's the same node
  }

  const arr: Text[] = [];
  const root = r.commonAncestorContainer;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = root.nodeType === Node.TEXT_NODE ? root : w.nextNode(); n; n = w.nextNode()) {
    const t = n as Text;
    const isOut =
      !t.length ||
      (t === r.startContainer && r.startOffset === t.length) ||
      (t === r.endContainer && r.endOffset === 0) ||
      !!t.parentElement!.closest("[data-formula]"); // formula is single element
    !isOut && r.intersectsNode(t) && arr.push(t);
  }
  return arr;
}

/** Moves content of el before `first` & after `last` into copies of el: `<b>a[bc]d</b>` => `<b>a</b><b>[bc]</b><b>d</b>` */
function isolate(el: Element, first: Node, last: Node): void {
  const before = document.createRange();
  before.setStart(el, 0);
  before.setEndBefore(first);
  if (!before.collapsed) {
    const c = el.cloneNode(false);
    c.appendChild(before.extractContents());
    el.before(c);
  }
  const after = document.createRange();
  after.setStartAfter(last);
  after.setEnd(el, el.childNodes.length);
  if (!after.collapsed) {
    const c = el.cloneNode(false);
    c.appendChild(after.extractContents());
    el.after(c);
  }
}

/** Removes inline format from text nodes */
export function removeInline(nodes: Text[], f: InlineFormat, root: Node): void {
  const groups = new Map<Element, Text[]>(); // element of format => text nodes inside
  nodes.forEach((t) =>
    formatParents(t, f, root).forEach((el) => {
      const arr = groups.get(el);
      arr ? arr.push(t) : groups.set(el, [t]);
    })
  );
  groups.forEach((arr, el) => {
    isolate(el, arr[0], arr[arr.length - 1]);
    unwrap(el);
  });
}

/** Merges element into previous sibling if they are equal (the same tag & attributes) */
function mergePrev(el: Node | null): void {
  const prev = el?.previousSibling;
  if (prev?.nodeType === Node.ELEMENT_NODE && prev.cloneNode(false).isEqualNode(el!.cloneNode(false))) {
    (prev as Element).append(...el!.childNodes);
    (el as Element).remove();
  }
}

/** Wraps text nodes into element of format (if they don't have format yet) */
export function addInline(nodes: Text[], f: InlineFormat, value: unknown, root: Node): void {
  nodes.forEach((t) => {
    if (!formatParents(t, f, root).length) {
      const el = f.create(value);
      t.before(el);
      el.appendChild(t);
      mergePrev(el.nextSibling);
      mergePrev(el); // `<b>a</b><b>b</b>` => `<b>ab</b>`
    }
  });
}

/** Splits element at collapsed range & places range between parts: `<b>a|b</b>` => `<b>a</b>|<b>b</b>` */
export function splitAt(el: Element, r: Range): void {
  const after = document.createRange();
  after.setStart(r.startContainer, r.startOffset);
  after.setEnd(el, el.childNodes.length);
  const c = el.cloneNode(false) as Element;
  c.appendChild(after.extractContents());
  el.after(c);
  !c.textContent && c.remove();
  r.setStartAfter(el);
  r.collapse(true);
  !el.textContent && el.remove();
}

/** Returns value of format `list` by list element */
export function listType(list: Element): "ordered" | "bullet" | "check" {
  if (list.tagName === "OL") {
    return "ordered";
  }
  return list.hasAttribute("data-checklist") ? "check" : "bullet";
}

/** Returns lines of editor: blocks placed directly into root & items of lists */
export function getLines(root: Element): HTMLElement[] {
  const arr: HTMLElement[] = [];
  const walk = (parent: Element): void => {
    for (
      let el = parent.firstElementChild as HTMLElement | null;
      el;
      el = el.nextElementSibling as HTMLElement | null
    ) {
      const tag = el.tagName;
      if (tag === "OL" || tag === "UL") {
        walk(el);
      } else if (tag === "LI") {
        arr.push(el);
        walk(el); // nested lists
      } else if (parent === root && isBlockTag(tag)) {
        arr.push(el);
      }
    }
  };
  walk(root);
  return arr;
}

/** Wraps inline content placed directly into root into <div> (Chrome doesn't wrap the 1st line); adds empty line if root is empty
 * @returns true if root is changed */
export function wrapLines(root: Element): boolean {
  let isChanged = false;
  let div: HTMLElement | null = null;
  Array.from(root.childNodes).forEach((n) => {
    if (n.nodeType === Node.ELEMENT_NODE && isBlockTag((n as Element).tagName)) {
      div = null;
    } else if (n.nodeName === "BR") {
      if (div) {
        n.remove(); // line break after inline content means the next line
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
}

/** Returns lines that intersect with range (line is skipped if range ends at the start of it: on triple click) */
export function linesOf(r: Range, root: Element): HTMLElement[] {
  const arr = getLines(root).filter((l) => r.intersectsNode(l));
  if (!r.collapsed && arr.length > 1) {
    const end = document.createRange();
    end.setStart(arr[arr.length - 1], 0);
    end.setEnd(r.endContainer, r.endOffset);
    !end.toString() && arr.pop();
  }
  return arr.filter((l) => !arr.some((n) => n !== l && l.contains(n))); // only nested items of lists
}

/** Returns position as [line index, count of chars before position in the line] */
export function toLinePos(lines: HTMLElement[], n: Node, offset: number): [number, number] {
  const i = lines.findLastIndex((l) => l.contains(n));
  if (i < 0) {
    return [0, 0];
  }
  const r = document.createRange();
  r.setStart(lines[i], 0);
  r.setEnd(n, offset);
  return [i, r.toString().length];
}

/** Returns node & offset by position [line index, count of chars before position in the line] */
export function fromLinePos(lines: HTMLElement[], [i, pos]: [number, number]): [Node, number] {
  const line = lines[Math.min(i, lines.length - 1)];
  const w = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  for (let t = w.nextNode() as Text | null; t; t = w.nextNode() as Text | null) {
    if (pos <= t.length) {
      return [t, pos];
    }
    pos -= t.length;
    last = t;
  }
  return last ? [last, last.length] : [line, 0];
}

/** Copies attribute style */
function copyStyle(src: Element, dst: Element): void {
  const s = src.getAttribute("style");
  s && dst.setAttribute("style", s);
}

/** Moves item of list out of the list as <div>: list is split if item is in the middle */
export function liftItem(li: HTMLElement): HTMLElement {
  const list = li.parentElement!;
  const div = document.createElement("div");
  div.append(...li.childNodes);
  copyStyle(li, div);
  if (li.nextSibling) {
    const rest = list.cloneNode(false);
    while (li.nextSibling) {
      rest.appendChild(li.nextSibling);
    }
    list.after(rest);
  }
  list.after(div);
  li.remove();
  !list.firstElementChild && list.remove();
  return div;
}

/** Replaces line with element of pointed tag (item of list is moved out of the list) */
export function setLineTag(line: HTMLElement, tag: string): HTMLElement {
  if (line.tagName === "LI") {
    line = liftItem(line);
  }
  if (line.tagName === tag) {
    return line;
  }
  const el = document.createElement(tag);
  el.append(...line.childNodes);
  copyStyle(line, el);
  line.replaceWith(el);
  return el;
}

/** Converts line into item of list with pointed type */
export function setLineList(line: HTMLElement, type: "ordered" | "bullet" | "check"): void {
  if (line.tagName === "LI") {
    if (listType(line.parentElement!) === type) {
      return;
    }
    line = liftItem(line);
  }
  const li = document.createElement("li");
  li.append(...line.childNodes);
  copyStyle(line, li);
  const list = document.createElement(type === "ordered" ? "ol" : "ul");
  type === "check" && list.setAttribute("data-checklist", "");
  list.appendChild(li);
  line.replaceWith(list);
}

/** Merges neighbor lists of the same type: `<ol><li>a</li></ol><ol><li>b</li></ol>` => `<ol><li>a</li><li>b</li></ol>` */
export function mergeLists(root: Element): void {
  for (let el = root.firstElementChild; el; el = el.nextElementSibling) {
    if (el.tagName === "OL" || el.tagName === "UL") {
      for (let next = el.nextElementSibling; next?.tagName === el.tagName; next = el.nextElementSibling) {
        if (next.hasAttribute("data-checklist") !== el.hasAttribute("data-checklist")) {
          break;
        }
        el.append(...next.childNodes);
        next.remove();
      }
    }
  }
}

/** Removes empty attribute style */
function removeEmptyStyle(el: Element): void {
  !el.getAttribute("style") && el.removeAttribute("style");
}

/** Sets text alignment of line ("left" is default) */
export function setLineAlign(line: HTMLElement, align: string): void {
  line.style.textAlign = align === "left" ? "" : align;
  removeEmptyStyle(line);
}

/** Changes indentation of line: 3em per level (the same as quill) */
export function setLineIndent(line: HTMLElement, diff: number): void {
  const m = /^(\d+(\.\d+)?)em$/.exec(line.style.marginLeft);
  const level = Math.min(8, Math.max(0, Math.round((m ? +m[1] : 0) / 3) + diff));
  line.style.marginLeft = level ? `${level * 3}em` : "";
  removeEmptyStyle(line);
}
