import onEvent from "./onEvent";

export interface ISwipeOptions {
  /** Movement in px to detect direction of swipe
   * @defaultValue 10 */
  minDelta?: number;
  /** Return true to skip the gesture (when element is somehow disabled for example) */
  skip?: (e: PointerEvent) => boolean;
  /** Called once when horizontal swipe is detected (before 1st onMove) */
  onStart?: (e: PointerEvent) => void;
  /** Called on every movement during the swipe
   * @param dx shift (px) from the start point */
  onMove?: (dx: number, e: PointerEvent) => void;
  /** Called when swipe is ended (by `pointerup` or `pointercancel`: see `e.type`)
   * @param dx shift (px) from the start point
   * @param v velocity (px/ms) of the last movement: use it to detect fling */
  onEnd?: (dx: number, v: number, e: PointerEvent) => void;
}

/** Handles horizontal swipe by touch & pen (mouse is ignored because dragging by mouse selects text)
 * @tutorial Troubleshooting
 * * vertical scroll by touch is allowed (sets `el.style.touchAction = "pan-y"`)
 * * click fired right after the swipe is prevented (otherwise swipe triggers clicks on inner buttons)
 * @example
 * const remove = onSwipe(el, { onMove: (dx) => (el.style.transform = `translateX(${dx}px)`) });
 * @returns remove/destroy function to remove related events */
export default function onSwipe(el: HTMLElement, opts: ISwipeOptions): () => void {
  el.style.touchAction = "pan-y"; // otherwise browser cancels pointer-events on horizontal swipe
  const minDelta = opts.minDelta ?? 10;

  const rDown = onEvent(el, "pointerdown", (e) => {
    if (e.pointerType === "mouse" || !e.isPrimary || opts.skip?.(e)) {
      return;
    }
    let dx = 0;
    let t = e.timeStamp;
    let v = 0;
    let isSwiping = false;
    const onPointer = (ev: PointerEvent): void => {
      if (ev.pointerId !== e.pointerId) {
        return;
      }
      if (ev.type === "pointermove") {
        const dt = ev.timeStamp - t;
        dt > 0 && (v = (ev.clientX - e.clientX - dx) / dt);
        t = ev.timeStamp;
        dx = ev.clientX - e.clientX;
        if (!isSwiping) {
          if (Math.abs(ev.clientY - e.clientY) > Math.max(minDelta, Math.abs(dx))) {
            off(); // vertical scroll
            return;
          }
          if (Math.abs(dx) <= minDelta) {
            return;
          }
          isSwiping = true;
          opts.onStart?.(ev);
        }
        opts.onMove?.(dx, ev); // WARN: touch & pen have implicit pointer capture so events are fired even when pointer is out of element
        return;
      }
      off();
      if (isSwiping) {
        if (ev.type === "pointerup") {
          const prevent = (c: MouseEvent): void => {
            c.preventDefault();
            c.stopImmediatePropagation();
          };
          const r = onEvent(el, "click", prevent, { capture: true, once: true, passive: false });
          setTimeout(r); // click is fired in the same task as pointerup (if it's fired)
        }
        opts.onEnd?.(dx, v, ev);
      }
    };
    const removers = (["pointermove", "pointerup", "pointercancel"] as const).map((k) => onEvent(el, k, onPointer));
    const off = (): void => removers.forEach((r) => r());
  });

  return () => {
    rDown();
    el.style.touchAction = "";
  };
}
