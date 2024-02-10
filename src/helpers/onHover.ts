import onEvent from "./onEvent";

/** Fires on mouseHover or touchStart
 * @param {HTMLElement} el HTMLElement to apply `.addEventListener`
 * @param {Function} callback Function invoked on event
 * @return dispose() function. Call it to remove listener
 * */
export default function onHover(
  el: HTMLElement,
  callback: (this: HTMLElement, ev: MouseEvent | TouchEvent) => any,
  options?: AddEventListenerOptions
): () => void {
  const r1 = onEvent(el, "mouseenter", callback, options);
  const r2 = onEvent(el, "touchstart", callback, options);

  return () => {
    r1();
    r2();
  };
}

/** Fires on mouseLeave or touchEnd
 * @param {HTMLElement} el HTMLElement to apply `.addEventListener`
 * @param {Function} callback Function invoked on event
 * @return dispose() function. Call it to remove listener
 * */
export function onHoverOut(
  el: HTMLElement,
  callback: (this: HTMLElement, ev: MouseEvent | TouchEvent) => any,
  options?: AddEventListenerOptions
): () => void {
  const r1 = onEvent(el, "mouseleave", callback, options);
  const r2 = onEvent(el, "touchend", callback, options); // todo it's wrong because can be fired outside element

  return () => {
    r1();
    r2();
  };
}
