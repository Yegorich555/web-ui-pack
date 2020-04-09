let waitMouseUp = false;
let waitMouseUpFunction: (() => void) | undefined;
let timeoutRef: NodeJS.Timeout | undefined;

document.addEventListener("mousedown", () => {
  waitMouseUp = true;
});

document.addEventListener("mouseup", () => {
  waitMouseUp = false;
  waitMouseUpFunction && waitMouseUpFunction();
  waitMouseUpFunction = undefined;
});

/**
 * This function helps to define is competely focus lost or not.
 * For cases when you click on Label that tied with Input you get the following behavior:
 * inputOnBlur > labelOnFocus > inputOnFocus.
 * Fire this function by onBlur event of an Input
 * @param wrapper Element (Label) that wrapes Input
 * @param callback Function that will be invoked if focus is completely left
 * @param focusDebounceMs Time for waiting after focus/blur events is fired
 */
export default function detectFocusLeft(wrapper: HTMLElement, callback: () => void, focusDebounceMs = 100): void {
  function stopTimeout(): void {
    clearTimeout(timeoutRef as NodeJS.Timeout);
    timeoutRef = undefined;
    wrapper.removeEventListener("focusin", stopTimeout);
  }
  function runTimeout(): void {
    timeoutRef = setTimeout(() => {
      stopTimeout();
      callback();
    }, focusDebounceMs);
    wrapper.addEventListener("focusin", stopTimeout);
  }

  if (waitMouseUp) {
    waitMouseUpFunction = runTimeout;
  } else {
    /**
     * in this case we can fire callback immediately
     * but for cases when label.onClick fires programmatically we must wait for 'focusin'
     */
    runTimeout();
  }
}
