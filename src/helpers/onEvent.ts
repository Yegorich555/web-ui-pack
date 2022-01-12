/* eslint-disable no-use-before-define */
/** Apply el.addEventListener and return el.removeEventListener function;
 *
 * Despite on addEventListener target & currentTarget is always HTMLElement otherwise it's not fired
 */
export default function onEvent<K extends keyof M, M extends HTMLElementEventMap = HTMLElementEventMap>(
  el: HTMLElement | Node,
  type: K,
  listener: (
    this: HTMLElement | Node,
    e: M[K] & {
      target: HTMLElement;
      currentTarget: HTMLElement;
    }
  ) => any,
  options?: boolean | AddEventListenerOptions
) {
  const remove = () => el.removeEventListener(type as string, wrapper);

  function wrapper(this: HTMLElement, e: Event) {
    if (e.target instanceof Node) {
      listener.call(
        el,
        e as unknown as M[K] & {
          target: HTMLElement;
          currentTarget: HTMLElement;
        }
      );
      (options as AddEventListenerOptions)?.once && remove();
    }
  }
  el.addEventListener(type as string, wrapper as unknown as EventListener, options);
  return remove;
}

export type onEventType<
  K extends keyof M,
  M extends HTMLElementEventMap | Record<string, Event> = HTMLElementEventMap
> = (
  el: HTMLElement | Node,
  type: K,
  listener: (
    this: HTMLElement | Node,
    e: M[K] & {
      target: HTMLElement;
      currentTarget: HTMLElement;
    }
  ) => any,
  options?: boolean | AddEventListenerOptions
) => () => void;
