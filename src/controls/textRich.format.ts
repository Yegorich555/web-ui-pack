import { isBlockTag, listTags } from "./textRich.input";

/** Fast `r.intersectsNode(n)`: it walks previous siblings (slow for lines) */
export const intersects = (r: Range, n: Node): boolean =>
  r.comparePoint(n, 0) < 1 &&
  r.comparePoint(n, n.nodeType === Node.TEXT_NODE ? (n as Text).length : n.childNodes.length) > -1;

/** Returns text of element after point (or before if `isBefore`): empty at its edge or out of it */
export function textAt(el: Node, n: Node, offset: number, isBefore?: boolean): string {
  const r = document.createRange();
  r.selectNodeContents(el);
  isBefore ? r.setEnd(n, offset) : r.setStart(n, offset);
  return r.toString();
}

/** Returns ancestors of node matched by `is` (from inner to outer) inside root */
export function formatParents(n: Node, is: (el: Element) => boolean, root: Node): Element[] {
  const arr: Element[] = [];
  for (let el = (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement) as Element | null; el && el !== root; ) {
    is(el) && arr.push(el);
    el = el.parentElement;
  }
  return arr;
}

/** Returns text nodes inside range (edge nodes are split by range) */
export function splitRange(r: Range): Text[] {
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
}

/** Moves content outside `first`..`last` into copies of el: `<b>a[bc]d</b>` => `<b>a</b><b>[bc]</b><b>d</b>` */
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

/** Removes inline format from text nodes: unwraps matched ancestors around them */
export function removeInline(nodes: Text[], is: (el: Element) => boolean, root: Node): void {
  const groups = new Map<Element, Text[]>(); // format element => text nodes inside
  nodes.forEach((t) =>
    formatParents(t, is, root).forEach((el) => {
      const arr = groups.get(el);
      arr ? arr.push(t) : groups.set(el, [t]);
    })
  );
  groups.forEach((arr, el) => {
    isolate(el, arr[0], arr.at(-1)!);
    el.replaceWith(...el.childNodes);
  });
}

/** Merges element into previous sibling with the same tag & attributes */
function mergePrev(el: Node | null): void {
  const prev = el?.previousSibling;
  if (prev?.nodeType === Node.ELEMENT_NODE && prev.cloneNode(false).isEqualNode(el!.cloneNode(false))) {
    (prev as Element).append(...el!.childNodes);
    (el as Element).remove();
  }
}

/** Wraps not formatted text nodes into new element of format */
export function addInline(nodes: Text[], is: (el: Element) => boolean, create: () => HTMLElement, root: Node): void {
  nodes.forEach((t) => {
    if (!formatParents(t, is, root).length) {
      const el = create();
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

/** Wraps loose inline content into <div> (Chrome doesn't wrap the 1st line); adds empty line to empty root
 * @returns true if root is changed */
export function wrapLines(root: Element): boolean {
  let isChanged = false;
  let div: HTMLElement | null = null;
  Array.from(root.childNodes).forEach((n) => {
    if (isBlockTag(n.nodeName)) {
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
}

/** Returns lines in range (skips the last one if range ends at its start: triple click) */
export function linesOf(r: Range, root: Element): HTMLElement[] {
  const arr = getLines(root).filter((l) => intersects(r, l));
  !r.collapsed && arr.length > 1 && !textAt(arr.at(-1)!, r.endContainer, r.endOffset, true) && arr.pop();
  return arr.filter((l, i) => !l.contains(arr[i + 1] ?? null)); // skip parents of nested items (nested item follows parent)
}

/** Returns true if element has neither text nor elements (whitespaces between list items etc.) */
const isBlank = (el: Element): boolean => !el.firstElementChild && !el.textContent!.trim();

/** Replaces line with element or tag (keeps line style: alignment etc.; skips the same tag);
 *  list item is moved out of its lists at first (splits lists & parent items of nested list) */
export function setLineTag(line: HTMLElement, tag: string | HTMLElement): HTMLElement {
  for (let p = line.parentElement!; line.tagName === "LI" && (listTags.has(p.tagName) || p.tagName === "LI"); ) {
    const rest = p.cloneNode(false) as Element; // items after line (nested ones keep their level)
    while (line.nextSibling) {
      rest.appendChild(line.nextSibling);
    }
    !isBlank(rest) && p.after(rest);
    p.after(line);
    isBlank(p) && p.remove();
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
}
