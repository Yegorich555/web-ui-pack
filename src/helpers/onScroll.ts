import onEvent from "./onEvent";

export interface IScrollOptions {
  /** Point true if need to implement scroll by X instead of scroll by Y */
  isXScroll?: boolean;
  /** Time between scrolls during the user-swipe on touchpads
   * @defaultValue 300 */
  swipeDebounceMs?: number;
  /** Min swipe-movement in pixels when need to scroll
   * @defaultValue 10 */
  swipeDebounceDelta?: number;
  /** Return true to skip scroll event (when element somehow is disabled for example) */
  skip?: () => boolean;
}

/** Handles wheel & touch events for custom scrolling (without real scroll)
 * @returns remove/destroy function to remove related events */
export default function onScroll(
  el: HTMLElement,
  callback: (direction: -1 | 1) => void,
  options?: IScrollOptions
): () => void {
  el.style.overflow = "hidden";
  el.style.touchAction = "none";

  const rOnWheel = onEvent(
    el,
    "wheel",
    (e) => {
      if (options?.skip?.call(el)) {
        return;
      }
      e.preventDefault(); // prevent body scroll
      callback(e.deltaY > 0 ? 1 : -1);
    },
    { passive: false }
  );

  const rOnTouch = onEvent(el, "touchstart", (ev) => {
    // WARN: don't prevent touchstart because it can prevent click events
    if (options?.skip?.call(el)) {
      return;
    }
    const isYScroll = !options?.isXScroll;
    let xy = isYScroll ? ev.touches[0].clientY : ev.touches[0].clientX;
    let stamp = 0;

    const rOnTouchMove = onEvent(
      ev.target as HTMLElement, // WARN: it's important to attach to target otherwise event not fired when element is removed: https://developer.mozilla.org/en-US/docs/Web/API/Touch/target
      "touchmove",
      (e) => {
        const xyNew = isYScroll ? e.touches[0].clientY : e.touches[0].clientX;
        const diff = xyNew - xy;
        if (Math.abs(diff) > (options?.swipeDebounceDelta ?? 10)) {
          xy = xyNew;
          /* istanbul ignore else */
          if (e.timeStamp - stamp > (options?.swipeDebounceMs ?? 300)) {
            stamp = e.timeStamp;
            callback(diff < 0 ? 1 : -1);
          }
        }
      },
      { passive: false } // WARN don't set capture: true; otherwise it's not removed
    );

    el.addEventListener("touchend", rOnTouchMove, { once: true, passive: true });
  });

  const remove = (): void => {
    rOnWheel();
    rOnTouch();
    el.style.overflow = "";
    el.style.touchAction = "";
  };
  return remove;
}

// all tests see in scrollCarousel...
