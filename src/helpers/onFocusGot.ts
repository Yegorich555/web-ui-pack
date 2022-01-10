// todo unit-tests
/** Fires when element or children gotFocus once
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
  const focusin = (e: FocusEvent) => {
    const isFocused = (a: Element) => el === a || el.contains(a);
    const isPrevFocused = e.relatedTarget instanceof Element && isFocused(e.relatedTarget);
    const isHandleActive = options?.handleActiveElement !== false;
    if (!isPrevFocused && !(isHandleActive && document.activeElement && isFocused(document.activeElement))) {
      listener.call(el, e);
      options?.once && el.removeEventListener("focusin", focusin);
    }
  };
  el.addEventListener("focusin", focusin, options);

  return () => el.removeEventListener("focusin", focusin);
}
