import onFocusLost from "./onFocusLost";

/** Fires when element or children gotFocus (happens once)
 * Depsite on focusin onFocusGot event isn't fired several times on chidlren inside element
 * @param {HTMLElement} element HTMLElement to apply `.addEventListener`
 * @param {Function} listener Callback invoked on event
 * @param options OnFocusLostOptions. onFocusGot depends on onFocusLost
 * @return Callback with `.removeEventListener`. Call it to remove listener
 * */
export default function onFocusGot(
  element: HTMLElement,
  listener: (this: HTMLElement, ev: HTMLElementEventMap["focusin"]) => any,
  options?: Parameters<typeof onFocusLost>[2]
): () => void {
  let isLost = true;
  let removeLost: () => void;
  const focusin = (e: FocusEvent) => {
    if (!isLost) {
      return;
    }
    const isFocused = (a: Element) => element === a || element.contains(a);
    const isPrevFocused = e.relatedTarget instanceof Element && isFocused(e.relatedTarget);
    // requires to detect focusLost properly (when console opens)
    removeLost = removeLost || onFocusLost(element, () => (isLost = true), options);

    if (!isPrevFocused) {
      listener.call(element, e);
      if (options?.once) {
        element.removeEventListener("focusin", focusin);
        removeLost?.call(element);
      }
      isLost = false;
    }
  };
  element.addEventListener("focusin", focusin, options);

  return () => {
    removeLost?.call(element);
    element.removeEventListener("focusin", focusin);
  };
}
