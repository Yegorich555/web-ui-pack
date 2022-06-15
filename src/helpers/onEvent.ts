/** Apply el.addEventListener and return el.removeEventListener function; use passive:true by default; */
export default function onEvent<
  T extends keyof E,
  K extends HTMLElement | Document,
  E extends (HTMLElementEventMap & Record<keyof E, Event>) | Record<string, Event> = HTMLElementEventMap
>(
  element: K,
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
  const remove = () => element.removeEventListener(type as string, wrapper);

  function wrapper(this: K, e: Event) {
    listener.call(
      element,
      e as E[T] & {
        target: EventTarget;
        currentTarget: EventTarget;
      }
    );
    (options as AddEventListenerOptions)?.once && remove();
  }
  element.addEventListener(
    type as string,
    wrapper,
    options instanceof Object ? { passive: true, ...options } : options
  );
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
