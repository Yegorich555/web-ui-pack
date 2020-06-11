/**
 * Search first focusable element (parent or children) and set focus
 * @param element
 * @return {Boolean} true if focus is fired
 */
export default function focusFirst(element: HTMLElement | { focus: () => void }): boolean {
  if (element instanceof HTMLElement) {
    const prev = document.activeElement;
    const tryFocus = (el: HTMLElement): boolean => {
      if (prev === el) {
        return true;
      }
      el.focus();
      // such checking required because elements can be indirect disabled or hidden: <fieldset disabled><input/></fieldset>
      return document.activeElement !== prev;
    };

    if (tryFocus(element)) {
      return true;
    }
    // const isVisible = (e: HTMLElement): boolean => {
    //   return e.offsetWidth > 0 || e.offsetHeight > 0 || !!(e.style?.display && e.style.display !== "none");
    // };
    const items = element.querySelectorAll(`button,input,textarea,[href],select,[tabindex],[contentEditable=true]`);
    for (let i = 0, item = items[0] as HTMLElement; i < items.length; item = items[++i] as HTMLElement) {
      if (tryFocus(item)) {
        return true;
      }
    }
  } else if (element.focus) {
    element.focus();
    return true;
  }

  return false;
}
