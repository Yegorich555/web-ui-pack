/** Style for visually hidden but accessible for screenReaders */
export const WUPcssHidden = `
position: absolute;
height:1px; width:1px;
overflow:hidden;
clip:rect(1px,1px,1px,1px);
min-width:initial;
padding:0;`;

/** Style for icons; vars --ctrl-icon, --ctrl-icon-size, --ctrl-icon-img to customize styling */
export const WUPcssIcon = `
display: inline-block;
width: var(--ctrl-icon-size);
min-height: var(--ctrl-icon-size);
box-sizing: content-box;
margin: 0;
padding: 5px;
flex: 0 0 auto;
align-self: stretch;
border: none;
box-shadow: none;
background: var(--ctrl-icon);
-webkit-mask-size: var(--ctrl-icon-size);
mask-size: var(--ctrl-icon-size);
-webkit-mask-repeat: no-repeat;
mask-repeat: no-repeat;
-webkit-mask-position: center;
mask-position: center;
-webkit-mask-image: var(--ctrl-icon-img);
mask-image: var(--ctrl-icon-img);`;

/** CSS variables with set of icons */
export const WUPcssIconSet = `
--wup-icon-cross: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M674.515 93.949a45.925 45.925 0 0 0-65.022 0L384.001 318.981 158.509 93.487a45.928 45.928 0 0 0-65.022 0c-17.984 17.984-17.984 47.034 0 65.018l225.492 225.494L93.487 609.491c-17.984 17.984-17.984 47.034 0 65.018s47.034 17.984 65.018 0l225.492-225.492 225.492 225.492c17.984 17.984 47.034 17.984 65.018 0s17.984-47.034 0-65.018L449.015 383.999l225.492-225.494c17.521-17.521 17.521-47.034 0-64.559z'/%3E%3C/svg%3E");
--wup-icon-check: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M37.691 450.599 224.76 635.864c21.528 21.32 56.11 21.425 77.478 0l428.035-426.23c21.47-21.38 21.425-56.11 0-77.478s-56.11-21.425-77.478 0L263.5 519.647 115.168 373.12c-21.555-21.293-56.108-21.425-77.478 0s-21.425 56.108 0 77.478z'/%3E%3C/svg%3E");
--wup-icon-dot: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='20'/%3E%3C/svg%3E");
--wup-icon-back: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='m509.8 16.068-329.14 329.14c-21.449 21.449-21.449 56.174 0 77.567l329.14 329.14c21.449 21.449 56.174 21.449 77.567 0s21.449-56.174 0-77.567l-290.36-290.36 290.36-290.36c21.449-21.449 21.449-56.173 0-77.567-21.449-21.394-56.173-21.449-77.567 0z'/%3E%3C/svg%3E");
--wup-icon-eye: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M384 122.182C209.455 122.182 60.392 230.749 0 384c60.392 153.251 209.455 261.818 384 261.818S707.608 537.251 768 384c-60.392-153.251-209.455-261.818-384-261.818zm0 436.363c-96.35 0-174.545-78.197-174.545-174.545S287.651 209.455 384 209.455 558.545 287.651 558.545 384 480.348 558.545 384 558.545zm0-279.272c-57.95 0-104.727 46.778-104.727 104.727S326.051 488.727 384 488.727 488.727 441.949 488.727 384 441.949 279.273 384 279.273z'/%3E%3C/svg%3E");
--wup-icon-eye-off: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M384 209.375c96.393 0 174.625 78.232 174.625 174.625 0 22.701-4.54 44.005-12.573 63.913l101.981 101.981C700.77 505.889 742.331 448.961 767.826 384c-60.42-153.321-209.55-261.938-384.174-261.938-48.895 0-95.695 8.731-139.001 24.448l75.438 75.438c19.907-8.032 41.212-12.573 63.913-12.573zM34.75 114.03l95.695 95.695C72.469 254.778 27.067 314.85-.174 384.001 60.246 537.322 209.376 645.938 384 645.938c54.133 0 105.823-10.477 152.971-29.337l14.668 14.668 102.33 101.981 44.355-44.355L79.105 69.676 34.75 114.031zm193.135 193.135 54.133 54.133c-1.746 7.334-2.794 15.018-2.794 22.701 0 57.976 46.799 104.775 104.775 104.775 7.684 0 15.367-1.048 22.701-2.794l54.134 54.134c-23.4 11.525-49.244 18.51-76.835 18.51-96.393 0-174.625-78.232-174.625-174.625 0-27.591 6.985-53.435 18.51-76.835zm150.527-27.242 110.014 110.014.698-5.588c0-57.976-46.799-104.775-104.775-104.775l-5.937.349z'/%3E%3C/svg%3E");
--wup-icon-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='m16.078 258.214 329.139 329.139c21.449 21.449 56.174 21.449 77.567 0l329.139-329.139c21.449-21.449 21.449-56.174 0-77.567s-56.174-21.449-77.567 0L384 471.003 93.644 180.647c-21.449-21.449-56.173-21.449-77.567 0s-21.449 56.173 0 77.567z'/%3E%3C/svg%3E");
--wup-icon-date: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M652.801 76.8c42.24 0 76.8 34.56 76.8 76.8v537.601c0 42.24-34.56 76.8-76.8 76.8H115.2c-42.624 0-76.8-34.56-76.8-76.8l.384-537.601c0-42.24 33.792-76.8 76.416-76.8h38.4V0h76.8v76.8h307.2V0h76.8v76.8h38.4zM192 345.6h76.8v76.8H192v-76.8zm230.4 0v76.8h-76.8v-76.8h76.8zm153.601 0h-76.8v76.8h76.8v-76.8zM115.2 691.2h537.601V268.8H115.2v422.4z'/%3E%3C/svg%3E");
--wup-icon-time-lg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M383.615 0C171.647 0 0 172.032 0 384s171.648 384 383.615 384c212.352 0 384.383-172.032 384.383-384S595.966 0 383.615 0zM384 691.199C214.272 691.199 76.801 553.727 76.801 384S214.273 76.801 384 76.801c169.728 0 307.199 137.472 307.199 307.199S553.727 691.199 384 691.199zm-38.401-499.198h57.6v201.6l172.8 102.528-28.8 47.232-201.6-120.96v-230.4z' /%3E%3C/svg%3E");
--wup-icon-time: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAABOAAAATgGxzR8zAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAASxJREFUOI2V00kuRFEUBuCvXqLMrEBIRBeKxCIMrcFAYguMRMz13QYwESxAMxIjXYKEiIHYAQYSTRncU1JRT+FPbnLfOf9/unsetejHPK7wHOcSsyjl8L/QiBW84wMnWItzGrY3LKKYJz5AGZtoy0nQjq3g7H0PshqOiXolBiaDu1Ax9EXZmznkY4zm2LeldnozjKCA8T9kr2AMGUYyDEpDuvtHgFucYzBDC27+Ia7gGq2ZNJDCD6QXDKMnx1cg9fGArh8CDOFM2olpNFX5unEPc9KStNcpdwBHOIzvztDMkNbzTVqSeiigOe47oflqbVmaxeQvQWAquPPVxiL2w7GNjhxhZ2QuYxcN3wlFLEVpH9Lw1rER9zJepZnViKtRkn7dSzzhERfSK9Q85ye76kkmcVhDgAAAAABJRU5ErkJggg==');`;

