/** Style for visually hidden but accessible for screenReaders */
export const WUPcssHidden = `
position: absolute;
height: 1px; width: 1px;
top:0;left:0;
overflow: hidden;
clip: rect(1px, 1px, 1px, 1px);`;

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

/** Style for small-scroll; vars --scroll, --scroll-hover to customize styling */
export const WUPcssScrollSmall = (tag: string): string => `
${tag}::-webkit-scrollbar {
  width: 10px; height: 10px;
  cursor: pointer;
}
${tag}::-webkit-scrollbar-corner {
  background: none;
}
${tag}::-webkit-scrollbar-thumb {
  border: 3px solid rgba(0,0,0,0);
  background-clip: padding-box;
  background-color: var(--scroll, rgba(0,0,0,0.2));
  border-radius: 999px;
}
${tag}::-webkit-scrollbar-track-piece:vertical:start,
${tag}::-webkit-scrollbar-track-piece:vertical:end,
${tag}::-webkit-scrollbar-track-piece:horizontal:start,
${tag}::-webkit-scrollbar-track-piece:horizontal:end {
  margin: 0;
}
@media (hover) {
  ${tag}::-webkit-scrollbar-thumb:hover {
    background-color: var(--scroll-hover, rgba(0,0,0,0.5));
  }
}`;
