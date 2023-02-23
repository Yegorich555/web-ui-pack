/** Returns viewportSize without scrollbars
 * despite on css 100vw returns window.width + scrollbars */
export default function viewportSize(): { vh: number; vw: number } {
  // explanation: https://codepen.io/machal/pen/rrXNWO
  // documentElement.clientHeight - h without scrollbars. For Safari h with scrollbars
  // window.innerHeight - h with scrollbars. For Safari h without scrollbars
  const vh = Math.min(document.documentElement.clientHeight || Number.MAX_SAFE_INTEGER, window.innerHeight);
  const vw = Math.min(document.documentElement.clientWidth || Number.MAX_SAFE_INTEGER, window.innerWidth);
  return { vh, vw };
}
