/** Returns callback on scroll end (via checking scroll position on every frame)
 * @param {HTMLElement} el HTMLElement to listen for`
 * @param {Function} listener Callback invoked on event
 * @returns removeListener callback
 */
export default function onScrollStop(el: HTMLElement, listener: (this: HTMLElement) => void): () => void {
  let { scrollTop: y, scrollLeft: x } = el;

  let id: number | null;
  const check = async (): Promise<void> => {
    while (1) {
      for (let i = 0; i < 3; ++i) {
        // eslint-disable-next-line no-loop-func, no-promise-executor-return
        await new Promise<any>((resolve) => (id = requestAnimationFrame(resolve)));
        if (id === null) {
          break;
        }
      }

      if (el.scrollTop === y && el.scrollLeft === x) {
        id = null;
        listener.call(el);
        break;
      } else {
        y = el.scrollTop;
        x = el.scrollLeft;
      }
    }
  };

  check();
  return () => {
    id != null && window.cancelAnimationFrame(id);
    id = null;
  };
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
