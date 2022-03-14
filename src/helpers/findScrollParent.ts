// Discussion: https://stackoverflow.com/questions/35939886/find-first-scrollable-parent

const vars = ["auto", "overlay"];
/** Find first parent with active scroll X/Y */
export default function findScrollParent(el: HTMLElement): HTMLElement | null {
  const p = el.parentElement;
  if (!p) {
    return null;
  }

  if (p.scrollHeight !== p.clientHeight || p.scrollWidth !== p.clientWidth) {
    const { overflowX, overflowY } = getComputedStyle(p);
    if (p.scrollHeight !== p.clientHeight && vars.includes(overflowY)) {
      return p;
    }
    if (p.scrollWidth !== p.clientWidth && vars.includes(overflowX)) {
      return p;
    }
    return null;
  }
  return findScrollParent(p);
}
