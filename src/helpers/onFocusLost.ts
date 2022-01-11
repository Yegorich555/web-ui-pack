/* todo unit-tests > cases:
1. Set focus, Click outside - focusLost
2. Click in, Click in again, Click on children (focusable/not focusable) - focus stay
3. Click on dev.console - focusStay
4. Click on label>input - focusStay
5. MouseDown,mouseUp on label tied with input - focusStay, because label throughs focus to input
6. MouseDown on label, mouseMove, mouseUp on label - focusLost
7. Check options: once
8. MemoryLeaking: Removing listener should unsubscribe for other ones
 */

import onEvent from "./onEvent";

let isMouseDown = false;
let rstEvent: undefined | (() => void);
let rstCnt = 0;
const onMouseUp: Array<() => void> = [];
function setEvent(): void {
  ++rstCnt;
  if (rstEvent) {
    return;
  }

  const r1 = onEvent(document, "mousedown", ({ defaultPrevented }) => (isMouseDown = !defaultPrevented));

  const mouseup = () => {
    onMouseUp.forEach((f) => f());
    onMouseUp.length = 0;
    isMouseDown = false;
  };
  // click fires after mouseup but provides better mechanism
  const r2 = onEvent(document, "click", mouseup);

  if (!rstEvent) {
    rstEvent = () => {
      --rstCnt;
      if (rstCnt === 0) {
        onMouseUp.length = 0;
        r1();
        r2();
      }
    };
  }
}

interface onFocusLostOptions extends AddEventListenerOptions {
  /** Required to prevent debounce when user clicks on label tied with input;
   * In this case events labelClick > inputFocusout > inputClick > inputFocusin is fired
   *
   * Troubleshooting: if click/focusout is handled somewhere during for a long time `debounceMs` must be adjusted
   * or you can prevent labelOnClick behavior via adding label.addEventListener('mousedown', (e) => e.preventDefault());
   * and implement labelClick > inputFocus yourself
   *
   * Default is `100ms` */
  debounceMs?: number;
}

/** Fires when element/children completely lost focus.
 * This event checks next focused/active element and isn't fired several times.
 * @param el HTMLElement to apply `.addEventListener`
 * @param listener Callback invoked on event
 * @param options OnFocusLostOptions
 * @return Callback with `.removeEventListener`. Call it to remove listener
 * */
export default function onFocusLost(
  el: HTMLElement,
  listener: (this: HTMLElement, ev: HTMLElementEventMap["focusout"]) => any,
  options?: onFocusLostOptions
): () => void {
  setEvent();
  const remove = () => {
    // eslint-disable-next-line no-use-before-define
    el.removeEventListener("focusout", focusout);
    rstEvent?.call(el);
  };
  const focusout = (e: FocusEvent) => {
    if (isMouseDown) {
      // mouseDown Label > mouseUp Label > click Label (without mouseMove) > focusin Input > click Input
      // if mouseDown.target === mouseUp.target >> click target; if clickTarget tied with input >>> clickInput
      // timeout requires to wait for next document.activeElement to be defined
      onMouseUp.push(() => setTimeout(() => focusout(e), options?.debounceMs || 100));
      return;
    }
    const isFocused = (a: Element | null) => a && (el === a || el.contains(a));
    const isStillFocused = e.relatedTarget instanceof Element && isFocused(e.relatedTarget);
    if (!isStillFocused && !isFocused(document.activeElement)) {
      listener.call(el, e);
      options?.once && remove();
    }
  };

  el.addEventListener("focusout", focusout, { ...options, once: false });
  return remove;
}
