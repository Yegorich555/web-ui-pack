// Discussion: https://stackoverflow.com/questions/35939886/find-first-scrollable-parent
// best solution: https://stackoverflow.com/questions/4880381/check-whether-html-element-has-scrollbars

/** Returns whether element has position fixed OR not */
function hasFixedPos(el: HTMLElement): boolean {
  const p = el.style.position;
  const n = "fixed";
  return p === n || (!p && window.getComputedStyle(el).position === n);
}

/** Find first parent with active scroll X/Y */
export default function findScrollParent(el: Element): HTMLElement | null {
  const p = el.parentElement;
  if (!p) {
    return null;
  }

  // it means it's changed
  if (p.scrollTop > 0 || p.scrollLeft > 0) {
    return p;
  }

  // prevent event triggering via p.onscroll = e => e.stopImmediatePropagation...
  const orig = p.onscroll;
  p.onscroll = (e) => {
    e.stopImmediatePropagation();
  };

  // try to change and check if it's affected
  let prev = p.scrollTop;
  p.scrollTop += 10; // 10 to fix case when zoom applied
  if (prev !== p.scrollTop) {
    p.scrollTop = prev;
    setTimeout(() => (p.onscroll = orig), 1);
    return p; // WARN: scroll changeable even if css overflow:hidden
  }

  prev = p.scrollLeft;
  p.scrollLeft += 10; // 10 to fix case when zoom applied
  if (prev !== p.scrollLeft) {
    p.scrollLeft = prev;
    setTimeout(() => (p.onscroll = orig), 1);
    return p;
  }

  p.onscroll = orig;

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
