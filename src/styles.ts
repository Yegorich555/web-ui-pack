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

/** Returns default style for primary/submit button */
export function WUPcssButton(tag: string): string {
  return `
${tag} {
  box-shadow: none;
  border: 1px solid var(--base-btn-bg);
  border-radius: var(--border-radius);
  box-sizing: border-box;
  padding: 0.5em;
  margin: 1em 0;
  min-width: 10em;
  cursor: pointer;
  font: inherit;
  font-weight: bold;
  background: var(--base-btn-bg);
  color: var(--base-btn-text);
  outline: none;
}
${tag}:focus {
  border-color: var(--base-btn-focus);
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
}`;
}

/** Returns default style for popup menu */
export function WUPcssMenu(tag: string, hoverColor = "#f1f1f1"): string {
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
    background-color: ${hoverColor};
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
