export type TypeOnEvent<K extends keyof HTMLElementEventMap> = (
  el: HTMLElement | Node,
  type: K | string,
  listener: (
    this: HTMLElement | Node,
    e: HTMLElementEventMap[K] & {
      target: HTMLElement;
      currentTarget: HTMLElement;
    }
  ) => any,
  options?: boolean | AddEventListenerOptions
) => () => void;

/** Apply el.addEventListener and return el.removeEventListener function;
 *
 * Despite on addEventListener target & currentTarget is always HTMLElement otherwise it's not fired
 */
export default function onEvent<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | Node,
  type: K | string,
  listener: (
    this: HTMLElement | Node,
    e: HTMLElementEventMap[K] & {
      target: HTMLElement;
      currentTarget: HTMLElement;
    }
  ) => any,
  options?: boolean | AddEventListenerOptions
) {
  function wrapper(this: HTMLElement, e: HTMLElementEventMap[K]) {
    if (e.target instanceof Node) {
      listener.call(
        el,
        e as HTMLElementEventMap[K] & {
          target: HTMLElement;
          currentTarget: HTMLElement;
        }
      );
      (options as AddEventListenerOptions)?.once &&
        el.removeEventListener(type, wrapper as EventListenerOrEventListenerObject);
    }
  }
  el.addEventListener(type, wrapper as EventListenerOrEventListenerObject, options);
  return () => el.removeEventListener(type, wrapper as EventListenerOrEventListenerObject);
}
