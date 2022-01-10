// todo unit-tests

import onFocusLost from "./onFocusLost";

/** Fires when element or children gotFocus (happens once)
 * Depsite on focusin onFocusGot event isn't fired several times on chidlren inside element
 * @param {HTMLElement} el HTMLElement to apply `.addEventListener`
 * @param {Function} listener Callback invoked on event
 * @return {Function} Callback with `.removeEventListener` function. Call it to remove listener
 * */
export default function onFocusGot(
  el: HTMLElement,
  listener: (this: HTMLElement, ev: HTMLElementEventMap["focusin"]) => any,
  options?: AddEventListenerOptions & { handleActiveElement?: boolean }
): () => void {
  let isLost = true;
  let removeLost: () => void;
  const focusin = (e: FocusEvent) => {
    if (!isLost) {
      return;
    }
    const isFocused = (a: Element) => el === a || el.contains(a);
    const isPrevFocused = e.relatedTarget instanceof Element && isFocused(e.relatedTarget);
    const isHandleActive = options?.handleActiveElement !== false;
    if (isHandleActive) {
      // requires to detect focusLost properly (when console opens)
      removeLost = onFocusLost(el, () => (isLost = true), options);
    }

    if (!isPrevFocused) {
      listener.call(el, e);
      options?.once && el.removeEventListener("focusin", focusin);
      isLost = false;
    }
  };
  el.addEventListener("focusin", focusin, options);

  return () => {
    removeLost?.call(el);
    el.removeEventListener("focusin", focusin);
  };
}
