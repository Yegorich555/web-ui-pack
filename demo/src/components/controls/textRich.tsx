import { useRef } from "react";
import Page from "src/elements/page";
import { WUPTextRichControl } from "web-ui-pack";
import stylesCom from "./controls.scss";

WUPTextRichControl.$use();

(window as any).myTextRichToolbar = WUPTextRichControl.$defaults.toolbar;
(window as any).myTextRichValidations = { required: true, min: 4 } as WUP.TextRich.Options["validations"];
(window as any).myTextRichToolbarShort = [
  ["link"],
  ["bold", "underline", "italic", "strike"],
] as WUP.TextRich.Options["toolbar"];

const initValue = [
  "<h2>Release notes</h2>",
  "<p>Text with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strike</s> and ",
  '<a href="https://github.com/Yegorich555/web-ui-pack">link</a></p>',
  "<blockquote>Quote</blockquote>",
  "<pre>const code = true;</pre>",
  "<ol><li>Numbered</li><li>List</li></ol>",
  "<ul><li>Bulleted</li><li>List</li></ul>",
  '<p style="text-align: center;">Centered text with <span style="font-size: x-large">large</span> size</p>',
].join("");

export default function TextRichControlView() {
  const refPreview = useRef<HTMLDivElement>(null);
  return (
    <Page
      header="TextRichControl"
      link="src/controls/textRich.ts"
      details={{
        tag: "wup-textrich",
        linkDemo: "demo/src/components/controls/textRich.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Inheritted features from TextareaControl",
        "Toolbar with formats: headers, bold, italic, underline, strike, quote, code, link, lists, subscript & superscript, indentation, size, alignment & clean",
        "Value is html: it's sanitized & only supported formats are kept (pasted content as well)",
        "Undo/redo for text & formatting (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y) including OS-native ones (Edit menu, shake on iPhone)",
        "Keyboard: Ctrl+B, Ctrl+I, Ctrl+U & Alt+F10 to focus toolbar (Arrows to navigate, Esc to return)",
        "Inline format with collapsed selection is applied to the next typed text (Ctrl+B and type text)",
        "Validations min/max count visible chars only",
      ]}
    >
      <wup-form
        class={stylesCom.formWide}
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        <wup-textrich
          w-name="description"
          w-label="Rich text"
          w-initValue=""
          w-validations="window.myTextRichValidations"
          w-toolbar="window.myTextRichToolbar"
          ref={(el) => {
            if (el) {
              el.$onChange = () => {
                console.warn("$change", { value: el.$value });
                refPreview.current!.innerHTML = el.$value ?? ""; // value is sanitized html
              };
            }
          }}
        />
        {/* value of the 1st input shown outside control with the same styles */}
        <div wup-textrich="" ref={refPreview} />
        <wup-textrich w-name="Custom toolbar" w-toolbar="window.myTextRichToolbarShort" />
        <wup-textrich
          w-name="withValue"
          w-label="With init value"
          ref={(el) => {
            if (el) {
              el.$initValue = initValue;
            }
          }}
        />
        <div className={stylesCom.group}>
          <wup-textrich
            w-name="readonly"
            readonly
            w-toolbar="window.myTextRichToolbarShort"
            ref={(el) => {
              if (el) {
                el.$initValue = "<p>Readonly <strong>text</strong></p>";
              }
            }}
          />
          <wup-textrich
            w-name="disabled"
            disabled
            w-toolbar="window.myTextRichToolbarShort"
            ref={(el) => {
              if (el) {
                el.$initValue = "<p>Disabled <strong>text</strong></p>";
              }
            }}
          />
        </div>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
