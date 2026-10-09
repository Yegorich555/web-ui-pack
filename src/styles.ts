// WARN: every string (@wup-include mixinName) is replaced with css of the mixin from styles.scss via stylesLoader.js

/** Returns css where `:host` is replaced with pointed tag */
const toTag = (css: string, tag: string): string => css.replace(/:host/g, tag);

/** Returns style for visually hidden but accessible for screenReaders element */
export function WUPcssHidden(tag: string): string {
  return toTag("@wup-include useHidden", tag);
}

/** Returns style for icons; vars --ctrl-icon, --ctrl-icon-size, --ctrl-icon-img to customize styling */
export function WUPcssIcon(tag: string): string {
  return toTag("@wup-include useIcon", tag);
}

/** Returns style for button with icons */
export function WUPcssBtnIcon(tag: string): string {
  return toTag("@wup-include useBtnIcon", tag);
}

/** Returns style for small-scroll; vars --scroll, --scroll-hover to customize styling
 * @tutorial Troubleshooting
 * * cursor:pointer; doesn't work - this Chromium issue https://stackoverflow.com/questions/64402424/why-does-the-css-cursor-property-not-work-for-the-styled-scrollbar */
export function WUPcssScrollSmall(tag: string): string {
  return toTag("@wup-include useScrollSmall", tag);
}

/** Returns default style for primary/submit button
 * @param type 1 - primary, 2/3 - secondary styles via vars `--base-btn2-*`, `--base-btn3-*`
 * @tutorial
 * WARN: it contains min-width: 10em... */
export function WUPcssButton(tag: string, type: 1 | 2 | 3 = 1): string {
  const css = toTag("@wup-include useButton", tag);
  return type === 1 ? css : css.replace(/--base-btn-(bg|text)/g, `--base-btn${type}-$1`);
}

/** Returns default style for popup menu */
export function WUPcssMenu(tag: string): string {
  return toTag("@wup-include useMenu", tag);
}

let refStyle: HTMLStyleElement | undefined;
/** Use this function to prepend css-style via JS into document.head */
export function useBuiltinStyle(cssString: string): HTMLStyleElement {
  if (!refStyle) {
    refStyle = document.createElement("style");
    document.head.prepend(refStyle);
  }
  refStyle.append(cssString);
  return refStyle;
}
//
