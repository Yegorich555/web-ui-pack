import { charsBefore, isBlockTag, listTags, pointAt } from "./textRich.input";

/** Inline format applied via element */
export interface InlineFormat {
  /** Returns true if element applies the format */
  is: (el: Element) => boolean;
  /** Returns new element that applies the format with value (ex. `"lg"` for format `size`) */
  create: (value?: unknown) => HTMLElement;
}

/** Returns elements of format that wrap node (from inner to outer) inside root */
export function formatParents(n: Node, f: InlineFormat, root: Node): Element[] {
  const arr: Element[] = [];
  for (let el = (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement) as Element | null; el && el !== root; ) {
    f.is(el) && arr.push(el);
    el = el.parentElement;
  }
  return arr;
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
      (t === r.endContainer && r.endOffset === 0);
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
    isolate(el, arr[0], arr.at(-1)!);
    el.replaceWith(...el.childNodes);
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
      if (listTags.has(tag)) {
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
    if (isBlockTag(n.nodeName)) {
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

/** Returns line of element (the nearest element placed directly into root or item of list) */
export function lineOf(el: HTMLElement | null, root: Element): HTMLElement | null {
  for (; el && el !== root; el = el.parentElement) {
    if (el.parentElement === root || el.tagName === "LI") {
      return el;
    }
  }
  return null;
}

/** Returns lines that intersect with range (line is skipped if range ends at the start of it: on triple click) */
export function linesOf(r: Range, root: Element): HTMLElement[] {
  const arr = getLines(root).filter((l) => r.intersectsNode(l));
  if (!r.collapsed && arr.length > 1) {
    const end = document.createRange();
    end.setStart(arr.at(-1)!, 0);
    end.setEnd(r.endContainer, r.endOffset);
    !end.toString() && arr.pop();
  }
  return arr.filter((l, i) => !l.contains(arr[i + 1] ?? null)); // only nested items of lists: nested item follows its parent
}

/** Returns position as [line index, count of chars before position in the line]: embed (see `isEmbed`) is counted as 1 char */
export function toLinePos(
  lines: HTMLElement[],
  n: Node,
  offset: number,
  isEmbed?: (el: Element) => boolean
): [number, number] {
  const i = lines.findLastIndex((l) => l.contains(n));
  return i < 0 ? [0, 0] : [i, charsBefore(lines[i], n, offset, isEmbed)];
}

/** Returns node & offset by position [line index, count of chars before position in the line]: embed (see `isEmbed`) is counted as 1 char */
export function fromLinePos(
  lines: HTMLElement[],
  [i, pos]: [number, number],
  isEmbed?: (el: Element) => boolean
): [Node, number] {
  return pointAt(lines[Math.min(i, lines.length - 1)], pos, isEmbed);
}

/** Replaces line with element of pointed tag or with pointed element (style of line is kept: alignment etc.);
 * line with the same tag isn't replaced (if tag is pointed);
 * item of list is moved out of the list at first (list is split if item is in the middle) */
export function setLineTag(line: HTMLElement, tag: string | HTMLElement): HTMLElement {
  if (line.tagName === "LI") {
    const list = line.parentElement!;
    if (line.nextSibling) {
      const rest = list.cloneNode(false);
      while (line.nextSibling) {
        rest.appendChild(line.nextSibling);
      }
      list.after(rest);
    }
    list.after(line);
    !list.firstElementChild && list.remove();
  }
  if (line.tagName === tag) {
    return line;
  }
  const el = typeof tag === "string" ? document.createElement(tag) : tag;
  el.append(...line.childNodes);
  const s = line.getAttribute("style");
  s && el.setAttribute("style", s + (el.getAttribute("style") ?? "")); // style of element is applied after style of line
  line.replaceWith(el);
  return el;
}
