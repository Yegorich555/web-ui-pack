// todo unit-tests
/** Fires when focus completely lost on element and children;
 * Depsite on focusout onFocusLost event checks next focused/active element
 * If you don't need for checking related to document.activeElement point `options.handleActiveElement = false`
 * (when dev-console is opened focus moves to console but active element stays the same)
 * @param {HTMLElement} el HTMLElement to apply `.addEventListener`
 * @param {Function} listener Callback invoked on event
 * @return {Function} Callback with `.removeEventListener` function. Call it to remove listener
 * */
export default function onFocusLost(
  el: HTMLElement,
  listener: (this: HTMLElement, ev: HTMLElementEventMap["focusout"]) => any,
  options?: AddEventListenerOptions & { handleActiveElement?: boolean }
): () => void {
  const focusout = (e: FocusEvent) => {
    const isFocused = (a: Element | null) => a && (el === a || el.contains(a));
    const isStillFocused = e.relatedTarget instanceof Element && isFocused(e.relatedTarget);
    const isHandleActive = options?.handleActiveElement !== false;
    if (!isStillFocused && !(isHandleActive && isFocused(document.activeElement))) {
      listener.call(el, e);
      options?.once && el.removeEventListener("focusout", focusout);
    }
  };

  el.addEventListener("focusout", focusout, { ...options, once: false });
  return () => el.removeEventListener("focusout", focusout);
}
