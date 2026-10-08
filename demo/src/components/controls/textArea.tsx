/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPTextAreaControl } from "web-ui-pack";
import styles from "./textArea.scss";

WUPTextAreaControl.$use();

(window as any).myTextAreaValidations = { min: 4 } as WUP.TextArea.Options["validations"];

export default function TextControlView() {
  return (
    <Page
      header="TextAreaControl"
      link="src/controls/textArea.ts"
      details={{
        tag: "wup-textarea",
        linkDemo: "demo/src/components/controls/textArea.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Inheritted features from TextControl (mask, prefix, postfix are not supported)",
        "Autoheight (change css rule: wup-textarea [contenteditable] { max-height: none })",
        "Footer with count of chars & validations.max (hidden via $options.hideFooter; override $renderFooter to customize)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { email: "test@google.com", required: "yes" };
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        <wup-textarea
          w-name="email"
          w-label="TextArea control"
          w-initValue=""
          w-validations="window.myTextAreaValidations"
        />
        <wup-textarea
          id="testMe"
          ref={(el) => {
            if (el) {
              el.$options.name = "longName";
              el.$options.label = "With scroll";
              el.$options.validations = {
                required: true,
                max: 250,
                min: (v) => (!v || v.length < 2) && "This is custom error",
              };
              el.$value = [
                "wup-textarea [contenteditable] { ", //
                "  min-height: 6em; // use css to change default",
                "}",
                "or leave as is",
              ].join("\n");
            }
          }}
        />
        <wup-textarea
          class={styles.autoh}
          w-name="autoH" //
          w-label="Autoheight"
          w-initValue={[
            "wup-textarea [contenteditable] { ", //
            "  max-height: 20em; // use css to limit",
            "}",
            "or leave as is",
          ].join("\n")}
        />
        <wup-textarea
          w-name="withoutClearButton"
          w-label="Without clear button & footer"
          w-initValue="Use $options.clearButton & $options.hideFooter"
          w-hideFooter
          ref={(el) => {
            if (el) {
              el.$options.clearButton = false;
              el.$options.validations = {
                required: true,
              };
            }
          }}
        />

        <wup-textarea
          w-initValue="init value here"
          w-name="readonly"
          ref={(el) => {
            if (el) {
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-textarea w-name="disabled" disabled />
        <wup-textarea //
          w-name="saveLsTa"
          w-label="With saving to localStorage (see $options.storageKey & storage)"
          w-storageKey="true"
          w-initValue="Type text & reload page"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
