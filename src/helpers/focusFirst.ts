let last: HTMLElement | Pick<HTMLElement, "focus"> | null = null;
export interface FocusOptions {
  /** Focus last possible item (instead of 1st) */
  isFocusLast?: boolean;
}

interface FocusFirstFunc {
  (element: HTMLElement | Pick<HTMLElement, "focus">, options?: FocusOptions): boolean;
  /** QuerySelector for all possible-focusable elements */
  $selector: string;
}

/** Set focus on element or first possible nested element
 * @param element
 * @return {Boolean} true if focus is called */
const focusFirst = <FocusFirstFunc>(
  function focusFirstFn(element: HTMLElement | Pick<HTMLElement, "focus">, options?: FocusOptions): boolean {
    if (last === element) {
      return false;
    }
    last = element; //

    if (element instanceof HTMLElement) {
      const prev = document.activeElement;
      const tryFocus = (el: HTMLElement): boolean => {
        if (prev === el) {
          return true;
        }
        el.focus();
        return document.activeElement !== prev; // elements can be indirect disabled or hidden: <fieldset disabled><input/></fieldset>
      };

      if (tryFocus(element)) {
        last = null;
        return true;
      }
      last = null;
      // const isVisible = (e: HTMLElement): boolean => {
      //   return e.offsetWidth > 0 || e.offsetHeight > 0 || !!(e.style?.display && e.style.display !== "none");
      // };
      const items = element.querySelectorAll(focusFirst.$selector);
      if (options?.isFocusLast) {
        for (let i = items.length - 1, item = items[i] as HTMLElement; i > -1; item = items[--i] as HTMLElement) {
          if (tryFocus(item)) {
            return true;
          }
        }
      } else {
        for (let i = 0, item = items[0] as HTMLElement; i < items.length; item = items[++i] as HTMLElement) {
          if (tryFocus(item)) {
            return true;
          }
        }
      }
    } else if (element.focus) {
      element.focus();
      return true;
    }

    return false;
  }
);

focusFirst.$selector = "button,input,textarea,[href],select,[tabindex],[contentEditable=true]";

export default focusFirst;
