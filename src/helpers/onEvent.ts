/** Apply el.addEventListener and return el.removeEventListener function; use passive:true by default;
 * @tutorial Troubleshooting
 * * don't change argument `options` after the function call otherwise removineListener can be skipped */
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
): () => void {
  if (typeof options !== "boolean") {
    if (options == null) {
      options = { passive: true };
    } else if (options.passive == null) {
      options.passive = true;
    }
  }

  const remove = (): void => element.removeEventListener(type as string, wrapper, options);

  function wrapper(this: K, e: Event): void {
    listener.call(
      element,
      e as E[T] & {
        target: EventTarget;
        currentTarget: EventTarget;
      }
    );
    (options as AddEventListenerOptions)?.once && remove();
  }
  element.addEventListener(type as string, wrapper, options);
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
