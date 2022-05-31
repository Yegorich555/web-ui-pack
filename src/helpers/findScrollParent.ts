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

/** Find all parents with active scroll X/Y */
export function findScrollParentAll(el: HTMLElement): HTMLElement[] | null {
  let l: HTMLElement | null = el;
  const root = document.body.parentElement;
  const arr = [];
  while (l && l !== root) {
    const s = findScrollParent(l);
    s && arr.push(s);
    l = l.parentElement;
  }
  return arr.length ? arr : null;
}