/** Style for button with icons */
export function WUPcssBtnIcon(tag: string): string {
  return `
${tag} {
  display: inline-block;
  cursor: pointer;
  box-shadow: none;
  border: none;
  margin: 0;
  padding: 0;
  width: var(--icon-hover-r, 2em);
  height: var(--icon-hover-r, 2em);
  background: none;
  outline: none;
  border-radius: 50%;
}
${tag}:after {
  content: "";
  display: inline-block;
  border-radius: 50%;
  width: 100%;
  height: 100%;
  background: var(--icon, #000);
  -webkit-mask-size: var(--icon-size, 1em);
  mask-size: var(--icon-size, 1em);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;

  -webkit-mask-image: var(--icon-img);
  mask-image: var(--icon-img);
}
${tag}:focus {
   box-shadow: inset 0 0 0 99999px var(--icon-focus-bg);
}
${tag}:focus:after {
   background: var(--icon-hover, var(--icon, #000));
}
@media (hover: hover) and (pointer: fine) {
  ${tag}:hover {
    box-shadow: inset 0 0 0 99999px var(--icon-hover-bg);
  }
  ${tag}:hover:after {
    background: var(--icon-hover, var(--icon, #000));
  }
  ${tag}:focus:hover {
   opacity: 0.9;
  }
}`;
}

// NiceToHave someHook to apply this rule as singleton (once for body & nested items)
/** Style for small-scroll; vars --scroll, --scroll-hover to customize styling
 * @tutorial Troubleshooting
 * * cursor:pointer; doesn't work - this Chromium issue https://stackoverflow.com/questions/64402424/why-does-the-css-cursor-property-not-work-for-the-styled-scrollbar */
