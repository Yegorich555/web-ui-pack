/* eslint-disable no-use-before-define */
/** Apply el.addEventListener and return el.removeEventListener function;
 *
 * Despite on addEventListener target & currentTarget is always HTMLElement otherwise it's not fired
 */
export default function onEvent<
  T extends keyof E,
  K extends HTMLElement | Document,
  E extends (HTMLElementEventMap & Record<keyof E, Event>) | Record<string, Event> = HTMLElementEventMap
>(
  el: K,
  type: T,
  listener: (
    this: K,
    e: E[T] & {
      target: EventTarget;
      currentTarget: EventTarget;
    }
  ) => any,
  options?: boolean | AddEventListenerOptions
) {
  const remove = () => el.removeEventListener(type as string, wrapper);

  function wrapper(this: K, e: Event) {
    if (e.target && e.currentTarget) {
      listener.call(
        el,
        e as E[T] & {
          target: EventTarget;
          currentTarget: EventTarget;
        }
      );
      (options as AddEventListenerOptions)?.once && remove();
    }
  }
  el.addEventListener(type as string, wrapper, options);
  return remove;
}

export type onEventType<
  T extends keyof E,
  K extends HTMLElement | Document,
  E extends HTMLElementEventMap & Record<keyof E, Event> = HTMLElementEventMap
> = (
  el: K,
  type: T,
  listener: (
    this: K,
    e: E[T] & {
      target: EventTarget;
      currentTarget: EventTarget;
    }
  ) => any,
  options?: boolean | AddEventListenerOptions
) => () => void;
