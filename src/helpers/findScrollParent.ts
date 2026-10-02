// Discussion: https://stackoverflow.com/questions/35939886/find-first-scrollable-parent
// best solution: https://stackoverflow.com/questions/4880381/check-whether-html-element-has-scrollbars

/** Returns whether element has position fixed OR not */
function hasFixedPos(el: HTMLElement): boolean {
  const p = el.style.position;
  const n = "fixed";
  return p === n || (!p && window.getComputedStyle(el).position === n);
}

/** Returns whether element is scrollable by pointed scroll OR not
 * @example ```
 * const el = document.getElementById("someTestElement");
 * isScrollable(el, 'scrollTop') - returns true if possible to scroll such element by Y (vertically)
 * isScrollable(el, 'scrollLeft') - returns true if possible to scroll such element by X (horizontally)
 * ``` */
export function isScrollable(el: HTMLElement, checkScroll: "scrollTop" | "scrollLeft"): boolean {
  const p = checkScroll;

  // it means it's changed
  if (el[p] > 0) {
    return true;
  }

  // prevent event triggering via p.onscroll = e => e.stopImmediatePropagation...
  const orig = el.onscroll;
  el.onscroll = (e) => {
    e.stopImmediatePropagation();
  };

  // try to change and check if it's affected
  const prev = el[p];
  el[p] += 10; // 10 to fix case when zoom applied
  if (prev !== el[p]) {
    el[p] = prev;
    setTimeout(() => (el.onscroll = orig), 1);
    return true; // WARN: scroll changeable even if css overflow:hidden
  }

  el.onscroll = orig;

  return false;
}

/** Find first parent with active scroll X/Y */
export default function findScrollParent(el: Element): HTMLElement | null {
  const p = el.parentElement;
  if (!p) {
    return null;
  }

  if (isScrollable(p, "scrollTop") || isScrollable(p, "scrollLeft")) {
    return p;
  }

  if (hasFixedPos(p)) {
    return null; // skip search if current element with fixed position
  }
  return findScrollParent(p);
}

/** Find all parents with active scroll X/Y */
export function findScrollParentAll(el: Element): HTMLElement[] | null {
  let l: Element | null = el;
  const arr: HTMLElement[] = [];
  // eslint-disable-next-line no-constant-condition
  while (1) {
    l = findScrollParent(l) as HTMLElement | null;
    if (l) {
      arr.push(l as HTMLElement);
      if (hasFixedPos(l as HTMLElement)) {
        break; // skip search if current element with fixed position
      }
    } else break;
  }
  return arr.length ? arr : null;
}
