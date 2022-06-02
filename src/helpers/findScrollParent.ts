// Discussion: https://stackoverflow.com/questions/35939886/find-first-scrollable-parent
// best solution: https://stackoverflow.com/questions/4880381/check-whether-html-element-has-scrollbars

/** Find first parent with active scroll X/Y */
export default function findScrollParent(el: HTMLElement): HTMLElement | null {
  const p = el.parentElement;
  if (!p) {
    return null;
  }

  // it means it's changed
  if (p.scrollTop > 0) {
    return p;
  }
  // try to change and check if it's affected
  const prev = p.scrollTop;
  p.scrollTop += 10; // 10 to fix case when zoom applied
  if (prev !== p.scrollTop) {
    p.scrollTop = prev;
    return p;
  }

  return findScrollParent(p);
}

/** Find all parents with active scroll X/Y */
export function findScrollParentAll(el: HTMLElement): HTMLElement[] | null {
  let l: HTMLElement | null = el;
  const arr = [];
  // eslint-disable-next-line no-constant-condition
  while (1) {
    l = findScrollParent(l);
    if (l) arr.push(l);
    else break;
  }
  return arr.length ? arr : null;
}