export function WUPcssScrollSmall(tag: string): string {
  return `
${tag}::-webkit-scrollbar {
  width: 10px; height: 10px;
  cursor: pointer;
}
${tag}::-webkit-scrollbar-corner {
  background: none;
  cursor: pointer;
}
${tag}::-webkit-scrollbar-thumb {
  border: 3px solid rgba(0,0,0,0);
  background-clip: padding-box;
  background-color: var(--scroll, rgba(0,0,0,0.2));
  border-radius: 999px;
  cursor: pointer;
}
${tag}::-webkit-scrollbar-track-piece:vertical:start,
${tag}::-webkit-scrollbar-track-piece:vertical:end,
${tag}::-webkit-scrollbar-track-piece:horizontal:start,
${tag}::-webkit-scrollbar-track-piece:horizontal:end {
  margin: 0;
  cursor: pointer;
}
@media (hover) {
  ${tag}::-webkit-scrollbar-thumb:hover {
    background-color: var(--scroll-hover, rgba(0,0,0,0.5));
    cursor: pointer;
  }
}`;
}

/** Returns default style for primary/submit button
 * @tutorial
 * WARN: it contains min-width: 10em...
 */
/* istanbul ignore next */
export function WUPcssButton(tag: string, type: 1 | 2 | 3 = 1): string {
  if (type === 1) {
    // @ts-ignore
    type = "";
  }
  return `
${tag} {
  box-shadow: none;
  border: none;
  border-radius: var(--border-radius);
  box-sizing: border-box;
  padding: 11px;
  margin: var(--base-margin) 0;
  min-width: 10em;
  cursor: pointer;
  font: inherit;
  font-weight: bold;
  background: var(--base-btn${type}-bg);
  color: var(--base-btn${type}-text);
  outline: none;
}
${tag}:focus {
  box-shadow: inset 0 0 0 2px var(--base-btn-focus);
}
@media (hover: hover) and (pointer: fine) {
  ${tag}:hover {
    box-shadow: inset 0 0 0 99999px rgba(0,0,0,0.2);
  }
}
${tag}[disabled] {
  opacity: 0.3;
  cursor: not-allowed;
  -webkit-user-select: none;
  user-select: none;
}
${tag}[aria-busy] {
  cursor: wait;
}
${tag}[busy] {
  position: relative;
}
${tag}[busy]:after {
    content: "";
    display: block;
    position: absolute;
    height: 3px;
    width: 90%;
    width: calc(100% - calc(var(--base-margin) * 2));
    background-color: #fff;
    animation: BTN-BUSY 3s cubic-bezier(0, 0, 0.2, 1) infinite;
    opacity: 0.3;
    left: 50%;
  }
  @keyframes BTN-BUSY {
    0% { transform: translateX(-50%) scaleX(40%); }
    50% { transform: translateX(-50%) scaleX(100%); }
    100% { transform: translateX(-50%) scaleX(40%); }
  }`;
}

/** Returns default style for popup menu */
export function WUPcssMenu(tag: string): string {
  return `
${tag} {
  padding: 0;
  overflow: hidden;
}
${tag} ul {
  margin: 0;
  padding: 0;
  list-style-type: none;
  cursor: pointer;
  overflow: auto;
  max-height: 300px;
}
${WUPcssScrollSmall(`${tag} ul`)}
${tag} li {
  padding: 1em;
}
@media (hover: hover) and (pointer: fine) {
  ${tag} li:hover {
    color: var(--menu-hover-text);
    background: var(--menu-hover-bg);
  }
}
${tag} li[aria-selected="true"] {
  color: var(--ctrl-selected);
  display: flex;
}
${tag} li[aria-selected="true"]:after {
  content: "";
  --ctrl-icon-img: var(--wup-icon-check);
  ${WUPcssIcon}
  background: var(--ctrl-selected);
  margin-left: auto;
  padding: 0;
}
${tag} li[focused] {
  box-shadow: inset 0 0 4px 0 var(--base-focus);
}`;
}

/** Add hover & focus style on pointed item (via :before) */
export function WUPCssIconHover(
  parentTag: string,
  iconTag: string,
  hoverSize = "var(--icon-hover-r, 2.4em)",
  hoverColor = "var(--icon-hover, #0001)"
): string {
  return `
${parentTag} ${iconTag} {
    transform-style: preserve-3d;
  }
${parentTag} ${iconTag}:before {
  z-index: -1;
  position: absolute;
  transform: translate(-50%, -50%) translateZ(-1px);
  left: 50%; top: 50%;
  width: ${hoverSize};
  height: ${hoverSize};
  background: ${hoverColor};
  border-radius: 50%;
}
${parentTag}:focus-within ${iconTag} {
  position: relative;
}
${parentTag}:focus-within ${iconTag}:before {
  content: "";
}
@media (hover: hover) and (pointer: fine) {
  ${parentTag}:hover ${iconTag} {
    position: relative;
  }
  ${parentTag}:hover ${iconTag}:before {
    content: "";
    opacity: 0.8;
  }
}`;
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
