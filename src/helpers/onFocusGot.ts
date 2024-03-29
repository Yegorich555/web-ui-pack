import onFocusLost from "./onFocusLost";

/** Fires when element or children gotFocus (happens once)
 * Depsite on focusin onFocusGot event isn't called several times on children inside element
 * @param {HTMLElement} element HTMLElement to apply `.addEventListener`
 * @param {Function} listener Callback invoked on event
 * @param options OnFocusLostOptions. onFocusGot depends on onFocusLost
 * @return dispose() function. Call it to remove listener
 * */
export default function onFocusGot(
  element: HTMLElement,
  listener: (this: HTMLElement, ev: HTMLElementEventMap["focusin"]) => any,
  options?: Parameters<typeof onFocusLost>[2]
): () => void {
  let isLost = true;
  let removeLost: undefined | (() => void);
  const remove = (): void => {
    removeLost?.call(element);
    element.removeEventListener("focusin", focusin);
  };

  const focusin = (e: FocusEvent): void => {
    if (!isLost) {
      return;
    }
    const isFocused = (a: Node): boolean => element === a || element.contains(a);
    const isPrevFocused = e.relatedTarget instanceof Node && isFocused(e.relatedTarget);
    // requires to detect focusLost properly (when console opens)
    removeLost = removeLost || onFocusLost(element, () => (isLost = true), options);

    if (!isPrevFocused) {
      listener.call(element, e);
      options?.once && remove();
      isLost = false;
    }
  };
  element.addEventListener("focusin", focusin, { passive: true, ...options });
  return remove;
}
