let waitMouseUp = false;
let waitMouseUpFunction: (() => void) | undefined;
let timeoutRef: NodeJS.Timeout | undefined;

document.addEventListener("mousedown", () => {
  console.clear();
  console.warn("got mousedown");
  waitMouseUp = true;
});
document.addEventListener("mouseup", () => {
  console.warn("got mouseup");
  waitMouseUp = false;
  waitMouseUpFunction && waitMouseUpFunction();
  waitMouseUpFunction = undefined;
});

export default function detectFocusLeft(control: HTMLElement, callback: () => void): void {
  function stopTimeout(): void {
    timeoutRef && clearTimeout(timeoutRef);
    timeoutRef = undefined;
    control.removeEventListener("focusin", stopTimeout);
  }
  function runTimeout(): void {
    timeoutRef = setTimeout(callback, 100);
    control.addEventListener("focusin", stopTimeout);
  }

  if (waitMouseUp) {
    waitMouseUpFunction = runTimeout;
  } else {
    runTimeout();
  }
}
