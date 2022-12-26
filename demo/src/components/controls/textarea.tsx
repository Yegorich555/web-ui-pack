/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPTextareaControl } from "web-ui-pack";
import styles from "./textarea.scss";

const sideEffect = WUPTextareaControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

(window as any).myTextareaValidations = { min: 4 } as WUPTextarea.Options["validations"];

export default function TextControlView() {
  return (
    <Page
      header="TextareaControl"
      link="src/controls/textarea.ts"
      // todo rollback after tests
      // details={{
      //   tag: "wup-textarea",
      //   cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      // }}
      features={[
        "Inheritted features from TextControl",
        "Autoheight (change css rule: wup-textarea [contenteditable] { max-height: none })",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { email: "test@google.com", required: "yes" };
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
      >
        <wup-textarea
          name="email"
          label="Textarea control"
          initValue=""
          autoComplete="off"
          autoFocus={false}
          validations="window.myTextareaValidations"
          mask=""
          maskholder=""
          prefix=""
          postfix=""
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
                "or leave as is\n\n",
              ].join("\n");
            }
          }}
        />
        <wup-textarea
          class={styles.autoh}
          name="autoH" //
          label="Autoheight"
          initValue={[
            "wup-textarea [contenteditable] { ", //
            "  max-height: 20em; // use css to limit",
            "}",
            "or leave as is",
          ].join("\n")}
        />
        <wup-textarea
          name="withoutClearButton"
          label="Without clear button"
          initValue="Use $options.clearButton"
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
          initValue="init value here"
          name="readonly"
          ref={(el) => {
            if (el) {
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-textarea name="disabled" disabled />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
