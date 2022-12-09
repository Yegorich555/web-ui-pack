/** Returns callback when scrolling is stopped (via checking scroll position every frame-render)
 * @param {HTMLElement} el HTMLElement to listen for
 * @param {Function} listener Callback invoked on event
 * @returns removeListener callback
 */
export default function onScrollStop(
  el: HTMLElement,
  listener: (this: HTMLElement) => void,
  options?: {
    once?: boolean;
    /** Call once even if scrolling isn't started */
    onceNotStarted?: boolean;
  }
): () => void {
  let { scrollTop: y, scrollLeft: x } = el;
  let id: number | null;
  let wasScrolled = false;
  const check = async (): Promise<void> => {
    let i = 0;
    while (1) {
      ++i;
      // eslint-disable-next-line no-loop-func, no-promise-executor-return
      await new Promise<any>((resolve) => (id = requestAnimationFrame(resolve)));
      if (id === null) {
        return; // skip other actions if it's cancelled
      }
      const isScrolled = el.scrollTop !== y || el.scrollLeft !== x;
      if (isScrolled) {
        wasScrolled = true;
        y = el.scrollTop;
        x = el.scrollLeft;
        i = 0;
      } else if (i === 3) {
        if (wasScrolled || options?.onceNotStarted) {
          setTimeout(() => listener.call(el));
          if (options?.once || options?.onceNotStarted) {
            return;
          }
        }
        wasScrolled = false;
        i = 0;
      }
    }
  };

  check();
  return () => (id = null);
}

// function to check intervals
// let t = Date.now();
// const id2 = setInterval(() => {
//   if (el.scrollTop !== y) {
//     const now = Date.now();
//     const diff = now - t;
//     (diff > 50 ? console.error : console.warn).call(console, diff, el.scrollTop);
//     y = el.scrollTop;
//     t = now;
//   }
// });
// setTimeout(() => clearInterval(id2), 1000);
