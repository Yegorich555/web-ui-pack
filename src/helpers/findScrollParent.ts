// Discussion: https://stackoverflow.com/questions/35939886/find-first-scrollable-parent
// best solution: https://stackoverflow.com/questions/4880381/check-whether-html-element-has-scrollbars

/** Find first parent with active scroll X/Y */
export default function findScrollParent(el: Element): HTMLElement | null {
  const p = el.parentElement;
  if (!p) {
    return null;
  }
  // todo it's wrong if parent:withScroll>div+position:fixed>el
  // it means it's changed
  if (p.scrollTop > 0 || p.scrollLeft > 0) {
    return p;
  }
  // try to change and check if it's affected
  let prev = p.scrollTop;
  p.scrollTop += 10; // 10 to fix case when zoom applied
  if (prev !== p.scrollTop) {
    p.scrollTop = prev;
    return p; // todo scroll changeable even if css overflow:hidden
  }

  prev = p.scrollLeft;
  p.scrollLeft += 10; // 10 to fix case when zoom applied
  if (prev !== p.scrollLeft) {
    p.scrollLeft = prev;
    return p;
  }
  return findScrollParent(p);
}

/** Find all parents with active scroll X/Y */
export function findScrollParentAll(el: Element): HTMLElement[] | null {
  let l: Element | null = el;
  const arr: HTMLElement[] = [];
  // eslint-disable-next-line no-constant-condition
  while (1) {
    l = findScrollParent(l);
    if (l) arr.push(l as HTMLElement);
    else break;
  }
  return arr.length ? arr : null;
}
