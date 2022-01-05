/** Apply el.addEventListener and return el.removeEventListener function;
 *
 * Despite on addEventListener target & currentTarget is always HTMLElement otherwise it's not fired
 */
export default function onEvent<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  type: K,
  listener: (
    this: HTMLElement,
    e: HTMLElementEventMap[K] & {
      target: HTMLElement;
      currentTarget: HTMLElement;
    }
  ) => any,
  options?: boolean | AddEventListenerOptions
) {
  function listenWrapper(this: HTMLElement, e: HTMLElementEventMap[K]) {
    e.target instanceof HTMLElement &&
      listener.call(
        el,
        e as HTMLElementEventMap[K] & {
          target: HTMLElement;
          currentTarget: HTMLElement;
        }
      );
  }
  el.addEventListener(type, listenWrapper, options);
  return () => el.removeEventListener(type, listenWrapper);
}
