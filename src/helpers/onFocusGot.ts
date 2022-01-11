// todo unit-tests

import onFocusLost from "./onFocusLost";

/** Fires when element or children gotFocus (happens once)
 * Depsite on focusin onFocusGot event isn't fired several times on chidlren inside element
 * @param {HTMLElement} el HTMLElement to apply `.addEventListener`
 * @param {Function} listener Callback invoked on event
 * @param options OnFocusLostOptions. onFocusGot depends on onFocusLost
 * @return Callback with `.removeEventListener`. Call it to remove listener
 * @return {Function} Callback with `.removeEventListener` function. Call it to remove listener
 * */
export default function onFocusGot(
  el: HTMLElement,
  listener: (this: HTMLElement, ev: HTMLElementEventMap["focusin"]) => any,
  options?: Parameters<typeof onFocusLost>[2]
): () => void {
  let isLost = true;
  let removeLost: () => void;
  const focusin = (e: FocusEvent) => {
    if (!isLost) {
      return;
    }
    const isFocused = (a: Element) => el === a || el.contains(a);
    const isPrevFocused = e.relatedTarget instanceof Element && isFocused(e.relatedTarget);
    // requires to detect focusLost properly (when console opens)
    removeLost = removeLost || onFocusLost(el, () => (isLost = true), options);

    if (!isPrevFocused) {
      listener.call(el, e);
      if (options?.once) {
        el.removeEventListener("focusin", focusin);
        removeLost?.call(el);
      }
      isLost = false;
    }
  };
  el.addEventListener("focusin", focusin, options);

  return () => {
    removeLost?.call(el);
    el.removeEventListener("focusin", focusin);
  };
}
