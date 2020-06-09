/**
 * Search first focusable element (parent or children) and set focus
 * @param element
 * @return {Boolean} true if focus is fired
 */
export default function focusFirst(element: HTMLElement | { focus: () => void }): boolean {
  if (element instanceof HTMLElement) {
    const prev = document.activeElement;
    element.focus();
    // such checking required because elements can be indirect disabled or hidden: <fieldset disabled><input/></fieldset>
    if (document.activeElement !== prev) {
      return true;
    }
    // const isVisible = (e: HTMLElement): boolean => {
    //   return e.offsetWidth > 0 || e.offsetHeight > 0 || !!(e.style?.display && e.style.display !== "none");
    // };
    const items = element.querySelectorAll(`button,input,textarea,[href],select,[tabindex],[contentEditable=true]`);
    for (let i = 0, item = items[0] as HTMLElement; i < items.length; item = items[++i] as HTMLElement) {
      item.focus();
      if (document.activeElement !== prev) {
        return true;
      }
    }
  } else if (element.focus) {
    element.focus();
    return true;
  }

  return false;
}
