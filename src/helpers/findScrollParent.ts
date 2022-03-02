// Discussion: https://stackoverflow.com/questions/35939886/find-first-scrollable-parent

/** Find first parent with active scroll X/Y */
export default function findScrollParent(el: HTMLElement): HTMLElement | null {
  const p = el.parentElement;
  if (!p) {
    return null;
  }

  if (p.scrollHeight !== p.clientHeight || p.scrollWidth !== p.clientWidth) {
    return p;
  }
  return findScrollParent(p);
}
