let waitMouseUp = false;
let waitMouseUpFunction: (() => void) | undefined;
let timeoutRef: NodeJS.Timeout | undefined;

// todo check mousedown with touch-screen
document.addEventListener("mousedown", () => {
  waitMouseUp = true;
});

document.addEventListener("mouseup", () => {
  waitMouseUp = false;
  waitMouseUpFunction && waitMouseUpFunction();
  waitMouseUpFunction = undefined;
});

export default function detectFocusLeft(control: HTMLElement, callback: () => void, timeoutMs = 100): void {
  function stopTimeout(): void {
    timeoutRef && clearTimeout(timeoutRef);
    timeoutRef = undefined;
    control.removeEventListener("focusin", stopTimeout);
  }
  function runTimeout(): void {
    timeoutRef = setTimeout(callback, timeoutMs);
    control.addEventListener("focusin", stopTimeout);
  }

  if (waitMouseUp) {
    waitMouseUpFunction = runTimeout;
  } else {
    runTimeout();
  }
}
